import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Mail, RefreshCw, Plus, Edit2, Trash2, Power, PowerOff, X, Loader2 } from 'lucide-react'
import { getMessageNotifications, deleteMessageNotification, updateMessageNotification, addMessageNotification } from '@/api/notifications'
import { useUIStore } from '@/store/uiStore'
import { PageLoading } from '@/components/common/Loading'
import type { MessageNotification } from '@/types'

export function MessageNotifications() {
  const { addToast } = useUIStore()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<MessageNotification[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNotification, setEditingNotification] = useState<MessageNotification | null>(null)
  const [formName, setFormName] = useState('')
  const [formKeyword, setFormKeyword] = useState('')
  const [formChannelId, setFormChannelId] = useState('')
  const [formEnabled, setFormEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const result = await getMessageNotifications()
      if (result.success) {
        setNotifications(result.data || [])
      }
    } catch {
      addToast({ type: 'error', message: '加载消息通知失败' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const handleToggleEnabled = async (notification: MessageNotification) => {
    try {
      await updateMessageNotification(notification.id, { enabled: !notification.enabled })
      addToast({ type: 'success', message: notification.enabled ? '通知已禁用' : '通知已启用' })
      loadNotifications()
    } catch {
      addToast({ type: 'error', message: '操作失败' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个消息通知吗？')) return
    try {
      await deleteMessageNotification(id)
      addToast({ type: 'success', message: '删除成功' })
      loadNotifications()
    } catch {
      addToast({ type: 'error', message: '删除失败' })
    }
  }

  const openAddModal = () => {
    setEditingNotification(null)
    setFormName('')
    setFormKeyword('')
    setFormChannelId('')
    setFormEnabled(true)
    setIsModalOpen(true)
  }

  const openEditModal = (notification: MessageNotification) => {
    setEditingNotification(notification)
    setFormName(notification.name)
    setFormKeyword(notification.trigger_keyword || '')
    setFormChannelId(notification.channel_id || '')
    setFormEnabled(notification.enabled)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingNotification(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      addToast({ type: 'warning', message: '请输入通知名称' })
      return
    }

    setSaving(true)
    try {
      const data = {
        name: formName.trim(),
        trigger_keyword: formKeyword.trim() || undefined,
        channel_id: formChannelId.trim() || undefined,
        enabled: formEnabled,
      }

      if (editingNotification) {
        await updateMessageNotification(editingNotification.id, data)
        addToast({ type: 'success', message: '通知已更新' })
      } else {
        await addMessageNotification(data)
        addToast({ type: 'success', message: '通知已添加' })
      }

      closeModal()
      loadNotifications()
    } catch {
      addToast({ type: 'error', message: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">消息通知</h1>
          <p className="page-description">配置关键词触发的消息通知</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openAddModal} className="btn-ios-primary ">
            <Plus className="w-4 h-4" />
            添加通知
          </button>
          <button onClick={loadNotifications} className="btn-ios-secondary ">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="vben-card"
      >
        <div className="vben-card-header 
                      flex items-center justify-between">
          <h2 className="vben-card-title ">
            <Mail className="w-4 h-4" />
            通知规则
          </h2>
          <span className="badge-primary">{notifications.length} 条规则</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-ios">
            <thead>
              <tr>
                <th>名称</th>
                <th>触发关键词</th>
                <th>通知渠道</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Mail className="w-12 h-12 text-gray-300" />
                      <p>暂无消息通知规则</p>
                    </div>
                  </td>
                </tr>
              ) : (
                notifications.map((notification) => (
                  <tr key={notification.id}>
                    <td className="font-medium">{notification.name}</td>
                    <td>
                      <code className="bg-primary-50 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-sm">
                        {notification.trigger_keyword || '全部消息'}
                      </code>
                    </td>
                    <td className="text-sm text-gray-500">
                      {notification.channel_id || '-'}
                    </td>
                    <td>
                      {notification.enabled ? (
                        <span className="badge-success">启用</span>
                      ) : (
                        <span className="badge-danger">禁用</span>
                      )}
                    </td>
                    <td>
                      <div className="">
                        <button
                          onClick={() => handleToggleEnabled(notification)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title={notification.enabled ? '禁用' : '启用'}
                        >
                          {notification.enabled ? (
                            <PowerOff className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Power className="w-4 h-4 text-emerald-500" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(notification)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(notification.id)}
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

      {/* 添加/编辑通知弹窗 */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingNotification ? '编辑消息通知' : '添加消息通知'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="input-label">通知名称</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="input-ios"
                    placeholder="如：订单通知"
                  />
                </div>
                <div>
                  <label className="input-label">触发关键词（可选）</label>
                  <input
                    type="text"
                    value={formKeyword}
                    onChange={(e) => setFormKeyword(e.target.value)}
                    className="input-ios"
                    placeholder="留空表示所有消息"
                  />
                </div>
                <div>
                  <label className="input-label">通知渠道ID</label>
                  <input
                    type="text"
                    value={formChannelId}
                    onChange={(e) => setFormChannelId(e.target.value)}
                    className="input-ios"
                    placeholder="输入渠道ID"
                  />
                </div>
                <label className=" text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formEnabled}
                    onChange={(e) => setFormEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-500 dark:text-blue-400"
                  />
                  启用此通知
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
