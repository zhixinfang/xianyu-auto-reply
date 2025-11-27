import { get, post, del } from '@/utils/request'
import type { ApiResponse, User } from '@/types'

// ========== 用户管理 ==========

// 获取用户列表
export const getUsers = async (): Promise<{ success: boolean; data?: User[] }> => {
  const result = await get<{ users: Array<{
    id: number
    username: string
    email?: string
    is_admin: boolean
    cookie_count?: number
    card_count?: number
  }> }>('/admin/users')
  // 后端返回 { users: [...] } 格式，转换字段名
  const users: User[] = (result.users || []).map(u => ({
    user_id: u.id,
    username: u.username,
    email: u.email,
    is_admin: u.is_admin,
  }))
  return { success: true, data: users }
}

// TODO: 后端暂未实现 POST /admin/users 接口
// export const addUser = ...

// TODO: 后端暂未实现 PUT /admin/users/{userId} 接口
// export const updateUser = ...

// 删除用户
export const deleteUser = (userId: number): Promise<ApiResponse> => {
  return del(`/admin/users/${userId}`)
}

// ========== 系统日志 ==========

export interface SystemLog {
  id: string
  level: 'info' | 'warning' | 'error'
  message: string
  module: string
  created_at: string
}

// 获取系统日志
export const getSystemLogs = async (params?: { page?: number; limit?: number; level?: string }): Promise<{ success: boolean; data?: SystemLog[]; total?: number }> => {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.level) query.set('level', params.level)
  const result = await get<{ logs?: string[]; total?: number }>(`/admin/logs?${query.toString()}`)
  // 后端返回 { logs: [...] } 格式，转换为 SystemLog 数组
  const logs: SystemLog[] = (result.logs || []).map((log, index) => ({
    id: String(index),
    level: log.includes('ERROR') ? 'error' : log.includes('WARNING') ? 'warning' : 'info',
    message: log,
    module: 'system',
    created_at: new Date().toISOString(),
  }))
  return { success: true, data: logs, total: result.total }
}

// 清空系统日志
export const clearSystemLogs = (): Promise<ApiResponse> => {
  return del('/admin/logs')
}

// ========== 风控日志 ==========

export interface RiskLog {
  id: string
  cookie_id: string
  risk_type: string
  message: string
  created_at: string
}

// 获取风控日志
export const getRiskLogs = async (params?: { page?: number; limit?: number; cookie_id?: string }): Promise<{ success: boolean; data?: RiskLog[]; total?: number }> => {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.cookie_id) query.set('cookie_id', params.cookie_id)
  const result = await get<{ success: boolean; data?: Array<{
    id: number
    cookie_id: string
    event_type: string
    event_description: string
    processing_result: string
    processing_status: string
    error_message: string | null
    created_at: string
    updated_at: string
    cookie_name: string
  }>; total?: number }>(`/admin/risk-control-logs?${query.toString()}`)
  // 转换后端格式为前端格式
  const logs: RiskLog[] = (result.data || []).map(item => ({
    id: String(item.id),
    cookie_id: item.cookie_id || item.cookie_name,
    risk_type: item.event_type,
    message: item.event_description || item.processing_result,
    created_at: item.created_at,
  }))
  return { success: true, data: logs, total: result.total }
}

// 清空风控日志
export const clearRiskLogs = (): Promise<ApiResponse> => {
  return del('/admin/risk-control-logs')
}

// ========== 数据管理 ==========

// 导出数据
export const exportData = (type: string): Promise<Blob> => {
  return get(`/admin/backup/download?type=${type}`, { responseType: 'blob' }) as Promise<Blob>
}

// 导入数据
export const importData = (formData: FormData): Promise<ApiResponse> => {
  return post('/admin/backup/upload', formData)
}

// 清理数据
export const cleanupData = (type: string): Promise<ApiResponse> => {
  return del(`/admin/data/${type}`)
}
