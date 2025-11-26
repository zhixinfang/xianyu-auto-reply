import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Bot, Mail, Shield, RefreshCw } from 'lucide-react'
import { getSystemSettings, updateSystemSettings, testAIConnection, testEmailSend } from '@/api/settings'
import { useUIStore } from '@/store/uiStore'
import { PageLoading, ButtonLoading } from '@/components/common/Loading'
import type { SystemSettings } from '@/types'

export function Settings() {
  const { addToast } = useUIStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SystemSettings | null>(null)

  const loadSettings = async () => {
    try {
      setLoading(true)
      const result = await getSystemSettings()
      if (result.success && result.data) {
        setSettings(result.data)
      }
    } catch {
      addToast({ type: 'error', message: '加载系统设置失败' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async () => {
    if (!settings) return
    try {
      setSaving(true)
      const result = await updateSystemSettings(settings)
      if (result.success) {
        addToast({ type: 'success', message: '设置保存成功' })
      } else {
        addToast({ type: 'error', message: result.message || '保存失败' })
      }
    } catch {
      addToast({ type: 'error', message: '保存设置失败' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestAI = async () => {
    try {
      const result = await testAIConnection()
      if (result.success) {
        addToast({ type: 'success', message: 'AI 连接测试成功' })
      } else {
        addToast({ type: 'error', message: result.message || 'AI 连接测试失败' })
      }
    } catch {
      addToast({ type: 'error', message: 'AI 连接测试失败' })
    }
  }

  const handleTestEmail = async () => {
    const email = prompt('请输入测试邮箱地址:')
    if (!email) return
    try {
      const result = await testEmailSend(email)
      if (result.success) {
        addToast({ type: 'success', message: '测试邮件发送成功' })
      } else {
        addToast({ type: 'error', message: result.message || '发送测试邮件失败' })
      }
    } catch {
      addToast({ type: 'error', message: '发送测试邮件失败' })
    }
  }

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="page-header flex-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">系统设置</h1>
          <p className="page-description">配置系统全局设置</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSettings} className="btn-ios-secondary">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-ios-primary">
            {saving ? <ButtonLoading /> : <Save className="w-4 h-4" />}
            保存设置
          </button>
        </div>
      </div>

      {/* General Settings */}
      <div className="vben-card">
        <div className="vben-card-header">
          <h2 className="vben-card-title flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            基础设置
          </h2>
        </div>
        <div className="vben-card-body space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">允许用户注册</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">开启后允许新用户注册账号</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.registration_enabled ?? true}
                onChange={(e) => setSettings(s => s ? { ...s, registration_enabled: e.target.checked } : null)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-2 
                            peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer 
                            peer-checked:after:translate-x-full peer-checked:after:border-white 
                            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                            after:bg-white after:border-slate-300 after:border after:rounded-full 
                            after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">显示默认登录信息</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">登录页面显示默认账号密码提示</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.show_login_info ?? true}
                onChange={(e) => setSettings(s => s ? { ...s, show_login_info: e.target.checked } : null)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-2 
                            peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer 
                            peer-checked:after:translate-x-full peer-checked:after:border-white 
                            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                            after:bg-white after:border-slate-300 after:border after:rounded-full 
                            after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
            </label>
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="vben-card">
        <div className="vben-card-header">
          <h2 className="vben-card-title flex items-center gap-2">
            <Bot className="w-4 h-4 text-green-500" />
            AI 设置
          </h2>
        </div>
        <div className="vben-card-body space-y-4">
          <div className="input-group">
            <label className="input-label">API 地址</label>
            <input
              type="text"
              value={settings?.ai_api_url || ''}
              onChange={(e) => setSettings(s => s ? { ...s, ai_api_url: e.target.value } : null)}
              placeholder="https://api.openai.com/v1"
              className="input-ios"
            />
          </div>
          <div className="input-group">
            <label className="input-label">API Key</label>
            <input
              type="password"
              value={settings?.ai_api_key || ''}
              onChange={(e) => setSettings(s => s ? { ...s, ai_api_key: e.target.value } : null)}
              placeholder="sk-..."
              className="input-ios"
            />
          </div>
          <div className="input-group">
            <label className="input-label">模型</label>
            <input
              type="text"
              value={settings?.ai_model || ''}
              onChange={(e) => setSettings(s => s ? { ...s, ai_model: e.target.value } : null)}
              placeholder="gpt-3.5-turbo"
              className="input-ios"
            />
          </div>
          <button onClick={handleTestAI} className="btn-ios-secondary">
            测试 AI 连接
          </button>
        </div>
      </div>

      {/* Email Settings */}
      <div className="vben-card">
        <div className="vben-card-header">
          <h2 className="vben-card-title flex items-center gap-2">
            <Mail className="w-4 h-4 text-amber-500" />
            邮件设置
          </h2>
        </div>
        <div className="vben-card-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">SMTP 服务器</label>
              <input
                type="text"
                value={settings?.smtp_host || ''}
                onChange={(e) => setSettings(s => s ? { ...s, smtp_host: e.target.value } : null)}
                placeholder="smtp.example.com"
                className="input-ios"
              />
            </div>
            <div className="input-group">
              <label className="input-label">端口</label>
              <input
                type="number"
                value={settings?.smtp_port || 465}
                onChange={(e) => setSettings(s => s ? { ...s, smtp_port: parseInt(e.target.value) } : null)}
                placeholder="465"
                className="input-ios"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">发件人邮箱</label>
              <input
                type="email"
                value={settings?.smtp_user || ''}
                onChange={(e) => setSettings(s => s ? { ...s, smtp_user: e.target.value } : null)}
                placeholder="noreply@example.com"
                className="input-ios"
              />
            </div>
            <div className="input-group">
              <label className="input-label">密码/授权码</label>
              <input
                type="password"
                value={settings?.smtp_password || ''}
                onChange={(e) => setSettings(s => s ? { ...s, smtp_password: e.target.value } : null)}
                placeholder="••••••••"
                className="input-ios"
              />
            </div>
          </div>
          <button onClick={handleTestEmail} className="btn-ios-secondary">
            发送测试邮件
          </button>
        </div>
      </div>

      {/* Security Settings */}
      <div className="vben-card">
        <div className="vben-card-header">
          <h2 className="vben-card-title flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            安全设置
          </h2>
        </div>
        <div className="vben-card-body">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">启用登录验证码</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">登录时需要输入图形验证码</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.login_captcha_enabled ?? false}
                onChange={(e) => setSettings(s => s ? { ...s, login_captcha_enabled: e.target.checked } : null)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-2 
                            peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer 
                            peer-checked:after:translate-x-full peer-checked:after:border-white 
                            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                            after:bg-white after:border-slate-300 after:border after:rounded-full 
                            after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
