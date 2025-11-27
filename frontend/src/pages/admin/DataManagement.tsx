import { useState, useRef } from 'react'

import { Database, Download, Upload, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { exportData, cleanupData, importData } from '@/api/admin'
import { useUIStore } from '@/store/uiStore'
import { ButtonLoading } from '@/components/common/Loading'

const dataTypes = [
  { id: 'accounts', name: '账号数据', desc: '导出所有闲鱼账号信息' },
  { id: 'keywords', name: '关键词数据', desc: '导出所有自动回复关键词' },
  { id: 'items', name: '商品数据', desc: '导出所有商品信息' },
  { id: 'orders', name: '订单数据', desc: '导出所有订单信息' },
  { id: 'cards', name: '卡券数据', desc: '导出所有卡券信息' },
  { id: 'all', name: '全部数据', desc: '导出所有系统数据' },
]

const cleanupTypes = [
  { id: 'logs', name: '清理日志', desc: '清理超过30天的系统日志', danger: false },
  { id: 'orders', name: '清理订单', desc: '清理已完成的历史订单', danger: false },
  { id: 'cards_used', name: '清理已用卡券', desc: '清理已使用的卡券记录', danger: false },
  { id: 'all_data', name: '清空所有数据', desc: '危险操作！清除所有用户数据', danger: true },
]

export function DataManagement() {
  const { addToast } = useUIStore()
  const [exporting, setExporting] = useState<string | null>(null)
  const [cleaning, setCleaning] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async (type: string) => {
    try {
      setExporting(type)
      const blob = await exportData(type)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `xianyu_${type}_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      addToast({ type: 'success', message: '导出成功' })
    } catch {
      addToast({ type: 'error', message: '导出失败' })
    } finally {
      setExporting(null)
    }
  }

  const handleCleanup = async (type: string, danger: boolean) => {
    const confirmMsg = danger 
      ? '⚠️ 这是一个危险操作！将会清除所有用户数据，此操作不可恢复！确定要继续吗？'
      : '确定要执行此清理操作吗？'
    
    if (!confirm(confirmMsg)) return
    if (danger && !confirm('再次确认：是否真的要清空所有数据？')) return

    try {
      setCleaning(type)
      const result = await cleanupData(type)
      if (result.success) {
        addToast({ type: 'success', message: '清理完成' })
      } else {
        addToast({ type: 'error', message: result.message || '清理失败' })
      }
    } catch {
      addToast({ type: 'error', message: '清理失败' })
    } finally {
      setCleaning(null)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      addToast({ type: 'error', message: '请选择 JSON 格式的文件' })
      return
    }

    if (!confirm('确定要导入此数据吗？这将覆盖现有数据！')) {
      e.target.value = ''
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await importData(formData)
      if (result.success) {
        addToast({ type: 'success', message: '数据导入成功' })
      } else {
        addToast({ type: 'error', message: result.message || '导入失败' })
      }
    } catch {
      addToast({ type: 'error', message: '导入失败' })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">数据管理</h1>
        <p className="page-description">导入导出和清理系统数据</p>
      </div>

      {/* 双列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左列 - 数据导出 */}
        <div className="vben-card">
          <div className="vben-card-header">
            <h2 className="vben-card-title">
              <Download className="w-4 h-4 text-blue-500" />
              数据导出
            </h2>
          </div>
          <div className="vben-card-body">
            <div className="space-y-3">
              {dataTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 
                           hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">{type.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{type.desc}</p>
                  </div>
                  <button
                    onClick={() => handleExport(type.id)}
                    disabled={exporting !== null}
                    className="btn-ios-secondary py-1.5 px-3 text-xs"
                  >
                    {exporting === type.id ? <ButtonLoading /> : <Download className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右列 */}
        <div className="space-y-4">
          {/* 数据导入 */}
          <div className="vben-card">
            <div className="vben-card-header">
              <h2 className="vben-card-title">
                <Upload className="w-4 h-4 text-emerald-500" />
                数据导入
              </h2>
            </div>
            <div className="p-5">
              <div
                onClick={handleImportClick}
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center
                          hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 
                          transition-colors cursor-pointer"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 animate-spin" />
                    <p className="text-slate-600 dark:text-slate-400 text-sm">正在导入数据...</p>
                  </>
                ) : (
                  <>
                    <Database className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-600 dark:text-slate-300 text-sm mb-1">点击选择文件上传</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">支持 JSON 格式的导出数据文件</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* 数据清理 */}
          <div className="vben-card">
            <div className="vben-card-header">
              <h2 className="vben-card-title">
                <Trash2 className="w-4 h-4 text-amber-500" />
                数据清理
              </h2>
            </div>
            <div className="vben-card-body">
              <div className="space-y-3">
                {cleanupTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      type.danger 
                        ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-900/20'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {type.danger && (
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <h3 className={`font-medium text-sm ${type.danger ? 'text-red-700 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {type.name}
                        </h3>
                        <p className={`text-xs mt-0.5 ${type.danger ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {type.desc}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCleanup(type.id, type.danger)}
                      disabled={cleaning !== null}
                      className={`py-1.5 px-3 text-xs rounded-md font-medium transition-colors ${
                        type.danger
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'btn-ios-secondary'
                      }`}
                    >
                      {cleaning === type.id ? <ButtonLoading /> : '执行'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
