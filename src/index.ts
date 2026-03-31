#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';

async function main() {
  try {
    // 创建 MCP Server
    const server = createMcpServer();

    // 创建传输层
    const transport = new StdioServerTransport();

    // 启动服务器
    await server.connect(transport);

    console.error('Lann MCP Server 已启动');
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

main();
