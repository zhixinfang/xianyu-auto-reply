import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Bell, RefreshCw, Plus, Edit2, Trash2, Send, Power, PowerOff, X, Loader2 } from 'lucide-react'
import { getNotificationChannels, deleteNotificationChannel, updateNotificationChannel, testNotificationChannel, addNotificationChannel } from '@/api/notifications'
import { useUIStore } from '@/store/uiStore'
import { PageLoading } from '@/components/common/Loading'
import type { NotificationChannel } from '@/types'

const channelTypeLabels: Record<string, string> = {
  email: '邮件',
  wechat: '微信',
  dingtalk: '钉钉',
  feishu: '飞书',
  webhook: 'Webhook',
  telegram: 'Telegram',
}

export function NotificationChannels() {
  const { addToast } = useUIStore()
  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState<NotificationChannel[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<'email' | 'wechat' | 'dingtalk' | 'feishu' | 'webhook' | 'telegram'>('email')
  const [formConfig, setFormConfig] = useState('')
  const [formEnabled, setFormEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadChannels = async () => {
    try {
      setLoading(true)
      const result = await getNotificationChannels()
      if (result.success) {
        setChannels(result.data || [])
      }
    } catch {
      addToast({ type: 'error', message: '加载通知渠道失败' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChannels()
  }, [])

  const handleToggleEnabled = async (channel: NotificationChannel) => {
    try {
      await updateNotificationChannel(channel.id, { enabled: !channel.enabled })
      addToast({ type: 'success', message: channel.enabled ? '渠道已禁用' : '渠道已启用' })
      loadChannels()
    } catch {
      addToast({ type: 'error', message: '操作失败' })
    }
  }

  const handleTest = async (id: string) => {
    try {
      const result = await testNotificationChannel(id)
      if (result.success) {
        addToast({ type: 'success', message: '测试消息发送成功' })
      } else {
        addToast({ type: 'error', message: result.message || '测试失败' })
      }
    } catch {
      addToast({ type: 'error', message: '测试失败' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个通知渠道吗？')) return
    try {
      await deleteNotificationChannel(id)
      addToast({ type: 'success', message: '删除成功' })
      loadChannels()
    } catch {
      addToast({ type: 'error', message: '删除失败' })
    }
  }

  const openAddModal = () => {
    setEditingChannel(null)
    setFormName('')
    setFormType('email')
    setFormConfig('')
    setFormEnabled(true)
    setIsModalOpen(true)
  }

  const openEditModal = (channel: NotificationChannel) => {
    setEditingChannel(channel)
    setFormName(channel.name)
    setFormType(channel.type)
    setFormConfig(JSON.stringify(channel.config || {}, null, 2))
    setFormEnabled(channel.enabled)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingChannel(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      addToast({ type: 'warning', message: '请输入渠道名称' })
      return
    }

    setSaving(true)
    try {
      let config = {}
      if (formConfig.trim()) {
        try {
          config = JSON.parse(formConfig)
        } catch {
          addToast({ type: 'error', message: '配置JSON格式错误' })
          setSaving(false)
          return
        }
      }

      const data = {
        name: formName.trim(),
        type: formType,
        config,
        enabled: formEnabled,
      }

      if (editingChannel) {
        await updateNotificationChannel(editingChannel.id, data)
        addToast({ type: 'success', message: '渠道已更新' })
      } else {
        await addNotificationChannel(data)
        addToast({ type: 'success', message: '渠道已添加' })
      }

      closeModal()
      loadChannels()
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
          <h1 className="page-title">通知渠道</h1>
          <p className="page-description">配置消息推送渠道</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openAddModal} className="btn-ios-primary ">
            <Plus className="w-4 h-4" />
            添加渠道
          </button>
          <button onClick={loadChannels} className="btn-ios-secondary ">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-full vben-card p-8 text-center"
          >
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无通知渠道，点击上方按钮添加</p>
          </motion.div>
        ) : (
          channels.map((channel, index) => (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="vben-card"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    channel.enabled ? 'bg-primary-100 text-blue-500 dark:text-blue-400' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="vben-card-title text-gray-900">{channel.name}</h3>
                    <p className="text-sm text-gray-500">
                      {channelTypeLabels[channel.type] || channel.type}
                    </p>
                  </div>
                </div>
                {channel.enabled ? (
                  <span className="badge-success">启用</span>
                ) : (
                  <span className="badge-gray">禁用</span>
                )}
              </div>

              <div className=" mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleToggleEnabled(channel)}
                  className="flex-1 btn-ios-secondary py-2 text-sm flex items-center justify-center gap-1"
                >
                  {channel.enabled ? (
                    <>
                      <PowerOff className="w-4 h-4" />
                      禁用
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      启用
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleTest(channel.id)}
                  className="flex-1 btn-ios-secondary py-2 text-sm flex items-center justify-center gap-1"
                >
                  <Send className="w-4 h-4" />
                  测试
                </button>
                <button
                  onClick={() => openEditModal(channel)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="编辑"
                >
                  <Edit2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                </button>
                <button
                  onClick={() => handleDelete(channel.id)}
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* 添加/编辑渠道弹窗 */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="modal-header flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingChannel ? '编辑通知渠道' : '添加通知渠道'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="input-label">渠道名称</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="input-ios"
                    placeholder="如：我的邮箱通知"
                  />
                </div>
                <div>
                  <label className="input-label">渠道类型</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as typeof formType)}
                    className="input-ios"
                  >
                    <option value="email">邮件</option>
                    <option value="wechat">微信</option>
                    <option value="dingtalk">钉钉</option>
                    <option value="feishu">飞书</option>
                    <option value="webhook">Webhook</option>
                    <option value="telegram">Telegram</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">配置 (JSON)</label>
                  <textarea
                    value={formConfig}
                    onChange={(e) => setFormConfig(e.target.value)}
                    className="input-ios h-32 resize-none font-mono text-sm"
                    placeholder='{"webhook_url": "..."}'
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    根据渠道类型填写对应的配置，如webhook_url、token等
                  </p>
                </div>
                <label className=" text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formEnabled}
                    onChange={(e) => setFormEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-500 dark:text-blue-400"
                  />
                  启用此渠道
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
