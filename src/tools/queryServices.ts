import { loadServices, extractDuration } from '../data/serviceLoader.js';
import type { QueryServicesParams } from '../types/index.js';

/**
 * 查询服务项目工具
 * 
 * @param params 查询参数
 * @returns 服务项目列表
 */
export async function queryServices(params: QueryServicesParams = {}): Promise<{
  success: boolean;
  services?: Array<{
    name: string;
    description: string;
    duration?: number | null;
  }>;
  message?: string;
}> {
  try {
    const allServices = loadServices();
    let filteredServices = allServices;

    // 按关键词筛选
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      filteredServices = filteredServices.filter(service => {
        return service.name.toLowerCase().includes(keyword) ||
               (service.desc && service.desc.toLowerCase().includes(keyword));
      });
    }

    // 按时长筛选
    if (params.duration) {
      filteredServices = filteredServices.filter(service => {
        const serviceDuration = extractDuration(service.name);
        return serviceDuration === params.duration;
      });
    }

    // 格式化返回结果
    const formattedServices = filteredServices.map(service => ({
      name: service.name,
      description: service.desc || '暂无描述',
      duration: extractDuration(service.name)
    }));

    return {
      success: true,
      services: formattedServices,
      message: `共找到 ${formattedServices.length} 个服务项目`
    };
  } catch (error) {
    console.error('查询服务项目失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '查询服务项目失败'
    };
  }
}

/**
 * 搜索服务工具（供 MCP Tool 使用）
 */
export const queryServicesTool = {
  name: 'query_services' as const,
  description: '查询蘭泰式按摩服务项目，支持按关键词和时长筛选。可获取服务名称、描述和时长信息。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      keyword: {
        type: 'string' as const,
        description: '关键词，如"精油"、"古法"、"拉伸"、"面部"等'
      },
      duration: {
        type: 'number' as const,
        description: '服务时长（分钟），如 60、90、120 等'
      }
    }
  }
};
