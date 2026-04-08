# HTTP 服务器重构总结

## 问题背景

之前的实现存在以下问题：
1. 会话初始化日志显示成功，但客户端实际连接未建立
2. GET SSE 请求返回 "Server not initialized" 错误
3. 状态管理过于复杂，容易导致竞态条件

## 解决方案

### 核心改进

1. **简化的会话管理**
   - 使用 `sessions` Map 存储每个会话的 Transport 和 McpServer 实例
   - 通过 `onsessioninitialized` 回调在会话初始化时保存实例
   - 后续请求通过 Session ID 复用已存在的会话

2. **正确的连接流程**
   ```typescript
   // 1. 创建 Transport（带 onsessioninitialized 回调）
   const transport = new StreamableHTTPServerTransport({
     sessionIdGenerator: () => crypto.randomUUID(),
     onsessioninitialized: (sessionId) => {
       this.sessions.set(sessionId, { transport, mcpServer });
     }
   });

   // 2. 创建 McpServer
   const mcpServer = createMcpServer();

   // 3. 立即连接
   await mcpServer.connect(transport);

   // 4. 处理请求
   await transport.handleRequest(req, res);
   ```

3. **会话生命周期管理**
   - 新会话：POST 初始化请求时创建
   - 已有会话：通过 Session ID 查找并复用
   - 会话清理：Transport 关闭时自动从 Map 中删除
   - 服务器停止：关闭所有会话的 Transport

### 关键代码变化

#### 之前的问题实现
```typescript
// ❌ 每次请求都创建新的实例，无法复用
const transport = new StreamableHTTPServerTransport({...});
const mcpServer = createMcpServer();
await mcpServer.connect(transport);
await transport.handleRequest(req, res);
```

#### 现在的正确实现
```typescript
// ✅ 根据 Session ID 判断是否复用已有会话
if (sessionId && this.sessions.has(sessionId)) {
  // 使用已存在的会话
  const session = this.sessions.get(sessionId)!;
  transport = session.transport;
  mcpServer = session.mcpServer;
} else {
  // 创建新会话并保存
  transport = new StreamableHTTPServerTransport({
    onsessioninitialized: (newSessionId) => {
      this.sessions.set(newSessionId, { transport, mcpServer });
    }
  });
  mcpServer = createMcpServer();
  await mcpServer.connect(transport);
}
```

## 测试结果

### 1. 健康检查
```bash
$ node test-health.js
状态码: 200
响应: { status: 'ok', timestamp: '...', version: '2.0.0' }
```

### 2. MCP 协议测试
```bash
$ node test-mcp-http.js
✓ 会话 ID: ea969325-cca3-4d65-ab25-3c03e6213476
SSE 连接状态码: 200  # 之前是 400
```

### 3. 工具调用测试
```bash
$ node test-tools.js
✓ 会话初始化成功
✓ query_stores 工具调用成功（返回 56 家门店）
✓ query_services 工具调用成功（返回 10 个服务）
```

### 4. 服务器日志
```
Lann MCP Server (HTTP mode) 已启动
监听地址: http://0.0.0.0:3000/mcp
健康检查: http://0.0.0.0:3000/health
新会话已初始化: ea969325-cca3-4d65-ab25-3c03e6213476
使用已存在会话: ea969325-cca3-4d65-ab25-3c03e6213476  # GET 请求复用会话
```

## 架构优势

1. **清晰的状态管理**
   - 会话状态集中在 `sessions` Map 中
   - 每个会话完全独立，避免竞态条件

2. **可靠的连接建立**
   - POST 初始化后立即保存会话
   - GET SSE 连接能正确找到已初始化的会话

3. **完善的资源清理**
   - Transport 关闭时自动清理会话
   - 服务器停止时关闭所有会话

4. **易于维护和调试**
   - 代码逻辑简单明了
   - 详细的日志输出便于排查问题

## 兼容性

- ✅ 保持相同的 API 接口
- ✅ 支持现有的所有客户端测试脚本
- ✅ 维持 CORS、速率限制等功能
- ✅ 符合 MCP Streamable HTTP 协议规范

## 文件变更

- `src/transport/httpServer.ts`: 完全重写，采用简化的会话管理
- 新增测试文件：`test-tools.js`（用于验证工具调用功能）

## 下一步建议

1. 添加会话超时机制（可选）
2. 添加会话数量限制（防止内存泄漏）
3. 考虑添加会话持久化（如果需要跨重启恢复）
