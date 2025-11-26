import { useState, useEffect } from 'react'
import { Package, RefreshCw, Search, Trash2, Download, CheckSquare, Square, Loader2 } from 'lucide-react'
import { getItems, deleteItem, fetchItemsFromAccount, batchDeleteItems } from '@/api/items'
import { getAccounts } from '@/api/accounts'
import { useUIStore } from '@/store/uiStore'
import { PageLoading } from '@/components/common/Loading'
import type { Item, Account } from '@/types'

export function Items() {
  const { addToast } = useUIStore()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [fetching, setFetching] = useState(false)
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 })

  const loadItems = async () => {
    try {
      setLoading(true)
      const result = await getItems(selectedAccount || undefined)
      if (result.success) {
        setItems(result.data || [])
      }
    } catch {
      addToast({ type: 'error', message: '加载商品列表失败' })
    } finally {
      setLoading(false)
    }
  }

  const handleFetchItems = async () => {
    if (!selectedAccount) {
      addToast({ type: 'warning', message: '请先选择账号后再获取商品' })
      return
    }

    setFetching(true)
    setFetchProgress({ current: 0, total: 0 })

    try {
      let page = 1
      let hasMore = true
      let totalFetched = 0

      while (hasMore) {
        setFetchProgress({ current: page, total: page })
        const result = await fetchItemsFromAccount(selectedAccount, page)
        
        if (result.success) {
          const fetchedCount = (result as { count?: number }).count || 0
          totalFetched += fetchedCount
          hasMore = (result as { has_more?: boolean }).has_more === true
          page++
        } else {
          hasMore = false
        }

        // 防止无限循环，最多抓取20页
        if (page > 20) hasMore = false
      }

      addToast({ type: 'success', message: `成功获取商品，共 ${totalFetched} 件` })
      await loadItems()
    } catch {
      addToast({ type: 'error', message: '获取商品失败' })
    } finally {
      setFetching(false)
      setFetchProgress({ current: 0, total: 0 })
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
    loadItems()
  }, [])

  useEffect(() => {
    loadItems()
  }, [selectedAccount])

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个商品吗？')) return
    try {
      await deleteItem(id)
      addToast({ type: 'success', message: '删除成功' })
      loadItems()
    } catch {
      addToast({ type: 'error', message: '删除失败' })
    }
  }

  // 批量选择相关
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      addToast({ type: 'warning', message: '请先选择要删除的商品' })
      return
    }
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个商品吗？`)) return
    try {
      await batchDeleteItems(Array.from(selectedIds))
      addToast({ type: 'success', message: `成功删除 ${selectedIds.size} 个商品` })
      setSelectedIds(new Set())
      loadItems()
    } catch {
      addToast({ type: 'error', message: '批量删除失败' })
    }
  }

  const filteredItems = items.filter((item) => {
    if (!searchKeyword) return true
    const keyword = searchKeyword.toLowerCase()
    return (
      item.title?.toLowerCase().includes(keyword) ||
      item.desc?.toLowerCase().includes(keyword) ||
      item.item_id?.includes(keyword)
    )
  })

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header flex-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">商品管理</h1>
          <p className="page-description">管理各账号的商品信息</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && (
            <button onClick={handleBatchDelete} className="btn-ios-danger">
              <Trash2 className="w-4 h-4" />
              删除选中 ({selectedIds.size})
            </button>
          )}
          <button 
            onClick={handleFetchItems} 
            disabled={fetching}
            className="btn-ios-success"
          >
            {fetching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                抓取中 (第{fetchProgress.current}页)
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                获取商品
              </>
            )}
          </button>
          <button onClick={loadItems} className="btn-ios-secondary">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="vben-card">
        <div className="vben-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="input-group">
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
            <div className="input-group">
              <label className="input-label">搜索商品</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索商品标题或详情..."
                  className="input-ios pl-9"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="vben-card">
        <div className="vben-card-header">
          <h2 className="vben-card-title ">
            <Package className="w-4 h-4" />
            商品列表
          </h2>
          <span className="badge-primary">{filteredItems.length} 个商品</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-ios">
            <thead>
              <tr>
                <th className="w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 hover:bg-gray-100 rounded"
                    title={selectedIds.size === filteredItems.length ? '取消全选' : '全选'}
                  >
                    {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th>账号ID</th>
                <th>商品ID</th>
                <th>商品标题</th>
                <th>价格</th>
                <th>多规格</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state py-8">
                      <Package className="empty-state-icon" />
                      <p className="text-gray-500">暂无商品数据</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className={selectedIds.has(item.id) ? 'bg-blue-50' : ''}>
                    <td>
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {selectedIds.has(item.id) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="font-medium text-blue-600 dark:text-blue-400">{item.cookie_id}</td>
                    <td className="text-xs text-gray-500">{item.item_id}</td>
                    <td className="max-w-[180px] truncate" title={item.title}>
                      {item.title}
                    </td>
                    <td className="text-amber-600 font-medium">¥{item.price}</td>
                    <td>
                      <span className={item.has_sku ? 'badge-success' : 'badge-gray'}>
                        {item.has_sku ? '是' : '否'}
                      </span>
                    </td>
                    <td className="text-gray-500">
                      {item.updated_at ? new Date(item.updated_at).toLocaleString() : '-'}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="table-action-btn hover:!bg-red-50"
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
    </div>
  )
}
