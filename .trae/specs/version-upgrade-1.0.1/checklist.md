# Lann MCP Server - 版本升级至 1.0.1 验证清单

- [ ] 检查 package.json 中的 version 字段是否为 1.0.1
- [ ] 检查 server.json 中的 version 字段是否为 1.0.1
- [ ] 检查 server.json 中 packages 数组内 npm 包的 version 字段是否为 1.0.1
- [ ] 检查 Git 提交是否成功执行
- [ ] 检查提交信息是否包含版本升级内容
- [ ] 检查本地仓库是否成功创建 v1.0.1 标签
- [ ] 检查标签是否成功推送到远程仓库
- [ ] 验证 GitHub Actions 工作流是否被触发
- [ ] 验证 npm 和 MCP Registry 发布是否成功