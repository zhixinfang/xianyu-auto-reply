import { post } from '@/utils/request'
import type { Item } from '@/types'

// 搜索商品
export const searchItems = (keyword: string, accountId?: string): Promise<{ success: boolean; data?: Item[] }> => {
  return post('/api/items/search', { keyword, cookie_id: accountId })
}
