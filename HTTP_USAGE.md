# HTTP/SSE 模式使用指南

> 本文档详细说明如何通过 HTTP/SSE 协议连接 Lann MCP Server，包括生产环境和开发环境的使用示例。

## 🌐 连接配置

### 生产环境（推荐）

- **Base URL**: `https://open.lannlife.com/mcp`
- **传输协议**: Streamable HTTP (支持 SSE)
- **健康检查**: `https://open.lannlife.com/health`
- **CORS**: 已配置，支持跨域请求
- **速率限制**: 100 请求/分钟/IP
- **SSL/TLS**: 已启用 HTTPS

### 开发环境（本地部署）

- **Base URL**: `http://localhost:3000/mcp`
- **传输协议**: Streamable HTTP (支持 SSE)
- **健康检查**: `http://localhost:3000/health`

**注意**: 以下示例默认使用生产环境 URL，如需使用本地环境，请将所有 `https://open.lannlife.com/mcp` 替换为 `http://localhost:3000/mcp`。

---

## 🚀 快速开始

### 步骤 1: 启动 MCP 服务器（HTTP 模式）

```bash
npm run start:http
```

服务器将在 `http://0.0.0.0:3000/mcp` 上监听。

### 步骤 2: 使用 MCP Inspector 测试

#### 方法 A: Web UI 模式（推荐）

1. **打开新的终端窗口**，运行：
   ```bash
   npm run inspector
   ```

2. **浏览器会自动打开** MCP Inspector 界面（通常是 `http://localhost:6274`）

3. **在 Web UI 中配置连接**：
   - **Transport Type**: 选择 `HTTP`
   - **Server URL**: 输入 `http://localhost:3000/mcp`
   - 点击 **Connect** 按钮

4. **开始测试**：
   - 查看可用的 Tools、Resources、Prompts
   - 填写参数并调用工具
   - 查看请求和响应的详细信息

#### 方法 B: CLI 模式（适合自动化）

```bash
npx @modelcontextprotocol/inspector --cli --transport http --server-url http://localhost:3000/mcp
```

然后可以执行各种命令，例如：
```bash
# 列出所有工具
--method tools/list

# 调用特定工具（注意：工具名使用下划线命名）
--method tools/call --tool-name query_stores --tool-arg city=北京
```

## 常见问题排查

### 问题 1: Inspector 无法连接

**症状**: 点击 Connect 后显示连接失败

**解决方案**:
1. 确认服务器已启动：运行 `npm run start:http`
2. 检查端口是否被占用：`netstat -ano | findstr :3000`
3. 确认 URL 正确：应该是 `http://localhost:3000/mcp`（注意 `/mcp` 路径）
4. 检查防火墙设置
5. **如果使用生产环境**，确认 URL 为 `https://open.lannlife.com/mcp`

### 问题 2: "Not Acceptable" 错误 (406)

**症状**: 收到 HTTP 406 错误，提示 `Client must accept text/event-stream`

**原因**: 客户端未正确设置 HTTP Accept 头

**解决方案**: 
- 确保设置正确的 headers：
  ```javascript
  headers: {
    'Accept': 'application/json, text/event-stream',  // 必须同时包含两者
    'Content-Type': 'application/json'
  }
  ```
- **注意**: `Accept` 头必须同时包含 `application/json` 和 `text/event-stream`，用逗号分隔

### 问题 3: CORS 错误

**症状**: 浏览器控制台显示 CORS 相关错误

**解决方案**:
1. **生产环境**: CORS 已正确配置，如果遇到此错误请检查域名是否在白名单中
2. **开发环境**: 检查环境变量 `CORS_ORIGINS` 配置
3. 开发环境可以设置为 `*`，生产环境应指定具体域名
4. 确认 Nginx 等反向代理正确传递 CORS 头
5. 检查请求的 `Origin` 头是否与服务器配置匹配

### 问题 4: SSE 连接断开

