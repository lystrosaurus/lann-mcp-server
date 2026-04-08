# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-04-08

### Added

- HTTP/SSE 传输层支持（使用 StreamableHTTPServerTransport）
- 可配置的 HTTP 服务器（端口、主机、基础路径）
- CORS 支持，可配置允许的源
- 速率限制保护（可配置时间窗口和最大请求数）
- 健康检查端点 (`/health`)
- 配置管理系统（环境变量 + 命令行参数）
- 优雅关闭支持（SIGTERM/SIGINT 处理）
- 部署文档 (DEPLOYMENT.md)

### Changed

- **BREAKING**: 新增 HTTP 传输模式，但默认仍为 stdio（向后兼容）
- 更新 MCP Server 版本标识为 2.0.0
- 优化 package.json keywords，增加 SEO 友好度
- 添加 `start:http` 和 `inspector:http` npm scripts

### Security

- 新增速率限制防止滥用
- CORS 配置保护跨域请求
- DNS rebinding 保护（通过 StreamableHTTPServerTransport 内置）

### Deprecated

- 无

### Removed

- 无

### Fixed

- 无

---

## [1.0.2] - Previous Release

### Features

- 门店查询工具 (`query_stores`)
- 服务查询工具 (`query_services`)
- 预约创建工具 (`create_booking`)
- 智能匹配算法（三层策略）
- 完整的参数验证
- MCP Registry 发布支持
