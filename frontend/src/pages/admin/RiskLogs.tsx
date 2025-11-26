import { useState, useEffect } from 'react'

import { ShieldAlert, RefreshCw, Trash2 } from 'lucide-react'
import { getRiskLogs, clearRiskLogs, type RiskLog } from '@/api/admin'
import { getAccounts } from '@/api/accounts'
import { useUIStore } from '@/store/uiStore'
import { PageLoading } from '@/components/common/Loading'
import type { Account } from '@/types'

export function RiskLogs() {
  const { addToast } = useUIStore()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<RiskLog[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')

  const loadLogs = async () => {
    try {
      setLoading(true)
      const result = await getRiskLogs({ cookie_id: selectedAccount || undefined })
      if (result.success) {
        setLogs(result.data || [])
      }
    } catch {
      addToast({ type: 'error', message: '加载风控日志失败' })
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
    loadLogs()
  }, [])

  useEffect(() => {
    loadLogs()
  }, [selectedAccount])

  const handleClear = async () => {
    if (!confirm('确定要清空所有风控日志吗？此操作不可恢复！')) return
    try {
      await clearRiskLogs()
      addToast({ type: 'success', message: '日志已清空' })
      loadLogs()
    } catch {
      addToast({ type: 'error', message: '清空失败' })
    }
  }

  if (loading && logs.length === 0) {
    return <PageLoading />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">风控日志</h1>
          <p className="page-description">查看账号风控相关日志</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleClear} className="btn-ios-danger ">
            <Trash2 className="w-4 h-4" />
            清空日志
          </button>
          <button onClick={loadLogs} className="btn-ios-secondary ">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* Filter */}
      <div
        
        
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
      </div>

      {/* Logs List */}
      <div
        
        
        
        className="vben-card"
      >
        <div className="bg-red-500 px-6 py-4 text-white 
                      flex items-center justify-between">
          <h2 className="vben-card-title ">
            <ShieldAlert className="w-4 h-4" />
            风控日志
          </h2>
          <span className="badge-primary">{logs.length} 条记录</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-ios">
            <thead>
              <tr>
                <th>账号ID</th>
                <th>风控类型</th>
                <th>详情</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                      <p>暂无风控日志</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-medium text-blue-600 dark:text-blue-400">{log.cookie_id}</td>
                    <td>
                      <span className="badge-danger">{log.risk_type}</span>
                    </td>
                    <td className="max-w-[300px] truncate text-slate-500 dark:text-slate-400">{log.message}</td>
                    <td className="text-slate-500 dark:text-slate-400 text-sm">
                      {new Date(log.created_at).toLocaleString()}
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
