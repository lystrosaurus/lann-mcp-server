import http, { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerConfig } from '../config/index.js';
import { createMcpServer } from '../server.js';

/**
 * HTTP/MCP 服务器封装类（简化版）
 * 
 * 设计理念：
 * 1. 会话级别的状态管理 - 每个会话维护独立的 Transport 和 McpServer
 * 2. 即时连接 - Transport 和 McpServer 在创建后立即连接
 * 3. 资源隔离 - 不同会话完全独立
 */
export class McpHttpServer {
  private server: http.Server;
  private config: ServerConfig;
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();
  // 会话管理：sessionId -> { transport, mcpServer }
  private sessions: Map<string, { transport: StreamableHTTPServerTransport; mcpServer: McpServer }> = new Map();

  constructor(config: ServerConfig) {
    this.config = config;
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  /**
   * 启动 HTTP 服务器
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(
        this.config.http.port,
        this.config.http.host,
        () => resolve()
      );
      this.server.on('error', reject);
    });
  }

  /**
   * 停止 HTTP 服务器
   */
  async stop(): Promise<void> {
    // 关闭所有会话
    for (const [sessionId, session] of this.sessions.entries()) {
      try {
        await session.transport.close();
        console.log(`已关闭会话: ${sessionId}`);
      } catch (error) {
        console.error(`关闭会话 ${sessionId} 时出错:`, error);
      }
    }
    this.sessions.clear();

    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }

  /**
   * 获取服务器地址信息
   */
  getAddress(): AddressInfo | null {
    const address = this.server.address();
    return address && typeof address === 'object' ? address : null;
  }

  /**
   * 请求处理主函数
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      // 1. 健康检查端点
      if (req.url === '/health') {
        return this.handleHealthCheck(res);
      }

      // 2. MCP 端点路由
      if (req.url?.startsWith(this.config.http.basePath)) {
        return await this.handleMcpRequest(req, res);
      }

      // 3. 未知路由
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    } catch (error) {
      console.error('请求处理错误:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
  }

  /**
   * 处理 MCP 请求
   */
  private async handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // CORS 预检请求
    if (req.method === 'OPTIONS') {
      this.applyCorsHeaders(res, req.headers.origin);
      res.writeHead(204);
      res.end();
      return;
    }

    // 应用 CORS
    this.applyCorsHeaders(res, req.headers.origin);

    // 速率限制检查
    const clientIp = req.socket.remoteAddress || 'unknown';
    if (!this.checkRateLimit(clientIp)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too Many Requests' }));
      return;
    }

    // 验证 Accept 头（POST 请求初始化时必需）
    if (req.method === 'POST') {
      const acceptHeader = req.headers.accept;
      if (!acceptHeader || 
          (!acceptHeader.includes('application/json') && !acceptHeader.includes('text/event-stream'))) {
        console.warn('警告: 客户端未设置正确的 Accept 头。MCP 协议要求 Accept 头必须包含 application/json 和 text/event-stream');
        // 注意：不自动修正，让 Transport 返回标准的 406 错误
      }
    }

    // 获取会话 ID
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    let transport: StreamableHTTPServerTransport;
    let mcpServer: McpServer;

    if (sessionId && this.sessions.has(sessionId)) {
      // 使用已存在的会话
      const session = this.sessions.get(sessionId)!;
      transport = session.transport;
      mcpServer = session.mcpServer;
      console.log(`使用已存在会话: ${sessionId}`);
    } else {
      // 如果提供了 Session ID 但不存在，返回错误
      if (sessionId) {
        console.warn(`警告: 会话 ${sessionId} 不存在，客户端需要重新初始化`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Session expired. Please re-initialize.'
          },
          id: null
        }));
        return;
      }

      // 创建新的会话
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (newSessionId) => {
          // 会话初始化完成后，保存 Transport 和 McpServer 实例
          console.log(`新会话已初始化: ${newSessionId}`);
          this.sessions.set(newSessionId, { transport, mcpServer });
        }
      });

      mcpServer = createMcpServer();

      // 立即连接 Transport 和 McpServer
      await mcpServer.connect(transport);

      // 设置 Transport 事件处理器
      this.setupTransportEvents(transport);
    }

    // 委托给 Transport 处理请求
    await transport.handleRequest(req, res);
  }

  /**
   * 设置 Transport 事件处理器
   */
  private setupTransportEvents(transport: StreamableHTTPServerTransport): void {
    transport.onerror = (error: any) => {
      // 忽略重复初始化的错误
      if (error.message?.includes('Server already initialized')) {
        console.warn('警告: 客户端尝试重复初始化，已忽略');
        return;
      }
      
      console.error('Transport 错误:', error);
    };

    transport.onclose = () => {
      console.log('Transport 连接关闭');
      // 清理已关闭的会话
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.transport === transport) {
          this.sessions.delete(sessionId);
          console.log(`已清理会话: ${sessionId}`);
          break;
        }
      }
    };
  }

  /**
   * 健康检查端点
   */
  private handleHealthCheck(res: ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    }));
  }

  /**
   * CORS 中间件
   */
  private applyCorsHeaders(res: ServerResponse, origin?: string): void {
    const allowedOrigins = this.config.cors.allowedOrigins;

    if (allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', this.config.cors.allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  /**
   * 速率限制检查
   */
  private checkRateLimit(ip: string): boolean {
    if (!this.config.rateLimit.enabled) {
      return true;
    }

    const now = Date.now();
    const record = this.rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      // 新的时间窗口
      this.rateLimitMap.set(ip, {
        count: 1,
        resetTime: now + this.config.rateLimit.windowMs
      });
      return true;
    }

    if (record.count >= this.config.rateLimit.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }
}
