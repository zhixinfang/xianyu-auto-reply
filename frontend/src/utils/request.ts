import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token 过期或无效，清除并跳转登录
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 封装 GET 请求
export const get = async <T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await request.get<T>(url, config)
  return response.data
}

// 封装 POST 请求
export const post = async <T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await request.post<T>(url, data, config)
  return response.data
}

// 封装 PUT 请求
export const put = async <T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await request.put<T>(url, data, config)
  return response.data
}

// 封装 DELETE 请求
export const del = async <T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await request.delete<T>(url, config)
  return response.data
}

export default request
