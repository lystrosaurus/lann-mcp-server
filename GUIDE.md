# 快速使用指南

## 项目结构

```
lann-mcp-server/
├── src/                      # TypeScript 源代码
│   ├── index.ts              # MCP Server 入口
│   ├── server.ts             # Server 配置
│   ├── test.ts               # 功能测试脚本
│   ├── tools/                # MCP Tools 实现
│   │   ├── createBooking.ts  # 创建预约工具
│   │   ├── queryStores.ts    # 查询门店工具
│   │   └── queryServices.ts  # 查询服务工具
│   ├── data/                 # 数据加载器
│   ├── utils/                # 工具函数
│   └── types/                # TypeScript 类型定义
├── dist/                     # 编译后的 JavaScript 代码
├── org_store.json            # 门店数据 (70 条)
├── prod_service.json         # 服务项目数据 (28 个)
└── package.json
```

## 可用 Tools

### 1. `create_booking` - 创建预约

**用途**: 创建蘭泰式按摩预约

**参数**:
- `phone` (string, 必填): 11 位中国大陆手机号
- `storeName` (string, 必填): 门店名称（支持模糊匹配）
- `serviceName` (string, 必填): 服务项目名称（支持模糊匹配）
- `peopleCount` (number, 必填): 人数 (1-20)
- `bookingTime` (string, 必填): ISO 8601 格式时间

**示例**:
```json
{
  "phone": "13800138000",
  "storeName": "淮海店",
  "serviceName": "传统古法全身按摩 -90 分钟",
  "peopleCount": 2,
  "bookingTime": "2024-01-15T14:00:00"
}
```

### 2. `query_stores` - 查询门店

**用途**: 查询门店信息，支持城市和关键词筛选

**参数**:
- `city` (string, 可选): 城市名称
- `keyword` (string, 可选): 关键词

**示例**:
```json
{ "city": "上海", "keyword": "淮海" }
```

### 3. `query_services` - 查询服务

**用途**: 查询服务项目，支持关键词和时长筛选

**参数**:
- `keyword` (string, 可选): 关键词
- `duration` (number, 可选): 时长（分钟）

**示例**:
```json
{ "keyword": "精油", "duration": 90 }
```

## 运行方式

### 开发模式
```bash
npm run dev        # 监听 TypeScript 变化自动编译
```

### 编译构建
```bash
npm run build      # 编译 TypeScript
```

### 运行测试
```bash
npm test           # 运行功能测试
```

### 启动 MCP Server
```bash
npm start          # 启动服务器
```

### 使用 MCP Inspector 测试
```bash
npm run inspector  # 打开 Inspector UI
```

## Claude Desktop 配置

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

## 智能匹配示例

### 门店名称匹配
- 输入 `"淮海"` → 匹配到 `"淮海店"` ✓
- 输入 `"新天地"` → 匹配到 `"新天地复兴 soho 店"` ✓
- 输入 `"不存在的店"` → 返回错误和建议 ✗

### 服务名称匹配
- 输入 `"精油 90"` → 可能匹配到多个精油类 90 分钟服务 ✓
- 输入 `"古法按摩"` → 匹配到古法相关服务 ✓
- 输入 `"未知服务"` → 返回错误和建议 ✗

## 数据概览

- **门店数量**: 70 家（实际有效 65 家）
- **覆盖城市**: 上海、杭州、成都、苏州、深圳、武汉、宁波等
- **服务项目**: 28 个
- **服务类型**: 传统古法按摩、精油 SPA、椰香按摩、草本热敷、面部护理、泰式拉伸、足部释压等

## 验证规则

1. **手机号**: 必须是 11 位中国大陆手机号（1 开头）
2. **人数**: 1-20 之间的整数
3. **预约时间**: 
   - 不能早于当前时间
   - 只能预约未来 30 天内
4. **门店/服务名称**: 支持模糊匹配，但必须能匹配到有效数据

## 错误处理

所有错误都会返回友好的中文提示：

```json
{
  "success": false,
  "message": "手机号格式不正确，请输入 11 位中国大陆手机号"
}
```

```json
{
  "success": false,
  "message": "未找到匹配的门店，您可能想要：淮海店、花木店"
}
```

## 模拟数据说明

当前版本使用模拟后端 API：
- 90% 成功率随机返回
- 500-1500ms 随机延迟
- 生成虚拟订单 ID

未来可接入真实后端 API。
