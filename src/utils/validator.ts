/**
 * 验证手机号格式（中国大陆）
 * @param phone 手机号
 * @returns 验证结果
 */
export function validatePhone(phone: string): { valid: boolean; message?: string } {
  if (!phone) {
    return { valid: false, message: '手机号不能为空' };
  }

  const phoneRegex = /^1[3-9]\d{9}$/;
  
  if (!phoneRegex.test(phone)) {
    return { 
      valid: false, 
      message: '手机号格式不正确，请输入 11 位中国大陆手机号' 
    };
  }

  return { valid: true };
}

/**
 * 验证人数
 * @param count 人数
 * @returns 验证结果
 */
export function validatePeopleCount(count: number): { valid: boolean; message?: string } {
  if (!count || count <= 0) {
    return { valid: false, message: '人数必须大于 0' };
  }

  if (!Number.isInteger(count)) {
    return { valid: false, message: '人数必须是整数' };
  }

  if (count > 20) {
    return { valid: false, message: '人数不能超过 20 人' };
  }

  return { valid: true };
}

/**
 * 验证预约时间
 * @param timeStr 时间字符串（ISO 8601 格式）
 * @returns 验证结果
 */
export function validateBookingTime(timeStr: string): { valid: boolean; message?: string } {
  if (!timeStr) {
    return { valid: false, message: '预约时间不能为空' };
  }

  const date = new Date(timeStr);
  
  if (isNaN(date.getTime())) {
    return { valid: false, message: '预约时间格式不正确，请使用 ISO 8601 格式（如：2024-01-15T14:00:00）' };
  }

  const now = new Date();
  if (date < now) {
    return { valid: false, message: '预约时间不能早于当前时间' };
  }

  // 检查是否是未来 30 天内的预约
  const maxDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (date > maxDate) {
    return { valid: false, message: '只能预约未来 30 天内的服务' };
  }

  return { valid: true };
}

/**
 * 验证字符串非空
 * @param value 字符串值
 * @param fieldName 字段名称
 * @returns 验证结果
 */
export function validateRequiredString(value: string | undefined | null, fieldName: string): { valid: boolean; message?: string } {
  if (!value || value.trim().length === 0) {
    return { valid: false, message: `${fieldName}不能为空` };
  }

  return { valid: true };
}
