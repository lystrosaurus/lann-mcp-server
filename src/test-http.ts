/**
 * HTTP/SSE 传输层集成测试
 */

async function runHttpTests() {
  console.log('开始 HTTP/SSE 传输层测试...\n');

  const baseUrl = 'http://127.0.0.1:3001';

  try {
    // 1. 健康检查测试
    console.log('测试 1: 健康检查端点');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json() as { status: string; version: string };
    console.assert(healthRes.status === 200, '健康检查应返回 200');
    console.assert(healthData.status === 'ok', '状态应为 ok');
    console.assert(healthData.version === '2.0.0', '版本应为 2.0.0');
    console.log('✓ 健康检查通过\n');

    // 2. 404 路由测试
    console.log('测试 2: 未知路由返回 404');
    const notFoundRes = await fetch(`${baseUrl}/unknown`);
    console.assert(notFoundRes.status === 404, '未知路由应返回 404');
    console.log('✓ 404 处理正确\n');

    console.log('所有 HTTP 测试通过！');
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

runHttpTests();
