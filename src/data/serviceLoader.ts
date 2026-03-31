import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Service } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 项目根目录（向上两级：src/data -> src -> root）
const ROOT_DIR = join(__dirname, '..', '..');

let servicesCache: Service[] | null = null;

/**
 * 加载服务项目数据
 * @returns 服务项目数组
 */
export function loadServices(): Service[] {
  if (servicesCache) {
    return servicesCache;
  }

  try {
    const filePath = join(ROOT_DIR, 'prod_service.json');
    const data = readFileSync(filePath, 'utf-8');
    servicesCache = JSON.parse(data) as Service[];
    return servicesCache;
  } catch (error) {
    console.error('加载服务项目数据失败:', error);
    throw new Error('无法加载服务项目数据');
  }
}

/**
 * 获取所有服务名称
 * @returns 服务名称数组
 */
export function getServiceNames(): string[] {
  const services = loadServices();
  return services
    .map(service => service.name)
    .filter((name): name is string => name !== null && name !== undefined);
}

/**
 * 根据名称查找服务
 * @param name 服务名称
 * @returns 匹配的服务或 null
 */
export function findServiceByName(name: string): Service | null {
  const services = loadServices();
  const service = services.find(s => s.name === name);
  return service || null;
}

/**
 * 从服务名称中提取时长（分钟）
 * @param name 服务名称
 * @returns 时长（分钟）或 null
 */
export function extractDuration(name: string): number | null {
  // 匹配类似 "90 分钟", "120 分钟", "-90", "(70 分钟)" 等格式
  const patterns = [
    /(\d+)\s*分钟/,
    /-(\d+)/,
    /(\d+)\s*min/i
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

/**
 * 清除缓存（用于测试）
 */
export function clearServicesCache(): void {
  servicesCache = null;
}
