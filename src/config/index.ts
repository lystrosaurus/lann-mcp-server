/**
 * 服务器配置管理模块
 * 支持环境变量和命令行参数配置
 */

export interface ServerConfig {
  // 传输层类型: 'stdio' | 'http'
  transport: 'stdio' | 'http';

  // HTTP 服务器配置
  http: {
    host: string;        // 监听地址，默认 '0.0.0.0'
    port: number;        // 监听端口，默认 3000
    basePath: string;    // API 基础路径，默认 '/mcp'
  };

  // CORS 配置
  cors: {
    allowedOrigins: string[];  // 允许的源，默认 ['*']
    allowedMethods: string[];  // 允许的方法，默认 ['GET', 'POST', 'OPTIONS']
  };

  // 速率限制配置
  rateLimit: {
    enabled: boolean;    // 是否启用，默认 true
    windowMs: number;    // 时间窗口（毫秒），默认 60000
    maxRequests: number; // 最大请求数，默认 100
  };
}

const DEFAULT_CONFIG: ServerConfig = {
  transport: 'stdio',
  http: {
    host: '0.0.0.0',
    port: 3000,
    basePath: '/mcp'
  },
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: ['GET', 'POST', 'OPTIONS']
  },
  rateLimit: {
    enabled: true,
    windowMs: 60000,
    maxRequests: 100
  }
};

/**
 * 加载配置
 * 优先级：命令行参数 > 环境变量 > 默认值
 */
export function loadConfig(): ServerConfig {
  const config: ServerConfig = { ...DEFAULT_CONFIG };

  // 从环境变量读取配置
  const transportEnv = process.env.TRANSPORT?.toLowerCase();
  if (transportEnv === 'http' || transportEnv === 'stdio') {
    config.transport = transportEnv;
  }

  // 检查命令行参数（优先级更高）
  const args = process.argv.slice(2);
  if (args.includes('--http')) {
    config.transport = 'http';
  } else if (args.includes('--stdio')) {
    config.transport = 'stdio';
  }

  // HTTP 配置
  if (process.env.HTTP_HOST) {
    config.http.host = process.env.HTTP_HOST;
  }

  if (process.env.HTTP_PORT) {
    const port = parseInt(process.env.HTTP_PORT, 10);
    if (!isNaN(port) && port > 0 && port < 65536) {
      config.http.port = port;
    }
  }

  if (process.env.MCP_BASE_PATH) {
    config.http.basePath = process.env.MCP_BASE_PATH;
  }

  // CORS 配置
  if (process.env.CORS_ORIGINS) {
    config.cors.allowedOrigins = process.env.CORS_ORIGINS.split(',').map(s => s.trim());
  }

  // 速率限制配置
  if (process.env.RATE_LIMIT_ENABLED !== undefined) {
    config.rateLimit.enabled = process.env.RATE_LIMIT_ENABLED === 'true';
  }

  return config;
}
