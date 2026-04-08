# Lann MCP Server

> 蘭泰式按摩预约服务的 Model Context Protocol (MCP) 服务器，为 AI 助手提供门店查询、服务查询和在线预约能力。

[![npm version](https://img.shields.io/npm/v/lann-mcp-server.svg)](https://www.npmjs.com/package/lann-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/lann-mcp-server.svg)](https://nodejs.org/)

## ✨ 功能特性

- 🔍 **智能门店搜索** - 按城市、关键词模糊搜索全国门店
- 📋 **服务项目查询** - 支持按类型、时长筛选按摩服务
- 📅 **一键预约** - 完整的预约流程，自动发送确认短信
- 🎯 **智能匹配** - 容错输入，自动纠正拼写错误
- ✅ **参数验证** - 详细的错误提示和输入建议
- 🌐 **双传输模式** - 支持 stdio（本地）和 HTTP/SSE（远程）

## 🚀 快速开始

### 方式一：Claude Desktop 集成（推荐）

在 Claude Desktop 配置文件中添加：

```json
{
  "mcpServers": {
    "lann": {
      "command": "npx",
      "args": ["lann-mcp-server"]
    }
  }
}
```

重启 Claude Desktop 后即可使用。

### 方式二：命令行测试

```bash
# 安装并启动
npx lann-mcp-server

# 或使用 MCP Inspector 可视化调试
npx -y @modelcontextprotocol/inspector npx lann-mcp-server
```

### 方式三：作为依赖包使用

```bash
npm install lann-mcp-server
```

```javascript
import { createMcpServer } from 'lann-mcp-server';

const server = createMcpServer();
// ... 自定义集成逻辑
```

### 方式四：连接生产环境 HTTP 服务（推荐 AI Agent）

如果您想直接连接到已部署的生产环境服务，无需本地运行服务器：

**生产环境连接配置：**
- **Base URL**: `https://open.lannlife.com/mcp`
- **传输协议**: Streamable HTTP (支持 SSE)
- **必需 Header**: 
  - `Accept: application/json, text/event-stream`
  - `Content-Type: application/json` (POST 请求时)
- **会话管理**: 通过 `Mcp-Session-Id` header 维护会话状态

**适用场景：**
- AI Agent 直接调用（Claude、Cursor 等）
- 远程应用集成
- 多用户共享服务

**快速连接示例：**

```javascript
// 初始化会话
const initResponse = await fetch('https://open.lannlife.com/mcp', {
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
      clientInfo: {
        name: 'my-agent',
        version: '1.0.0'
      }
    }
  })
});

// 从响应头获取 Session ID
const sessionId = initResponse.headers.get('Mcp-Session-Id');

// 使用 Session ID 调用工具
const toolResponse = await fetch('https://open.lannlife.com/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'Mcp-Session-Id': sessionId
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'query_stores',
      arguments: {
        city: '上海'
      }
    }
  })
});
```

更多详细的 HTTP/SSE 协议说明请参考 [HTTP_USAGE.md](./HTTP_USAGE.md)。

## 📖 使用场景

### 本地集成（stdio 模式）

**适用场景：**
- Claude Desktop、Cursor 等桌面 AI 应用
- 本地脚本和自动化工具
- 开发调试

**配置示例：**

Claude Desktop 配置文件位置：
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "lann": {
      "command": "npx",
      "args": ["lann-mcp-server"]
    }
  }
}
```

---

### 远程部署（HTTP/SSE 模式）

**适用场景：**
- 多用户共享服务
- 云端部署
- 企业级应用集成
- **AI Agent 直接连接（推荐）**

#### 选项 A：使用生产环境（推荐）

我们已提供稳定的生产环境服务，您可以直接连接：

**生产环境配置：**
- **Base URL**: `https://open.lannlife.com/mcp`
- **传输协议**: Streamable HTTP
- **健康检查**: `https://open.lannlife.com/health`
- **CORS**: 已配置，支持跨域请求
- **速率限制**: 100 请求/分钟/IP

**优势：**
- ✅ 无需自行部署和维护
- ✅ 高可用性和稳定性保障
- ✅ 自动 SSL/TLS 加密
- ✅ 专业的监控和告警

**快速开始：** 参考上方"方式四"的连接示例

#### 选项 B：自托管部署

如果您需要自托管服务：

**快速启动：**

```bash
# 启动 HTTP 服务器
npx lann-mcp-server --transport http

# 或使用环境变量
TRANSPORT=http npx lann-mcp-server
```

服务器将在 `http://localhost:3000/mcp` 上监听。

