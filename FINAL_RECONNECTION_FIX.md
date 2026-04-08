# 最终修复：断线重连会话管理

## 问题描述

客户端断开连接后重新连接时出现错误：
```
Transport 连接关闭
Transport 错误: Error: Invalid Request: Server already initialized
```

**关键现象**：
- ✅ 重启服务器后，客户端首次连接正常
- ❌ 客户端断开后重连，立即报错
- ❌ 即使发送初始化请求也失败

---

## 根本原因分析

### 问题场景重现

```
时间线：
T1: 客户端首次连接
    → POST /mcp (无 Session ID)
    → 服务器创建 Transport A, Session ID: abc-123
    → 返回 Mcp-Session-Id: abc-123
    → 客户端缓存 abc-123

T2: 客户端断开连接（网络中断、超时等）
    → Transport A 触发 onclose
    → 服务器清理: sessionTransports.delete('abc-123')
    → Transport A 被销毁

T3: 客户端重新连接
    → POST /mcp (Mcp-Session-Id: abc-123)  ← 使用旧的 ID
    → 服务器检查: abc-123 不存在
    → 之前的实现：创建新的 Transport B
    → 但 Transport B 还没初始化
    → 客户端发送的请求（可能是 initialize 或其他）
    → ❌ Transport B 报错: "Server already initialized"
       （因为客户端用了旧 ID，但实际是新 Transport）
```

### 核心问题

**之前实现的缺陷**：
```typescript
// 旧代码
if (sessionId && this.sessionTransports.has(sessionId)) {
  transport = this.sessionTransports.get(sessionId)!;
} else {
  // 问题：如果 sessionId 存在但无效，仍然创建新 Transport
  // 但客户端以为自己在用旧会话，会发送非初始化请求
  // 导致新 Transport 收到意外请求而报错
  if (sessionId) {
    console.warn(`会话 ${sessionId} 不存在，将创建新会话`);
  }
  transport = new StreamableHTTPServerTransport({ /* ... */ });
}
```

**为什么会报错**：
1. 客户端使用旧 Session ID `abc-123`
2. 服务器发现 `abc-123` 不存在，创建新 Transport B
3. 客户端发送请求（可能不是 initialize，而是 tools/call）
4. Transport B 还没初始化，收到非初始化请求
5. ❌ 报错："Server already initialized" 或其他错误

---

## 最终解决方案

### 策略：明确拒绝无效会话，强制重新初始化

当检测到无效的 Session ID 时：
1. **不创建新 Transport**
2. **直接返回 400 错误**
3. **明确提示客户端需要重新初始化**

```typescript
if (sessionId && this.sessionTransports.has(sessionId)) {
  // 使用已存在的会话
  transport = this.sessionTransports.get(sessionId)!;
} else {
  // 如果提供了 Session ID 但不存在，说明会话已过期
  if (sessionId) {
    console.warn(`警告: 会话 ${sessionId} 已失效，客户端需要重新初始化`);
    
    // 返回明确的错误信息
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'Session expired. Please re-initialize.'
      },
      id: null
    }));
    return;  // 重要：不再继续处理
  }
  
  // 没有 Session ID，创建新 Transport（正常流程）
  transport = new StreamableHTTPServerTransport({ /* ... */ });
}
```

---

## 工作流程

### 正确的重连流程

```
T1: 客户端首次连接
    → POST /mcp (无 Session ID)
    → 服务器创建 Transport A
    → 返回 Session ID: abc-123
    → ✅ 成功

T2: 客户端断开
    → Transport A onclose
    → 服务器清理 abc-123

T3: 客户端重连（使用旧 ID）
    → POST /mcp (Mcp-Session-Id: abc-123)
    → 服务器检查: abc-123 不存在
    → 服务器返回 400: "Session expired. Please re-initialize."
    → ❌ 客户端收到错误

T4: 客户端重新初始化（不带 Session ID）
    → POST /mcp (无 Session ID)
    → 服务器创建 Transport B
    → 返回新 Session ID: def-456
    → ✅ 成功

T5: 客户端使用新 ID
    → POST /mcp (Mcp-Session-Id: def-456)
    → 服务器找到 def-456
    → ✅ 正常工作
```

---

## 客户端适配

### 方案 1: 清除 Session ID 后重试（推荐）

```javascript
class MCPClient {
  constructor(url) {
    this.url = url;
    this.sessionId = null;
  }
  
  async request(method, params, retry = true) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };
    
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
    
    // 更新 Session ID
    const newSessionId = response.headers.get('Mcp-Session-Id');
    if (newSessionId) {
      this.sessionId = newSessionId;
    }
    
    // 检查是否是会话过期错误
    if (response.status === 400) {
      const data = await response.json();
      if (data.error?.message?.includes('Session expired')) {
        console.log('会话已过期，重新初始化...');
        
        // 清除 Session ID
        this.sessionId = null;
        
        // 如果允许重试，重新初始化
        if (retry) {
          return this.request('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'client', version: '1.0.0' }
          }, false);  // 避免无限重试
        }
      }
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(await response.json())}`);
    }
    
    return response.json();
  }
  
  async reconnect() {
    // 强制清除 Session ID
    this.sessionId = null;
    return this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'client', version: '1.0.0' }
    });
  }
}

// 使用示例
const client = new MCPClient('http://localhost:3000/mcp');

// 首次连接
await client.request('initialize', { /* ... */ });

// ... 使用一段时间后断开 ...

