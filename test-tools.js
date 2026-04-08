/**
 * 测试工具调用功能
 */

import http from 'node:http';

const BASE_URL = 'http://127.0.0.1:3000';

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

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const sessionId = res.headers['mcp-session-id'];
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

async function callTool(sessionId, toolName, args) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
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
        'Mcp-Session-Id': sessionId,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`\n调用工具: ${toolName}`);
    console.log('参数:', JSON.stringify(args, null, 2));

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('响应状态码:', res.statusCode);
        if (res.statusCode === 200) {
          // 解析 SSE 格式响应
          const lines = data.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonData = line.substring(6);
              try {
                const result = JSON.parse(jsonData);
                console.log('工具调用结果:', JSON.stringify(result, null, 2));
                resolve(result);
              } catch (e) {
                console.log('原始数据:', jsonData);
              }
            }
          }
        } else {
          console.log('错误响应:', data);
          reject(new Error(`工具调用失败: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    console.log('=== 测试工具调用功能 ===\n');

    // 初始化会话
    console.log('步骤 1: 初始化会话');
    const sessionId = await initializeSession();
    console.log('✓ 会话 ID:', sessionId);

    // 测试查询门店工具
    console.log('\n步骤 2: 测试 query_stores 工具');
    await callTool(sessionId, 'query_stores', { city: '上海' });

    // 测试查询服务工具
    console.log('\n步骤 3: 测试 query_services 工具');
    await callTool(sessionId, 'query_services', { keyword: '精油' });

    console.log('\n✓ 所有测试完成');
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    console.error(error);
  } finally {
    setTimeout(() => process.exit(0), 1000);
  }
}

main();
