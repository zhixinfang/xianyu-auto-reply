import { useState, useEffect, useRef } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, RefreshCw, Plus, Edit2, Trash2, Upload, Download } from 'lucide-react'
import { getKeywords, deleteKeyword, addKeyword, updateKeyword, exportKeywords, importKeywords as importKeywordsApi } from '@/api/keywords'
import { getAccounts } from '@/api/accounts'
import { useUIStore } from '@/store/uiStore'
import { PageLoading } from '@/components/common/Loading'
import type { Keyword, Account } from '@/types'

export function Keywords() {
  const { addToast } = useUIStore()
  const [loading, setLoading] = useState(true)
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null)
  const [keywordText, setKeywordText] = useState('')
  const [replyText, setReplyText] = useState('')
  const [fuzzyMatch, setFuzzyMatch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const loadKeywords = async () => {
    if (!selectedAccount) {
      setKeywords([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await getKeywords(selectedAccount)
      setKeywords(data)
    } catch {
      addToast({ type: 'error', message: '加载关键词列表失败' })
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const data = await getAccounts()
      setAccounts(data)
      if (data.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0].id)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadKeywords()
    }
  }, [selectedAccount])

  const openAddModal = () => {
    if (!selectedAccount) {
      addToast({ type: 'warning', message: '请先选择账号' })
      return
    }
    setEditingKeyword(null)
    setKeywordText('')
    setReplyText('')
    setFuzzyMatch(false)
    setIsModalOpen(true)
  }

  const openEditModal = (keyword: Keyword) => {
    setEditingKeyword(keyword)
    setKeywordText(keyword.keyword)
    setReplyText(keyword.reply)
    setFuzzyMatch(!!keyword.fuzzy_match)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!selectedAccount) {
      addToast({ type: 'warning', message: '请先选择账号' })
      return
    }

    if (!keywordText.trim()) {
      addToast({ type: 'warning', message: '请输入关键词' })
      return
    }

    if (!replyText.trim()) {
      addToast({ type: 'warning', message: '请输入回复内容' })
      return
    }

    try {
      setSaving(true)

      if (editingKeyword) {
        await updateKeyword(selectedAccount, editingKeyword.id, {
          keyword: keywordText.trim(),
          reply: replyText.trim(),
          fuzzy_match: fuzzyMatch,
        })
        addToast({ type: 'success', message: '关键词已更新' })
      } else {
        await addKeyword(selectedAccount, {
          keyword: keywordText.trim(),
          reply: replyText.trim(),
          fuzzy_match: fuzzyMatch,
        })
        addToast({ type: 'success', message: '关键词已添加' })
      }

      await loadKeywords()
      setIsModalOpen(false)
    } catch {
      addToast({ type: 'error', message: '保存关键词失败' })
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    if (!selectedAccount) {
      addToast({ type: 'warning', message: '请先选择账号' })
      return
    }

    try {
      setExporting(true)
      const blob = await exportKeywords(selectedAccount)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `keywords_${selectedAccount}_${date}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      addToast({ type: 'success', message: '关键词导出成功' })
    } catch {
      addToast({ type: 'error', message: '关键词导出失败' })
    } finally {
      setExporting(false)
    }
  }

  const handleImportButtonClick = () => {
    if (!selectedAccount) {
      addToast({ type: 'warning', message: '请先选择账号' })
      return
    }
    importInputRef.current?.click()
  }

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      const result = await importKeywordsApi(selectedAccount, file)
      if (result.success) {
        const info = (result.data as { added?: number; updated?: number } | undefined) || {}
        addToast({
          type: 'success',
          message: `导入成功：新增 ${info.added ?? 0} 条，更新 ${info.updated ?? 0} 条`,
        })
        await loadKeywords()
      } else {
        addToast({ type: 'error', message: result.message || '导入失败' })
      }
    } catch {
      addToast({ type: 'error', message: '导入关键词失败' })
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const handleDelete = async (keywordId: string) => {
    if (!confirm('确定要删除这个关键词吗？')) return
    try {
      await deleteKeyword(selectedAccount, keywordId)
      addToast({ type: 'success', message: '删除成功' })
      loadKeywords()
    } catch {
      addToast({ type: 'error', message: '删除失败' })
    }
  }

  if (loading && accounts.length === 0) {
    return <PageLoading />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">自动回复</h1>
          <p className="page-description">管理关键词自动回复规则</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openAddModal}
            className="btn-ios-primary "
          >
            <Plus className="w-4 h-4" />
            添加关键词
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!selectedAccount || exporting}
            className="btn-ios-secondary "
          >
            <Download className="w-4 h-4" />
            导出
          </button>
          <button
            type="button"
            onClick={handleImportButtonClick}
            disabled={!selectedAccount || importing}
            className="btn-ios-secondary "
          >
            <Upload className="w-4 h-4" />
            导入
          </button>
          <button onClick={loadKeywords} className="btn-ios-secondary ">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFileChange}
          />
        </div>
      </div>

      {/* Account Select */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="vben-card"
      >
        <div className="max-w-md">
          <label className="input-label">选择账号</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="input-ios"
          >
            {accounts.length === 0 ? (
              <option value="">暂无账号</option>
            ) : (
              accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.id}
                </option>
              ))
            )}
          </select>
        </div>
      </motion.div>

      {/* Keywords List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="vben-card"
      >
        <div className="vben-card-header">
          <h2 className="vben-card-title flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            关键词列表
          </h2>
          <span className="badge-primary">{keywords.length} 个关键词</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-ios">
            <thead>
              <tr>
                <th>关键词</th>
                <th>回复内容</th>
                <th>匹配模式</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {!selectedAccount ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    请先选择一个账号
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : keywords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <MessageSquare className="w-12 h-12 text-gray-300" />
                      <p>暂无关键词，点击上方按钮添加</p>
                    </div>
                  </td>
                </tr>
              ) : (
                keywords.map((keyword) => (
                  <tr key={keyword.id}>
                    <td className="font-medium">
                      <code className="bg-primary-50 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                        {keyword.keyword}
                      </code>
                    </td>
                    <td className="max-w-[300px]">
                      <p className="truncate text-gray-600" title={keyword.reply}>
                        {keyword.reply}
                      </p>
                    </td>
                    <td>
                      {keyword.fuzzy_match ? (
                        <span className="badge-info">模糊匹配</span>
                      ) : (
                        <span className="badge-gray">精确匹配</span>
                      )}
                    </td>
                    <td>
                      <div className="">
                        <button
                          onClick={() => openEditModal(keyword)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(keyword.id)}
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

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="text-lg font-semibold">
                {editingKeyword ? '编辑关键词' : '添加关键词'}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="input-label">所属账号</label>
                  <input
                    type="text"
                    value={selectedAccount}
                    disabled
                    className="input-ios bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="input-label">关键词</label>
                  <input
                    type="text"
                    value={keywordText}
                    onChange={(e) => setKeywordText(e.target.value)}
                    className="input-ios"
                    placeholder="请输入关键词"
                  />
                </div>
                <div>
                  <label className="input-label">回复内容</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="input-ios h-28 resize-none"
                    placeholder="请输入自动回复内容"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className=" text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={fuzzyMatch}
                      onChange={(e) => setFuzzyMatch(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-500 dark:text-blue-400 focus:ring-primary-500"
                    />
                    使用模糊匹配
                  </label>
                  <p className="text-xs text-gray-400">开启后，将在消息中模糊匹配该关键词</p>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-ios-secondary"
                  disabled={saving}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn-ios-primary"
                  disabled={saving}
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
