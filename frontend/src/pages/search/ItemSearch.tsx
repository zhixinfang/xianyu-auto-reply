import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, ShoppingBag } from 'lucide-react'
import { searchItems } from '@/api/search'
import { getAccounts } from '@/api/accounts'
import { useUIStore } from '@/store/uiStore'
import { ButtonLoading } from '@/components/common/Loading'
import type { Item, Account } from '@/types'

export function ItemSearch() {
  const { addToast } = useUIStore()
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('')
  const [results, setResults] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    getAccounts().then(setAccounts).catch(() => {})
  }, [])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!keyword.trim()) {
      addToast({ type: 'warning', message: '请输入搜索关键词' })
      return
    }

    try {
      setLoading(true)
      const result = await searchItems(keyword, selectedAccount || undefined)
      if (result.success) {
        setResults(result.data || [])
        if ((result.data || []).length === 0) {
          addToast({ type: 'info', message: '未找到相关商品' })
        }
      }
    } catch {
      addToast({ type: 'error', message: '搜索失败' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="page-title">商品搜索</h1>
        <p className="page-description">在闲鱼平台搜索商品</p>
      </div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="vben-card"
      >
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="输入关键词搜索商品..."
              className="input-ios pl-12"
            />
          </div>
          <div className="w-full md:w-64">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="input-ios"
            >
              <option value="">使用所有账号搜索</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.id}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-ios-primary w-full md:w-32 flex items-center justify-center"
          >
            {loading ? <ButtonLoading /> : '搜索'}
          </button>
        </form>
      </motion.div>

      {/* Results */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {results.map((item, index) => (
          <motion.div
            key={item.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="vben-card group hover:shadow-ios-lg transition-all duration-300"
          >
            <div className="aspect-square bg-gray-100 relative overflow-hidden">
              {/* Placeholder for item image - in real app would use item.image_url */}
              <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                <ShoppingBag className="w-12 h-12" />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            </div>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 h-12">
                {item.title}
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-red-500">¥{item.price}</span>
                <span className="text-sm text-gray-500">{item.cookie_id}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                <span>ID: {item.item_id}</span>
                {item.has_sku && <span className="badge-info">多规格</span>}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {!loading && results.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p>输入关键词开始搜索</p>
        </div>
      )}
    </div>
  )
}
