import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Ticket, RefreshCw, Plus, Trash2, Upload, X, Loader2 } from 'lucide-react'
import { getCards, deleteCard, addCard, importCards } from '@/api/cards'
import { getAccounts } from '@/api/accounts'
import { useUIStore } from '@/store/uiStore'
import { PageLoading } from '@/components/common/Loading'
import { useAuthStore } from '@/store/authStore'
import { Select } from '@/components/common/Select'
import type { Card, Account } from '@/types'

type ModalType = 'add' | 'import' | null

export function Cards() {
  const { addToast } = useUIStore()
  const { isAuthenticated, token, _hasHydrated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [cards, setCards] = useState<Card[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  
  // 添加卡券表单
  const [addItemId, setAddItemId] = useState('')
  const [addCardContent, setAddCardContent] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  
  // 导入卡券表单
  const [importItemId, setImportItemId] = useState('')
  const [importContent, setImportContent] = useState('')
  const [importLoading, setImportLoading] = useState(false)

  const loadCards = async () => {
    if (!_hasHydrated || !isAuthenticated || !token) {
      return
    }
    try {
      setLoading(true)
      const result = await getCards(selectedAccount || undefined)
      if (result.success) {
        setCards(result.data || [])
      }
    } catch {
      addToast({ type: 'error', message: '加载卡券列表失败' })
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    if (!_hasHydrated || !isAuthenticated || !token) {
      return
    }
    try {
      const data = await getAccounts()
      setAccounts(data)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !token) return
    loadAccounts()
    loadCards()
  }, [_hasHydrated, isAuthenticated, token])

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !token) return
    loadCards()
  }, [_hasHydrated, isAuthenticated, token, selectedAccount])

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这张卡券吗？')) return
    try {
      await deleteCard(id)
      addToast({ type: 'success', message: '删除成功' })
      loadCards()
    } catch {
      addToast({ type: 'error', message: '删除失败' })
    }
  }

  const closeModal = () => {
    setActiveModal(null)
    setAddItemId('')
    setAddCardContent('')
    setAddLoading(false)
    setImportItemId('')
    setImportContent('')
    setImportLoading(false)
  }

  const handleAddCard = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedAccount) {
      addToast({ type: 'warning', message: '请先选择账号' })
      return
    }
    if (!addItemId.trim()) {
      addToast({ type: 'warning', message: '请输入商品ID' })
      return
    }
    if (!addCardContent.trim()) {
      addToast({ type: 'warning', message: '请输入卡密内容' })
      return
    }

    setAddLoading(true)
    try {
      const cards = addCardContent.split('\n').map((s) => s.trim()).filter(Boolean)
      const result = await addCard(selectedAccount, { item_id: addItemId.trim(), cards })
      if (result.success) {
        addToast({ type: 'success', message: `成功添加 ${cards.length} 张卡券` })
        closeModal()
        loadCards()
      } else {
        addToast({ type: 'error', message: result.message || '添加失败' })
      }
    } catch {
      addToast({ type: 'error', message: '添加卡券失败' })
    } finally {
      setAddLoading(false)
    }
  }

  const handleImportCards = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedAccount) {
      addToast({ type: 'warning', message: '请先选择账号' })
      return
    }
    if (!importItemId.trim()) {
      addToast({ type: 'warning', message: '请输入商品ID' })
      return
    }
    if (!importContent.trim()) {
      addToast({ type: 'warning', message: '请输入卡密内容' })
      return
    }

    setImportLoading(true)
    try {
      const result = await importCards(selectedAccount, {
        item_id: importItemId.trim(),
        content: importContent,
      })
      if (result.success) {
        addToast({ type: 'success', message: '卡券导入成功' })
        closeModal()
        loadCards()
      } else {
        addToast({ type: 'error', message: result.message || '导入失败' })
      }
    } catch {
      addToast({ type: 'error', message: '导入卡券失败' })
    } finally {
      setImportLoading(false)
    }
  }

  if (loading && cards.length === 0) {
    return <PageLoading />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header flex-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">卡券管理</h1>
          <p className="page-description">管理自动发货的卡密信息</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveModal('import')} className="btn-ios-success">
            <Upload className="w-4 h-4" />
            导入卡券
          </button>
          <button onClick={() => setActiveModal('add')} className="btn-ios-primary">
            <Plus className="w-4 h-4" />
            添加卡券
          </button>
          <button onClick={loadCards} className="btn-ios-secondary">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="vben-card">
        <div className="vben-card-body">
          <div className="max-w-md">
            <div className="input-group">
              <label className="input-label">筛选账号</label>
              <Select
                value={selectedAccount}
                onChange={setSelectedAccount}
                options={[
                  { value: '', label: '所有账号' },
                  ...accounts.map((account) => ({
                    value: account.id,
                    label: account.id,
                  })),
                ]}
                placeholder="所有账号"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div className="vben-card">
        <div className="vben-card-header">
          <h2 className="vben-card-title ">
            <Ticket className="w-4 h-4" />
            卡券列表
          </h2>
          <span className="badge-primary">{cards.length} 张卡券</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-ios">
            <thead>
              <tr>
                <th>账号ID</th>
                <th>商品ID</th>
                <th>卡密内容</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Ticket className="w-12 h-12 text-gray-300" />
                      <p>暂无卡券数据</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cards.map((card) => (
                  <tr key={card.id}>
                    <td className="font-medium text-blue-600 dark:text-blue-400">{card.cookie_id}</td>
                    <td className="text-sm">{card.item_id}</td>
                    <td>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded max-w-[200px] truncate block">
                        {card.card_content}
                      </code>
                    </td>
                    <td>
                      {card.is_used ? (
                        <span className="badge-gray">已使用</span>
                      ) : (
                        <span className="badge-success">未使用</span>
                      )}
                    </td>
                    <td className="text-gray-500 text-sm">
                      {card.created_at ? new Date(card.created_at).toLocaleString() : '-'}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(card.id)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 添加卡券弹窗 */}
      {activeModal === 'add' && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="modal-header flex items-center justify-between">
              <h2 className="text-lg font-semibold">添加卡券</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddCard}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="input-label">所属账号</label>
                  <input
                    type="text"
                    value={selectedAccount || '请先在列表页选择账号'}
                    disabled
                    className="input-ios bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="input-label">商品ID</label>
                  <input
                    type="text"
                    value={addItemId}
                    onChange={(e) => setAddItemId(e.target.value)}
                    className="input-ios"
                    placeholder="请输入商品ID"
                  />
                </div>
                <div>
                  <label className="input-label">卡密内容</label>
                  <textarea
                    value={addCardContent}
                    onChange={(e) => setAddCardContent(e.target.value)}
                    className="input-ios h-32 resize-none font-mono text-sm"
                    placeholder="每行一个卡密，支持批量添加"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    每行输入一个卡密，系统会自动按行拆分
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-ios-secondary" disabled={addLoading}>
                  取消
                </button>
                <button type="submit" className="btn-ios-primary" disabled={addLoading || !selectedAccount}>
                  {addLoading ? (
                    <span className="">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      添加中...
                    </span>
                  ) : (
                    '添加'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 导入卡券弹窗 */}
      {activeModal === 'import' && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="modal-header flex items-center justify-between">
              <h2 className="text-lg font-semibold">导入卡券</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleImportCards}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="input-label">所属账号</label>
                  <input
                    type="text"
                    value={selectedAccount || '请先在列表页选择账号'}
                    disabled
                    className="input-ios bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="input-label">商品ID</label>
                  <input
                    type="text"
                    value={importItemId}
                    onChange={(e) => setImportItemId(e.target.value)}
                    className="input-ios"
                    placeholder="请输入商品ID"
                  />
                </div>
                <div>
                  <label className="input-label">卡密内容（批量）</label>
                  <textarea
                    value={importContent}
                    onChange={(e) => setImportContent(e.target.value)}
                    className="input-ios h-40 resize-none font-mono text-sm"
                    placeholder="粘贴卡密内容，每行一个&#10;支持从Excel/TXT批量粘贴"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    支持从Excel或文本文件中批量粘贴，系统会自动按行解析
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-ios-secondary" disabled={importLoading}>
                  取消
                </button>
                <button type="submit" className="btn-ios-primary" disabled={importLoading || !selectedAccount}>
                  {importLoading ? (
                    <span className="">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      导入中...
                    </span>
                  ) : (
                    '导入'
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
