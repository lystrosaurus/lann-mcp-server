#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';
import { loadConfig, type ServerConfig } from './config/index.js';
import { McpHttpServer } from './transport/httpServer.js';

/**
 * 启动 HTTP/SSE 模式
 */
async function startHttpMode(config: ServerConfig) {
  const httpServer = new McpHttpServer(config);

  await httpServer.start();

  const address = httpServer.getAddress();
  console.error('Lann MCP Server (HTTP mode) 已启动');
  console.error(`监听地址: http://${address?.address}:${address?.port}${config.http.basePath}`);
  console.error(`健康检查: http://${address?.address}:${address?.port}/health`);

  // 优雅关闭
  const shutdown = async () => {
    console.error('\n正在关闭服务器...');
    await httpServer.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

/**
 * 启动 stdio 模式（向后兼容）
 */
async function startStdioMode(mcpServer: Awaited<ReturnType<typeof createMcpServer>>) {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('Lann MCP Server (stdio mode) 已启动');
}

async function main() {
  try {
    // 1. 加载配置
    const config = loadConfig();

    // 2. 根据配置选择传输层
    if (config.transport === 'http') {
      // HTTP 模式下，McpServer 会在每个会话中独立创建
      await startHttpMode(config);
    } else {
      // stdio 模式下，创建全局 McpServer 实例
      const mcpServer = createMcpServer();
      await startStdioMode(mcpServer);
    }
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

main();
