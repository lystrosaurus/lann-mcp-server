/**
 * 完整功能测试脚本
 */

import { queryStores } from './tools/queryStores.js';
import { queryServices } from './tools/queryServices.js';
import { createBooking } from './tools/createBooking.js';

async function runTests() {
  console.log('=== Lann MCP Server 完整功能测试 ===\n');

  // 测试 1: 查询所有门店
  console.log('1. 查询所有门店:');
  const allStores = await queryStores();
  console.log(`   ✓ 找到 ${allStores.stores?.length} 家门店\n`);

  // 测试 2: 按城市查询门店
  console.log('2. 查询上海的门店:');
  const shanghaiStores = await queryStores({ city: '上海' });
  console.log(`   ✓ 找到 ${shanghaiStores.stores?.length} 家门店\n`);

  // 测试 3: 关键词搜索门店
  console.log('3. 搜索"淮海"相关门店:');
  const huaihaiStores = await queryStores({ keyword: '淮海' });
  console.log(`   ✓ 找到 ${huaihaiStores.stores?.length} 家门店\n`);

  // 测试 4: 查询所有服务
  console.log('4. 查询所有服务项目:');
  const allServices = await queryServices();
  console.log(`   ✓ 找到 ${allServices.services?.length} 个服务项目\n`);

  // 测试 5: 按关键词查询服务
  console.log('5. 搜索"精油"相关服务:');
  const oilServices = await queryServices({ keyword: '精油' });
  console.log(`   ✓ 找到 ${oilServices.services?.length} 个服务项目\n`);

  // 测试 6: 按时长查询服务
  console.log('6. 查询 90 分钟的服务:');
  const ninetyMinServices = await queryServices({ duration: 90 });
  console.log(`   ✓ 找到 ${ninetyMinServices.services?.length} 个服务项目\n`);

  // 测试 7: 创建预约（成功场景）
  console.log('7. 测试创建预约（精确匹配）:');
  const bookingResult = await createBooking({
    phone: '13800138000',
    storeName: '淮海店',
    serviceName: '传统古法全身按摩 -90 分钟',
    peopleCount: 2,
    bookingTime: new Date(Date.now() + 86400000).toISOString()
  });
  console.log(`   ${bookingResult.success ? '✓' : '✗'} 预约${bookingResult.success ? '成功' : '失败'}`);
  if (bookingResult.bookingId) {
    console.log(`     预约 ID: ${bookingResult.bookingId}`);
  }
  console.log();

  // 测试 8: 模糊匹配测试
  console.log('8. 测试模糊匹配（输入带空格）:');
  const fuzzyMatchResult = await createBooking({
    phone: '13800138000',
    storeName: '淮海',
    serviceName: '传统古法全身按摩 - 90 分钟',
    peopleCount: 1,
    bookingTime: new Date(Date.now() + 86400000).toISOString()
  });
  console.log(`   ${fuzzyMatchResult.success ? '✓' : '✗'} 匹配${fuzzyMatchResult.success ? '成功' : '失败'}\n`);

  // 测试 9: 验证错误处理 - 无效手机号
  console.log('9. 测试错误处理 - 无效手机号:');
  const invalidPhoneResult = await createBooking({
    phone: '12345',
    storeName: '淮海店',
    serviceName: '传统古法全身按摩 -90 分钟',
    peopleCount: 2,
    bookingTime: new Date(Date.now() + 86400000).toISOString()
  });
  console.log(`   ✓ 正确捕获错误：${invalidPhoneResult.message}\n`);

  // 测试 10: 不存在的门店
  console.log('10. 测试错误处理 - 不存在的门店:');
  const invalidStoreResult = await createBooking({
    phone: '13800138000',
    storeName: '不存在的门店',
    serviceName: '传统古法全身按摩 -90 分钟',
    peopleCount: 2,
    bookingTime: new Date(Date.now() + 86400000).toISOString()
  });
  console.log(`   ✓ 正确捕获错误：${invalidStoreResult.message}\n`);

  console.log('=== 所有测试完成 ===');
}

runTests().catch(console.error);
