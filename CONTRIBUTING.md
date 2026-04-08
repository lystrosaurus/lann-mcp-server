# 贡献指南

感谢你对 Lann MCP Server 项目的关注！我们欢迎各种形式的贡献，包括 bug 修复、功能增强、文档改进等。

## 📋 目录

- [开发环境设置](#开发环境设置)
- [代码规范](#代码规范)
- [提交 Pull Request](#提交-pull-request)
- [报告 Bug](#报告-bug)
- [建议新功能](#建议新功能)

## 🛠️ 开发环境设置

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### 安装步骤

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/YOUR_USERNAME/lann-mcp-server.git
cd lann-mcp-server

# 2. 安装依赖
npm install

# 3. 创建分支
git checkout -b feature/your-feature-name

# 4. 启动开发模式
npm run dev

# 5. 运行测试
npm test
```

### 项目结构

```
lann-mcp-server/
├── src/
│   ├── index.ts              # 入口文件
│   ├── server.ts             # MCP Server 配置
│   ├── config/               # 配置管理
│   ├── transport/            # 传输层实现
│   ├── tools/                # MCP 工具实现
│   ├── data/                 # 数据加载器
│   ├── utils/                # 工具函数
│   └── types/                # TypeScript 类型定义
├── org_store.json            # 门店数据
├── prod_service.json         # 服务项目数据
└── package.json
```

## 📝 代码规范

### TypeScript 规范

- 使用严格的类型检查
- 避免使用 `any` 类型
- 为所有公共 API 添加 JSDoc 注释
- 遵循现有的代码风格

### 命名约定

- **变量/函数**: camelCase (`queryStores`, `createBooking`)
- **类/接口**: PascalCase (`McpHttpServer`, `StoreInfo`)
- **常量**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **文件名**: camelCase.ts (`httpServer.ts`, `matcher.ts`)

### 提交信息规范

使用语义化的提交信息：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Type 类型：**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动

**示例：**
```
feat(tools): 添加服务时长过滤功能

- 在 queryServices 中支持 duration 参数
- 添加时长范围验证
- 更新相关测试用例

Closes #123
```

## 🔀 提交 Pull Request

### 流程

1. **Fork 仓库** - 点击 GitHub 右上角的 Fork 按钮
2. **创建分支** - 从 `main` 分支创建特性分支
   ```bash
   git checkout -b feat/your-feature
   ```
3. **提交更改** - 确保代码通过测试和 lint 检查
   ```bash
   npm run build
   npm test
   ```
4. **推送到远程** 
   ```bash
   git push origin feat/your-feature
   ```
5. **创建 PR** - 在 GitHub 上提交 Pull Request

### PR 检查清单

- [ ] 代码遵循项目规范
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 通过了所有 CI 检查
- [ ] 提交信息清晰明确
- [ ] 没有合并冲突

### PR 描述模板

```markdown
## 描述
简要说明此 PR 的目的和解决的问题

## 类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 文档更新
- [ ] 重构
- [ ] 其他（请说明）

## 相关 Issue
Fixes #(issue number)

## 测试
说明如何测试此更改

## 截图（如适用）
添加 UI 变化的截图

## 检查清单
- [ ] 我的代码遵循了项目的代码规范
- [ ] 我进行了自测
- [ ] 我更新了相关文档
- [ ] 所有测试都通过了
```

## 🐛 报告 Bug

### Bug 报告模板

```markdown
**Bug 描述**
清晰简洁地描述 bug 是什么

**复现步骤**
1. 执行 '...'
2. 点击 '....'
3. 看到错误 '....'

**预期行为**
清晰简洁地描述你期望发生的事情

**实际行为**
清晰简洁地描述实际发生的事情

**环境信息**
- OS: [e.g. Windows 11, macOS 14.0]
- Node.js: [e.g. 18.17.0]
- Package Version: [e.g. 2.0.0]

**附加信息**
添加任何其他上下文信息、截图或日志
```

## 💡 建议新功能

### 功能建议模板

```markdown
**功能描述**
清晰简洁地描述你想要的功能

**使用场景**
说明这个功能能解决什么问题

**实现方案**
如果你有任何实现思路，可以在这里说明

**替代方案**
描述你考虑过的替代解决方案

**附加信息**
添加任何其他上下文信息或截图
```

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --grep "queryStores"

# 生成覆盖率报告
npm test -- --coverage
```

### 编写测试

- 为新功能添加单元测试
- 为 Bug 修复添加回归测试
- 保持测试简洁明了
- 使用描述性的测试名称

## 📚 文档

### 文档更新

当你的更改影响用户使用时，请更新相关文档：

- **README.md** - 主要功能和快速开始
- **DEPLOYMENT.md** - 部署相关更改
- **HTTP_USAGE.md** - HTTP/SSE 协议相关更改
- **GUIDE.md** - 详细使用指南

### 文档规范

- 使用清晰的中文或英文
- 提供可运行的代码示例
- 包含必要的截图（UI 相关）
- 保持格式一致

## 🤝 社区行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们承诺：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化的语言或图像
- 人身攻击或侮辱性评论
- 公开或私下骚扰
- 未经许可发布他人隐私信息
- 其他不道德或不专业的行为

## ❓ 获取帮助

- **GitHub Issues** - 报告 bug 或建议功能
- **GitHub Discussions** - 提问和讨论
- **Email** - lystrosaurus@example.com（私人问题）

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

再次感谢你的贡献！🎉
