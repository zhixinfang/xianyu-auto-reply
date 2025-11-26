import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNavbar } from './TopNavbar'
import { TabsBar } from './TabsBar'
import { Toast } from '@/components/common/Toast'

export function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <Sidebar />
      
      {/* Main content area */}
      <div className="lg:ml-56 min-h-screen flex flex-col">
        {/* Top navbar */}
        <TopNavbar />
        
        {/* Tabs bar */}
        <TabsBar />
        
        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Toast notifications */}
      <Toast />
    </div>
  )
}
