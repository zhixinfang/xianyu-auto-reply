import { useState, useEffect, useRef } from 'react'
import { Settings as SettingsIcon, Save, Bot, Mail, Shield, RefreshCw, Key, Database, Download, Upload, Archive } from 'lucide-react'
import { getSystemSettings, updateSystemSettings, testAIConnection, testEmailSend, changePassword, downloadDatabaseBackup, uploadDatabaseBackup, reloadSystemCache, exportUserBackup, importUserBackup } from '@/api/settings'
import { getAccounts } from '@/api/accounts'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { PageLoading, ButtonLoading } from '@/components/common/Loading'
import { Select } from '@/components/common/Select'
import type { SystemSettings, Account } from '@/types'

export function Settings() {
  const { addToast } = useUIStore()
  const { isAuthenticated, token, _hasHydrated, user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  
  // 密码修改状态
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  
  // 备份管理状态
  const [uploadingBackup, setUploadingBackup] = useState(false)
  const [reloadingCache, setReloadingCache] = useState(false)
  const backupFileRef = useRef<HTMLInputElement>(null)
  const userBackupFileRef = useRef<HTMLInputElement>(null)
  
  // AI 测试账号选择
  const [accounts, setAccounts] = useState<Account[]>([])
  const [testAccountId, setTestAccountId] = useState('')
  const [testingAI, setTestingAI] = useState(false)

  const loadSettings = async () => {
    if (!_hasHydrated || !isAuthenticated || !token) return
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
    if (!_hasHydrated || !isAuthenticated || !token) return
    loadSettings()
  }, [_hasHydrated, isAuthenticated, token])

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

  // 加载账号列表
  const loadAccounts = async () => {
    try {
      const data = await getAccounts()
      setAccounts(data)
      if (data.length > 0 && !testAccountId) {
        setTestAccountId(data[0].id)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (_hasHydrated && isAuthenticated && token) {
      loadAccounts()
    }
  }, [_hasHydrated, isAuthenticated, token])

  const handleTestAI = async () => {
    if (!testAccountId) {
      addToast({ type: 'warning', message: '请先选择一个账号' })
      return
    }
    setTestingAI(true)
    try {
      const result = await testAIConnection(testAccountId)
      if (result.success) {
        addToast({ type: 'success', message: result.message || 'AI 连接测试成功' })
      } else {
        addToast({ type: 'error', message: result.message || 'AI 连接测试失败' })
      }
    } catch {
      addToast({ type: 'error', message: 'AI 连接测试失败' })
    } finally {
      setTestingAI(false)
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

  // 修改密码
  const handleChangePassword = async () => {
    if (!currentPassword) {
      addToast({ type: 'warning', message: '请输入当前密码' })
      return
    }
    if (!newPassword) {
      addToast({ type: 'warning', message: '请输入新密码' })
      return
    }
    if (newPassword !== confirmPassword) {
      addToast({ type: 'warning', message: '两次输入的密码不一致' })
      return
    }
    if (newPassword.length < 6) {
      addToast({ type: 'warning', message: '新密码长度不能少于6位' })
      return
    }
    try {
      setChangingPassword(true)
      const result = await changePassword({ current_password: currentPassword, new_password: newPassword })
      if (result.success) {
        addToast({ type: 'success', message: '密码修改成功' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        addToast({ type: 'error', message: result.message || '密码修改失败' })
      }
    } catch {
      addToast({ type: 'error', message: '密码修改失败' })
    } finally {
      setChangingPassword(false)
    }
  }

  // 下载数据库备份（管理员）
  const handleDownloadBackup = () => {
    const url = downloadDatabaseBackup()
    window.open(url, '_blank')
  }

  // 上传数据库备份（管理员）
  const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.db')) {
      addToast({ type: 'error', message: '只支持 .db 格式的数据库文件' })
      return
    }
    if (!confirm('警告：恢复数据库将覆盖所有当前数据！确定要继续吗？')) {
      e.target.value = ''
      return
    }
    try {
      setUploadingBackup(true)
      const result = await uploadDatabaseBackup(file)
      if (result.success) {
        addToast({ type: 'success', message: '数据库恢复成功' })
      } else {
        addToast({ type: 'error', message: result.message || '数据库恢复失败' })
      }
    } catch {
      addToast({ type: 'error', message: '数据库恢复失败' })
    } finally {
      setUploadingBackup(false)
      e.target.value = ''
    }
  }

  // 刷新系统缓存
  const handleReloadCache = async () => {
    try {
      setReloadingCache(true)
      const result = await reloadSystemCache()
      if (result.success) {
        addToast({ type: 'success', message: '系统缓存已刷新' })
      } else {
        addToast({ type: 'error', message: result.message || '刷新缓存失败' })
      }
    } catch {
      addToast({ type: 'error', message: '刷新缓存失败' })
    } finally {
      setReloadingCache(false)
    }
  }

  // 导出用户备份
  const handleExportUserBackup = () => {
    const url = exportUserBackup()
    window.open(url, '_blank')
  }

  // 导入用户备份
  const handleImportUserBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.json')) {
      addToast({ type: 'error', message: '只支持 .json 格式的备份文件' })
      return
    }
    try {
      const result = await importUserBackup(file)
      if (result.success) {
        addToast({ type: 'success', message: '备份导入成功' })
      } else {
        addToast({ type: 'error', message: result.message || '备份导入失败' })
      }
    } catch {
      addToast({ type: 'error', message: '备份导入失败' })
    } finally {
      e.target.value = ''
    }
  }

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-4">
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

      {/* 双列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左列 */}
        <div className="space-y-4">
          {/* General Settings */}
          <div className="vben-card">
            <div className="vben-card-header">
              <h2 className="vben-card-title">
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
                <label className="switch-ios">
                  <input
                    type="checkbox"
                    checked={settings?.registration_enabled ?? true}
                    onChange={(e) => setSettings(s => s ? { ...s, registration_enabled: e.target.checked } : null)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">显示默认登录信息</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">登录页面显示默认账号密码提示</p>
                </div>
                <label className="switch-ios">
                  <input
                    type="checkbox"
                    checked={settings?.show_default_login_info ?? true}
                    onChange={(e) => setSettings(s => s ? { ...s, show_default_login_info: e.target.checked } : null)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* AI Settings */}
          <div className="vben-card">
            <div className="vben-card-header">
              <h2 className="vben-card-title">
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
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="input-label">测试账号</label>
                  <Select
                    value={testAccountId}
                    onChange={setTestAccountId}
                    options={accounts.map(a => ({ value: a.id, label: a.id }))}
                    placeholder="选择账号"
                  />
                </div>
                <button 
                  onClick={handleTestAI} 
                  className="btn-ios-secondary"
                  disabled={testingAI || !testAccountId}
                >
                  {testingAI ? '测试中...' : '测试 AI 连接'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 右列 */}
        <div className="space-y-4">
          {/* Email Settings */}
          <div className="vben-card">
            <div className="vben-card-header">
              <h2 className="vben-card-title">
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
              <h2 className="vben-card-title">
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
                <label className="switch-ios">
                  <input
                    type="checkbox"
                    checked={settings?.login_captcha_enabled ?? false}
                    onChange={(e) => setSettings(s => s ? { ...s, login_captcha_enabled: e.target.checked } : null)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 密码修改 */}
      <div className="vben-card">
        <div className="vben-card-header">
          <h2 className="vben-card-title">
            <Key className="w-4 h-4 text-purple-500" />
            修改密码
          </h2>
        </div>
        <div className="vben-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="input-group">
              <label className="input-label">当前密码</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="请输入当前密码"
                className="input-ios"
              />
            </div>
            <div className="input-group">
              <label className="input-label">新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码"
                className="input-ios"
              />
            </div>
            <div className="input-group">
              <label className="input-label">确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                className="input-ios"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="btn-ios-primary"
            >
              {changingPassword ? <ButtonLoading /> : <Key className="w-4 h-4" />}
              修改密码
            </button>
          </div>
        </div>
      </div>

      {/* 数据备份 */}
      <div className="vben-card">
        <div className="vben-card-header">
          <h2 className="vben-card-title">
            <Archive className="w-4 h-4 text-blue-500" />
            数据备份
          </h2>
        </div>
        <div className="vben-card-body">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 用户数据备份 */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 dark:bg-blue-900/20 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
              <div className="relative p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Download className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">用户数据备份</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">导出您的账号、关键词、卡券等数据</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={handleExportUserBackup} className="btn-ios-primary">
                    <Download className="w-4 h-4" />
                    导出备份
                  </button>
                  <label className="btn-ios-secondary cursor-pointer">
                    <Upload className="w-4 h-4" />
                    导入备份
                    <input
                      ref={userBackupFileRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleImportUserBackup}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* 管理员数据库备份 */}
            {user?.is_admin && (
              <div className="relative overflow-hidden rounded-xl border border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 dark:bg-red-900/30 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
                <div className="relative p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-red-900 dark:text-red-100">数据库备份</h3>
                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium">管理员</span>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-300">完整备份或恢复整个数据库</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mb-4">
                    <button onClick={handleDownloadBackup} className="btn-ios-primary bg-red-500 hover:bg-red-600 focus:ring-red-500">
                      <Download className="w-4 h-4" />
                      下载数据库
                    </button>
                    <label className="btn-ios-secondary cursor-pointer">
                      {uploadingBackup ? <ButtonLoading /> : <Upload className="w-4 h-4" />}
                      恢复数据库
                      <input
                        ref={backupFileRef}
                        type="file"
                        accept=".db"
                        className="hidden"
                        onChange={handleUploadBackup}
                        disabled={uploadingBackup}
                      />
                    </label>
                    <button
                      onClick={handleReloadCache}
                      disabled={reloadingCache}
                      className="btn-ios-secondary"
                    >
                      {reloadingCache ? <ButtonLoading /> : <RefreshCw className="w-4 h-4" />}
                      刷新缓存
                    </button>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-red-100/50 dark:bg-red-900/30 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      恢复数据库将覆盖所有当前数据，请谨慎操作
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