**症状**: 连接建立后很快断开

**解决方案**:
1. **生产环境**: 检查网络连接稳定性，生产环境已优化超时设置
2. **开发环境**: 检查 Nginx 的 `proxy_read_timeout` 和 `proxy_send_timeout`（如果使用）
3. 确认服务器资源充足
4. 检查网络稳定性
5. 实现客户端重连逻辑，自动重新建立 SSE 连接

### 问题 5: 会话过期 (Session Expired)

**症状**: 收到 400 错误，消息为 "Session expired. Please re-initialize."

**原因**: 会话已超时或服务器重启导致会话丢失

**解决方案**:
1. 捕获 400 错误
2. 清除旧的 Session ID
3. 重新发送 initialize 请求
4. 使用新的 Session ID 重试请求
5. 参考上方"Session ID 管理机制"中的重连策略代码示例

### 问题 6: 速率限制 (429 Too Many Requests)

**症状**: 收到 HTTP 429 错误

**原因**: 超过速率限制（生产环境：100 请求/分钟/IP）

**解决方案**:
1. 降低请求频率
2. 实现请求队列和节流机制
3. 对于批量操作，考虑分批执行
4. 检查是否有异常的重复请求
5. 如需更高限额，请联系服务提供方

## 📋 完整工作流程示例

## 🔑 Session ID 管理机制

MCP Streamable HTTP 协议使用会话机制来维护客户端和服务端的状态。正确管理 Session ID 至关重要。

### Session ID 生命周期

1. **创建会话**: 首次 POST 请求初始化时，服务器在响应头中返回 `Mcp-Session-Id`
2. **使用会话**: 后续所有请求必须在 header 中包含 `Mcp-Session-Id`
3. **会话过期**: 会话可能因超时或服务重启而失效
4. **重新初始化**: 收到 400 错误（Session expired）时需重新初始化

### 如何获取 Session ID

```javascript
const response = await fetch('https://open.lannlife.com/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'my-client', version: '1.0.0' }
    }
  })
});

// 从响应头提取 Session ID
const sessionId = response.headers.get('Mcp-Session-Id');
console.log('Session ID:', sessionId);
```

### 如何在请求中使用 Session ID

```javascript
// 所有后续请求都必须包含 Session ID
const toolResponse = await fetch('https://open.lannlife.com/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'Mcp-Session-Id': sessionId  // ← 关键：包含 Session ID
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'query_stores',
      arguments: { city: '上海' }
    }
  })
});
```

### 处理会话过期

当会话过期时，服务器会返回 400 错误：

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Session expired. Please re-initialize."
  },
  "id": null
}
```

**重连策略：**
1. 捕获 400 错误
2. 清除旧的 Session ID
3. 重新发送 initialize 请求获取新的 Session ID
4. 使用新的 Session ID 重试失败的请求

```javascript
async function callWithRetry(method, params, maxRetries = 2) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch('https://open.lannlife.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        ...(sessionId && { 'Mcp-Session-Id': sessionId })
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      })
    });

    if (response.status === 400) {
      // 会话过期，重新初始化
      console.log('会话过期，重新初始化...');
      sessionId = await initializeSession();
      continue;
    }

    return response.json();
  }
  throw new Error('请求失败，已达最大重试次数');
}
```

---

## 📡 使用 cURL 测试

### 1. 初始化会话（POST）

**生产环境示例：**

```bash
curl -X POST https://open.lannlife.com/mcp \
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
        "name": "curl-test",
        "version": "1.0.0"
      }
    }
  }' -v
```

**响应示例：**
```
< HTTP/2 200
< mcp-session-id: abc123-def456-ghi789
< content-type: text/event-stream

data: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"lann-mcp-server","version":"2.0.0"}}}
```

**重要**: 从响应头中提取 `mcp-session-id` 的值，用于后续请求。

**开发环境示例（本地）：**

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
        "name": "curl-test",
        "version": "1.0.0"
      }
    }
  }' -v
```

