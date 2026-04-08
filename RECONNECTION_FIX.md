# 断线重连问题修复

## 问题描述

客户端断开连接后重新连接时出现错误：
```
Transport 连接关闭
Transport 错误: Error: Invalid Request: Server already initialized
```

## 根本原因

### 问题场景

1. **客户端首次连接**
   - 发送初始化请求
   - 服务器创建会话，返回 Session ID: `abc-123`
   - 建立 SSE 连接

2. **连接断开**（网络问题、超时等）
   - Transport 触发 `onclose` 回调
   - 服务器清理会话：删除 `abc-123`
   - 会话资源被释放

3. **客户端重新连接**
   - 客户端使用旧的 Session ID: `abc-123`
   - 发送请求（可能是初始化或其他操作）
   - 服务器发现 `abc-123` 不存在
   - ❌ 抛出 "Server already initialized" 或 "Session not found" 错误

### 为什么会这样？

- **客户端行为**：某些客户端（特别是大模型）会缓存 Session ID，断线后仍使用旧 ID
- **服务器行为**：连接关闭时会话被清理，旧 ID 失效
- **结果**：客户端使用无效 ID，导致错误

---

## 解决方案

### 1. 检测无效的 Session ID

当客户端提供的 Session ID 不存在时，自动创建新会话：

```typescript
if (sessionId && this.sessionTransports.has(sessionId)) {
  // 使用已存在的会话
  transport = this.sessionTransports.get(sessionId)!;
} else {
  // 如果提供了 Session ID 但不存在，记录警告并创建新会话
  if (sessionId) {
    console.warn(`警告: 会话 ${sessionId} 不存在，将创建新会话`);
  }
  
  // 创建新的 Transport 实例
  transport = new StreamableHTTPServerTransport({ /* ... */ });
}
```

**效果**：
- ✅ 客户端可以使用任意 Session ID（包括无效的）
- ✅ 服务器会自动创建新会话
- ✅ 对客户端透明，无需修改客户端代码

---

### 2. 优雅处理会话相关错误

在 `onerror` 回调中捕获并忽略会话相关的错误：

```typescript
transport.onerror = (error: any) => {
  // 忽略重复初始化的错误
  if (error.message?.includes('Server already initialized')) {
    console.warn(`警告: 客户端尝试重复初始化，已忽略`);
    return;
  }
  
  // 如果会话不存在，记录信息但不报错
  if (error.message?.includes('Session not found') || 
      error.message?.includes('Invalid session')) {
    console.warn(`警告: 会话 ${sessionId} 不存在，客户端可能需要重新初始化`);
    return;
  }
  
  console.error(`Transport 错误 (会话: ${sessionId || 'new'}):`, error);
};
```

**效果**：
- ✅ 不会因为会话问题中断服务
- ✅ 记录警告日志便于调试
- ✅ 其他错误正常处理

---

### 3. 改进会话清理逻辑

确保正确清理已关闭的会话：

```typescript
transport.onclose = () => {
  console.log(`Transport 连接关闭 (会话: ${sessionId || 'unknown'})`);
  
  // 清理已关闭的会话
  const sidToClean = sessionId || Array.from(this.sessionTransports.entries())
    .find(([_, t]) => t === transport)?.[0];
  
  if (sidToClean) {
    this.sessionTransports.delete(sidToClean);
    this.initializedSessions.delete(sidToClean);
    console.log(`已清理会话: ${sidToClean}`);
  }
};
```

**改进点**：
- 即使 `sessionId` 为空，也能找到并清理对应的会话
- 避免内存泄漏
- 日志更清晰

---

## 工作流程

### 场景 1: 正常断线重连

```
时间线：
T1: 客户端连接 → Session ID: abc-123
T2: 连接断开 → 服务器清理 abc-123
T3: 客户端重连（使用 abc-123）
    ↓
    服务器检查: abc-123 不存在
    ↓
    服务器警告: "会话 abc-123 不存在，将创建新会话"
    ↓
    服务器创建新会话: def-456
    ↓
    服务器返回: Mcp-Session-Id: def-456
    ↓
✅ 客户端获得新的 Session ID，继续工作
```

---

### 场景 2: 客户端不缓存 Session ID

```
时间线：
T1: 客户端连接 → Session ID: abc-123
T2: 连接断开 → 服务器清理 abc-123
T3: 客户端重连（不带 Session ID）
    ↓
    服务器检查: 没有 Session ID
    ↓
    服务器创建新会话: ghi-789
    ↓
    服务器返回: Mcp-Session-Id: ghi-789
    ↓
✅ 正常工作
```

---

### 场景 3: 重复初始化

```
时间线：
T1: 客户端初始化 → Session ID: abc-123
T2: 客户端再次初始化（使用 abc-123）
    ↓
    服务器检查: abc-123 已存在
    ↓
    Transport 检测到重复初始化
    ↓
    onerror 捕获错误
    ↓
    服务器警告: "客户端尝试重复初始化，已忽略"
    ↓
✅ 不返回错误，客户端继续工作
```

---

## 测试

### 测试 1: 断线重连

