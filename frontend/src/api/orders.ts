import { get, del, post } from '@/utils/request'
import type { Order, ApiResponse } from '@/types'

// 获取订单列表
export const getOrders = (cookieId?: string, status?: string): Promise<{ success: boolean; data: Order[] }> => {
  const params = new URLSearchParams()
  if (cookieId) params.append('cookie_id', cookieId)
  if (status) params.append('status', status)
  const queryString = params.toString()
  return get(`/api/orders${queryString ? `?${queryString}` : ''}`)
}

// 删除订单
export const deleteOrder = (id: string): Promise<ApiResponse> => {
  return del(`/api/orders/${id}`)
}

// 批量删除订单
export const batchDeleteOrders = (ids: string[]): Promise<ApiResponse> => {
  return post('/api/orders/batch-delete', { ids })
}

// 更新订单状态
export const updateOrderStatus = (id: string, status: string): Promise<ApiResponse> => {
  return post(`/api/orders/${id}/status`, { status })
}
