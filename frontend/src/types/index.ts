// 用户相关类型
export interface User {
  user_id: number
  username: string
  is_admin: boolean
  email?: string
}

export interface LoginRequest {
  username?: string
  password?: string
  email?: string
  verification_code?: string
}

export interface LoginResponse {
  success: boolean
  message?: string
  token?: string
  user_id?: number
  username?: string
  is_admin?: boolean
}

// 账号相关类型
export interface Account {
  id: string
  cookie: string
  enabled: boolean
  use_ai_reply: boolean
  use_default_reply: boolean
  auto_confirm: boolean
  note?: string
  pause_duration?: number
  created_at?: string
  updated_at?: string
}

export interface AccountDetail extends Account {
  keywords?: Keyword[]
  keywordCount?: number
}

// 关键词相关类型
export interface Keyword {
  id: string
  cookie_id: string
  keyword: string
  reply: string
  fuzzy_match: boolean
  created_at?: string
  updated_at?: string
}

// 商品相关类型
export interface Item {
  id: string
  cookie_id: string
  item_id: string
  title: string
  desc?: string
  price: string
  has_sku: boolean
  multi_delivery: boolean
  created_at?: string
  updated_at?: string
}

export interface ItemReply {
  id: string
  cookie_id: string
  item_id: string
  title?: string
  content?: string
  reply: string
  created_at?: string
  updated_at?: string
}

// 订单相关类型
export interface Order {
  id: string
  order_id: string
  cookie_id: string
  item_id: string
  buyer_id: string
  sku_info?: string
  quantity: number
  amount: string
  status: OrderStatus
  created_at?: string
  updated_at?: string
}

export type OrderStatus = 
  | 'processing' 
  | 'processed' 
  | 'shipped' 
  | 'completed' 
  | 'cancelled' 
  | 'unknown'

// 卡券相关类型
export interface Card {
  id: string
  cookie_id: string
  item_id: string
  keyword?: string
  card_content: string
  is_used: boolean
  used?: boolean
  order_id?: string
  created_at?: string
  updated_at?: string
}

// 发货规则相关类型
export interface DeliveryRule {
  id: string
  cookie_id: string
  item_id?: string
  keyword?: string
  delivery_type: 'card' | 'text' | 'api'
  delivery_content?: string
  api_url?: string
  api_method?: string
  api_params?: string
  enabled: boolean
  created_at?: string
  updated_at?: string
}

// 通知渠道相关类型
export interface NotificationChannel {
  id: string
  cookie_id?: string
  name: string
  type: 'webhook' | 'email' | 'telegram' | 'wechat' | 'dingtalk' | 'feishu'
  channel_type?: string
  channel_name?: string
  channel_config?: string
  config?: Record<string, unknown>
  enabled: boolean
  created_at?: string
  updated_at?: string
}

// 消息通知相关类型
export interface MessageNotification {
  id: string
  cookie_id?: string
  name: string
  notification_type?: string
  trigger_keyword?: string
  channel_id?: string
  channel_ids?: string[]
  enabled: boolean
  created_at?: string
  updated_at?: string
}

// 系统设置相关类型
export interface SystemSettings {
  ai_model?: string
  ai_api_key?: string
  ai_api_url?: string
  ai_base_url?: string
  default_reply?: string
  registration_enabled?: boolean
  show_default_login?: boolean
  show_login_info?: boolean
  login_captcha_enabled?: boolean
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_password?: string
  [key: string]: unknown
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

// 分页相关类型
export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 仪表盘统计类型
export interface DashboardStats {
  totalAccounts: number
  totalKeywords: number
  activeAccounts: number
  totalOrders: number
}
