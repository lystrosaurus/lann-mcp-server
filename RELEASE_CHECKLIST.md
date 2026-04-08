# NPM 发布检查清单

在发布新版本到 npmjs.com 之前，请确保完成以下所有检查项。

## 📋 发布前检查

### 1. 代码质量

- [ ] 所有 TypeScript 编译通过，无错误
  ```bash
  npm run build
  ```

- [ ] 运行测试并确保全部通过
  ```bash
  npm test
  ```

- [ ] 代码符合 lint 规范
  ```bash
  npm run lint  # 如果配置了 linter
  ```

- [ ] 没有未提交的更改
  ```bash
  git status
  ```

### 2. 版本号管理

- [ ] 更新 `package.json` 中的 `version` 字段
- [ ] 更新 `server.json` 中的 `version` 字段
- [ ] 遵循语义化版本规范 (SemVer)
  - **MAJOR**: 不兼容的 API 变更
  - **MINOR**: 向后兼容的功能新增
  - **PATCH**: 向后兼容的问题修正

**示例：**
```json
// package.json
{
  "version": "2.0.1"  // 从 2.0.0 升级到 2.0.1 (bug fix)
}

// server.json
{
  "version": "2.0.1"
}
```

### 3. 文档更新

- [ ] 更新 `README.md` 中的版本信息和功能说明
- [ ] 如有必要，更新 `DEPLOYMENT.md`
- [ ] 如有必要，更新 `HTTP_USAGE.md`
- [ ] 创建或更新 `CHANGELOG.md`（推荐）

**CHANGELOG.md 模板：**
```markdown
# Changelog

## [2.0.1] - 2026-04-08

### Fixed
- 修复 HTTP 模式下 Accept 头验证问题
- 修正 Windows 环境变量设置兼容性

### Changed
- 优化 README 文档结构
- 添加 Docker 部署支持

## [2.0.0] - 2026-04-01

### Added
- 支持 HTTP/SSE 传输模式
- 添加健康检查端点
- 实现 CORS 和速率限制

### Changed
- 重构项目结构
- 改进错误处理机制
```

### 4. Git 标签

- [ ] 提交所有更改
  ```bash
  git add .
  git commit -m "chore: release v2.0.1"
  ```

- [ ] 创建 Git 标签
  ```bash
  git tag -a v2.0.1 -m "Release version 2.0.1"
  ```

- [ ] 推送代码和标签
  ```bash
  git push origin main
  git push origin v2.0.1
  ```

### 5. 依赖检查

- [ ] 检查是否有安全漏洞
  ```bash
  npm audit
  ```

- [ ] 修复高危漏洞
  ```bash
  npm audit fix
  ```

- [ ] 确认 `dependencies` 和 `devDependencies` 正确
  - `dependencies`: 运行时必需的包
  - `devDependencies`: 仅开发时需要的包

### 6. 构建产物

- [ ] 清理旧的构建文件
  ```bash
  rm -rf dist/
  ```

- [ ] 重新构建
  ```bash
  npm run build
  ```

- [ ] 验证 `dist/` 目录包含所有必需文件
  ```bash
  ls -la dist/
  ```

- [ ] 确认 `.npmignore` 或 `files` 字段正确配置

### 7. 本地测试

- [ ] 本地安装测试
  ```bash
  npm pack
  tar -xzf lann-mcp-server-2.0.1.tgz
  cd package
  npm install
  node dist/index.js
  ```

- [ ] 测试 stdio 模式
  ```bash
  npx @modelcontextprotocol/inspector node dist/index.js
  ```

- [ ] 测试 HTTP 模式
  ```bash
  TRANSPORT=http node dist/index.js
  curl http://localhost:3000/health
  ```

### 8. CI/CD 检查

- [ ] GitHub Actions 工作流正常
- [ ] 自动发布流程配置正确
- [ ] 检查 `.github/workflows/publish-mcp.yml`

