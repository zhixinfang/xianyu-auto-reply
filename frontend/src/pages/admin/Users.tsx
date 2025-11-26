import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'

import { Users as UsersIcon, RefreshCw, Plus, Edit2, Trash2, Shield, ShieldOff, X, Loader2 } from 'lucide-react'
import { getUsers, deleteUser, updateUser, addUser } from '@/api/admin'
import { useUIStore } from '@/store/uiStore'
import { PageLoading } from '@/components/common/Loading'
import type { User } from '@/types'

export function Users() {
  const { addToast } = useUIStore()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formIsAdmin, setFormIsAdmin] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadUsers = async () => {
    try {
      setLoading(true)
      const result = await getUsers()
      if (result.success) {
        setUsers(result.data || [])
      }
    } catch {
      addToast({ type: 'error', message: '加载用户列表失败' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleToggleAdmin = async (user: User) => {
    try {
      await updateUser(user.user_id, { is_admin: !user.is_admin })
      addToast({ type: 'success', message: user.is_admin ? '已取消管理员权限' : '已设为管理员' })
      loadUsers()
    } catch {
      addToast({ type: 'error', message: '操作失败' })
    }
  }

  const handleDelete = async (userId: number) => {
    if (!confirm('确定要删除这个用户吗？此操作不可恢复！')) return
    try {
      await deleteUser(userId)
      addToast({ type: 'success', message: '删除成功' })
      loadUsers()
    } catch {
      addToast({ type: 'error', message: '删除失败' })
    }
  }

  const openAddModal = () => {
    setEditingUser(null)
    setFormUsername('')
    setFormPassword('')
    setFormEmail('')
    setFormIsAdmin(false)
    setIsModalOpen(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormUsername(user.username)
    setFormPassword('')
    setFormEmail(user.email || '')
    setFormIsAdmin(user.is_admin)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formUsername.trim()) {
      addToast({ type: 'warning', message: '请输入用户名' })
      return
    }
    if (!editingUser && !formPassword) {
      addToast({ type: 'warning', message: '请输入密码' })
      return
    }

    setSaving(true)
    try {
      if (editingUser) {
        const data: Partial<User> & { password?: string } = {
          username: formUsername.trim(),
          email: formEmail.trim() || undefined,
          is_admin: formIsAdmin,
        }
        if (formPassword) data.password = formPassword
        await updateUser(editingUser.user_id, data)
        addToast({ type: 'success', message: '用户已更新' })
      } else {
        await addUser({
          username: formUsername.trim(),
          password: formPassword,
          email: formEmail.trim() || undefined,
          is_admin: formIsAdmin,
        })
        addToast({ type: 'success', message: '用户已添加' })
      }

      closeModal()
      loadUsers()
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
          <h1 className="page-title">用户管理</h1>
          <p className="page-description">管理系统用户账号</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openAddModal} className="btn-ios-primary ">
            <Plus className="w-4 h-4" />
            添加用户
          </button>
          <button onClick={loadUsers} className="btn-ios-secondary ">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* Users List */}
      <div
        
        
        className="vben-card"
      >
        <div className="vben-card-header 
                      flex items-center justify-between">
          <h2 className="vben-card-title ">
            <UsersIcon className="w-4 h-4" />
            用户列表
          </h2>
          <span className="badge-primary">{users.length} 个用户</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-ios">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <UsersIcon className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                      <p>暂无用户数据</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.user_id}>
                    <td className="font-medium">{user.user_id}</td>
                    <td className="font-medium text-blue-600 dark:text-blue-400">{user.username}</td>
                    <td className="text-slate-500 dark:text-slate-400">{user.email || '-'}</td>
                    <td>
                      {user.is_admin ? (
                        <span className="badge-warning">管理员</span>
                      ) : (
                        <span className="badge-gray">普通用户</span>
                      )}
                    </td>
                    <td>
                      <div className="">
                        <button
                          onClick={() => handleToggleAdmin(user)}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:bg-slate-700 transition-colors"
                          title={user.is_admin ? '取消管理员' : '设为管理员'}
                        >
                          {user.is_admin ? (
                            <ShieldOff className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Shield className="w-4 h-4 text-emerald-500" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:bg-slate-700 transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.user_id)}
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
      </div>

      {/* 添加/编辑用户弹窗 */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingUser ? '编辑用户' : '添加用户'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-slate-100 dark:bg-slate-700 rounded-lg">
                <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="input-label">用户名</label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="input-ios"
                    placeholder="请输入用户名"
                  />
                </div>
                <div>
                  <label className="input-label">
                    密码{editingUser && '（留空则不修改）'}
                  </label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="input-ios"
                    placeholder={editingUser ? '留空则不修改密码' : '请输入密码'}
                  />
                </div>
                <div>
                  <label className="input-label">邮箱（可选）</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="input-ios"
                    placeholder="请输入邮箱"
                  />
                </div>
                <label className=" text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formIsAdmin}
                    onChange={(e) => setFormIsAdmin(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-500 dark:text-blue-400"
                  />
                  设为管理员
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
