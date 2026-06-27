'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { Puzzle, Plus, Trash2, RefreshCw, Upload, Power, PowerOff, Search, X } from 'lucide-react'
import { toast } from 'sonner'

export default function PluginsPage() {
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    loadPlugins()
  }, [])

  const loadPlugins = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/plugins', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setPlugins(Object.values(data))
    } catch (err) {
      toast.error('Failed to load plugins')
    }
    setLoading(false)
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('plugin', file)

    try {
      const res = await fetch('/api/plugins/install', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('Plugin installed')
      loadPlugins()
    } catch (err) {
      toast.error('Upload failed')
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (name) => {
    if (!confirm(`Delete plugin "${name}"?`)) return
    try {
      await fetch(`/api/plugins/${name}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Plugin deleted')
      loadPlugins()
    } catch (err) {
      toast.error('Failed to delete plugin')
    }
  }

  const handleToggle = async (name, enabled) => {
    try {
      await fetch(`/api/plugins/${name}/enable`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: !enabled })
      })
      toast.success(`Plugin ${!enabled ? 'enabled' : 'disabled'}`)
      loadPlugins()
    } catch (err) {
      toast.error('Failed to toggle plugin')
    }
  }

  const filteredPlugins = plugins.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!token) return null

  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar />
      <div className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Plugins</h1>
            <p className="text-slate-400 text-sm mt-1">Extend KuroPanel functionality</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search plugins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-700 rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
            <button onClick={loadPlugins} className="p-2 bg-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <label className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition flex items-center gap-2 cursor-pointer disabled:opacity-50">
              <Plus size={18} /> Upload Plugin
              <input type="file" accept=".zip" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400 text-center py-12">Loading plugins...</div>
        ) : filteredPlugins.length === 0 ? (
          <div className="text-slate-400 text-center py-12">
            {searchQuery ? 'No plugins match your search' : 'No plugins installed. Upload a plugin to get started.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlugins.map((plugin) => (
              <div key={plugin.name} className="bg-slate-800 rounded-xl p-6 border border-white/5 hover:border-white/10 transition group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Puzzle className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{plugin.name}</h3>
                      <p className="text-xs text-slate-400">v{plugin.version}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggle(plugin.name, plugin.enabled)}
                      className={`p-1 rounded hover:bg-white/10 transition ${plugin.enabled ? 'text-green-400' : 'text-slate-400'}`}
                      title={plugin.enabled ? 'Disable' : 'Enable'}
                    >
                      {plugin.enabled ? <Power size={16} /> : <PowerOff size={16} />}
                    </button>
                    <button
                      onClick={() => handleDelete(plugin.name)}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-red-400 transition"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-400 line-clamp-2">{plugin.description || 'No description'}</p>

                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-white/5">
                  <span className="text-xs text-slate-500">By {plugin.author || 'Unknown'}</span>
                  {plugin.permissions && plugin.permissions.map((perm, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300">
                      {perm}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${plugin.enabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    {plugin.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {plugin.hooks && Object.values(plugin.hooks).some(v => v) && (
                    <span className="text-xs text-slate-500">{Object.values(plugin.hooks).filter(v => v).length} hooks</span>
                  )}
                  {plugin.routes && plugin.routes.length > 0 && (
                    <span className="text-xs text-slate-500">{plugin.routes.length} routes</span>
                  )}
                </div>

                {plugin.installed_at && (
                  <p className="text-xs text-slate-500 mt-2">Installed: {new Date(plugin.installed_at).toLocaleDateString()}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}