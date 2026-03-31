# Lann MCP Server - 版本升级至 1.0.1 实施计划

## [ ] Task 1: 更新 package.json 版本号
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 将 package.json 文件中的 version 字段从 1.0.0 更新为 1.0.1
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: package.json 中的 version 字段值为 "1.0.1"
- **Notes**: 确保只修改 version 字段，不更改其他内容

## [ ] Task 2: 更新 server.json 版本号
- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 将 server.json 文件中的 version 字段从 1.0.0 更新为 1.0.1
  - 同时更新 packages 数组中 npm 包的 version 字段
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-2.1: server.json 中的 version 字段值为 "1.0.1"
  - `programmatic` TR-2.2: server.json 中 packages 数组内 npm 包的 version 字段值为 "1.0.1"
- **Notes**: 确保两个版本号保持一致

## [ ] Task 3: 提交版本号更改到 Git
- **Priority**: P0
- **Depends On**: Task 1, Task 2
- **Description**:
  - 执行 git commit 命令，将版本号更改提交到本地仓库
  - 使用清晰的提交信息，如 "chore: bump version to 1.0.1"
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-3.1: git commit 命令执行成功
  - `programmatic` TR-3.2: 提交信息包含版本升级内容
- **Notes**: 确保只有版本号相关的文件被提交

## [ ] Task 4: 创建并推送 v1.0.1 标签
- **Priority**: P0
- **Depends On**: Task 3
- **Description**:
  - 创建 v1.0.1 标签
  - 将标签推送到远程仓库
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-4.1: 本地仓库成功创建 v1.0.1 标签
  - `programmatic` TR-4.2: 标签成功推送到远程仓库
- **Notes**: 确保标签名称与版本号完全一致