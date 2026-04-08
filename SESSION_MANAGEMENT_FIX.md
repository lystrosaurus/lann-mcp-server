# HTTP 会话管理修复

## 问题描述

大模型客户端调用时出现错误：
```
Transport 错误: Error: Invalid Request: Server already initialized
```

## 根本原因

之前的实现使用**单个全局的 `StreamableHTTPServerTransport` 实例**处理所有请求。这违反了 MCP Streamable HTTP 协议规范：

1. **每个会话应该有独立的 Transport 实例**
2. **初始化请求只能发送一次**，重复初始化会导致 "Server already initialized" 错误
3. 当多个客户端或同一客户端多次连接时，共享的 Transport 会冲突

## 解决方案

### 修改前（❌ 错误）

```typescript
// 单个全局 Transport
private transport: StreamableHTTPServerTransport;

constructor() {
  this.transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });
}

async handleRequest(req, res) {
  // 所有请求都使用同一个 Transport
  await this.transport.handleRequest(req, res);
}
```

**问题**：
- ❌ 所有会话共享一个 Transport
- ❌ 重复初始化导致错误
- ❌ 无法正确管理多个并发会话

---

### 修改后（✅ 正确）

```typescript
// 会话管理：sessionId -> Transport 实例
private sessionTransports: Map<string, StreamableHTTPServerTransport> = new Map();

async handleRequest(req, res) {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && this.sessionTransports.has(sessionId)) {
    // 使用已存在的会话 Transport
    transport = this.sessionTransports.get(sessionId)!;
  } else {
    // 创建新的 Transport 实例
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (newSessionId) => {
        console.log(`新会话已初始化: ${newSessionId}`);
        this.sessionTransports.set(newSessionId, transport);
        
        // 连接 MCP Server 到这个 Transport
        this.mcpServer.connect(transport).catch(error => {
          console.error('连接 MCP Server 失败:', error);
        });
      }
    });

    // 设置回调
    transport.onmessage = () => {};
    transport.onerror = (error) => {
      console.error(`Transport 错误 (会话: ${sessionId || 'new'}):`, error);
    };
    transport.onclose = () => {
      console.log(`Transport 连接关闭 (会话: ${sessionId || 'unknown'})`);
      // 清理已关闭的会话
      if (sessionId) {
        this.sessionTransports.delete(sessionId);
      }
    };
  }

  // 委托给对应的 Transport 处理
  await transport.handleRequest(req, res);
}
```

**优点**：
- ✅ 每个会话有独立的 Transport 实例
- ✅ 支持多个并发客户端
- ✅ 正确的会话生命周期管理
- ✅ 自动清理已关闭的会话
- ✅ 符合 MCP 协议规范

---

## 工作流程

### 1. 首次请求（初始化）

```
客户端 → POST /mcp (无 Mcp-Session-Id)
  ↓
服务器 → 创建新的 Transport
  ↓
服务器 → 生成 Session ID (例如: abc-123)
  ↓
服务器 → 返回响应头: Mcp-Session-Id: abc-123
  ↓
服务器 → 保存 Transport 到 sessionTransports Map
```

### 2. 后续请求（使用会话）

```
客户端 → POST /mcp (Mcp-Session-Id: abc-123)
  ↓
服务器 → 从 Map 中查找 sessionId = abc-123
  ↓
服务器 → 找到对应的 Transport
  ↓
服务器 → 使用该 Transport 处理请求
```

### 3. SSE 连接

```
客户端 → GET /mcp (Mcp-Session-Id: abc-123, Accept: text/event-stream)
  ↓
服务器 → 从 Map 中查找 sessionId = abc-123
  ↓
服务器 → 使用该 Transport 建立 SSE 连接
  ↓
服务器 → 通过 SSE 推送事件
```

### 4. 会话关闭

```
客户端 → 断开连接
  ↓
Transport → 触发 onclose 回调
  ↓
服务器 → 从 Map 中删除该 sessionId
  ↓
服务器 → 释放资源
```

