# MCP Server 连接问题修复

## 问题描述

创建新会话时出现错误：
```
新会话已初始化: fb15aaa8-cb9e-4b1d-b6a5-0ed03a3a4b0f
连接 MCP Server 失败: Error: Already connected to a transport. 
Call close() before connecting to a new transport, or use a separate Protocol instance per connection.
```

## 根本原因

**MCP SDK 限制**：
- `McpServer` 实例只能调用一次 `connect()` 方法
- 一旦连接到一个 Transport，就不能再连接到另一个 Transport
- 之前的实现在每个新会话的 `onsessioninitialized` 回调中都尝试调用 `mcpServer.connect(transport)`
- 第一个会话成功连接，后续会话都会报错

### 错误代码

```typescript
// ❌ 错误：每次创建新会话都尝试连接
transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
  onsessioninitialized: (newSessionId) => {
    this.sessionTransports.set(newSessionId, transport);
    
    // 这里会报错：Already connected to a transport
    this.mcpServer.connect(transport).catch(error => {
      console.error('连接 MCP Server 失败:', error);
    });
  }
});
```

---

## 解决方案

### 关键理解

**`StreamableHTTPServerTransport` 不需要手动调用 `mcpServer.connect()`**

根据 MCP SDK 的设计：
1. `StreamableHTTPServerTransport.handleRequest()` 会自动处理 HTTP 请求
2. 它会内部与 `McpServer` 通信（通过共享的状态或消息传递）
3. **不需要显式调用 `connect()`**

### 正确实现

```typescript
// ✅ 正确：不手动连接，让 Transport 自己工作
transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
  onsessioninitialized: (newSessionId) => {
    console.log(`新会话已初始化: ${newSessionId}`);
    this.sessionTransports.set(newSessionId, transport);
    this.initializedSessions.add(newSessionId);
    
    // 不需要调用 mcpServer.connect()
  }
});

// 在 handleRequest 中委托给 Transport
await transport.handleRequest(req, res);
```

---

## 工作流程

### 正确的消息流

```
客户端 → POST /mcp (initialize)
  ↓
服务器 → 创建 Transport A
  ↓
服务器 → Transport A.handleRequest(req, res)
  ↓
Transport A → 内部处理 MCP 协议
  ↓
Transport A → 调用 McpServer 的工具/资源
  ↓
McpServer → 执行工具逻辑
  ↓
McpServer → 返回结果给 Transport A
  ↓
Transport A → 返回响应给客户端
  ↓
✅ 完成，无需手动 connect()
```

---

## 架构说明

### 组件关系

```
┌─────────────────────────────────────┐
│         HTTP Server                 │
│  (Node.js http.createServer)        │
└──────────┬──────────────────────────┘
           │
           │ 接收 HTTP 请求
           ↓
┌─────────────────────────────────────┐
│   Session Router                    │
│  (httpServer.ts)                    │
│  - 检查 Session ID                  │
│  - 创建/获取 Transport              │
│  - 路由到对应的 Transport           │
└──────────┬──────────────────────────┘
           │
           │ 为每个会话
           ↓
┌─────────────────────────────────────┐
│  StreamableHTTPServerTransport      │
│  (多个实例，每个会话一个)             │
│  - 处理 HTTP 请求/响应              │
│  - 管理 SSE 连接                    │
│  - 解析 MCP 协议消息                │
└──────────┬──────────────────────────┘
           │
           │ 内部通信
           ↓
┌─────────────────────────────────────┐
│         McpServer                   │
│  (单例，注册了所有工具)              │
│  - 工具定义                         │
│  - 资源定义                         │
│  - 提示词定义                       │
└─────────────────────────────────────┘
```

### 关键点

1. **McpServer 是单例**：只有一个实例，注册了所有工具
2. **Transport 是多实例**：每个会话一个 Transport 实例
3. **无需手动连接**：Transport 通过内部机制与 McpServer 通信
4. **handleRequest 是关键**：所有消息通过这个入口点处理

---

## 测试

### 测试 1: 多会话并发

```bash
# 启动服务
npm run start:http

# 终端 1: 客户端 A 初始化
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"client-a","version":"1.0.0"}}}'

# 终端 2: 客户端 B 初始化（同时）
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"client-b","version":"1.0.0"}}}'

# 预期结果：
# ✅ 两个客户端都成功
# ✅ 服务器日志显示两个会话都已初始化
# ✅ 没有 "Already connected" 错误
```

---

### 测试 2: 调用工具

