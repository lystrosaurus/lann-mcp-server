/**
 * SSE 端点测试脚本
 * 
 * 使用方法: node test-sse.js
 */

import http from 'node:http';

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/mcp',
  method: 'GET',
  headers: {
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache'
  }
};

console.log('正在连接到 SSE 端点...');
console.log(`URL: http://${options.hostname}:${options.port}${options.path}\n`);

const req = http.request(options, (res) => {
  console.log('状态码:', res.statusCode);
  console.log('响应头:', res.headers);
  console.log('\n--- 开始接收 SSE 数据 ---\n');

  res.on('data', (chunk) => {
    console.log('收到数据:', chunk.toString());
  });

  res.on('end', () => {
    console.log('\n--- 连接关闭 ---');
  });

  res.on('error', (error) => {
    console.error('响应错误:', error);
  });
});

req.on('error', (error) => {
  console.error('请求错误:', error);
});

req.end();

// 5秒后自动断开
setTimeout(() => {
  console.log('\n测试完成，断开连接...');
  req.destroy();
  process.exit(0);
}, 5000);