### 2. 建立 SSE 连接（GET）

SSE (Server-Sent Events) 连接用于接收服务器的异步通知和流式响应。

**生产环境示例：**

```bash
curl -N https://open.lannlife.com/mcp \
  -H "Accept: text/event-stream" \
  -H "Cache-Control: no-cache" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID_HERE"
```

**开发环境示例（本地）：**

```bash
curl -N http://localhost:3000/mcp \
  -H "Accept: text/event-stream" \
  -H "Cache-Control: no-cache" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID_HERE"
```

**注意**: `-N` 参数禁用缓冲，使您可以实时看到 SSE 事件。此命令会保持连接打开，直到手动中断（Ctrl+C）。

### 3. 调用工具（POST）

#### 示例 A: 查询门店

**生产环境：**

```bash
curl -X POST https://open.lannlife.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID_HERE" \
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
```

**开发环境（本地）：**

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID_HERE" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "query_stores",
      "arguments": {
        "keyword": "北京"
      }
    }
  }'
```

#### 示例 B: 查询服务

```bash
curl -X POST https://open.lannlife.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID_HERE" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "query_services",
      "arguments": {
        "keyword": "精油",
        "duration": 90
      }
    }
  }'
```

#### 示例 C: 创建预约

```bash
curl -X POST https://open.lannlife.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID_HERE" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "create_booking",
      "arguments": {
        "mobile": "13800138000",
        "storeName": "淮海店",
        "serviceName": "传统古法全身按摩 -90 分钟",
        "count": 2,
        "bookTime": "2024-01-15T14:00:00"
      }
    }
  }'
```

## 📋 完整工作流程示例

以下是一个完整的 JavaScript 示例，展示如何与生产环境交互：

```javascript
class LannMCPClient {
  constructor(baseUrl = 'https://open.lannlife.com/mcp') {
    this.baseUrl = baseUrl;
    this.sessionId = null;
  }

  // 初始化会话
  async initialize() {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'my-agent', version: '1.0.0' }
        }
      })
    });

    this.sessionId = response.headers.get('Mcp-Session-Id');
    console.log('会话已初始化，Session ID:', this.sessionId);
    return this.sessionId;
  }

  // 通用请求方法（带自动重试）
  async request(method, params, retries = 2) {
    for (let attempt = 0; attempt < retries; attempt++) {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          ...(this.sessionId && { 'Mcp-Session-Id': this.sessionId })
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params
        })
      });

      // 处理会话过期
      if (response.status === 400) {
        console.log('会话过期，重新初始化...');
        await this.initialize();
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    }
    throw new Error('请求失败，已达最大重试次数');
  }

  // 查询门店
  async queryStores(params = {}) {
    return this.request('tools/call', {
      name: 'query_stores',
      arguments: params
    });
  }

  // 查询服务
  async queryServices(params = {}) {
    return this.request('tools/call', {
      name: 'query_services',
      arguments: params
    });
  }

  // 创建预约
  async createBooking(params) {
    return this.request('tools/call', {
      name: 'create_booking',
      arguments: params
    });
  }
}

// 使用示例
async function main() {
  const client = new LannMCPClient();
  
  // 1. 初始化
  await client.initialize();
  
  // 2. 查询上海的门店
  const stores = await client.queryStores({ city: '上海' });
  console.log('门店列表:', stores);
  
  // 3. 查询 90 分钟精油服务
  const services = await client.queryServices({ 
    keyword: '精油', 
    duration: 90 
  });
  console.log('服务列表:', services);
  
  // 4. 创建预约
  const booking = await client.createBooking({
    mobile: '13800138000',
    storeName: '淮海店',
    serviceName: '泰式精油全身护理 -90 分钟',
    count: 2,
    bookTime: '2024-01-15T14:00:00'
  });
  console.log('预约结果:', booking);
}

