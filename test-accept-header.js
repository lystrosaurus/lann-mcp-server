/**
 * 测试 Accept 头自动修正功能
 */

import http from 'node:http';

console.log('=== 测试 Accept 头自动修正 ===\n');

// 测试 1: 不带 Accept 头的请求（应该被自动修正）
console.log('测试 1: 不带 Accept 头的 POST 请求');
const postData1 = JSON.stringify({
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

const options1 = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/mcp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // 故意不设置 Accept 头
    'Content-Length': Buffer.byteLength(postData1)
  }
};

const req1 = http.request(options1, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('状态码:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('✅ 测试 1 通过: 服务器自动修正了 Accept 头');
      console.log('响应:', data.substring(0, 100) + '...\n');
    } else {
      console.log('❌ 测试 1 失败:', data);
    }
    
    runTest2();
  });
});

req1.on('error', (error) => {
  console.error('❌ 请求错误:', error.message);
});

req1.write(postData1);
req1.end();

// 测试 2: 带正确 Accept 头的请求
function runTest2() {
  console.log('测试 2: 带正确 Accept 头的 POST 请求');
  
  const postData2 = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client-2',
        version: '1.0.0'
      }
    }
  });

  const options2 = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/mcp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Content-Length': Buffer.byteLength(postData2)
    }
  };

  const req2 = http.request(options2, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('状态码:', res.statusCode);
      if (res.statusCode === 200) {
        console.log('✅ 测试 2 通过: 正常的请求也能正常工作');
        console.log('响应:', data.substring(0, 100) + '...\n');
      } else {
        console.log('❌ 测试 2 失败:', data);
      }
      
      console.log('=== 测试完成 ===');
      process.exit(0);
    });
  });

  req2.on('error', (error) => {
    console.error('❌ 请求错误:', error.message);
  });

  req2.write(postData2);
  req2.end();
}
