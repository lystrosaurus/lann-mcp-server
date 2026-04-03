# Lann MCP Server

蘭泰式按摩预约服务的 MCP (Model Context Protocol) 服务器实现。为大语言模型提供查询门店、查询服务项目和创建预约的能力。

## 功能特性

- 🔍 **门店查询** - 支持按城市、关键词搜索门店信息
- 📋 **服务查询** - 支持按关键词、时长筛选服务项目
- 📅 **在线预约** - 智能匹配门店和服务，创建预约订单
- 🎯 **智能匹配** - 支持模糊匹配，容错输入
- ✅ **参数验证** - 完整的输入验证和友好的错误提示

## 安装

```bash
npm install lann-mcp-server
```

## 使用方式

### 作为 MCP Server 运行

```bash
npx lann-mcp-server
```

### 在 Claude Desktop 中配置

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

### 使用 MCP Inspector 测试

```bash
npm run inspector
```

## Available Tools

### 1. `create_booking` - 创建预约

创建蘭泰式按摩预约。

**参数：**
- `mobile` (string, 必填): 手机号码（11 位中国大陆手机号）
- `storeName` (string, 必填): 门店名称
- `serviceName` (string, 必填): 服务项目名称
- `count` (number, 必填): 预约人数（1-20 人）
- `bookTime` (string, 必填): 预约时间（ISO 8601 格式）

**示例：**
```json
{
  "mobile": "13800138000",
  "storeName": "淮海店",
  "serviceName": "传统古法全身按摩 -90 分钟",
  "count": 2,
  "bookTime": "2024-01-15T14:00:00"
}
```

**返回：**
```json
{
  "success": true,
  "bookingId": "BK1704012345678A1B2",
  "message": "预约成功！已为您发送确认短信。",
  "storeInfo": {
    "name": "淮海店",
    "ADDRESS": "上海市黄浦区进贤路 216 号（近陕西南路）",
    "TELEPHONE": "021-62670235",
    "traffic": "地铁 1 号线陕西南路 1 号口出，沿陕西南路走到进贤路右转约 100m"
  },
  "serviceInfo": {
    "name": "传统古法全身按摩 -90 分钟",
    "desc": "通过独特的推、拉、蹬、摇、踩等手法..."
  }
}
```

### 2. `query_stores` - 查询门店

查询蘭泰式按摩门店信息。

**参数：**
- `city` (string, 可选): 城市名称，如"上海"、"杭州"、"成都"等
- `keyword` (string, 可选): 关键词，如"淮海"、"新天地"、"地铁"等

**示例：**
```json
{
  "city": "上海",
  "keyword": "淮海"
}
```

**返回：**
```json
{
  "success": true,
  "stores": [
    {
      "name": "淮海店",
      "address": "上海市黄浦区进贤路 216 号（近陕西南路）",
      "telephone": "021-62670235",
      "traffic": "地铁 1 号线陕西南路 1 号口出，沿陕西南路走到进贤路右转约 100m"
    }
  ],
  "message": "共找到 1 家门店"
}
```

### 3. `query_services` - 查询服务

查询蘭泰式按摩服务项目。

**参数：**
- `keyword` (string, 可选): 关键词，如"精油"、"古法"、"拉伸"、"面部"等
- `duration` (number, 可选): 服务时长（分钟），如 60、90、120 等

**示例：**
```json
{
  "keyword": "精油",
  "duration": 90
}
```

**返回：**
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

## 智能匹配说明

本服务实现了智能匹配算法，支持以下匹配方式：

1. **精确匹配** - 完全相等的匹配（高置信度）
2. **包含匹配** - 输入是门店/服务名称的子串（高置信度）
3. **相似度匹配** - 基于编辑距离的模糊匹配（中/低置信度）

**示例：**
- 输入 `"淮海"` → 匹配到 `"淮海店"`
- 输入 `"精油 90"` → 匹配到 `"泰式精油全身护理 -90 分钟"`
- 输入 `"古法按摩"` → 可能匹配到多个相关服务并提供建议

## 开发

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
│   ├── index.ts              # 入口文件
│   ├── server.ts             # MCP Server 配置
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
└── README.md
```

## 注意事项

1. **API 连接状态** - `create_booking` 工具已连接真实后端 API（`https://open.lannlife.com/mcp/book/create`），`query_stores` 和 `query_services` 工具使用本地数据文件
2. **数据完整性** - 部分门店数据的字段可能为 null
3. **预约时间** - 只能预约未来 30 天内的服务
4. **版本信息** - 当前稳定版本为 v1.0.2，后续迭代将基于此版本进行

## License

MIT
