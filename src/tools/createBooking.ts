import { findStoreByName, getStoreNames } from '../data/storeLoader.js';
import { findServiceByName, getServiceNames } from '../data/serviceLoader.js';
import { smartMatch, getMatchMessage } from '../utils/matcher.js';
import { validatePhone, validatePeopleCount, validateBookingTime, validateRequiredString } from '../utils/validator.js';
import type { CreateBookingParams, BookingResponse } from '../types/index.js';

/**
 * 调用后端 API 创建预约
 * @param params 预约参数
 * @returns API 响应结果
 */
async function callCreateBookingAPI(params: {
  mobile: string;
  storeName: string;
  serviceName: string;
  count: number;
  bookTime: string;
}): Promise<{
  success: boolean;
  bookingId?: string;
  message: string;
  startTime?: string;
  endTime?: string;
}> {
  try {
    const response = await fetch('https://open.lannlife.com/mcp/book/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mobile: params.mobile,
        storeName: params.storeName,
        serviceName: params.serviceName,
        count: params.count,
        bookTime: params.bookTime
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP 错误：${response.status}`);
    }

    const result = await response.json() as {
      code: string;
      msg: string;
      body?: {
        bookId: string;
        storeName: string;
        serviceName: string;
        count: number;
        startTime: string;
        endTime: string;
        description: string;
      };
    };

    if (result.code === '200' || result.code === '0') {
      return {
        success: true,
        bookingId: result.body?.bookId,
        message: result.msg || '预约成功！',
        startTime: result.body?.startTime,
        endTime: result.body?.endTime
      };
    } else {
      return {
        success: false,
        message: result.msg || '预约失败'
      };
    }
  } catch (error) {
    console.error('调用预约 API 失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '预约失败，请稍后重试'
    };
  }
}

/**
 * 创建预约工具
 * 
 * @param params 预约参数
 * @returns 预约结果
 */
export async function createBooking(params: CreateBookingParams): Promise<BookingResponse> {
  // 1. 验证必填参数
  const phoneValidation = validateRequiredString(params.phone, '手机号');
  if (!phoneValidation.valid) {
    return { success: false, message: phoneValidation.message! };
  }

  const storeNameValidation = validateRequiredString(params.storeName, '门店名称');
  if (!storeNameValidation.valid) {
    return { success: false, message: storeNameValidation.message! };
  }

  const serviceNameValidation = validateRequiredString(params.serviceName, '服务项目');
  if (!serviceNameValidation.valid) {
    return { success: false, message: serviceNameValidation.message! };
  }

  // 2. 验证手机号格式
  const phoneValid = validatePhone(params.phone);
  if (!phoneValid.valid) {
    return { success: false, message: phoneValid.message! };
  }

  // 3. 验证人数
  const peopleValid = validatePeopleCount(params.peopleCount);
  if (!peopleValid.valid) {
    return { success: false, message: peopleValid.message! };
  }

  // 4. 验证预约时间
  const timeValid = validateBookingTime(params.bookingTime);
  if (!timeValid.valid) {
    return { success: false, message: timeValid.message! };
  }

  // 5. 智能匹配门店
  const storeMatchResult = smartMatch(params.storeName, getStoreNames());
  
  if (!storeMatchResult.matched) {
    const message = getMatchMessage(storeMatchResult, '门店');
    return { success: false, message };
  }

  const matchedStore = findStoreByName(storeMatchResult.exactMatch!);
  if (!matchedStore) {
    return { success: false, message: '未找到匹配的门店信息' };
  }

  // 6. 智能匹配服务
  const serviceMatchResult = smartMatch(params.serviceName, getServiceNames());
  
  if (!serviceMatchResult.matched) {
    const message = getMatchMessage(serviceMatchResult, '服务项目');
    return { success: false, message };
  }

  const matchedService = findServiceByName(serviceMatchResult.exactMatch!);
  if (!matchedService) {
    return { success: false, message: '未找到匹配的服务项目' };
  }

  // 7. 调用真实后端 API
  const apiResult = await callCreateBookingAPI({
    mobile: params.phone,
    storeName: matchedStore.name!,
    serviceName: matchedService.name,
    count: params.peopleCount,
    bookTime: params.bookingTime
  });

  // 8. 返回结果
  return {
    ...apiResult,
    storeInfo: matchedStore,
    serviceInfo: matchedService
  };
}

/**
 * 创建预约工具定义（供 MCP Tool 使用）
 */
export const createBookingTool = {
  name: 'create_booking' as const,
  description: '创建蘭泰式按摩预约。需要提供手机号、门店名称、服务项目、人数和预约时间。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      phone: {
        type: 'string' as const,
        description: '手机号码（11 位中国大陆手机号）'
      },
      storeName: {
        type: 'string' as const,
        description: '门店名称，如"淮海店"、"花木店"、"新天地复兴 soho 店"等'
      },
      serviceName: {
        type: 'string' as const,
        description: '服务项目名称，如"传统古法全身按摩 -90 分钟"、"泰式精油全身护理 -90 分钟"等'
      },
      peopleCount: {
        type: 'number' as const,
        description: '预约人数（1-20 人）'
      },
      bookingTime: {
        type: 'string' as const,
        description: '预约时间，ISO 8601 格式（如：2024-01-15T14:00:00）'
      }
    },
    required: ['phone', 'storeName', 'serviceName', 'peopleCount', 'bookingTime']
  }
};
