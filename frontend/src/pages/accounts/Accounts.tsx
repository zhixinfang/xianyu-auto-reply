import { useState, useEffect, useRef, useCallback } from 'react'
import type { FormEvent } from 'react'
import { Plus, RefreshCw, QrCode, Key, Edit2, Trash2, Power, PowerOff, X, Loader2 } from 'lucide-react'
import { getAccountDetails, deleteAccount, updateAccount, addAccount, generateQRLogin, checkQRLoginStatus, passwordLogin } from '@/api/accounts'
import { useUIStore } from '@/store/uiStore'
import { PageLoading } from '@/components/common/Loading'
import type { AccountDetail } from '@/types'

type ModalType = 'qrcode' | 'password' | 'manual' | 'edit' | null

export function Accounts() {
  const { addToast } = useUIStore()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<AccountDetail[]>([])
  const [activeModal, setActiveModal] = useState<ModalType>(null)

  // 扫码登录状态
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [, setQrSessionId] = useState('')
  const [qrStatus, setQrStatus] = useState<'loading' | 'ready' | 'scanned' | 'success' | 'expired' | 'error'>('loading')
  const qrCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 密码登录状态
  const [pwdAccount, setPwdAccount] = useState('')
  const [pwdPassword, setPwdPassword] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdShowBrowser, setPwdShowBrowser] = useState(false)

  // 手动输入状态
  const [manualAccountId, setManualAccountId] = useState('')
  const [manualCookie, setManualCookie] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

  // 编辑账号状态
  const [editingAccount, setEditingAccount] = useState<AccountDetail | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editUseAI, setEditUseAI] = useState(false)
  const [editUseDefault, setEditUseDefault] = useState(false)
  const [editCookie, setEditCookie] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await getAccountDetails()
      setAccounts(data)
    } catch {
      addToast({ type: 'error', message: '加载账号列表失败' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  // 清理扫码检查定时器
  const clearQrCheck = useCallback(() => {
    if (qrCheckIntervalRef.current) {
      clearInterval(qrCheckIntervalRef.current)
      qrCheckIntervalRef.current = null
    }
  }, [])

  // 关闭弹窗时清理
  const closeModal = useCallback(() => {
    clearQrCheck()
    setActiveModal(null)
    setQrCodeUrl('')
    setQrSessionId('')
    setQrStatus('loading')
    setPwdAccount('')
    setPwdPassword('')
    setPwdLoading(false)
    setManualAccountId('')
    setManualCookie('')
    setManualLoading(false)
  }, [clearQrCheck])

  // ==================== 扫码登录 ====================
  const startQRCodeLogin = async () => {
    setActiveModal('qrcode')
    setQrStatus('loading')
    try {
      const result = await generateQRLogin()
      if (result.success && result.qr_code_url && result.session_id) {
        setQrCodeUrl(result.qr_code_url)
        setQrSessionId(result.session_id)
        setQrStatus('ready')
        // 开始轮询
        startQrCheck(result.session_id)
      } else {
        setQrStatus('error')
        addToast({ type: 'error', message: result.message || '生成二维码失败' })
      }
    } catch {
      setQrStatus('error')
      addToast({ type: 'error', message: '生成二维码失败' })
    }
  }

  const startQrCheck = (sessionId: string) => {
    clearQrCheck()
    qrCheckIntervalRef.current = setInterval(async () => {
      try {
        const result = await checkQRLoginStatus(sessionId)
        if (!result.success) return

        switch (result.status) {
          case 'scanned':
            setQrStatus('scanned')
            break
          case 'success':
            setQrStatus('success')
            clearQrCheck()
            addToast({
              type: 'success',
              message: result.account_info?.is_new_account
                ? `新账号 ${result.account_info.account_id} 添加成功`
                : `账号 ${result.account_info?.account_id} 登录成功`,
            })
            setTimeout(() => {
              closeModal()
              loadAccounts()
            }, 1500)
            break
          case 'expired':
            setQrStatus('expired')
            clearQrCheck()
            break
          case 'cancelled':
            clearQrCheck()
            addToast({ type: 'warning', message: '用户取消登录' })
            closeModal()
            break
          case 'verification_required':
            addToast({ type: 'warning', message: '需要手机验证，请在手机上完成' })
            break
        }
      } catch {
        // 忽略网络错误，继续轮询
      }
    }, 2000)
  }

  const refreshQRCode = async () => {
    setQrStatus('loading')
    clearQrCheck()
    try {
      const result = await generateQRLogin()
      if (result.success && result.qr_code_url && result.session_id) {
        setQrCodeUrl(result.qr_code_url)
        setQrSessionId(result.session_id)
        setQrStatus('ready')
        startQrCheck(result.session_id)
      } else {
        setQrStatus('error')
      }
    } catch {
      setQrStatus('error')
    }
  }

  // ==================== 密码登录 ====================
  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!pwdAccount.trim() || !pwdPassword.trim()) {
      addToast({ type: 'warning', message: '请输入账号和密码' })
      return
    }

    setPwdLoading(true)
    try {
      const result = await passwordLogin({
        account_id: pwdAccount.trim(),
        account: pwdAccount.trim(),
        password: pwdPassword,
        show_browser: pwdShowBrowser,
      })
      if (result.success) {
        addToast({ type: 'success', message: '登录请求已提交，请等待处理' })
        closeModal()
        // 延迟刷新列表
        setTimeout(loadAccounts, 3000)
      } else {
        addToast({ type: 'error', message: result.message || '登录失败' })
      }
    } catch {
      addToast({ type: 'error', message: '登录请求失败' })
    } finally {
      setPwdLoading(false)
    }
  }

  // ==================== 手动输入 ====================
  const handleManualAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!manualAccountId.trim()) {
      addToast({ type: 'warning', message: '请输入账号ID' })
      return
    }
    if (!manualCookie.trim()) {
      addToast({ type: 'warning', message: '请输入Cookie' })
      return
    }

    setManualLoading(true)
    try {
      const result = await addAccount({
        id: manualAccountId.trim(),
        cookie: manualCookie.trim(),
      })
      if (result.success) {
        addToast({ type: 'success', message: '账号添加成功' })
        closeModal()
        loadAccounts()
      } else {
        addToast({ type: 'error', message: result.message || '添加失败' })
      }
    } catch {
      addToast({ type: 'error', message: '添加账号失败' })
    } finally {
      setManualLoading(false)
    }
  }

  const handleToggleEnabled = async (account: AccountDetail) => {
    try {
      await updateAccount(account.id, { enabled: !account.enabled })
      addToast({ type: 'success', message: account.enabled ? '账号已禁用' : '账号已启用' })
      loadAccounts()
    } catch {
      addToast({ type: 'error', message: '操作失败' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个账号吗？')) return
    try {
      await deleteAccount(id)
      addToast({ type: 'success', message: '删除成功' })
      loadAccounts()
    } catch {
      addToast({ type: 'error', message: '删除失败' })
    }
  }

  // ==================== 编辑账号 ====================
  const openEditModal = (account: AccountDetail) => {
    setEditingAccount(account)
    setEditNote(account.note || '')
    setEditUseAI(account.use_ai_reply || false)
    setEditUseDefault(account.use_default_reply || false)
    setEditCookie(account.cookie || '')
    setActiveModal('edit')
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingAccount) return

    setEditSaving(true)
    try {
      await updateAccount(editingAccount.id, {
        note: editNote.trim() || undefined,
        use_ai_reply: editUseAI,
        use_default_reply: editUseDefault,
        cookie: editCookie.trim() || undefined,
      })
      addToast({ type: 'success', message: '账号信息已更新' })
      closeModal()
      loadAccounts()
    } catch {
      addToast({ type: 'error', message: '保存失败' })
    } finally {
      setEditSaving(false)
    }
  }

  // 组件卸载时清理
  useEffect(() => {
    return () => clearQrCheck()
  }, [clearQrCheck])

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">账号管理</h1>
          <p className="page-description">管理闲鱼账号Cookie信息</p>
        </div>
        <button onClick={loadAccounts} className="btn-ios-secondary">
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {/* Add Account Card */}
      <div className="vben-card">
        <div className="vben-card-header">
          <h2 className="vben-card-title ">
            <Plus className="w-4 h-4" />
            添加新账号
          </h2>
        </div>
        <div className="vben-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 扫码登录 */}
            <button
              onClick={startQRCodeLogin}
              className="flex items-center gap-3 p-4 rounded-md border border-indigo-200 
                         bg-blue-50 hover:bg-blue-100 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">扫码登录</p>
                <p className="text-xs text-gray-500">推荐方式</p>
              </div>
            </button>

            {/* 账号密码登录 */}
            <button
              onClick={() => setActiveModal('password')}
              className="flex items-center gap-3 p-4 rounded-md border border-gray-200 
                         hover:border-indigo-200 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Key className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">账号密码</p>
                <p className="text-xs text-gray-500">使用账号和密码</p>
              </div>
            </button>

            {/* 手动输入 */}
            <button
              onClick={() => setActiveModal('manual')}
              className="flex items-center gap-3 p-4 rounded-md border border-gray-200 
                         hover:border-indigo-200 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Edit2 className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">手动输入</p>
                <p className="text-xs text-gray-500">手动输入Cookie</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="vben-card">
        <div className="vben-card-header">
          <h2 className="vben-card-title">账号列表</h2>
          <span className="badge-primary">{accounts.length} 个账号</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-ios">
            <thead>
              <tr>
                <th>账号ID</th>
                <th>Cookie</th>
                <th>状态</th>
                <th>AI回复</th>
                <th>默认回复</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state py-8">
                      <p className="text-gray-500">暂无账号，请添加新账号</p>
                    </div>
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="font-medium text-blue-600 dark:text-blue-400">{account.id}</td>
                    <td>
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded max-w-[120px] truncate block">
                        {account.cookie?.substring(0, 25)}...
                      </code>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 ${account.enabled !== false ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`status-dot ${account.enabled !== false ? 'status-dot-success' : 'status-dot-danger'}`} />
                        {account.enabled !== false ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td>
                      <span className={account.use_ai_reply ? 'badge-success' : 'badge-gray'}>
                        {account.use_ai_reply ? '开启' : '关闭'}
                      </span>
                    </td>
                    <td>
                      <span className={account.use_default_reply ? 'badge-success' : 'badge-gray'}>
                        {account.use_default_reply ? '开启' : '关闭'}
                      </span>
                    </td>
                    <td className="text-gray-500 max-w-[80px] truncate">
                      {account.note || '-'}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => handleToggleEnabled(account)}
                          className="table-action-btn"
                          title={account.enabled !== false ? '禁用' : '启用'}
                        >
                          {account.enabled !== false ? (
                            <PowerOff className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Power className="w-4 h-4 text-green-500" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(account)}
                          className="table-action-btn"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(account.id)}
                          className="table-action-btn hover:!bg-red-50"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 扫码登录弹窗 */}
      {activeModal === 'qrcode' && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <h2 className="modal-title">扫码登录</h2>
              <button onClick={closeModal} className="modal-close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body flex flex-col items-center py-6">
              {qrStatus === 'loading' && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
                  <p className="text-sm text-gray-500">正在生成二维码...</p>
                </div>
              )}
              {qrStatus === 'ready' && (
                <div className="flex flex-col items-center gap-3">
                  <img src={qrCodeUrl} alt="登录二维码" className="w-44 h-44 rounded-lg border" />
                  <p className="text-sm text-gray-600">请使用闲鱼APP扫描二维码</p>
                  <p className="text-xs text-gray-400">二维码有效期约5分钟</p>
                </div>
              )}
              {qrStatus === 'scanned' && (
                <div className="flex flex-col items-center gap-3">
                  <img src={qrCodeUrl} alt="登录二维码" className="w-44 h-44 rounded-lg border opacity-50" />
                  <div className=" text-blue-600 dark:text-blue-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>已扫描，等待确认...</span>
                  </div>
                </div>
              )}
              {qrStatus === 'success' && (
                <div className="flex flex-col items-center gap-3 text-green-600">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                    <Power className="w-7 h-7" />
                  </div>
                  <p className="font-medium">登录成功！</p>
                </div>
              )}
              {qrStatus === 'expired' && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-gray-500">二维码已过期</p>
                  <button onClick={refreshQRCode} className="btn-ios-primary btn-sm">
                    刷新二维码
                  </button>
                </div>
              )}
              {qrStatus === 'error' && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-red-500">生成二维码失败</p>
                  <button onClick={refreshQRCode} className="btn-ios-primary btn-sm">
                    重试
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 密码登录弹窗 */}
      {activeModal === 'password' && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <h2 className="modal-title">账号密码登录</h2>
              <button onClick={closeModal} className="modal-close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handlePasswordLogin}>
              <div className="modal-body space-y-4">
                <div className="input-group">
                  <label className="input-label">账号</label>
                  <input
                    type="text"
                    value={pwdAccount}
                    onChange={(e) => setPwdAccount(e.target.value)}
                    className="input-ios"
                    placeholder="请输入闲鱼账号/手机号"
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">密码</label>
                  <input
                    type="password"
                    value={pwdPassword}
                    onChange={(e) => setPwdPassword(e.target.value)}
                    className="input-ios"
                    placeholder="请输入密码"
                  />
                </div>
                <label className=" text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={pwdShowBrowser}
                    onChange={(e) => setPwdShowBrowser(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 dark:text-blue-400"
                  />
                  显示浏览器（调试用）
                </label>
                <p className="input-hint">
                  登录过程可能需要进行人脸验证，请确保手机畅通
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-ios-secondary" disabled={pwdLoading}>
                  取消
                </button>
                <button type="submit" className="btn-ios-primary" disabled={pwdLoading}>
                  {pwdLoading ? (
                    <span className="">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      登录中...
                    </span>
                  ) : (
                    '登录'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 手动输入弹窗 */}
      {activeModal === 'manual' && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2 className="modal-title">手动输入Cookie</h2>
              <button onClick={closeModal} className="modal-close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleManualAdd}>
              <div className="modal-body space-y-4">
                <div className="input-group">
                  <label className="input-label">账号ID</label>
                  <input
                    type="text"
                    value={manualAccountId}
                    onChange={(e) => setManualAccountId(e.target.value)}
                    className="input-ios"
                    placeholder="请输入账号ID（如手机号或用户名）"
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Cookie</label>
                  <textarea
                    value={manualCookie}
                    onChange={(e) => setManualCookie(e.target.value)}
                    className="input-ios h-28 resize-none font-mono text-xs"
                    placeholder="请粘贴完整的Cookie值"
                  />
                  <p className="input-hint">
                    可从浏览器开发者工具中获取Cookie
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-ios-secondary" disabled={manualLoading}>
                  取消
                </button>
                <button type="submit" className="btn-ios-primary" disabled={manualLoading}>
                  {manualLoading ? (
                    <span className="">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      添加中...
                    </span>
                  ) : (
                    '添加账号'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑账号弹窗 */}
      {activeModal === 'edit' && editingAccount && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2 className="modal-title">编辑账号</h2>
              <button onClick={closeModal} className="modal-close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body space-y-4">
                <div className="input-group">
                  <label className="input-label">账号ID</label>
                  <input
                    type="text"
                    value={editingAccount.id}
                    disabled
                    className="input-ios"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">备注</label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="input-ios"
                    placeholder="添加备注信息"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Cookie</label>
                  <textarea
                    value={editCookie}
                    onChange={(e) => setEditCookie(e.target.value)}
                    className="input-ios h-20 resize-none font-mono text-xs"
                    placeholder="更新Cookie值"
                  />
                </div>
                <div className="space-y-2">
                  <label className=" text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={editUseAI}
                      onChange={(e) => setEditUseAI(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 dark:text-blue-400"
                    />
                    启用AI回复
                  </label>
                  <label className=" text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={editUseDefault}
                      onChange={(e) => setEditUseDefault(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 dark:text-blue-400"
                    />
                    启用默认回复
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-ios-secondary" disabled={editSaving}>
                  取消
                </button>
                <button type="submit" className="btn-ios-primary" disabled={editSaving}>
                  {editSaving ? (
                    <span className="">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      保存中...
                    </span>
                  ) : (
                    '保存'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
