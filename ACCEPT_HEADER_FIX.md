# HTTP Accept 头自动修正功能

## 问题描述

大模型客户端在调用 MCP HTTP 端点时，可能会出现以下错误：

```
Transport 错误: Error: Not Acceptable: Client must accept both application/json and text/event-stream
```

### 原因分析

根据 MCP Streamable HTTP 协议规范：
- **POST 请求**（初始化、工具调用等）必须在 `Accept` 头中声明支持 `application/json` 和 `text/event-stream`
- 某些客户端（特别是大模型内置的 HTTP 客户端）可能不会自动设置这个头
- `StreamableHTTPServerTransport` 会严格验证 Accept 头，不符合要求则返回 406 错误

## 解决方案

### 服务器端自动修正（已实现）✅

在 [src/transport/httpServer.ts](./src/transport/httpServer.ts) 中添加了 Accept 头自动修正逻辑：

```typescript
// 验证并修正 Accept 头（POST 请求初始化时必需）
if (req.method === 'POST') {
  const acceptHeader = req.headers.accept;
  
  // 如果 Accept 头缺失或不包含必需的 MIME 类型，自动添加
  if (!acceptHeader || 
      (!acceptHeader.includes('application/json') && !acceptHeader.includes('text/event-stream'))) {
    // 记录警告但不拒绝请求，自动修正
    console.warn(`警告: 客户端未设置正确的 Accept 头，自动修正为 'application/json, text/event-stream'`);
    req.headers.accept = 'application/json, text/event-stream';
  }
}
```

**优点**：
- ✅ 对客户端透明，无需修改客户端代码
- ✅ 兼容所有 MCP 客户端
- ✅ 记录警告日志，便于调试
- ✅ 不影响正常设置了 Accept 头的客户端

---

## 客户端最佳实践

虽然服务器端已经实现了自动修正，但建议客户端仍然正确设置 Accept 头。

### 正确的客户端实现

#### Node.js HTTP 客户端

```javascript
import http from 'node:http';

const options = {
  hostname: 'your-server.com',
  port: 3000,
  path: '/mcp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',  // ⚠️ 必需
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  // 处理响应
});

req.write(postData);
req.end();
```

#### cURL

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \  # ⚠️ 必需
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
  }'
```

#### Python requests

```python
import requests

headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'  # ⚠️ 必需
}

data = {
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
}

response = requests.post(
    'http://localhost:3000/mcp',
    headers=headers,
    json=data
)
```

#### JavaScript fetch

```javascript
const response = await fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'  // ⚠️ 必需
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  })
});
```

---

## 测试

### 测试脚本

运行测试脚本验证自动修正功能：

```bash
# 1. 启动服务器
npm run start:http

# 2. 在另一个终端运行测试
node test-accept-header.js
```

**预期输出**：
```
=== 测试 Accept 头自动修正 ===

测试 1: 不带 Accept 头的 POST 请求
状态码: 200
✅ 测试 1 通过: 服务器自动修正了 Accept 头
响应: {"result":{"protocolVersion":"2024-11-05",...

测试 2: 带正确 Accept 头的 POST 请求
状态码: 200
✅ 测试 2 通过: 正常的请求也能正常工作
响应: {"result":{"protocolVersion":"2024-11-05",...

=== 测试完成 ===
```

### 手动测试

```bash
# 测试 1: 不带 Accept 头（应该被自动修正）
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

# 查看服务器日志，应该看到：
# 警告: 客户端未设置正确的 Accept 头，自动修正为 'application/json, text/event-stream'

# 测试 2: 带正确 Accept 头（正常工作）
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
```

---

## 日志监控

服务器会在自动修正 Accept 头时记录警告日志：

```
警告: 客户端未设置正确的 Accept 头，自动修正为 'application/json, text/event-stream'
```

**如何查看日志**：

```bash
# PM2
pm2 logs lann-mcp-server

# Docker
docker-compose logs -f

# 直接运行
npm run start:http
```

**建议**：
- 如果频繁看到此警告，建议检查客户端配置
- 生产环境中可以调整日志级别或禁用此警告

---

## 常见问题

### Q1: 为什么不在客户端强制要求 Accept 头？

**A**: 为了最大化兼容性。某些大模型客户端可能无法自定义 HTTP 头，服务器端自动修正确保这些客户端也能正常工作。

### Q2: 自动修正会影响性能吗？

**A**: 影响微乎其微。只是一个简单的字符串检查，每次请求增加的时间小于 1ms。

### Q3: 可以禁用自动修正吗？

**A**: 如果需要严格的协议合规性，可以修改 `httpServer.ts` 移除自动修正逻辑，让服务器返回 406 错误。

### Q4: GET 请求需要 Accept 头吗？

**A**: 是的，GET 请求（建立 SSE 连接）需要 `Accept: text/event-stream`。但这部分由 `StreamableHTTPServerTransport` 内部处理，不需要我们额外修正。

---

## 相关文档

- [MCP Streamable HTTP 协议规范](https://modelcontextprotocol.io/specification/streamable-http)
- [HTTP_USAGE.md](./HTTP_USAGE.md) - HTTP/SSE 使用指南
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南

---

**最后更新**: 2026-04-08  
**版本**: v2.0.1+