```bash
# 使用 Session ID 调用工具
SESSION_ID="your-session-id"

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "query_stores",
      "arguments": {
        "city": "上海"
      }
    }
  }'

# 预期结果：
# ✅ 返回门店列表
# ✅ 没有连接错误
```

---

## 日志示例

### 修复前 ❌

```
新会话已初始化: abc-123
连接 MCP Server 失败: Error: Already connected to a transport
❌ 第二个及以后的会话无法工作
```

### 修复后 ✅

```
Lann MCP Server (HTTP mode) 已启动
监听地址: http://0.0.0.0:3000/mcp

新会话已初始化: abc-123
新会话已初始化: def-456
新会话已初始化: ghi-789
✅ 所有会话都正常工作
```

---

## 相关 API

### StreamableHTTPServerTransport

```typescript
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
  onsessioninitialized?: (sessionId: string) => void,
  onclose?: () => void,
  onerror?: (error: Error) => void,
  onmessage?: (message: JSONRPCMessage) => void
});

// 处理 HTTP 请求
await transport.handleRequest(req, res);

// 关闭 Transport
await transport.close();
```

### McpServer

```typescript
const server = new McpServer(
  { name: 'my-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// 注册工具
server.registerTool('my_tool', { /* ... */ }, handler);

// stdio 模式需要 connect
await server.connect(stdioTransport);

// HTTP 模式不需要 connect！
// Transport 会通过 handleRequest 自动工作
```

---

## 常见误区

### 误区 1: 认为每个 Transport 都需要 connect

```typescript
// ❌ 错误
for (each session) {
  const transport = new StreamableHTTPServerTransport();
  await mcpServer.connect(transport);  // 第二次会报错
}

// ✅ 正确
for (each session) {
  const transport = new StreamableHTTPServerTransport();
  // 不需要 connect，直接使用
  await transport.handleRequest(req, res);
}
```

---

### 误区 2: 混淆 stdio 和 HTTP 模式

```typescript
// stdio 模式：需要 connect
const stdioTransport = new StdioServerTransport();
await mcpServer.connect(stdioTransport);  // ✅ 必需

// HTTP 模式：不需要 connect
const httpTransport = new StreamableHTTPServerTransport();
// await mcpServer.connect(httpTransport);  // ❌ 不需要
await httpTransport.handleRequest(req, res);  // ✅ 直接处理
```

---

### 误区 3: 试图复用 Transport

```typescript
// ❌ 错误：所有会话共享一个 Transport
const sharedTransport = new StreamableHTTPServerTransport();
await mcpServer.connect(sharedTransport);

async function handleRequest(req, res) {
  await sharedTransport.handleRequest(req, res);  // 会混乱
}

// ✅ 正确：每个会话独立的 Transport
const sessionTransports = new Map();

async function handleRequest(req, res) {
  const sessionId = getSessionId(req);
  let transport = sessionTransports.get(sessionId);
  
  if (!transport) {
    transport = new StreamableHTTPServerTransport();
    sessionTransports.set(sessionId, transport);
  }
  
  await transport.handleRequest(req, res);
}
```

---

## 最佳实践

### 1. HTTP 模式下不要调用 connect

```typescript
// ✅ 推荐
class McpHttpServer {
  async start() {
    // 只启动 HTTP 服务器
    this.server.listen(port, host);
    // 不调用 mcpServer.connect()
  }
}
```

### 2. 为每个会话创建独立的 Transport

```typescript
// ✅ 推荐
if (!this.sessionTransports.has(sessionId)) {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID()
  });
  this.sessionTransports.set(sessionId, transport);
}
```

### 3. 正确清理资源

```typescript
// ✅ 推荐
transport.onclose = () => {
  this.sessionTransports.delete(sessionId);
  this.initializedSessions.delete(sessionId);
};

async stop() {
  for (const transport of this.sessionTransports.values()) {
    await transport.close();
  }
  this.sessionTransports.clear();
}
```

---

## 总结

| 项目 | stdio 模式 | HTTP 模式 |
|------|-----------|----------|
| **Transport 数量** | 1 个 | 多个（每会话一个） |
| **需要 connect** | ✅ 是 | ❌ 否 |
| **消息入口** | connect 后自动 | handleRequest |
| **生命周期** | 进程级别 | 会话级别 |

**核心要点**：
- ✅ HTTP 模式下，`StreamableHTTPServerTransport` 通过 `handleRequest` 工作
- ✅ 不需要调用 `mcpServer.connect()`
- ✅ 每个会话有独立的 Transport 实例
- ✅ Transport 内部会自动与 McpServer 通信

---

**修复版本**: v2.0.6  
**最后更新**: 2026-04-08
