import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  MessageSquare,
  CreditCard,
  Truck,
  Bell,
  MessageCircle,
  Search,
  Settings,
  UserCog,
  FileText,
  Shield,
  Database,
  Info,
  Menu,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

interface NavItem {
  icon: React.ElementType
  label: string
  path: string
  adminOnly?: boolean
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: '仪表盘', path: '/dashboard' },
  { icon: Users, label: '账号管理', path: '/accounts' },
  { icon: Package, label: '商品管理', path: '/items' },
  { icon: ShoppingCart, label: '订单管理', path: '/orders' },
  { icon: MessageSquare, label: '自动回复', path: '/keywords' },
  { icon: MessageCircle, label: '指定商品回复', path: '/item-replies' },
  { icon: CreditCard, label: '卡券管理', path: '/cards' },
  { icon: Truck, label: '自动发货', path: '/delivery' },
  { icon: Bell, label: '通知渠道', path: '/notification-channels' },
  { icon: MessageCircle, label: '消息通知', path: '/message-notifications' },
  { icon: Search, label: '商品搜索', path: '/item-search' },
  { icon: Settings, label: '系统设置', path: '/settings' },
]

const adminNavItems: NavItem[] = [
  { icon: UserCog, label: '用户管理', path: '/admin/users', adminOnly: true },
  { icon: FileText, label: '系统日志', path: '/admin/logs', adminOnly: true },
  { icon: Shield, label: '风控日志', path: '/admin/risk-logs', adminOnly: true },
  { icon: Database, label: '数据管理', path: '/admin/data', adminOnly: true },
]

const bottomNavItems: NavItem[] = [
  { icon: Info, label: '关于', path: '/about' },
]

export function Sidebar() {
  const { user } = useAuthStore()
  const { sidebarMobileOpen, setSidebarMobileOpen } = useUIStore()

  const closeMobileSidebar = () => {
    setSidebarMobileOpen(false)
  }

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const Icon = item.icon
    return (
      <NavLink
        to={item.path}
        onClick={closeMobileSidebar}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150',
            'text-slate-400 hover:text-white hover:bg-white/10',
            isActive && 'bg-blue-600 text-white shadow-sm'
          )
        }
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{item.label}</span>
      </NavLink>
    )
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: sidebarMobileOpen ? 0 : undefined,
        }}
        className={cn(
          'fixed top-0 left-0 h-screen w-56 z-50',
          'bg-[#001529] text-white',
          'flex flex-col',
          'transition-transform duration-200 ease-out',
          'lg:translate-x-0',
          !sidebarMobileOpen && '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-white">闲鱼管理系统</span>
          </div>
          <button
            onClick={closeMobileSidebar}
            className="lg:hidden p-1.5 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 sidebar-scrollbar">
          {mainNavItems.map((item) => (
            <NavItemComponent key={item.path} item={item} />
          ))}

          {/* Admin section */}
          {user?.is_admin && (
            <>
              <div className="pt-4 pb-2 px-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  管理员
                </p>
              </div>
              {adminNavItems.map((item) => (
                <NavItemComponent key={item.path} item={item} />
              ))}
            </>
          )}

          <div className="pt-4 pb-2 px-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              其他
            </p>
          </div>
          {bottomNavItems.map((item) => (
            <NavItemComponent key={item.path} item={item} />
          ))}
        </nav>

      </motion.aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setSidebarMobileOpen(true)}
        className={cn(
          'fixed top-3 left-3 z-30 lg:hidden',
          'w-10 h-10 rounded-md',
          'bg-blue-500 text-white shadow-md',
          'flex items-center justify-center',
          'hover:bg-blue-600 transition-colors'
        )}
      >
        <Menu className="w-5 h-5" />
      </button>
    </>
  )
}
