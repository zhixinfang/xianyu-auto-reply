import { get, post, put, del } from '@/utils/request'
import type { Keyword, ApiResponse } from '@/types'

// 获取关键词列表
export const getKeywords = (cookieId: string): Promise<Keyword[]> => {
  return get(`/keywords/${cookieId}`)
}

// 添加关键词
export const addKeyword = (cookieId: string, data: Partial<Keyword>): Promise<ApiResponse> => {
  return post(`/keywords/${cookieId}`, data)
}

// 更新关键词
export const updateKeyword = (cookieId: string, keywordId: string, data: Partial<Keyword>): Promise<ApiResponse> => {
  return put(`/keywords/${cookieId}/${keywordId}`, data)
}

// 删除关键词
export const deleteKeyword = (cookieId: string, keywordId: string): Promise<ApiResponse> => {
  return del(`/keywords/${cookieId}/${keywordId}`)
}

// 批量添加关键词
export const batchAddKeywords = (cookieId: string, keywords: Partial<Keyword>[]): Promise<ApiResponse> => {
  return post(`/keywords/${cookieId}/batch`, { keywords })
}

// 批量删除关键词
export const batchDeleteKeywords = (cookieId: string, keywordIds: string[]): Promise<ApiResponse> => {
  return post(`/keywords/${cookieId}/batch-delete`, { keyword_ids: keywordIds })
}

// 获取默认回复
export const getDefaultReply = (cookieId: string): Promise<{ default_reply: string }> => {
  return get(`/default-reply/${cookieId}`)
}

// 更新默认回复
export const updateDefaultReply = (cookieId: string, defaultReply: string): Promise<ApiResponse> => {
  return put(`/default-reply/${cookieId}`, { default_reply: defaultReply })
}

// 导出关键词（Excel/模板），返回 Blob 供前端触发下载
export const exportKeywords = (cookieId: string): Promise<Blob> => {
  return get<Blob>(`/keywords-export/${cookieId}`, { responseType: 'blob' })
}

// 导入关键词（Excel），上传文件并返回导入结果
export const importKeywords = (
  cookieId: string,
  file: File
): Promise<ApiResponse<{ added: number; updated: number }>> => {
  const formData = new FormData()
  formData.append('file', file)
  return post<ApiResponse<{ added: number; updated: number }>>(`/keywords-import/${cookieId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
