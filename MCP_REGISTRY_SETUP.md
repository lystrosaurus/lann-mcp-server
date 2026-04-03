# MCP Registry 发布配置说明

本文档说明如何将 lann-mcp-server 发布到 Model Context Protocol Registry。

## 📋 前置要求

### 必需的账户
- **npm 账户**: 用于发布 npm 包
- **GitHub 账户**: 用于代码托管和 OIDC 认证

### 必需的 Secret 配置
在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加：
- `NPM_TOKEN`: npm 发布令牌（**仅需这一个 Secret**）

**不需要任何 MCP Registry 相关的 Token!**

## 🚀 发布流程

### 1. 首次发布前准备

```bash
# 1. 登录 npm
npm adduser

# 2. 发布到 npm（公开包）
npm publish --access public

# 3. 验证包已发布
# 访问 https://www.npmjs.com/package/lann-mcp-server
```

### 2. 配置 GitHub Secret

1. 登录 https://www.npmjs.com
2. 进入 **Account Settings → Access Tokens**
3. 创建新的 token（选择 **Automation** 类型）
4. 复制生成的 token
5. 在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中
6. 点击 **New repository secret**
7. 名称：`NPM_TOKEN`，值：粘贴刚才复制的 token

### 3. 发布到 MCP Registry

```bash
# 1. 验证版本一致性（确保三个版本号完全一致）
node -p "require('./package.json').version"     # 应返回 1.0.2
node -p "require('./server.json').version"      # 应返回 1.0.2
git tag -l "v1.0.2"                              # 应返回 v1.0.2

# 2. 打版本标签（例如 v1.0.2）
git tag v1.0.2

git push origin v1.0.2

**版本里程碑**：v1.0.2 是稳定版本，标志着项目参数名称与MCP定义一致并投入生产使用。后续迭代将基于此版本进行。

GitHub Actions 会自动执行以下步骤：
1. ✅ 检出代码
2. ✅ 安装依赖
3. ✅ 构建 TypeScript
4. ✅ 发布到 npm
5. ✅ 安装 mcp-publisher 工具
6. ✅ 使用 GitHub OIDC 登录 MCP Registry（无需 Secret）
7. ✅ 发布到 MCP Registry

### 4. 验证发布结果

```bash
# 使用 curl 查询 Registry
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.lystrosaurus/lann-mcp-server"

# 或访问网页查看
# https://modelcontextprotocol.io/registry
```

## 📁 配置文件说明

### package.json
添加了 `mcpName` 字段用于所有权验证：
```json
{
  "name": "lann-mcp-server",
  "mcpName": "io.github.lystrosaurus/lann-mcp-server",
  ...
}
```

### server.json
MCP Registry 元数据文件（已提交到 Git）：
- `name`: 服务器唯一标识符（格式：`io.github.<用户名>/<项目名>`）
- `version`: 版本号（必须与 package.json 和 Git Tag 一致）
- `packages`: 包含 npm 包信息

### .github/workflows/publish-mcp.yml
GitHub Actions 工作流文件，定义了自动化发布流程。

## ⚠️ 重要注意事项

### 版本一致性
确保以下三个版本号完全一致：
- `package.json` 中的 `version`
- `server.json` 中的 `version`
- Git Tag（如 `v1.0.0`）

### 发布规则
- 同一版本不能重复发布（会被拒绝）
- 需要先发布到 npm，再发布到 MCP Registry
- `mcpName` 必须与 `server.json` 的 `name` 完全匹配

### 认证机制
- 使用 **GitHub OIDC** 自动认证
- 无需配置任何 MCP Registry Token
- GitHub Actions 自动提供 OIDC token
- 自动获得 `io.github.<你的 GitHub 用户名>/*` 命名空间的发布权限

## 🔧 故障排查

### 问题：发布失败 "Registry validation failed for package"
**解决**: 确保 `package.json` 中包含正确的 `mcpName` 字段

### 问题：发布失败 "Invalid or expired Registry JWT token"
**解决**: OIDC token 过期，重新触发工作流即可

### 问题：发布失败 "You do not have permission to publish this server"
**解决**: 确保 `server.json` 的 `name` 字段以 `io.github.<你的 GitHub 用户名>/` 开头

### 问题：npm 发布失败
**解决**: 检查 `NPM_TOKEN` Secret 是否正确配置

## 📚 参考链接

- [MCP Registry Quickstart](https://modelcontextprotocol.io/registry/quickstart)
- [GitHub Actions 自动化发布](https://modelcontextprotocol.io/registry/github-actions)
- [支持的包类型](https://modelcontextprotocol.io/registry/package-types)