**本地开发连接信息：**
- **Base URL**: `http://HOST:PORT/mcp`
- **默认地址**: `http://localhost:3000/mcp`
- **健康检查**: `http://localhost:3000/health`

**注意：** 本地部署仅适用于开发和测试环境。生产环境请使用上方的生产服务或参考 [DEPLOYMENT.md](./DEPLOYMENT.md) 进行专业部署。

## 🛠️ 核心工具能力

本 MCP Server 提供三个核心工具，帮助 AI Agent 完成蘭泰式按摩的查询和预约流程：

### 1. `query_stores` - 智能门店查询

**能力描述：** 查询蘭泰式按摩全国门店信息，支持多维度搜索和智能匹配。

**适用场景：**
- 用户询问"附近有哪些门店"
- 用户指定城市或区域查找门店
- 用户通过关键词（如地标、地铁线）搜索门店

**参数：**
- `city` (string, 可选): 城市名称，如"上海"、"杭州"、"成都"等
- `keyword` (string, 可选): 关键词，如"淮海"、"新天地"、"地铁"等

**返回信息：**
- 门店名称、详细地址、联系电话、交通指引

**Agent 调用示例：**
```json
{
  "method": "tools/call",
  "params": {
    "name": "query_stores",
    "arguments": {
      "city": "上海",
      "keyword": "淮海"
    }
  }
}
```

**成功响应：**
```json
{
  "success": true,
  "stores": [
    {
      "name": "淮海店",
      "address": "上海市黄浦区进贤路 216 号（近陕西南路）",
      "telephone": "021-62670235",
      "traffic": "地铁 1 号线陕西南路 1 号口出"
    }
  ],
  "message": "共找到 1 家门店"
}
```

---

### 2. `query_services` - 服务项目查询

**能力描述：** 查询蘭泰式按摩服务项目库，支持按类型、时长等多维度筛选。

**适用场景：**
- 用户询问"有哪些按摩服务"
- 用户指定时长（如 90 分钟）查找服务
- 用户通过关键词（如"精油"、"古法"）搜索特定服务

**参数：**
- `keyword` (string, 可选): 关键词，如"精油"、"古法"、"拉伸"、"面部"等
- `duration` (number, 可选): 服务时长（分钟），如 60、90、120 等

**返回信息：**
- 服务名称、详细描述、服务时长

**Agent 调用示例：**
```json
{
  "method": "tools/call",
  "params": {
    "name": "query_services",
    "arguments": {
      "keyword": "精油",
      "duration": 90
    }
  }
}
```

**成功响应：**
```json
{
  "success": true,
  "services": [
    {
      "name": "泰式精油全身护理 -90 分钟",
      "description": "天然植物精油与泰式按摩手法强强结合...",
      "duration": 90
    }
  ],
  "message": "共找到 1 个服务项目"
}
```

---

### 3. `create_booking` - 在线预约创建

**能力描述：** 创建蘭泰式按摩预约，连接到真实后端 API，自动发送确认短信。

**适用场景：**
- 用户明确表达预约意向并提供必要信息
- 完成门店和服务选择后创建预约
- 需要验证用户手机号和预约时间

**参数：**
- `mobile` (string, 必填): 手机号码（11 位中国大陆手机号）
- `storeName` (string, 必填): 门店名称（建议使用 query_stores 获取准确名称）
- `serviceName` (string, 必填): 服务项目名称（建议使用 query_services 获取准确名称）
- `count` (number, 必填): 预约人数（1-8 人）
- `bookTime` (string, 必填): 预约时间（ISO 8601 格式，如 `2024-01-15T14:00:00`）

**重要提示：**
- ⚠️ 只能预约未来 30 天内的服务
- ⚠️ 门店和服务名称必须准确，建议使用前两个工具查询后使用
- ⚠️ 预约成功后会自动发送确认短信到用户手机

**Agent 调用示例：**
```json
{
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
}
```

**成功响应：**
```json
{
  "success": true,
  "bookingId": "BK1704012345678A1B2",
  "message": "预约成功！已为您发送确认短信。",
  "storeInfo": {
    "name": "淮海店",
    "address": "上海市黄浦区进贤路 216 号（近陕西南路）",
    "telephone": "021-62670235"
  },
  "serviceInfo": {
    "name": "传统古法全身按摩 -90 分钟"
  }
}
```

---

## 💡 AI Agent 最佳实践

### 典型工作流程

