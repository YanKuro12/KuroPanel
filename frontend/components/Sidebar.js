'use client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, Server, Zap, FolderOpen, Gamepad2, Users, Settings, LogOut 
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const menu = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: Server, label: 'Nodes', href: '/nodes' },
    { icon: Zap, label: 'Tasks', href: '/tasks' },
    { icon: FolderOpen, label: 'Files', href: '/files' },
    { icon: Gamepad2, label: 'Games', href: '/games' },
    { icon: Users, label: 'Users', href: '/users' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <div className="fixed left-0 top-0 bottom-0 w-64 bg-slate-800 border-r border-white/5 p-4 flex flex-col">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold gradient-text">KuroPanel</h1>
      </div>

      <nav className="flex-1">
        {menu.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition
                ${isActive 
                  ? 'bg-blue-600/20 text-blue-400' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <item.icon size={18} />
              <span className="text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition mt-auto"
      >
        <LogOut size={18} />
        <span className="text-sm">Logout</span>
      </button>
    </div>
  )
}