---

## 测试

### 测试 1: 单次初始化

```bash
# 启动服务器
npm run start:http

# 第一次初始化（应该成功）
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

# 查看响应头中的 Mcp-Session-Id
# 例如: mcp-session-id: abc-123-def-456
```

**预期结果**：
- ✅ 返回 200 状态码
- ✅ 响应头包含 `Mcp-Session-Id`
- ✅ 服务器日志显示：`新会话已初始化: abc-123-def-456`

---

### 测试 2: 使用会话 ID 进行后续请求

```bash
# 使用上一步获取的 Session ID
SESSION_ID="abc-123-def-456"

# 调用工具
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "queryStores",
      "arguments": {
        "keyword": "上海"
      }
    }
  }'
```

**预期结果**：
- ✅ 返回 200 状态码
- ✅ 返回门店列表
- ✅ 没有 "Server already initialized" 错误

---

### 测试 3: 多客户端并发

打开两个终端：

**终端 1**：
```bash
# 客户端 A 初始化
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"client-a","version":"1.0.0"}}}'
```

**终端 2**：
```bash
# 客户端 B 初始化（同时）
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"client-b","version":"1.0.0"}}}'
```

**预期结果**：
- ✅ 两个客户端都成功初始化
- ✅ 获得不同的 Session ID
- ✅ 服务器日志显示两个会话都已初始化
- ✅ 没有冲突或错误

---

## 日志示例

### 正常流程

```
Lann MCP Server (HTTP mode) 已启动
监听地址: http://0.0.0.0:3000/mcp
健康检查: http://0.0.0.0:3000/health

新会话已初始化: 5aa6bb8b-2b7d-428a-b381-75ff722eb2d8
Transport 连接关闭 (会话: 5aa6bb8b-2b7d-428a-b381-75ff722eb2d8)
已关闭会话: 5aa6bb8b-2b7d-428a-b381-75ff722eb2d8
```

### 错误情况（修复前）

```
Transport 错误: Error: Invalid Request: Server already initialized
    at WebStandardStreamableHTTPServerTransport.validateSession
    ...
```

### 错误情况（修复后）

```
✅ 不再出现此错误
```

---

## 性能考虑

### 内存使用

每个会话占用约 10-50 KB 内存（取决于连接状态）。

**建议配置**：
- 最大并发会话数：100-1000（根据服务器内存）
- 会话超时时间：由客户端控制
- 定期清理：Transport 关闭时自动清理

### 监控

```bash
# 查看活跃会话数
# 在代码中添加监控端点
GET /stats

# 返回
{
  "activeSessions": 5,
  "totalRequests": 1234,
  "uptime": 3600
}
```

---

## 常见问题

### Q1: 为什么需要为每个会话创建独立的 Transport？

**A**: MCP Streamable HTTP 协议规定：
- 每个会话是独立的状态机
- 初始化只能进行一次
- 不同会话之间不能共享状态

### Q2: 会话何时会被清理？

**A**: 
- Transport 触发 `onclose` 回调时自动清理
- 客户端断开连接时
- 服务器重启时清空所有会话

### Q3: 如果客户端不发送 Mcp-Session-Id 怎么办？

**A**: 
- 每次都会创建新的 Transport
- 生成新的 Session ID
- 这是正常的初始化流程

### Q4: 可以限制最大会话数吗？

**A**: 可以，添加会话数检查：

```typescript
if (this.sessionTransports.size >= MAX_SESSIONS) {
  res.writeHead(503, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Too many active sessions' }));
  return;
}
```

---

## 相关文档

- [MCP Streamable HTTP 协议规范](https://modelcontextprotocol.io/specification/streamable-http)
- [ACCEPT_HEADER_FIX.md](./ACCEPT_HEADER_FIX.md) - Accept 头自动修正
- [HTTP_USAGE.md](./HTTP_USAGE.md) - HTTP/SSE 使用指南

---

**修复版本**: v2.0.2  
**最后更新**: 2026-04-08
