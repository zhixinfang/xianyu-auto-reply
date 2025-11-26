import { get, post, put, del } from '@/utils/request'
import type { ApiResponse, DeliveryRule } from '@/types'

// 获取发货规则列表
export const getDeliveryRules = (accountId?: string): Promise<{ success: boolean; data?: DeliveryRule[] }> => {
  const url = accountId ? `/api/delivery-rules?cookie_id=${accountId}` : '/api/delivery-rules'
  return get(url)
}

// 添加发货规则
export const addDeliveryRule = (data: Partial<DeliveryRule>): Promise<ApiResponse> => {
  return post('/api/delivery-rules', data)
}

// 更新发货规则
export const updateDeliveryRule = (ruleId: string, data: Partial<DeliveryRule>): Promise<ApiResponse> => {
  return put(`/api/delivery-rules/${ruleId}`, data)
}

// 删除发货规则
export const deleteDeliveryRule = (ruleId: string): Promise<ApiResponse> => {
  return del(`/api/delivery-rules/${ruleId}`)
}

// 获取账号的发货规则
export const getDeliveryRulesByAccount = (accountId: string): Promise<DeliveryRule[]> => {
  return get(`/delivery-rules/${accountId}`)
}
