import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, RefreshCw, Search, Trash2 } from 'lucide-react'
import { getOrders, deleteOrder } from '@/api/orders'
import { getAccounts } from '@/api/accounts'
import { useUIStore } from '@/store/uiStore'
import { PageLoading } from '@/components/common/Loading'
import type { Order, Account } from '@/types'

const statusMap: Record<string, { label: string; class: string }> = {
  processing: { label: '处理中', class: 'badge-warning' },
  processed: { label: '已处理', class: 'badge-info' },
  shipped: { label: '已发货', class: 'badge-success' },
  completed: { label: '已完成', class: 'badge-success' },
  cancelled: { label: '已关闭', class: 'badge-danger' },
  unknown: { label: '未知', class: 'badge-gray' },
}

export function Orders() {
  const { addToast } = useUIStore()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  const loadOrders = async () => {
    try {
      setLoading(true)
      const result = await getOrders(selectedAccount || undefined, selectedStatus || undefined)
      if (result.success) {
        setOrders(result.data || [])
      }
    } catch {
      addToast({ type: 'error', message: '加载订单列表失败' })
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
    loadOrders()
  }, [])

  useEffect(() => {
    loadOrders()
  }, [selectedAccount, selectedStatus])

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个订单吗？')) return
    try {
      await deleteOrder(id)
      addToast({ type: 'success', message: '删除成功' })
      loadOrders()
    } catch {
      addToast({ type: 'error', message: '删除失败' })
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (!searchKeyword) return true
    const keyword = searchKeyword.toLowerCase()
    return (
      order.order_id?.toLowerCase().includes(keyword) ||
      order.item_id?.toLowerCase().includes(keyword) ||
      order.buyer_id?.toLowerCase().includes(keyword)
    )
  })

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">订单管理</h1>
          <p className="page-description">查看和管理所有订单信息</p>
        </div>
        <button onClick={loadOrders} className="btn-ios-secondary ">
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="vben-card"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
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
          <div>
            <label className="input-label">订单状态</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input-ios"
            >
              <option value="">所有状态</option>
              <option value="processing">处理中</option>
              <option value="processed">已处理</option>
              <option value="shipped">已发货</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已关闭</option>
            </select>
          </div>
          <div>
            <label className="input-label">搜索订单</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索订单ID或商品ID..."
                className="input-ios pl-12"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Orders List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="vben-card"
      >
        <div className="vben-card-header 
                      flex items-center justify-between">
          <h2 className="vben-card-title ">
            <ShoppingCart className="w-4 h-4" />
            订单列表
          </h2>
          <span className="badge-primary">{filteredOrders.length} 个订单</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-ios">
            <thead>
              <tr>
                <th>订单ID</th>
                <th>商品ID</th>
                <th>买家ID</th>
                <th>数量</th>
                <th>金额</th>
                <th>状态</th>
                <th>账号ID</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingCart className="w-12 h-12 text-gray-300" />
                      <p>暂无订单数据</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const status = statusMap[order.status] || statusMap.unknown
                  return (
                    <tr key={order.id}>
                      <td className="font-mono text-sm">{order.order_id}</td>
                      <td className="text-sm">{order.item_id}</td>
                      <td className="text-sm">{order.buyer_id}</td>
                      <td>{order.quantity}</td>
                      <td className="text-amber-600 font-medium">¥{order.amount}</td>
                      <td>
                        <span className={status.class}>{status.label}</span>
                      </td>
                      <td className="font-medium text-blue-600 dark:text-blue-400">{order.cookie_id}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
