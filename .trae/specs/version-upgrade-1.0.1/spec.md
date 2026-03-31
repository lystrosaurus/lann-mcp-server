# Lann MCP Server - 版本升级至 1.0.1 产品需求文档

## Overview
- **Summary**: 将 Lann MCP Server 从版本 1.0.0 升级至 1.0.1，以发布最近的文档更新。
- **Purpose**: 触发自动发布流程，确保文档变更能够被用户获取。
- **Target Users**: 项目维护者和最终用户。

## Goals
- 成功将版本号从 1.0.0 升级至 1.0.1
- 确保所有相关文件中的版本号保持一致
- 触发 GitHub Actions 工作流完成自动发布

## Non-Goals (Out of Scope)
- 修改任何功能代码
- 添加新功能或修复 bug
- 更改项目结构或依赖

## Background & Context
- 当前 npm 上已存在 `lann-mcp-server` 的 1.0.0 版本
- 最近的提交仅包含文档更新（如 MCP_REGISTRY_SETUP.md 或 README.md）
- 文档更新未触发自动发布流程
- 需要通过版本号升级来触发发布

## Functional Requirements
- **FR-1**: 更新 package.json 中的 version 字段为 1.0.1
- **FR-2**: 更新 server.json 中的 version 字段为 1.0.1
- **FR-3**: 将版本号修改提交到 Git
- **FR-4**: 创建并推送 v1.0.1 标签到远程仓库

## Non-Functional Requirements
- **NFR-1**: 版本号必须在所有文件中保持一致
- **NFR-2**: 提交和标签操作必须成功执行
- **NFR-3**: 发布流程必须被触发

## Constraints
- **Technical**: 使用 Git 版本控制，依赖 GitHub Actions 进行自动发布
- **Dependencies**: 需要网络连接以推送标签到远程仓库

## Assumptions
- 本地 Git 仓库已正确配置远程仓库
- GitHub Actions 工作流已正确设置
- 具备推送权限到远程仓库

## Acceptance Criteria

### AC-1: 版本号更新
- **Given**: 项目处于 1.0.0 版本
- **When**: 更新 package.json 和 server.json 中的 version 字段
- **Then**: 两个文件中的版本号均为 1.0.1
- **Verification**: `programmatic`

### AC-2: Git 提交
- **Given**: 版本号已更新
- **When**: 执行 git commit 命令
- **Then**: 变更被成功提交到本地仓库
- **Verification**: `programmatic`

### AC-3: 标签创建与推送
- **Given**: 变更已提交
- **When**: 创建并推送 v1.0.1 标签
- **Then**: 标签成功推送到远程仓库
- **Verification**: `programmatic`

### AC-4: 发布触发
- **Given**: 标签已推送
- **说 bad部那种远程仓库
- **When**: GitHub Actions 工作流运行
- **Then**: npm 和 MCP Registry 发布成功
- **Verification**: `human-judgment`

## Open Questions
- [ ] 确认当前 Git 分支状态
- [ ] 确认远程仓库配置