// 重连（自动处理会话过期）
try {
  await client.request('tools/list', {});
} catch (error) {
  if (error.message.includes('Session expired')) {
    await client.reconnect();  // 重新初始化
    await client.request('tools/list', {});  // 重试
  }
}
```

---

### 方案 2: 检测错误后自动重连

```javascript
async function callWithAutoReconnect(client, method, params) {
  try {
    return await client.request(method, params);
  } catch (error) {
    // 如果是会话相关错误
    if (error.message.includes('Session expired') ||
        error.message.includes('session') ||
        error.message.includes('initialized')) {
      
      console.log('检测到会话错误，自动重连...');
      
      // 重新初始化
      await client.reconnect();
      
      // 重试原请求
      return await client.request(method, params);
    }
    
    // 其他错误，抛出
    throw error;
  }
}

// 使用
const result = await callWithAutoReconnect(client, 'tools/call', {
  name: 'queryStores',
  arguments: { keyword: '上海' }
});
```

---

### 方案 3: 大模型客户端的适配

对于无法修改代码的大模型客户端，需要在提示词中说明：

```
当调用 MCP 服务时：
1. 首次调用需要发送 initialize 请求
2. 保存响应头中的 Mcp-Session-Id
3. 后续请求在 header 中包含 Mcp-Session-Id
4. 如果收到 400 错误且消息包含 "Session expired"
5. 清除 Session ID，重新发送 initialize 请求
6. 使用新的 Session ID 继续调用
```

---

## 测试

### 测试 1: 模拟断线重连

```bash
# 1. 首次连接
curl -v -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

# 记录 Session ID，例如: abc-123

# 2. 重启服务器（模拟会话丢失）
# pm2 restart lann-mcp-server

# 3. 使用旧 Session ID 请求
curl -v -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: abc-123" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# 预期结果：
# < HTTP/1.1 400 Bad Request
# < Content-Type: application/json
# < 
# {"jsonrpc":"2.0","error":{"code":-32600,"message":"Session expired. Please re-initialize."},"id":null}

# 4. 重新初始化（不带 Session ID）
curl -v -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":3,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

# 预期结果：
# < HTTP/1.1 200 OK
# < Mcp-Session-Id: def-456  ← 新的 Session ID
```

---

### 测试 2: 客户端自动重连

```javascript
const client = new MCPClient('http://localhost:3000/mcp');

// 首次连接
console.log('首次连接...');
await client.request('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'test', version: '1.0.0' }
});
console.log('Session ID:', client.sessionId);

// 模拟服务器重启
console.log('\n等待 5 秒后重启服务器...');
await new Promise(r => setTimeout(r, 5000));

// 尝试调用（应该会失败并自动重连）
console.log('\n尝试调用工具...');
try {
  const result = await callWithAutoReconnect(client, 'tools/list', {});
  console.log('✅ 成功！新 Session ID:', client.sessionId);
  console.log('工具列表:', result);
} catch (error) {
  console.error('❌ 失败:', error);
}
```

**预期输出**：
```
首次连接...
Session ID: abc-123

等待 5 秒后重启服务器...

尝试调用工具...
检测到会话错误，自动重连...
✅ 成功！新 Session ID: def-456
工具列表: { ... }
```

---

## 日志示例

### 修复前 ❌

```
新会话已初始化: abc-123
Transport 连接关闭 (会话: abc-123)
已清理会话: abc-123

# 客户端重连
警告: 会话 abc-123 不存在，将创建新会话
Transport 错误: Error: Invalid Request: Server already initialized
❌ 客户端收到错误，无法恢复
```

### 修复后 ✅

```
新会话已初始化: abc-123
Transport 连接关闭
已清理会话: abc-123

# 客户端重连（使用旧 ID）
警告: 会话 abc-123 已失效，客户端需要重新初始化
→ 返回 400: Session expired. Please re-initialize.

# 客户端重新初始化
新会话已初始化: def-456
✅ 客户端获得新 ID，继续工作
```

---

## 优势对比

| 特性 | 旧方案 | 新方案 |
|------|--------|--------|
| **错误处理** | 静默创建新会话，导致混淆 | 明确返回错误，清晰明了 |
| **客户端行为** | 不知道需要重新初始化 | 收到明确提示 |
| **调试难度** | 难以定位问题 | 日志清晰，易于排查 |
| **协议合规** | 不符合 MCP 规范 | 严格遵循规范 |
| **可靠性** | 低，容易出错 | 高，状态明确 |

---

## 最佳实践总结

### 服务器端

1. ✅ 检测到无效 Session ID 时，返回 400 错误
2. ✅ 错误消息明确提示需要重新初始化
3. ✅ 不自动创建新会话，避免状态混乱
4. ✅ 清理会话时彻底删除所有相关数据

### 客户端

1. ✅ 缓存 Session ID
2. ✅ 每次请求携带 Session ID
3. ✅ 检测 400 错误和 "Session expired" 消息
4. ✅ 收到会话过期错误时，清除 Session ID
5. ✅ 重新发送 initialize 请求
6. ✅ 使用新的 Session ID 继续

---

## 相关文档

- [RECONNECTION_FIX.md](./RECONNECTION_FIX.md) - 之前的重连修复尝试
- [REINITIALIZATION_FIX.md](./REINITIALIZATION_FIX.md) - 重复初始化修复
- [SESSION_MANAGEMENT_FIX.md](./SESSION_MANAGEMENT_FIX.md) - 会话管理实现
- [ACCEPT_HEADER_FIX.md](./ACCEPT_HEADER_FIX.md) - Accept 头自动修正

---

**修复版本**: v2.0.5 (最终版)  
**最后更新**: 2026-04-08