main().catch(console.error);
```

---

## 🏭 生产环境部署

### 环境变量配置

创建 `.env` 文件：

```env
TRANSPORT=http
HTTP_HOST=0.0.0.0
HTTP_PORT=3000
MCP_BASE_PATH=/mcp
CORS_ORIGINS=https://your-domain.com
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

### 使用 PM2 管理进程

```bash
npm install -g pm2
pm2 start dist/index.js --name lann-mcp-server -- TRANSPORT=http
pm2 save
pm2 startup
```

### Nginx 反向代理配置

参考 [DEPLOYMENT.md](./DEPLOYMENT.md) 中的 Nginx 配置示例。

## 📖 MCP Streamable HTTP 协议说明

### 协议概述

MCP Streamable HTTP 是 Model Context Protocol 的 HTTP 传输层实现，结合了 RESTful API 和 Server-Sent Events (SSE) 的优势。

### 工作流程

```
客户端                          服务器
  |                               |
  |--- POST /mcp (initialize) --->|
  |                               |
  |<-- 200 OK + Mcp-Session-Id --|
  |<-- SSE stream (events) ------|
  |                               |
  |--- POST /mcp (tool call) ---->|
  |    + Mcp-Session-Id           |
  |                               |
  |<-- SSE events (response) -----|
  |                               |
  |--- GET /mcp (SSE listen) ---->|
  |    + Mcp-Session-Id           |
  |                               |
  |<-- Continuous SSE stream -----|
```

### 请求类型

#### 1. POST 请求 - 发送指令

用于向服务器发送请求，如：
- `initialize`: 初始化会话
- `tools/list`: 列出可用工具
- `tools/call`: 调用工具
- `resources/list`: 列出资源
- `prompts/list`: 列出提示词

**必需 Headers:**
- `Content-Type: application/json`
- `Accept: application/json, text/event-stream`
- `Mcp-Session-Id: <session_id>` (除初始化外的所有请求)

#### 2. GET 请求 - 接收事件

用于建立 SSE 连接，接收服务器的异步通知和流式响应。

**必需 Headers:**
- `Accept: text/event-stream`
- `Cache-Control: no-cache`
- `Mcp-Session-Id: <session_id>`

### SSE 事件格式

服务器通过 SSE 发送的事件格式：

```
data: {"jsonrpc":"2.0","id":1,"result":{...}}

data: {"jsonrpc":"2.0","method":"notifications/message","params":{...}}
```

每个事件以 `data: ` 开头，后跟 JSON-RPC 消息。

### 错误处理

#### HTTP 状态码

- `200`: 请求成功
- `400`: 请求错误（如会话过期）
- `404`: 路径不存在
- `406`: Accept 头不正确
- `429`: 速率限制触发
- `500`: 服务器内部错误

#### JSON-RPC 错误格式

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": "详细错误信息"
  },
  "id": null
}
```

常见错误码：
- `-32700`: Parse error - JSON 解析失败
- `-32600`: Invalid Request - 无效的请求
- `-32601`: Method not found - 方法不存在
- `-32602`: Invalid params - 参数错误
- `-32603`: Internal error - 内部错误

### 最佳实践

1. **始终检查 Accept 头**: 确保包含 `application/json` 和 `text/event-stream`
2. **妥善管理 Session ID**: 存储在内存或持久化存储中
3. **实现重连逻辑**: 处理会话过期和网络中断
4. **监听 SSE 连接**: 保持 GET 请求的 SSE 连接打开以接收异步通知
5. **遵守速率限制**: 控制请求频率避免被限流
6. **错误重试**: 对临时性错误实现指数退避重试

---

## ❓ 常见问题排查

## 更多资源

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [MCP Inspector GitHub](https://github.com/modelcontextprotocol/inspector)
- [项目部署指南](./DEPLOYMENT.md)
- [完整使用指南](./GUIDE.md)
