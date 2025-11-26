import { get, post, put, del } from '@/utils/request'
import type { ApiResponse, User } from '@/types'

// ========== 用户管理 ==========

// 获取用户列表
export const getUsers = (): Promise<{ success: boolean; data?: User[] }> => {
  return get('/admin/users')
}

// 添加用户
export const addUser = (data: { username: string; password: string; email?: string; is_admin?: boolean }): Promise<ApiResponse> => {
  return post('/admin/users', data)
}

// 更新用户
export const updateUser = (userId: number, data: Partial<User & { password?: string }>): Promise<ApiResponse> => {
  return put(`/admin/users/${userId}`, data)
}

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
export const getSystemLogs = (params?: { page?: number; limit?: number; level?: string }): Promise<{ success: boolean; data?: SystemLog[]; total?: number }> => {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.level) query.set('level', params.level)
  return get(`/admin/logs?${query.toString()}`)
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
export const getRiskLogs = (params?: { page?: number; limit?: number; cookie_id?: string }): Promise<{ success: boolean; data?: RiskLog[]; total?: number }> => {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.cookie_id) query.set('cookie_id', params.cookie_id)
  return get(`/admin/risk-control-logs?${query.toString()}`)
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
