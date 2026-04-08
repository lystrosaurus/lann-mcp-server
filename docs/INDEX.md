# 文档导航

欢迎使用 Lann MCP Server！本文档索引帮助你快速找到所需信息。

## 📚 文档列表

### 👤 NPM 使用者（集成到 AI 应用）

#### [README.md](./README.md) - 主要文档 ⭐
**适合人群**: 所有用户  
**内容**:
- ✨ 功能特性介绍
- 🚀 快速开始指南
- 📖 Claude Desktop 集成教程
- 🛠️ 可用工具详细说明
- 🎯 智能匹配算法说明
- 💻 开发环境设置

**推荐阅读顺序**: 
1. 功能特性 → 2. 快速开始 → 3. 使用场景 → 4. 可用工具

---

#### [HTTP_USAGE.md](./HTTP_USAGE.md) - HTTP/SSE 协议详解
**适合人群**: 需要通过 HTTP 远程访问服务的开发者  
**内容**:
- 🌐 HTTP/SSE 模式快速开始
- 🔧 MCP Inspector 使用教程
- 📡 cURL 测试示例
- 🔍 常见问题排查
- 🏗️ 生产环境部署要点

**何时阅读**: 当你需要远程部署或自定义客户端时

---

### 🖥️ 服务器管理员（部署到生产环境）

#### [DEPLOYMENT.md](./DEPLOYMENT.md) - 生产环境部署指南 ⭐
**适合人群**: DevOps 工程师、系统管理员  
**内容**:
- 🔧 系统要求和前置条件
- 🚀 快速部署步骤
- 🌐 Nginx 反向代理配置
- 🔒 SSL 证书配置（Let's Encrypt）
- 📊 PM2 进程管理
- 🛡️ 安全加固建议
- ⚡ 性能优化技巧
- 🐳 Docker 和 Kubernetes 部署
- 📋 环境变量参考

**推荐阅读顺序**:
1. 前置要求 → 2. 快速部署 → 3. Nginx 配置 → 4. 安全加固

---

### 💻 开发者（贡献代码）

#### [CONTRIBUTING.md](./CONTRIBUTING.md) - 贡献指南 ⭐
**适合人群**: 想要贡献代码的开发者  
**内容**:
- 🛠️ 开发环境设置
- 📝 代码规范和命名约定
- 🔀 Pull Request 流程
- 🐛 Bug 报告模板
- 💡 功能建议模板
- 🧪 测试编写指南
- 📚 文档更新规范

**何时阅读**: 准备提交 PR 或报告 Bug 前

---

#### [GUIDE.md](./GUIDE.md) - 完整开发指南
**适合人群**: 深度定制和二次开发的开发者  
**内容**:
- 🏗️ 项目架构详解
- 📂 目录结构说明
- 🔌 如何添加新工具
- 🎨 自定义数据源
- 🧩 扩展点说明
- 📖 API 参考文档

**何时阅读**: 需要深入理解项目内部机制时

---

### 🚀 发布维护者

#### [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) - 发布检查清单 ⭐
**适合人群**: 负责发布新版本到 npm 的维护者  
**内容**:
- 📋 发布前检查清单
- 🚀 发布步骤详解
- ✅ 发布后验证
- 🔧 常见问题解决
- 📝 发布模板

**何时阅读**: 每次准备发布新版本时

---

## 🎯 根据场景选择文档

### 场景 1: 我是普通用户，想在 Claude Desktop 中使用

👉 阅读 [README.md](./README.md) 的"快速开始"部分

### 场景 2: 我是开发者，想在自己的项目中集成

👉 阅读顺序：
1. [README.md](./README.md) - 了解基本用法
2. [HTTP_USAGE.md](./HTTP_USAGE.md) - 了解 HTTP 协议
3. [CONTRIBUTING.md](./CONTRIBUTING.md) - 了解如何贡献

### 场景 3: 我是运维，需要部署到生产服务器

👉 阅读 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 场景 4: 我想修复一个 Bug 或添加新功能

👉 阅读顺序：
1. [CONTRIBUTING.md](./CONTRIBUTING.md) - 了解贡献流程
2. [GUIDE.md](./GUIDE.md) - 了解项目架构
3. [README.md](./README.md) - 了解现有功能

### 场景 5: 我要发布新版本到 npm

👉 严格按照 [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) 执行

### 场景 6: 我遇到了问题

👉 查找顺序：
1. [README.md](./README.md) - "注意事项"部分
2. [HTTP_USAGE.md](./HTTP_USAGE.md) - "常见问题排查"部分
3. [DEPLOYMENT.md](./DEPLOYMENT.md) - "故障排查"部分
4. GitHub Issues - 搜索类似问题
5. 创建新 Issue - 使用 CONTRIBUTING.md 中的模板

---

## 📖 文档更新指南

如果你发现文档有误或需要改进：

1. **小错误**（拼写、格式）: 直接提交 PR 修复
2. **内容补充**: 在 PR 中说明补充的原因和内容
3. **结构调整**: 先在 Issue 中讨论，达成共识后再修改
4. **新增文档**: 确保新文档有明确的受众和目的

**文档规范**:
- 使用清晰的中文或英文
- 提供可运行的代码示例
- 包含必要的截图（UI 相关）
- 保持格式一致（使用 Markdown）
- 添加适当的 emoji 提高可读性

---

## 🔗 外部资源

- **[NPM Package](https://www.npmjs.com/package/lann-mcp-server)** - 查看最新版本和下载统计
- **[GitHub Repository](https://github.com/lystrosaurus/lann-mcp-server)** - 源代码和 Issue 追踪
- **[MCP Protocol](https://modelcontextprotocol.io/)** - Model Context Protocol 官方文档
- **[Node.js](https://nodejs.org/)** - Node.js 官方文档
- **[TypeScript](https://www.typescriptlang.org/)** - TypeScript 官方文档

---

## ❓ 还有问题？

- 📧 **Email**: lystrosaurus@example.com
- 💬 **GitHub Discussions**: 提问和讨论
- 🐛 **GitHub Issues**: 报告 Bug 或建议功能

---

**最后更新**: 2026-04-08  
**维护者**: lystrosaurus
