import { get, put } from '@/utils/request'
import type { ApiResponse, SystemSettings } from '@/types'

// 获取系统设置
export const getSystemSettings = async (): Promise<{ success: boolean; data?: SystemSettings }> => {
  const data = await get<Record<string, unknown>>('/system-settings')
  // 将字符串 'true'/'false' 转换为布尔值
  const booleanFields = ['registration_enabled', 'show_login_info', 'login_captcha_enabled', 'show_default_login']
  const converted: SystemSettings = {}
  for (const [key, value] of Object.entries(data)) {
    if (booleanFields.includes(key)) {
      converted[key] = value === true || value === 'true'
    } else {
      converted[key] = value
    }
  }
  return { success: true, data: converted }
}

// 更新系统设置
export const updateSystemSettings = async (data: Partial<SystemSettings>): Promise<ApiResponse> => {
  // 逐个更新设置项，确保 value 是字符串
  const promises = Object.entries(data).map(([key, value]) => {
    // 将布尔值和数字转换为字符串
    const stringValue = typeof value === 'boolean' ? (value ? 'true' : 'false') 
                      : typeof value === 'number' ? String(value)
                      : value
    return put(`/system-settings/${key}`, { value: stringValue })
  })
  await Promise.all(promises)
  return { success: true, message: '设置已保存' }
}

// 获取 AI 设置
export const getAISettings = (): Promise<{ success: boolean; data?: Record<string, unknown> }> => {
  return get('/ai-reply-settings')
}

// 更新 AI 设置
export const updateAISettings = (data: Record<string, unknown>): Promise<ApiResponse> => {
  return put('/ai-reply-settings', data)
}

// TODO: 测试 AI 连接需要指定 cookie_id，后端接口为 POST /ai-reply-test/{cookie_id}
// 系统设置页面的测试按钮暂时无法使用，需要先选择账号
export const testAIConnection = async (): Promise<ApiResponse> => {
  // 后端需要有效的 cookie_id，这里返回提示信息
  return { success: false, message: 'AI 测试需要先选择一个账号，请在账号管理页面的 AI 设置中测试' }
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

// TODO: 测试邮件发送功能需要后端支持 type: 'test' 参数
// 当前后端的 /send-verification-code 接口只支持 'register' 和 'login' 类型
export const testEmailSend = async (_email: string): Promise<ApiResponse> => {
  return { success: false, message: '邮件测试功能暂未实现，请检查 SMTP 配置后直接保存' }
}
