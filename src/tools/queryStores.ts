import { loadStores } from '../data/storeLoader.js';
import type { QueryStoresParams } from '../types/index.js';

/**
 * 查询门店工具
 * 
 * @param params 查询参数
 * @returns 门店列表
 */
export async function queryStores(params: QueryStoresParams = {}): Promise<{
  success: boolean;
  stores?: Array<{
    name: string;
    address: string;
    telephone: string;
    traffic: string;
    longitude?: number | null;
    latitude?: number | null;
  }>;
  message?: string;
}> {
  try {
    const allStores = loadStores();
    let filteredStores = allStores;

    // 按关键词筛选
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      filteredStores = filteredStores.filter(store => {
        if (!store.name) return false;
        return store.name.toLowerCase().includes(keyword) ||
               (store.address && store.address.toLowerCase().includes(keyword)) ||
               (store.traffic && store.traffic.toLowerCase().includes(keyword));
      });
    }

    // 按城市筛选（从地址或门店名称中提取）
    if (params.city) {
      const city = params.city.toLowerCase();
      filteredStores = filteredStores.filter(store => {
        if (!store.name && !store.address) return false;
        const searchText = `${store.name || ''} ${store.address || ''}`.toLowerCase();
        return searchText.includes(city);
      });
    }

    // 格式化返回结果
    const formattedStores = filteredStores
      .filter(store => store.name !== null) // 只返回有名称的门店
      .map(store => ({
        name: store.name || '未知门店',
        address: store.address || '地址不详',
        telephone: store.telephone || '电话不详',
        traffic: store.traffic || '交通指引不详',
        longitude: store.longitude,
        latitude: store.latitude
      }));

    return {
      success: true,
      stores: formattedStores,
      message: `共找到 ${formattedStores.length} 家门店`
    };
  } catch (error) {
    console.error('查询门店失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '查询门店失败'
    };
  }
}

/**
 * 搜索门店（供 MCP Tool 使用）
 */
export const queryStoresTool = {
  name: 'query_stores' as const,
  description: '查询蘭泰式按摩门店信息，支持按城市和关键词搜索。可获取门店地址、电话和交通指引。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      city: {
        type: 'string' as const,
        description: '城市名称，如"上海"、"杭州"、"成都"等'
      },
      keyword: {
        type: 'string' as const,
        description: '关键词，如"淮海"、"新天地"、"地铁"等'
      }
    }
  }
};
