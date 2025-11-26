import { get, post, put } from '@/utils/request'
import type { ApiResponse, SystemSettings } from '@/types'

// 获取系统设置
export const getSystemSettings = (): Promise<{ success: boolean; data?: SystemSettings }> => {
  return get('/system-settings')
}

// 更新系统设置
export const updateSystemSettings = (data: Partial<SystemSettings>): Promise<ApiResponse> => {
  // 逐个更新设置项
  const promises = Object.entries(data).map(([key, value]) => 
    put(`/system-settings/${key}`, { value })
  )
  return Promise.all(promises).then(() => ({ success: true, message: '设置已保存' }))
}

// 获取 AI 设置
export const getAISettings = (): Promise<{ success: boolean; data?: Record<string, unknown> }> => {
  return get('/ai-reply-settings')
}

// 更新 AI 设置
export const updateAISettings = (data: Record<string, unknown>): Promise<ApiResponse> => {
  return put('/ai-reply-settings', data)
}

// 测试 AI 连接
export const testAIConnection = (): Promise<ApiResponse> => {
  return post('/ai-reply-test/default')
}

// 获取邮件设置
export const getEmailSettings = (): Promise<{ success: boolean; data?: Record<string, unknown> }> => {
  return get('/system-settings')
}

// 更新邮件设置
export const updateEmailSettings = (data: Record<string, unknown>): Promise<ApiResponse> => {
  const promises = Object.entries(data).map(([key, value]) => 
    put(`/system-settings/${key}`, { value })
  )
  return Promise.all(promises).then(() => ({ success: true, message: '设置已保存' }))
}

// 测试邮件发送
export const testEmailSend = (email: string): Promise<ApiResponse> => {
  return post('/send-verification-code', { email, type: 'test' })
}
