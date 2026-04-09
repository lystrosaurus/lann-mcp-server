import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Store } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 项目根目录（向上两级：src/data -> src -> root）
const ROOT_DIR = join(__dirname, '..', '..');

let storesCache: Store[] | null = null;

/**
 * 加载门店数据
 * @returns 门店数组
 */
export function loadStores(): Store[] {
  if (storesCache) {
    return storesCache;
  }

  try {
    const filePath = join(ROOT_DIR, 'org_store.json');
    const data = readFileSync(filePath, 'utf-8');
    const rawData = JSON.parse(data);
    
    // 确保数据类型兼容性：将旧的大写字段映射到新的小写字段（如果存在）
    storesCache = rawData.map((item: any) => ({
      name: item.name ?? null,
      address: item.address ?? item.ADDRESS ?? null,
      telephone: item.telephone ?? item.TELEPHONE ?? null,
      traffic: item.traffic ?? null,
      longitude: item.longitude ?? null,
      latitude: item.latitude ?? null
    })) as Store[];
    
    return storesCache;
  } catch (error) {
    console.error('加载门店数据失败:', error);
    throw new Error('无法加载门店数据');
  }
}

/**
 * 获取所有门店名称
 * @returns 门店名称数组
 */
export function getStoreNames(): string[] {
  const stores = loadStores();
  return stores
    .map(store => store.name)
    .filter((name): name is string => name !== null && name !== undefined);
}

/**
 * 根据名称查找门店
 * @param name 门店名称
 * @returns 匹配的门店或 null
 */
export function findStoreByName(name: string): Store | null {
  const stores = loadStores();
  const store = stores.find(s => s.name === name);
  return store || null;
}

/**
 * 清除缓存（用于测试）
 */
export function clearStoresCache(): void {
  storesCache = null;
}
