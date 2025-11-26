import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Truck, RefreshCw, Plus, Edit2, Trash2, Power, PowerOff, X, Loader2 } from 'lucide-react'
import { getDeliveryRules, deleteDeliveryRule, updateDeliveryRule, addDeliveryRule } from '@/api/delivery'
import { getAccounts } from '@/api/accounts'
import { useUIStore } from '@/store/uiStore'
import { PageLoading } from '@/components/common/Loading'
import type { DeliveryRule, Account } from '@/types'

export function Delivery() {
  const { addToast } = useUIStore()
  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState<DeliveryRule[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  
  // 弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<DeliveryRule | null>(null)
  const [formItemId, setFormItemId] = useState('')
  const [formDeliveryType, setFormDeliveryType] = useState<'card' | 'text' | 'api'>('card')
  const [formContent, setFormContent] = useState('')
  const [formEnabled, setFormEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadRules = async () => {
    try {
      setLoading(true)
      const result = await getDeliveryRules(selectedAccount || undefined)
      if (result.success) {
        setRules(result.data || [])
      }
    } catch {
      addToast({ type: 'error', message: '加载发货规则失败' })
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const data = await getAccounts()
      setAccounts(data)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadAccounts()
    loadRules()
  }, [])

  useEffect(() => {
    loadRules()
  }, [selectedAccount])

  const handleToggleEnabled = async (rule: DeliveryRule) => {
    try {
      await updateDeliveryRule(rule.id, { enabled: !rule.enabled })
      addToast({ type: 'success', message: rule.enabled ? '规则已禁用' : '规则已启用' })
      loadRules()
    } catch {
      addToast({ type: 'error', message: '操作失败' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条规则吗？')) return
    try {
      await deleteDeliveryRule(id)
      addToast({ type: 'success', message: '删除成功' })
      loadRules()
    } catch {
      addToast({ type: 'error', message: '删除失败' })
    }
  }

  const openAddModal = () => {
    if (!selectedAccount) {
      addToast({ type: 'warning', message: '请先选择账号' })
      return
    }
    setEditingRule(null)
    setFormItemId('')
    setFormDeliveryType('card')
    setFormContent('')
    setFormEnabled(true)
    setIsModalOpen(true)
  }

  const openEditModal = (rule: DeliveryRule) => {
    setEditingRule(rule)
    setFormItemId(rule.item_id || '')
    setFormDeliveryType((rule.delivery_type as 'card' | 'text' | 'api') || 'card')
    setFormContent(rule.delivery_content || '')
    setFormEnabled(rule.enabled)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingRule(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedAccount && !editingRule) {
      addToast({ type: 'warning', message: '请先选择账号' })
      return
    }

    setSaving(true)
    try {
      const data = {
        cookie_id: editingRule?.cookie_id || selectedAccount,
        item_id: formItemId || undefined,
        delivery_type: formDeliveryType,
        delivery_content: formContent,
        enabled: formEnabled,
      }

      if (editingRule) {
        await updateDeliveryRule(editingRule.id, data)
        addToast({ type: 'success', message: '规则已更新' })
      } else {
        await addDeliveryRule(data)
        addToast({ type: 'success', message: '规则已添加' })
      }

      closeModal()
      loadRules()
    } catch {
      addToast({ type: 'error', message: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  if (loading && rules.length === 0) {
    return <PageLoading />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">自动发货</h1>
          <p className="page-description">配置商品的自动发货规则</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openAddModal} className="btn-ios-primary ">
            <Plus className="w-4 h-4" />
            添加规则
          </button>
          <button onClick={loadRules} className="btn-ios-secondary ">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="vben-card"
      >
        <div className="max-w-md">
          <label className="input-label">筛选账号</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="input-ios"
          >
            <option value="">所有账号</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.id}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Rules List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="vben-card"
      >
        <div className="vben-card-header 
                      flex items-center justify-between">
          <h2 className="vben-card-title ">
            <Truck className="w-4 h-4" />
            发货规则
          </h2>
          <span className="badge-primary">{rules.length} 条规则</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-ios">
            <thead>
              <tr>
                <th>账号ID</th>
                <th>商品ID</th>
                <th>发货类型</th>
                <th>发货内容</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Truck className="w-12 h-12 text-gray-300" />
                      <p>暂无发货规则</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="font-medium text-blue-600 dark:text-blue-400">{rule.cookie_id}</td>
                    <td className="text-sm">{rule.item_id || '所有商品'}</td>
                    <td>
                      {rule.delivery_type === 'card' ? (
                        <span className="badge-info">卡密发货</span>
                      ) : rule.delivery_type === 'text' ? (
                        <span className="badge-warning">固定文本</span>
                      ) : (
                        <span className="badge-gray">其他</span>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate text-gray-500">
                      {rule.delivery_content || '-'}
                    </td>
                    <td>
                      {rule.enabled ? (
                        <span className="badge-success">启用</span>
                      ) : (
                        <span className="badge-danger">禁用</span>
                      )}
                    </td>
                    <td>
                      <div className="">
                        <button
                          onClick={() => handleToggleEnabled(rule)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title={rule.enabled ? '禁用' : '启用'}
                        >
                          {rule.enabled ? (
                            <PowerOff className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Power className="w-4 h-4 text-emerald-500" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(rule)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors"
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
      </motion.div>

      {/* 添加/编辑规则弹窗 */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="modal-header flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingRule ? '编辑发货规则' : '添加发货规则'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="input-label">所属账号</label>
                  <input
                    type="text"
                    value={editingRule?.cookie_id || selectedAccount || '请先选择账号'}
                    disabled
                    className="input-ios bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="input-label">商品ID（可选）</label>
                  <input
                    type="text"
                    value={formItemId}
                    onChange={(e) => setFormItemId(e.target.value)}
                    className="input-ios"
                    placeholder="留空表示适用于所有商品"
                  />
                </div>
                <div>
                  <label className="input-label">发货类型</label>
                  <select
                    value={formDeliveryType}
                    onChange={(e) => setFormDeliveryType(e.target.value as 'card' | 'text' | 'api')}
                    className="input-ios"
                  >
                    <option value="card">卡密发货</option>
                    <option value="text">固定文本</option>
                    <option value="api">API接口</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">
                    {formDeliveryType === 'card' ? '卡密说明' : formDeliveryType === 'api' ? 'API地址' : '发货内容'}
                  </label>
                  <textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="input-ios h-24 resize-none"
                    placeholder={
                      formDeliveryType === 'card'
                        ? '卡密将从卡券库中自动获取'
                        : formDeliveryType === 'api'
                        ? '请输入API接口地址'
                        : '请输入固定发货文本'
                    }
                  />
                </div>
                <label className=" text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formEnabled}
                    onChange={(e) => setFormEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-500 dark:text-blue-400"
                  />
                  启用此规则
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-ios-secondary" disabled={saving}>
                  取消
                </button>
                <button type="submit" className="btn-ios-primary" disabled={saving}>
                  {saving ? (
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
