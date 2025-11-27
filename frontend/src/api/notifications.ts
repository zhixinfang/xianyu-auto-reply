import { get, post, put, del } from '@/utils/request'
import type { ApiResponse, NotificationChannel, MessageNotification } from '@/types'

// ========== 通知渠道 ==========

// 获取通知渠道列表
export const getNotificationChannels = (): Promise<{ success: boolean; data?: NotificationChannel[] }> => {
  return get('/notification-channels')
}

// 添加通知渠道
export const addNotificationChannel = (data: Partial<NotificationChannel>): Promise<ApiResponse> => {
  return post('/notification-channels', data)
}

// 更新通知渠道
export const updateNotificationChannel = (channelId: string, data: Partial<NotificationChannel>): Promise<ApiResponse> => {
  return put(`/notification-channels/${channelId}`, data)
}

// 删除通知渠道
export const deleteNotificationChannel = (channelId: string): Promise<ApiResponse> => {
  return del(`/notification-channels/${channelId}`)
}

// 测试通知渠道
export const testNotificationChannel = (channelId: string): Promise<ApiResponse> => {
  return post(`/notification-channels/${channelId}/test`)
}

// ========== 消息通知 ==========

// 获取所有消息通知配置
// 后端返回格式: { cookie_id: { channel_id: { enabled: boolean, channel_name: string } } }
export const getMessageNotifications = async (): Promise<{ success: boolean; data?: MessageNotification[] }> => {
  const result = await get<Record<string, Record<string, { enabled: boolean; channel_name?: string }>>>('/message-notifications')
  // 将嵌套对象转换为数组
  const notifications: MessageNotification[] = []
  for (const [cookieId, channels] of Object.entries(result || {})) {
    for (const [channelId, config] of Object.entries(channels || {})) {
      notifications.push({
        cookie_id: cookieId,
        channel_id: Number(channelId),
        channel_name: config.channel_name,
        enabled: config.enabled,
      })
    }
  }
  return { success: true, data: notifications }
}

// 设置消息通知 - 后端接口需要 cookie_id 作为路径参数
export const setMessageNotification = (cookieId: string, channelId: number, enabled: boolean): Promise<ApiResponse> => {
  return post(`/message-notifications/${cookieId}`, { channel_id: channelId, enabled })
}

// 删除消息通知
export const deleteMessageNotification = (notificationId: string): Promise<ApiResponse> => {
  return del(`/message-notifications/${notificationId}`)
}

// 删除账号的所有消息通知
export const deleteAccountNotifications = (cookieId: string): Promise<ApiResponse> => {
  return del(`/message-notifications/account/${cookieId}`)
}