1. **理解用户需求** → 识别用户是想查询门店、服务还是直接预约
2. **信息查询阶段** → 使用 `query_stores` 和 `query_services` 获取准确信息
3. **确认关键信息** → 向用户确认门店、服务、时间、人数等
4. **创建预约** → 使用 `create_booking` 提交预约
5. **反馈结果** → 告知用户预约成功与否及详细信息

### 智能匹配特性

本服务实现了智能匹配算法，支持：
- **精确匹配** - 完全相等的匹配（高置信度）
- **包含匹配** - 输入是门店/服务名称的子串（高置信度）
- **相似度匹配** - 基于编辑距离的模糊匹配（中/低置信度）

**示例：**
- 输入 `"淮海"` → 匹配到 `"淮海店"`
- 输入 `"精油 90"` → 匹配到 `"泰式精油全身护理 -90 分钟"`
- 输入 `"古法按摩"` → 可能匹配到多个相关服务并提供建议

### 错误处理建议

- 如果工具返回 `success: false`，仔细阅读 `message` 字段了解错误原因
- 对于参数验证错误，根据提示信息修正参数后重试
- 对于匹配失败，可以使用更准确的名称或先查询获取可用选项列表

## 🎯 智能匹配说明

本服务实现了智能匹配算法，已在上面的工具介绍中详细说明。Agent 可以利用这一特性提供更友好的用户体验，即使用户输入不够精确也能正确理解意图。

## 📚 更多文档

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 生产环境部署指南（Nginx、SSL、PM2）
- **[HTTP_USAGE.md](./HTTP_USAGE.md)** - HTTP/SSE 协议详细说明和 cURL 示例
- **[GUIDE.md](./GUIDE.md)** - 完整使用指南和开发文档

## 💻 开发

### 本地开发

```bash
# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 监听模式
npm run dev

# 运行服务
npm start
```

### 项目结构

```
lann-mcp-server/
├── src/
│   ├── index.ts              # 入口文件（支持 stdio 和 HTTP 双模式）
│   ├── server.ts             # MCP Server 配置
│   ├── config/
│   │   └── index.ts          # 配置管理模块
│   ├── transport/
│   │   └── httpServer.ts     # HTTP 服务器封装
│   ├── tools/
│   │   ├── index.ts          # Tools 导出
│   │   ├── createBooking.ts  # 创建预约工具
│   │   ├── queryStores.ts    # 查询门店工具
│   │   └── queryServices.ts  # 查询服务工具
│   ├── data/
│   │   ├── storeLoader.ts    # 门店数据加载
│   │   └── serviceLoader.ts  # 服务数据加载
│   ├── utils/
│   │   ├── matcher.ts        # 智能匹配算法
│   │   └── validator.ts      # 参数验证
│   └── types/
│       └── index.ts          # TypeScript 类型定义
├── org_store.json            # 门店数据
├── prod_service.json         # 服务项目数据
├── package.json
├── tsconfig.json
├── README.md
├── DEPLOYMENT.md             # 部署指南
└── CHANGELOG.md              # 版本变更日志
```

## ⚠️ 注意事项

1. **API 连接** - `create_booking` 工具已连接真实后端 API（`https://open.lannlife.com/mcp/book/create`）
2. **数据完整性** - 部分门店数据的字段可能为 null
3. **预约时间** - 只能预约未来 30 天内的服务
4. **版本信息** - 当前稳定版本为 v2.0.0，支持 stdio 和 HTTP/SSE 双传输模式
5. **生产环境** - 推荐使用 `https://open.lannlife.com/mcp` 而非本地部署
6. **会话管理** - HTTP 模式下需妥善管理 `Mcp-Session-Id`，会话过期需重新初始化
7. **速率限制** - 生产环境限制为 100 请求/分钟/IP，请合理控制调用频率

## 🔄 从 v1.x 升级到 v2.0

### 向后兼容性

- ✅ **stdio 模式保持不变**：默认启动方式与 v1.x 完全兼容
- ✅ **Claude Desktop 配置无需修改**：现有配置可继续使用
- ✅ **所有工具接口不变**：参数和返回值保持一致

### 新增功能

- 🌐 **HTTP/SSE 传输层**：可通过 `TRANSPORT=http` 启用
- ⚙️ **配置管理系统**：支持环境变量和命令行参数
- 🏥 **健康检查端点**：`GET /health`
- 🔒 **CORS 和速率限制**：保护 HTTP 端点安全

### 升级步骤

```bash
npm install lann-mcp-server@latest
npm run build  # 如果是本地开发
```

## 👥 贡献

欢迎提交 Issue 和 Pull Request！详情请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 📄 License

MIT
