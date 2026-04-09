/**
 * 门店数据类型定义
 */
export interface Store {
  name: string | null;
  address: string | null;
  telephone: string | null;
  traffic: string | null;
  longitude?: number | null;
  latitude?: number | null;
}

/**
 * 服务项目类型定义
 */
export interface Service {
  name: string;
  desc: string | null;
}

/**
 * 预约请求参数
 */
export interface CreateBookingParams {
  mobile: string;
  storeName: string;
  serviceName: string;
  count: number;
  bookTime: string; // ISO 8601 format
}

/**
 * 预约响应
 */
export interface BookingResponse {
  success: boolean;
  bookingId?: string;
  message: string;
  storeInfo?: Store;
  serviceInfo?: Service;
}

/**
 * 匹配结果
 */
export interface MatchResult {
  matched: boolean;
  exactMatch?: string;
  suggestions?: string[];
  confidence: 'high' | 'medium' | 'low' | 'none';
}

/**
 * 查询门店参数
 */
export interface QueryStoresParams {
  city?: string;
  keyword?: string;
}

/**
 * 查询服务参数
 */
export interface QueryServicesParams {
  keyword?: string;
  duration?: number;
}