```bash
# 1. 首次连接
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

# 获取 Session ID，例如: abc-123

# 2. 模拟断开连接（等待会话超时或重启服务器）

# 3. 使用旧 Session ID 重连
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: abc-123" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# 预期结果：
# - 服务器日志: "警告: 会话 abc-123 不存在，将创建新会话"
# - 服务器创建新会话
# - 返回新的 Session ID
# - ✅ 不报错
```

---

### 测试 2: 并发重连

打开三个终端同时重连：

**终端 1, 2, 3**：
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: old-invalid-id" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"client","version":"1.0.0"}}}'
```

**预期结果**：
- ✅ 三个客户端都成功
- ✅ 每个客户端获得不同的新 Session ID
- ✅ 服务器日志显示创建了三个新会话
- ✅ 没有错误

---

### 测试 3: 大模型断线重连

模拟大模型的行为：

```javascript
let sessionId = null;

async function callMCP(method, params) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  };
  
  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }
  
  try {
    const response = await fetch('http://localhost:3000/mcp', {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
    });
    
    // 保存新的 Session ID（可能是新的）
    const newSessionId = response.headers.get('Mcp-Session-Id');
    if (newSessionId) {
      sessionId = newSessionId;
    }
    
    return await response.json();
  } catch (error) {
    console.error('调用失败:', error);
    // 清除 Session ID，下次重新初始化
    sessionId = null;
    throw error;
  }
}

// 模拟断线重连
async function testReconnect() {
  // 第一次调用
  await callMCP('initialize', { /* ... */ });
  console.log('Session ID:', sessionId);
  
  // 模拟断线（等待或重启服务器）
  await new Promise(r => setTimeout(r, 5000));
  
  // 重连（使用旧的 Session ID）
  try {
    await callMCP('tools/list', {});
    console.log('✅ 重连成功，新 Session ID:', sessionId);
  } catch (error) {
    console.error('❌ 重连失败:', error);
  }
}

testReconnect();
```

**预期结果**：
- ✅ 重连成功
- ✅ 获得新的 Session ID
- ✅ 没有错误

---

## 日志示例

### 修复前

```
新会话已初始化: abc-123
Transport 连接关闭 (会话: abc-123)
已清理会话: abc-123

# 客户端重连
Transport 错误: Error: Invalid Request: Server already initialized
    at WebStandardStreamableHTTPServerTransport.validateSession
    ...
❌ 客户端收到错误
```

### 修复后

```
新会话已初始化: abc-123
Transport 连接关闭 (会话: abc-123)
已清理会话: abc-123

# 客户端重连（使用旧的 abc-123）
警告: 会话 abc-123 不存在，将创建新会话
新会话已初始化: def-456
✅ 客户端获得新的 Session ID，继续工作
```

---

## 最佳实践建议

### 对于客户端开发者

#### 1. 正确处理 Session ID

```javascript
class MCPClient {
  constructor(url) {
    this.url = url;
    this.sessionId = null;
  }
  
  async request(method, params) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };
    
    // 如果有 Session ID，添加到请求头
    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }
    
    const response = await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      })
    });
    
    // 更新 Session ID（服务器可能返回新的）
    const newSessionId = response.headers.get('Mcp-Session-Id');
    if (newSessionId) {
      this.sessionId = newSessionId;
    }
    
    // 如果返回 400 或 404，清除 Session ID
    if (response.status === 400 || response.status === 404) {
      this.sessionId = null;
    }
    
    return response.json();
  }
  
  async reconnect() {
    // 清除 Session ID，强制重新初始化
    this.sessionId = null;
    return this.request('initialize', { /* ... */ });
  }
}
```

#### 2. 实现重试机制

```javascript
async function requestWithRetry(client, method, params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await client.request(method, params);
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // 如果是会话相关错误，重新初始化
      if (error.message?.includes('session') || 
          error.message?.includes('initialized')) {
        console.log('会话失效，重新初始化...');
        await client.reconnect();
      }
      
      // 等待后重试
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

---

### 对于服务器管理员

#### 1. 监控会话状态

```bash
# 查看活跃会话数（需要添加 /stats 端点）
curl http://localhost:3000/stats

# 返回
{
  "activeSessions": 5,
  "totalRequests": 1234,
  "reconnections": 10
}
```

#### 2. 调整会话超时

如果需要更长的会话保持时间，可以配置：

```typescript
// 在 Transport 配置中添加
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
  // 会话超时时间（毫秒）
  sessionTimeoutMs: 300000, // 5 分钟
});
```

#### 3. 日志监控

```bash
# 监控重连相关的警告
pm2 logs lann-mcp-server | grep "会话.*不存在"

# 统计重连次数
pm2 logs lann-mcp-server | grep "会话.*不存在" | wc -l
```

---

## 相关文档

- [REINITIALIZATION_FIX.md](./REINITIALIZATION_FIX.md) - 重复初始化修复
- [SESSION_MANAGEMENT_FIX.md](./SESSION_MANAGEMENT_FIX.md) - 会话管理实现
- [ACCEPT_HEADER_FIX.md](./ACCEPT_HEADER_FIX.md) - Accept 头自动修正
- [HTTP_USAGE.md](./HTTP_USAGE.md) - HTTP/SSE 使用指南

---

**修复版本**: v2.0.4  
**最后更新**: 2026-04-08
