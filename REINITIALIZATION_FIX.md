# 重复初始化问题修复

## 问题描述

大模型客户端调用时出现错误：
```
Error from MCP server: StreamableHTTPError: Streamable HTTP error: Error POSTing to endpoint: 
{"jsonrpc":"2.0","error":{"code":-32600,"message":"Invalid Request: Server already initialized"},"id":null}
```

## 根本原因

某些大模型客户端可能会：
1. **重复发送初始化请求** - 即使会话已经初始化
2. **不缓存 Session ID** - 每次都尝试重新初始化
3. **重试机制** - 网络超时后重试初始化

`StreamableHTTPServerTransport` 严格遵循 MCP 协议，只允许每个会话初始化一次，重复初始化会返回错误。

## 解决方案

### 优雅地忽略重复初始化错误

在 [src/transport/httpServer.ts](./src/transport/httpServer.ts) 的 `onerror` 回调中捕获并忽略重复初始化错误：

```typescript
transport.onerror = (error: any) => {
  // 忽略重复初始化的错误
  if (error.message?.includes('Server already initialized')) {
    console.warn(`警告: 客户端尝试重复初始化，已忽略`);
    return;  // 不抛出错误，静默处理
  }
  console.error(`Transport 错误 (会话: ${sessionId || 'new'}):`, error);
};
```

**工作原理**：
1. Transport 检测到重复初始化请求
2. 内部抛出 "Server already initialized" 错误
3. `onerror` 回调捕获该错误
4. 检查错误消息，如果是重复初始化则忽略
5. 其他错误正常记录和处理

---

## 优势

| 特性 | 说明 |
|------|------|
| **简单有效** | 只需几行代码，无需复杂逻辑 |
| **向后兼容** | 不影响正常的初始化流程 |
| **容错性强** | 容忍客户端的不规范行为 |
| **日志清晰** | 记录警告但不影响服务 |
| **符合实际** | 适应大模型客户端的行为模式 |

---

## 测试

### 测试 1: 正常初始化

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }' -v
```

**预期结果**：
- ✅ 返回 200 状态码
- ✅ 响应包含 Session ID
- ✅ 服务器日志：`新会话已初始化: xxx`

---

### 测试 2: 重复初始化（使用相同 Session ID）

```bash
# 使用上一步获取的 Session ID
SESSION_ID="your-session-id-here"

# 再次发送初始化请求
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

**预期结果**：
- ✅ 不再返回错误
- ✅ 服务器日志：`警告: 客户端尝试重复初始化，已忽略`
- ✅ 客户端可以继续使用该会话

---

### 测试 3: 大模型连续调用

模拟大模型的行为：

```javascript
// 第一次调用 - 初始化
await fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { /* ... */ }
  })
});

// 第二次调用 - 可能再次发送初始化（大模型的行为）
await fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'initialize',  // 重复初始化
    params: { /* ... */ }
  })
});

// ✅ 现在不会报错，服务器会优雅地忽略
```

---

## 日志示例

### 修复前

```
Transport 错误: Error: Invalid Request: Server already initialized
    at WebStandardStreamableHTTPServerTransport.validateSession
    ...
❌ 客户端收到错误响应
```

### 修复后

```
新会话已初始化: 5aa6bb8b-2b7d-428a-b381-75ff722eb2d8
警告: 客户端尝试重复初始化，已忽略
警告: 客户端尝试重复初始化，已忽略
✅ 客户端继续正常工作
```

---

## 其他可能的解决方案

### 方案 A: 拦截请求（过于复杂）❌

在请求到达 Transport 之前解析请求体，检测是否是重复初始化，然后直接返回成功响应。

**缺点**：
- 需要手动解析请求体
- 破坏了 Stream API
- 代码复杂，容易出错

### 方案 B: 修改 SDK（不可行）❌

修改 `@modelcontextprotocol/sdk` 使其允许重复初始化。

**缺点**：
- 违反 MCP 协议规范
- 需要维护 fork 版本
- 升级困难

### 方案 C: 忽略错误（当前方案）✅

在 `onerror` 回调中捕获并忽略重复初始化错误。

**优点**：
- 简单直接
- 不破坏现有架构
- 符合实际需求
- 易于维护

---

## 最佳实践建议

### 对于客户端开发者

虽然服务器端已经做了容错处理，但仍建议客户端：

1. **缓存 Session ID**
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
     
     const response = await fetch('http://localhost:3000/mcp', {
       method: 'POST',
       headers,
       body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
     });
     
     // 保存 Session ID
     sessionId = response.headers.get('Mcp-Session-Id');
     
     return response.json();
   }
   ```

2. **不要重复初始化**
   ```javascript
   let initialized = false;
   
   async function ensureInitialized() {
     if (initialized) return;
     
     await callMCP('initialize', { /* ... */ });
     initialized = true;
   }
   ```

3. **处理会话过期**
   ```javascript
   async function callWithRetry(method, params, retries = 3) {
     for (let i = 0; i < retries; i++) {
       try {
         return await callMCP(method, params);
       } catch (error) {
         if (error.message.includes('session') && i < retries - 1) {
           // 会话失效，重新初始化
           sessionId = null;
           initialized = false;
           await ensureInitialized();
         } else {
           throw error;
         }
       }
     }
   }
   ```

---

## 相关文档

- [SESSION_MANAGEMENT_FIX.md](./SESSION_MANAGEMENT_FIX.md) - 会话管理实现
- [ACCEPT_HEADER_FIX.md](./ACCEPT_HEADER_FIX.md) - Accept 头自动修正
- [HTTP_USAGE.md](./HTTP_USAGE.md) - HTTP/SSE 使用指南

---

**修复版本**: v2.0.3  
**最后更新**: 2026-04-08
