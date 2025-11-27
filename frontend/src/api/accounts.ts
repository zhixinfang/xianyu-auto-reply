import { get, post, put, del } from '@/utils/request'
import type { Account, AccountDetail, ApiResponse } from '@/types'

// 获取账号列表（返回账号ID数组）
export const getAccounts = async (): Promise<Account[]> => {
  const ids: string[] = await get('/cookies')
  // 后端返回的是账号ID数组，转换为Account对象数组
  return ids.map(id => ({ 
    id, 
    cookie: '', 
    enabled: true,
    use_ai_reply: false,
    use_default_reply: false,
    auto_confirm: false
  }))
}

// 获取账号详情列表
export const getAccountDetails = async (): Promise<AccountDetail[]> => {
  interface BackendAccountDetail {
    id: string
    value: string
    enabled: boolean
    auto_confirm: boolean
    remark?: string
    pause_duration?: number
  }
  const data = await get<BackendAccountDetail[]>('/cookies/details')
  // 后端返回 value 字段，前端使用 cookie 字段
  return data.map((item) => ({
    id: item.id,
    cookie: item.value,
    enabled: item.enabled,
    auto_confirm: item.auto_confirm,
    note: item.remark,
    pause_duration: item.pause_duration,
    use_ai_reply: false,
    use_default_reply: false,
  }))
}

// 添加账号
export const addAccount = (data: { id: string; cookie: string }): Promise<ApiResponse> => {
  // 后端需要 id 和 value 字段
  return post('/cookies', { id: data.id, value: data.cookie })
}

// 更新账号 Cookie 值
export const updateAccountCookie = (id: string, value: string): Promise<ApiResponse> => {
  return put(`/cookies/${id}`, { id, value })
}

// 更新账号启用/禁用状态
export const updateAccountStatus = (id: string, enabled: boolean): Promise<ApiResponse> => {
  return put(`/cookies/${id}/status`, { enabled })
}

// 更新账号备注
export const updateAccountRemark = (id: string, remark: string): Promise<ApiResponse> => {
  return put(`/cookies/${id}/remark`, { remark })
}

// 更新账号自动确认设置
export const updateAccountAutoConfirm = (id: string, autoConfirm: boolean): Promise<ApiResponse> => {
  return put(`/cookies/${id}/auto-confirm`, { auto_confirm: autoConfirm })
}

// 更新账号暂停时间
export const updateAccountPauseDuration = (id: string, pauseDuration: number): Promise<ApiResponse> => {
  return put(`/cookies/${id}/pause-duration`, { pause_duration: pauseDuration })
}

// 删除账号
export const deleteAccount = (id: string): Promise<ApiResponse> => {
  return del(`/cookies/${id}`)
}

// 获取账号二维码登录
export const getQRCode = (accountId: string): Promise<{ success: boolean; qrcode_url?: string; token?: string }> => {
  return post('/qrcode/generate', { account_id: accountId })
}

// 检查二维码登录状态
export const checkQRCodeStatus = (token: string): Promise<{ success: boolean; status: string; cookie?: string }> => {
  return post('/qrcode/check', { token })
}

// 账号密码登录
export const passwordLogin = (data: { account_id: string; account: string; password: string; show_browser?: boolean }): Promise<ApiResponse> => {
  return post('/password-login', data)
}

// 生成扫码登录二维码
export const generateQRLogin = (): Promise<{ success: boolean; session_id?: string; qr_code_url?: string; message?: string }> => {
  return post('/qr-login/generate')
}

// 检查扫码登录状态
export const checkQRLoginStatus = (sessionId: string): Promise<{
  success: boolean
  status: 'pending' | 'scanned' | 'success' | 'expired' | 'cancelled' | 'verification_required' | 'processing' | 'already_processed'
  message?: string
  account_info?: {
    account_id: string
    is_new_account: boolean
  }
}> => {
  return get(`/qr-login/check/${sessionId}`)
}

// 检查密码登录状态
export const checkPasswordLoginStatus = (sessionId: string): Promise<{
  success: boolean
  status: 'pending' | 'processing' | 'success' | 'failed' | 'verification_required'
  message?: string
  account_id?: string
}> => {
  return get(`/password-login/status/${sessionId}`)
}