## 🚀 发布步骤

### 方法一：手动发布

```bash
# 1. 登录 npm（首次需要）
npm login

# 2. 发布到 npm
npm publish

# 3. 验证发布
npm view lann-mcp-server
```

### 方法二：通过 Git Tag 触发自动发布

如果使用 GitHub Actions 自动发布：

```bash
# 1. 创建并推送标签
git tag -a v2.0.1 -m "Release version 2.0.1"
git push origin v2.0.1

# 2. 检查 GitHub Actions 执行状态
# 访问: https://github.com/lystrosaurus/lann-mcp-server/actions

# 3. 验证 npm 上的新版本
npm view lann-mcp-server versions
```

## ✅ 发布后验证

### 1. NPM 验证

- [ ] 检查 npm 页面
  ```
  https://www.npmjs.com/package/lann-mcp-server
  ```

- [ ] 验证版本号正确
  ```bash
  npm view lann-mcp-server version
  ```

- [ ] 测试全新安装
  ```bash
  mkdir test-install
  cd test-install
  npm install lann-mcp-server
  ls node_modules/lann-mcp-server/
  ```

### 2. 功能验证

- [ ] 测试 Claude Desktop 集成
- [ ] 测试 MCP Inspector
- [ ] 测试 HTTP 模式（如适用）
- [ ] 验证所有工具正常工作

### 3. 文档验证

- [ ] README 在 npm 上正确渲染
- [ ] 所有链接有效
- [ ] 代码示例可运行

### 4. 通知用户

- [ ] 在 GitHub Release 页面创建 Release
- [ ] 更新项目文档
- [ ] 通知主要用户（如适用）

## 🔧 常见问题

### 问题 1: 发布失败 - "You cannot publish over previously published versions"

**原因**: 版本号已存在

**解决方案**:
```bash
# 增加版本号
npm version patch  # 或 minor, major
npm publish
```

### 问题 2: 发布失败 - "E403 Forbidden"

**原因**: 未登录或权限不足

**解决方案**:
```bash
npm login
# 或检查是否使用了正确的 registry
npm config get registry  # 应该是 https://registry.npmjs.org/
```

### 问题 3: 发布的包缺少文件

**原因**: `files` 字段配置不正确

**解决方案**:
```bash
# 检查将要发布的文件
npm pack --dry-run

# 更新 package.json 中的 files 字段
# 或使用 .npmignore 排除不需要的文件
```

### 问题 4: TypeScript 类型定义缺失

**原因**: `.d.ts` 文件未包含在发布中

**解决方案**:
```json
// package.json
{
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ]
}
```

## 📝 发布模板

### Git Commit Message

```
chore: release v2.0.1

- Update version to 2.0.1
- Update changelog
- Fix critical bug in HTTP mode
```

### GitHub Release Notes

```markdown
## What's Changed

### 🐛 Bug Fixes
- Fix HTTP Accept header validation
- Improve Windows compatibility

### 📚 Documentation
- Restructure README for better UX
- Add Docker deployment guide
- Create CONTRIBUTING.md

### 🔧 Technical Improvements
- Add comprehensive test coverage
- Optimize build process

**Full Changelog**: https://github.com/lystrosaurus/lann-mcp-server/compare/v2.0.0...v2.0.1
```

## 🎯 最佳实践

1. **定期发布**: 小步快跑，频繁发布小版本
2. **语义化版本**: 严格遵守 SemVer 规范
3. **详细日志**: 维护清晰的 CHANGELOG
4. **自动化**: 使用 CI/CD 自动化发布流程
5. **充分测试**: 发布前进行全面的本地测试
6. **文档同步**: 确保文档与代码保持同步
7. **向后兼容**: 尽量避免破坏性变更
8. **用户沟通**: 重大变更提前通知用户

---

**最后更新**: 2026-04-08  
**维护者**: lystrosaurus
