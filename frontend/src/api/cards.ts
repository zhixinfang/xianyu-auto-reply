import { get, post, del } from '@/utils/request'
import type { ApiResponse, Card } from '@/types'

// 获取卡券列表
export const getCards = async (accountId?: string): Promise<{ success: boolean; data?: Card[] }> => {
  const url = accountId ? `/cards?cookie_id=${accountId}` : '/cards'
  const result = await get<Card[] | { cards?: Card[] }>(url)
  // 后端可能返回数组或 { cards: [...] } 格式
  const data = Array.isArray(result) ? result : (result.cards || [])
  return { success: true, data }
}

// 获取账号的卡券列表
export const getCardsByAccount = (accountId: string): Promise<Card[]> => {
  return get(`/cards?cookie_id=${accountId}`)
}

// 添加卡券
export const addCard = (accountId: string, data: { item_id: string; cards: string[] }): Promise<ApiResponse> => {
  return post('/cards', { ...data, cookie_id: accountId })
}

// 删除卡券
export const deleteCard = (cardId: string): Promise<ApiResponse> => {
  return del(`/cards/${cardId}`)
}

// 批量删除卡券
export const batchDeleteCards = (cardIds: string[]): Promise<ApiResponse> => {
  return post('/cards/batch-delete', { ids: cardIds })
}

// 导入卡券（从文本）
export const importCards = (accountId: string, data: { item_id: string; content: string }): Promise<ApiResponse> => {
  return post('/cards', { ...data, cookie_id: accountId, cards: data.content.split('\n').filter(Boolean) })
}
