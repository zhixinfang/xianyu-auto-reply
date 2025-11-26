import { get, post, put, del } from '@/utils/request'
import type { Account, AccountDetail, ApiResponse } from '@/types'

// 获取账号列表
export const getAccounts = (): Promise<Account[]> => {
  return get('/cookies')
}

// 获取账号详情列表
export const getAccountDetails = (): Promise<AccountDetail[]> => {
  return get('/cookies/details')
}

// 添加账号
export const addAccount = (data: { id: string; cookie: string }): Promise<ApiResponse> => {
  return post('/cookies', data)
}

// 更新账号
export const updateAccount = (id: string, data: Partial<Account>): Promise<ApiResponse> => {
  return put(`/cookies/${id}`, data)
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
