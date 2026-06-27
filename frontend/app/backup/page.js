'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import {
  Database, RefreshCw, Download, Upload, Trash2,
  Archive, Clock, HardDrive, CheckCircle, XCircle,
  AlertCircle, Search, RotateCw, FileArchive
} from 'lucide-react'
import { toast } from 'sonner'

export default function BackupPage() {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    loadBackups()
  }, [])

  const loadBackups = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/backup', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setBackups(data || [])
    } catch (err) {
      toast.error('Failed to load backups')
    }
    setLoading(false)
  }

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('Backup created successfully')
      loadBackups()
    } catch (err) {
      toast.error('Failed to create backup')
    }
    setCreating(false)
  }

  const handleDownload = async (id, filename) => {
    try {
      const res = await fetch(`/api/backup/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `backup-${id}.sql.gz`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch (err) {
      toast.error('Failed to download backup')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this backup?')) return
    try {
      await fetch(`/api/backup/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Backup deleted')
      loadBackups()
    } catch (err) {
      toast.error('Failed to delete backup')
    }
  }

  const handleRestore = async (id) => {
    if (!confirm('Restore this backup? This will overwrite current data.')) return
    try {
      const res = await fetch(`/api/backup/${id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('Restore initiated')
      loadBackups()
    } catch (err) {
      toast.error('Failed to restore backup')
    }
  }

  const filteredBackups = backups.filter(b =>
    b.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.type || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Completed' }
      case 'failed':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed' }
      case 'running':
        return { icon: RotateCw, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Running...' }
      default:
        return { icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'Unknown' }
    }
  }

  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleString()
  }

  if (!token) return null

  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar />
      <div className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Backup & Restore</h1>
            <p className="text-slate-400 text-sm mt-1">Manage database backups</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search backups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-700 rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
            <button onClick={loadBackups} className="p-2 bg-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Database size={18} /> {creating ? 'Creating...' : 'Create Backup'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Archive className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{backups.length}</p>
                <p className="text-xs text-slate-400">Total Backups</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{backups.filter(b => b.status === 'completed').length}</p>
                <p className="text-xs text-slate-400">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{backups.filter(b => b.status === 'running').length}</p>
                <p className="text-xs text-slate-400">In Progress</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <HardDrive className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {formatSize(backups.reduce((acc, b) => acc + (b.size || 0), 0))}
                </p>
                <p className="text-xs text-slate-400">Total Size</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400 text-center py-12">Loading backups...</div>
        ) : filteredBackups.length === 0 ? (
          <div className="text-slate-400 text-center py-12">
            {searchQuery ? 'No backups match your search' : 'No backups found. Create your first backup.'}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl overflow-hidden border border-white/5">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-slate-700/50 text-xs text-slate-400 font-medium">
              <div className="col-span-3">Filename</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            <div className="divide-y divide-white/5">
              {filteredBackups.map((backup) => {
                const status = getStatusBadge(backup.status)
                const StatusIcon = status.icon
                return (
                  <div key={backup.id} className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-white/5 transition items-center">
                    <div className="col-span-3 flex items-center gap-3">
                      <FileArchive className="w-4 h-4 text-slate-400" />
                      <p className="text-white text-sm font-mono truncate">{backup.filename}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-white text-sm">{backup.type || 'full'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 text-sm">{formatSize(backup.size)}</span>
                    </div>
                    <div className="col-span-2">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${status.bg} ${status.color}`}>
                        <StatusIcon size={12} className={backup.status === 'running' ? 'animate-spin' : ''} />
                        {status.label}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-400 text-xs">{formatDate(backup.created_at)}</p>
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      {backup.status === 'completed' && (
                        <button
                          onClick={() => handleRestore(backup.id)}
                          className="p-1 rounded hover:bg-white/10 text-yellow-400 hover:text-yellow-300 transition"
                          title="Restore"
                        >
                          <Upload size={14} />
                        </button>
                      )}
                      {backup.status === 'completed' && (
                        <button
                          onClick={() => handleDownload(backup.id, backup.filename)}
                          className="p-1 rounded hover:bg-white/10 text-blue-400 hover:text-blue-300 transition"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(backup.id)}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-red-400 transition"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}