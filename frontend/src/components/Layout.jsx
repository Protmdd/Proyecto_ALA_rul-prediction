import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Activity,
  TrendingUp,
  Bell,
  Menu,
  X,
  Settings,
  ChevronLeft,
  Gauge,
  ShieldCheck,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, color: 'text-blue-500' },
  { name: 'Rodamientos', href: '/rodamientos', icon: Activity, color: 'text-purple-500' },
  { name: 'Predicciones', href: '/predicciones', icon: TrendingUp, color: 'text-green-500' },
  { name: 'Indicadores', href: '/indicadores', icon: ShieldCheck, color: 'text-indigo-500' },
  { name: 'Alertas', href: '/alertas', icon: Bell, color: 'text-red-500' },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ width: 280 }}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        transition={{ duration: 0.3 }}
        className="bg-white border-r border-slate-200 flex flex-col shadow-sm relative z-10"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <Gauge className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="overflow-hidden"
              >
                <h1 className="font-bold text-lg text-slate-900 whitespace-nowrap">
                  RUL Predict
                </h1>
                <p className="text-xs text-slate-500 whitespace-nowrap">
                  Mantenimiento Predictivo
                </p>
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Toggle button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 hover:bg-slate-50 z-20"
        >
          <ChevronLeft 
            className={`w-4 h-4 text-slate-500 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} 
          />
        </button>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm' 
                    : 'text-slate-700 hover:bg-slate-50'
                  }
                `}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : item.color}`} />
                {sidebarOpen && (
                  <span className="whitespace-nowrap">{item.name}</span>
                )}
                {isActive && sidebarOpen && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1 h-6 bg-blue-600 rounded-full"
                  />
                )}
              </Link>
            )
          })}
        </nav>
        
        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-slate-200">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-sm text-slate-900">
                  Sistema Activo
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                12 rodamientos monitoreados en tiempo real
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-700 font-medium">Online</span>
              </div>
            </div>
          </div>
        )}
      </motion.aside>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {navigation.find(n => 
                location.pathname === n.href ||
                (n.href !== '/' && location.pathname.startsWith(n.href))
              )?.name || 'Dashboard'}
            </h2>
            <p className="text-xs text-slate-500">
              Universidad del Pacífico | Álgebra Lineal Aplicada
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-700">LIVE</span>
            </div>
            
            {/* Notifications */}
            <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            
            {/* User */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="w-9 h-9 bg-gradient-purple rounded-full flex items-center justify-center text-white font-semibold text-sm">
                JA
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">José Atto</p>
                <p className="text-xs text-slate-500">Estudiante</p>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
