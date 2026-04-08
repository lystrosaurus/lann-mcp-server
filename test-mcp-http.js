/**
 * MCP HTTP 客户端完整测试示例
 * 
 * 演示正确的 MCP Streamable HTTP 协议使用流程：
 * 1. POST 初始化连接
 * 2. GET 建立 SSE 连接
 */

import http from 'node:http';

const BASE_URL = 'http://127.0.0.1:3000';

/**
 * 步骤 1: 发送初始化请求 (POST)
 */
async function initializeSession() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    });

    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('步骤 1: 发送初始化请求 (POST /mcp)');
    console.log('请求体:', postData);
    console.log('');

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('响应状态码:', res.statusCode);
        console.log('响应头:', res.headers);
        console.log('响应体:', data);
        console.log('');

        if (res.statusCode === 200) {
          const sessionId = res.headers['mcp-session-id'];
          console.log('✓ 会话 ID:', sessionId);
          console.log('');
          resolve(sessionId);
        } else {
          reject(new Error(`初始化失败: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * 步骤 2: 建立 SSE 连接 (GET)
 */
function establishSSEConnection(sessionId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/mcp',
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Mcp-Session-Id': sessionId
      }
    };

    console.log('步骤 2: 建立 SSE 连接 (GET /mcp)');
    console.log('会话 ID:', sessionId);
    console.log('');

    const req = http.request(options, (res) => {
      console.log('SSE 连接状态码:', res.statusCode);
      console.log('--- 开始接收 SSE 事件 ---\n');

      res.on('data', (chunk) => {
        console.log('收到事件:', chunk.toString());
      });

      res.on('end', () => {
        console.log('\n--- SSE 连接关闭 ---');
        resolve();
      });

      res.on('error', reject);
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * 主测试流程
 */
async function main() {
  try {
    console.log('=== MCP HTTP 协议测试 ===\n');

    // 步骤 1: 初始化
    const sessionId = await initializeSession();

    // 步骤 2: 建立 SSE 连接
    await establishSSEConnection(sessionId);

    console.log('\n✓ 测试完成');
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    console.error(error);
  } finally {
    setTimeout(() => process.exit(0), 1000);
  }
}

main();
