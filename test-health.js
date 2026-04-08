/**
 * 健康检查测试
 */
import http from 'node:http';

const req = http.get('http://127.0.0.1:3000/health', (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('状态码:', res.statusCode);
    console.log('响应:', JSON.parse(data));
  });
});

req.on('error', (error) => {
  console.error('错误:', error);
});
