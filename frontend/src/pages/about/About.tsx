
import { MessageSquare, Github, Globe, Users, Heart } from 'lucide-react'

export function About() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-600 
                    mx-auto mb-6 flex items-center justify-center shadow-lg"
        >
          <MessageSquare className="w-12 h-12 text-white" />
        </div>
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          
          className="text-3xl font-bold text-slate-900 dark:text-slate-100"
        >
          闲鱼自动回复管理系统
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          
          className="text-slate-500 dark:text-slate-400 mt-2"
        >
          智能管理您的闲鱼店铺，提升客服效率
        </motion.p>
      </div>

      {/* Features */}
      <div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        
        className="vben-card"
      >
        <h2 className="text-lg vben-card-title text-slate-900 dark:text-slate-100 mb-4">主要功能</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: '多账号管理', desc: '支持同时管理多个闲鱼账号' },
            { title: '智能自动回复', desc: '基于关键词的智能消息回复' },
            { title: 'AI 助手', desc: '接入 AI 模型，智能处理复杂问题' },
            { title: '自动发货', desc: '订单自动发货，支持卡密发货' },
            { title: '消息通知', desc: '多渠道消息推送通知' },
            { title: '数据统计', desc: '订单、商品数据统计分析' },
          ].map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{feature.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        
        className="vben-card"
      >
        <h2 className="text-lg vben-card-title text-slate-900 dark:text-slate-100 mb-4">相关链接</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-gray-900 text-white 
                     hover:bg-gray-800 transition-colors"
          >
            <Github className="w-6 h-6" />
            <span className="font-medium">GitHub</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 p-4 rounded-xl bg-blue-500 text-white 
                     hover:bg-blue-600 transition-colors"
          >
            <Globe className="w-6 h-6" />
            <span className="font-medium">官方网站</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500 text-white 
                     hover:bg-emerald-600 transition-colors"
          >
            <Users className="w-6 h-6" />
            <span className="font-medium">交流群</span>
          </a>
        </div>
      </div>

      {/* Footer */}
      <div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        
        className="text-center py-6 text-slate-500 dark:text-slate-400"
      >
        <p className="flex items-center justify-center gap-1">
          Made with <Heart className="w-4 h-4 text-red-500" /> by Open Source Community
        </p>
        <p className="text-sm mt-2">
          赞助商：划算云服务器{' '}
          <a
            href="https://www.hsykj.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 dark:text-blue-400 hover:underline"
          >
            www.hsykj.com
          </a>
        </p>
      </div>
    </div>
  )
}
