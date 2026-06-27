'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { 
  Zap, Plus, Trash2, RefreshCw, Eye, Play, X, 
  Search, Clock, CheckCircle, XCircle, AlertCircle,
  Loader2, ChevronRight, Terminal
} from 'lucide-react'
import { toast } from 'sonner'

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  const [newTaskType, setNewTaskType] = useState('command')
  const [newTaskTarget, setNewTaskTarget] = useState('')
  const [newTaskCommand, setNewTaskCommand] = useState('')
  const [newTaskNodeId, setNewTaskNodeId] = useState('')
  const [creating, setCreating] = useState(false)

  const router = useRouter()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    loadNodes()
    loadTasks()
  }, [])

  useEffect(() => {
    if (nodes.length > 0 && !newTaskNodeId) {
      setNewTaskNodeId(nodes[0].id)
    }
  }, [nodes])

  const loadNodes = async () => {
    try {
      const res = await fetch('/api/nodes', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setNodes(data || [])
    } catch (err) {
      toast.error('Failed to load nodes')
    }
  }

  const loadTasks = async (nodeId) => {
    setLoading(true)
    try {
      const url = nodeId 
        ? `/api/tasks/node/${nodeId}`
        : '/api/tasks'
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setTasks(data || [])
    } catch (err) {
      toast.error('Failed to load tasks')
    }
    setLoading(false)
  }

  const handleNodeChange = (nodeId) => {
    setSelectedNodeId(nodeId)
    loadTasks(nodeId)
  }

  const handleCreate = async () => {
    if (!newTaskNodeId) {
      toast.error('Select a node')
      return
    }

    if (!newTaskCommand.trim()) {
      toast.error('Command is required')
      return
    }

    setCreating(true)
    try {
      const res = await fetch(`/api/tasks/node/${newTaskNodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: newTaskType,
          target: newTaskTarget || 'localhost',
          params: { command: newTaskCommand }
        })
      })

      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }

      toast.success('Task created and queued')
      setShowCreate(false)
      setNewTaskCommand('')
      setNewTaskTarget('')
      loadTasks(selectedNodeId)
    } catch (err) {
      toast.error('Failed to create task')
    }
    setCreating(false)
  }

  const handleRetry = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('Task retried')
      loadTasks(selectedNodeId)
    } catch (err) {
      toast.error('Failed to retry task')
    }
  }

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Task deleted')
      if (showDetail === taskId) setShowDetail(null)
      loadTasks(selectedNodeId)
    } catch (err) {
      toast.error('Failed to delete task')
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Clear all completed tasks?')) return

    try {
      await fetch('/api/tasks/clear', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Completed tasks cleared')
      loadTasks(selectedNodeId)
    } catch (err) {
      toast.error('Failed to clear tasks')
    }
  }

  const getStatusConfig = (status) => {
    switch(status) {
      case 'pending':
        return { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Pending' }
      case 'running':
        return { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Running' }
      case 'done':
        return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Done' }
      case 'failed':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed' }
      default:
        return { icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'Unknown' }
    }
  }

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleString()
  }

  const filteredTasks = tasks.filter(task => {
    const matchStatus = statusFilter === 'all' || task.status === statusFilter
    const matchSearch = task.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       task.target?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       task.id?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatus && matchSearch
  })

  if (!token) return null

  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar />
      <div className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Tasks</h1>
            <p className="text-slate-400 text-sm mt-1">Manage and monitor tasks across nodes</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-700 rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
            <button onClick={() => loadTasks(selectedNodeId)} className="p-2 bg-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-2 bg-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition text-sm"
            >
              Clear Done
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus size={18} /> New Task
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Node:</label>
            <select
              value={selectedNodeId}
              onChange={(e) => handleNodeChange(e.target.value)}
              className="px-3 py-1.5 bg-slate-700 rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Nodes</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-700 rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="done">Done</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <span className="text-xs text-slate-500 ml-auto">
            {filteredTasks.length} tasks
          </span>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Create Task</h2>
                <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Node</label>
                  <select
                    value={newTaskNodeId}
                    onChange={(e) => setNewTaskNodeId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Task Type</label>
                  <select
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="command">Command</option>
                    <option value="script">Script</option>
                    <option value="docker">Docker</option>
                    <option value="file">File Operation</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Target</label>
                  <input
                    type="text"
                    placeholder="localhost or IP"
                    value={newTaskTarget}
                    onChange={(e) => setNewTaskTarget(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Command</label>
                  <textarea
                    placeholder="ls -la /home"
                    value={newTaskCommand}
                    onChange={(e) => setNewTaskCommand(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) handleCreate()
                    }}
                  />
                  <p className="text-xs text-slate-500 mt-1">Press Ctrl+Enter to submit</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                    {creating ? 'Creating...' : 'Create Task'}
                  </button>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-4 py-2 bg-slate-600 rounded-lg text-white hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl border border-white/10 max-h-[80vh] overflow-y-auto">
              {(() => {
                const task = tasks.find(t => t.id === showDetail)
                if (!task) return null
                const status = getStatusConfig(task.status)
                const StatusIcon = status.icon

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Terminal className="text-cyan-400" size={24} />
                        <div>
                          <h2 className="text-xl font-bold text-white">{task.type}</h2>
                          <p className="text-xs text-slate-400 font-mono">{task.id}</p>
                        </div>
                      </div>
                      <button onClick={() => setShowDetail(null)} className="text-slate-400 hover:text-white transition">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-400">Status</p>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm ${status.bg} ${status.color} mt-1`}>
                          <StatusIcon size={14} className={task.status === 'running' ? 'animate-spin' : ''} />
                          {status.label}
                        </div>
                      </div>
                      <div className="bg-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-400">Target</p>
                        <p className="text-white text-sm font-medium mt-1">{task.target || '—'}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-400">Created</p>
                        <p className="text-white text-sm mt-1">{formatDate(task.created_at)}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-400">Node</p>
                        <p className="text-white text-sm mt-1">{nodes.find(n => n.id === task.node_id)?.name || task.node_id}</p>
                      </div>
                    </div>

                    <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
                      <p className="text-xs text-slate-400 mb-1">Command</p>
                      <pre className="text-white text-sm font-mono bg-slate-900 p-3 rounded-lg overflow-x-auto">
                        {task.params ? JSON.stringify(task.params, null, 2) : '—'}
                      </pre>
                    </div>

                    {task.result && (
                      <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
                        <p className="text-xs text-slate-400 mb-1">Result</p>
                        <pre className="text-white text-sm font-mono bg-slate-900 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {task.result}
                        </pre>
                      </div>
                    )}

                    {task.error && (
                      <div className="bg-red-500/10 rounded-xl p-4 mb-4 border border-red-500/20">
                        <p className="text-xs text-red-400 mb-1">Error</p>
                        <pre className="text-red-400 text-sm font-mono bg-slate-900 p-3 rounded-lg overflow-x-auto">
                          {task.error}
                        </pre>
                      </div>
                    )}

                    <div className="flex gap-3">
                      {task.status === 'failed' && (
                        <button
                          onClick={() => {
                            handleRetry(task.id)
                            setShowDetail(null)
                          }}
                          className="flex-1 px-4 py-2 bg-yellow-600 rounded-lg text-white hover:bg-yellow-700 transition flex items-center justify-center gap-2"
                        >
                          <Play size={16} /> Retry
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="flex-1 px-4 py-2 bg-red-600 rounded-lg text-white hover:bg-red-700 transition flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* Tasks Table */}
        {loading ? (
          <div className="text-slate-400 text-center py-12">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-slate-400 text-center py-12">
            {searchQuery || statusFilter !== 'all' ? 'No tasks match your filters' : 'No tasks yet. Create a new task to get started.'}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl overflow-hidden border border-white/5">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-slate-700/50 text-xs text-slate-400 font-medium">
              <div className="col-span-1">Status</div>
              <div className="col-span-2">ID</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Node</div>
              <div className="col-span-2">Target</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            <div className="divide-y divide-white/5">
              {filteredTasks.map((task) => {
                const status = getStatusConfig(task.status)
                const StatusIcon = status.icon

                return (
                  <div
                    key={task.id}
                    className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-white/5 transition items-center cursor-pointer"
                    onClick={() => setShowDetail(task.id)}
                  >
                    <div className="col-span-1">
                      <StatusIcon
                        size={16}
                        className={`${status.color} ${task.status === 'running' ? 'animate-spin' : ''}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <p className="text-white text-xs font-mono truncate">{task.id.substring(0, 8)}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-white text-sm">{task.type}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 text-xs">
                        {nodes.find(n => n.id === task.node_id)?.name || task.node_id?.substring(0, 8)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 text-xs truncate">{task.target || '—'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 text-xs">{formatDate(task.created_at)}</span>
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDetail(task.id)
                        }}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
                        title="Detail"
                      >
                        <Eye size={14} />
                      </button>
                      {task.status === 'failed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRetry(task.id)
                          }}
                          className="p-1 rounded hover:bg-white/10 text-yellow-400 hover:text-yellow-300 transition"
                          title="Retry"
                        >
                          <Play size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(task.id)
                        }}
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