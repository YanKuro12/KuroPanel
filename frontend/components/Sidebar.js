'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Server,
  Zap,
  FolderOpen,
  Gamepad2,
  Users,
  Settings,
  Puzzle,
  Database,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useLanguage } from '@/app/providers'
import LanguageSwitcher from './LanguageSwitcher'

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved) {
      setCollapsed(saved === 'true')
    }
  }, [])

  const toggleCollapse = () => {
    const newState = !collapsed
    setCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', String(newState))
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const menu = [
    { icon: LayoutDashboard, label: t('dashboard'), href: '/' },
    { icon: Server, label: t('nodes'), href: '/nodes' },
    { icon: Zap, label: t('tasks'), href: '/tasks' },
    { icon: FolderOpen, label: t('files'), href: '/files' },
    { icon: Gamepad2, label: t('games'), href: '/games' },
    { icon: Users, label: t('users'), href: '/users' },
    { icon: Puzzle, label: t('plugins'), href: '/plugins' },
    { icon: Database, label: t('backup'), href: '/backup' },
    { icon: Settings, label: t('settings'), href: '/settings' },
  ]

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg text-white"
      >
        <Menu size={24} />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full bg-slate-800 border-r border-white/5 z-50
          transition-all duration-300 flex flex-col
          ${collapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold gradient-text whitespace-nowrap">KuroPanel</h1>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center mx-auto flex-shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menu.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.label : ''}
              >
                <item.icon size={20} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/5 p-3 space-y-2">
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
              text-red-400 hover:bg-red-500/10 w-full
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? t('logout') : ''}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm whitespace-nowrap">{t('logout')}</span>}
          </button>

          <button
            onClick={toggleCollapse}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
              text-slate-400 hover:text-white hover:bg-white/5 w-full
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? (
              <ChevronRight size={20} className="flex-shrink-0" />
            ) : (
              <>
                <ChevronLeft size={20} className="flex-shrink-0" />
                <span className="text-sm whitespace-nowrap">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`} />
    </>
  )
}