import { get, post, put, del } from '@/utils/request'
import type { ApiResponse, NotificationChannel, MessageNotification } from '@/types'

// ========== 通知渠道 ==========

// 获取通知渠道列表
export const getNotificationChannels = (): Promise<{ success: boolean; data?: NotificationChannel[] }> => {
  return get('/api/notification-channels')
}

// 添加通知渠道
export const addNotificationChannel = (data: Partial<NotificationChannel>): Promise<ApiResponse> => {
  return post('/api/notification-channels', data)
}

// 更新通知渠道
export const updateNotificationChannel = (channelId: string, data: Partial<NotificationChannel>): Promise<ApiResponse> => {
  return put(`/api/notification-channels/${channelId}`, data)
}

// 删除通知渠道
export const deleteNotificationChannel = (channelId: string): Promise<ApiResponse> => {
  return del(`/api/notification-channels/${channelId}`)
}

// 测试通知渠道
export const testNotificationChannel = (channelId: string): Promise<ApiResponse> => {
  return post(`/api/notification-channels/${channelId}/test`)
}

// ========== 消息通知 ==========

// 获取消息通知列表
export const getMessageNotifications = (): Promise<{ success: boolean; data?: MessageNotification[] }> => {
  return get('/api/message-notifications')
}

// 添加消息通知
export const addMessageNotification = (data: Partial<MessageNotification>): Promise<ApiResponse> => {
  return post('/api/message-notifications', data)
}

// 更新消息通知
export const updateMessageNotification = (notificationId: string, data: Partial<MessageNotification>): Promise<ApiResponse> => {
  return put(`/api/message-notifications/${notificationId}`, data)
}

// 删除消息通知
export const deleteMessageNotification = (notificationId: string): Promise<ApiResponse> => {
  return del(`/api/message-notifications/${notificationId}`)
}
