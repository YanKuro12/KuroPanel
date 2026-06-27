'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { 
  Server, Plus, Trash2, Pencil, RefreshCw, Eye, 
  Power, PowerOff, Cpu, HardDrive, Activity, Clock,
  X, Check, Search, MoreVertical
} from 'lucide-react'
import { toast } from 'sonner'

export default function NodesPage() {
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(null)
  const [newName, setNewName] = useState('')
  const [newHostname, setNewHostname] = useState('')
  const [editName, setEditName] = useState('')
  const [editHostname, setEditHostname] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNode, setSelectedNode] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const router = useRouter()

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    loadNodes()
  }, [])

  const loadNodes = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/nodes', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setNodes(data || [])
    } catch (err) {
      toast.error('Failed to load nodes')
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!newName.trim() || !newHostname.trim()) {
      toast.error('Name and hostname required')
      return
    }

    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: newName.trim(), 
          hostname: newHostname.trim() 
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('Node created')
      setNewName('')
      setNewHostname('')
      setShowCreate(false)
      loadNodes()
    } catch (err) {
      toast.error('Failed to create node')
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete node "${name}"? This cannot be undone.`)) return

    try {
      await fetch(`/api/nodes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Node deleted')
      if (selectedNode?.id === id) {
        setSelectedNode(null)
        setShowDetail(false)
      }
      loadNodes()
    } catch (err) {
      toast.error('Failed to delete node')
    }
  }

  const handleEdit = async (id) => {
    if (!editName.trim() || !editHostname.trim()) {
      toast.error('Name and hostname required')
      return
    }

    try {
      const res = await fetch(`/api/nodes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: editName.trim(), 
          hostname: editHostname.trim() 
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('Node updated')
      setShowEdit(null)
      loadNodes()
      if (selectedNode?.id === id) {
        setSelectedNode({ ...selectedNode, name: editName.trim(), hostname: editHostname.trim() })
      }
    } catch (err) {
      toast.error('Failed to update node')
    }
  }

  const handleRegenerateToken = async (id) => {
    if (!confirm('Regenerate token? This will disconnect the node.')) return

    try {
      const res = await fetch(`/api/nodes/${id}/regenerate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      toast.success('Token regenerated')
      if (selectedNode?.id === id) {
        setSelectedNode({ ...selectedNode, token: data.token })
      }
      loadNodes()
    } catch (err) {
      toast.error('Failed to regenerate token')
    }
  }

  const openDetail = (node) => {
    setSelectedNode(node)
    setShowDetail(true)
  }

  const closeDetail = () => {
    setShowDetail(false)
    setSelectedNode(null)
  }

  const filteredNodes = nodes.filter(n => 
    n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.hostname.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status) => {
    switch(status) {
      case 'online': return 'bg-green-500'
      case 'offline': return 'bg-red-500'
      case 'busy': return 'bg-yellow-500'
      default: return 'bg-slate-500'
    }
  }

  const getStatusText = (status) => {
    switch(status) {
      case 'online': return 'Online'
      case 'offline': return 'Offline'
      case 'busy': return 'Busy'
      default: return 'Unknown'
    }
  }

  const formatDate = (date) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleString()
  }

  if (!token) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar />
      <div className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Nodes</h1>
            <p className="text-slate-400 text-sm mt-1">Manage your infrastructure nodes</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-700 rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
            <button onClick={loadNodes} className="p-2 bg-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus size={18} /> Add Node
            </button>
          </div>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Add New Node</h2>
                <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Node Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Production-01"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Hostname</label>
                  <input
                    type="text"
                    placeholder="e.g., server-01.example.com"
                    value={newHostname}
                    onChange={(e) => setNewHostname(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition">
                    Create
                  </button>
                  <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 bg-slate-600 rounded-lg text-white hover:bg-slate-700 transition">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEdit && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Edit Node</h2>
                <button onClick={() => setShowEdit(null)} className="text-slate-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Node Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Hostname</label>
                  <input
                    type="text"
                    value={editHostname}
                    onChange={(e) => setEditHostname(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => handleEdit(showEdit)} className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition">
                    Save
                  </button>
                  <button onClick={() => setShowEdit(null)} className="flex-1 px-4 py-2 bg-slate-600 rounded-lg text-white hover:bg-slate-700 transition">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Panel */}
        {showDetail && selectedNode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl border border-white/10 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Server className="text-cyan-400" size={24} />
                  <h2 className="text-xl font-bold text-white">{selectedNode.name}</h2>
                  <span className={`text-xs px-2 py-1 rounded ${selectedNode.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {getStatusText(selectedNode.status)}
                  </span>
                </div>
                <button onClick={closeDetail} className="text-slate-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-xs text-slate-400">Hostname</p>
                  <p className="text-white text-sm font-medium">{selectedNode.hostname}</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-xs text-slate-400">IP Address</p>
                  <p className="text-white text-sm font-medium">{selectedNode.ip || '—'}</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-xs text-slate-400">Created</p>
                  <p className="text-white text-sm font-medium">{formatDate(selectedNode.created_at)}</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-xs text-slate-400">Last Heartbeat</p>
                  <p className="text-white text-sm font-medium">{formatDate(selectedNode.last_heartbeat)}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <Cpu className="mx-auto text-cyan-400 mb-1" size={20} />
                  <p className="text-2xl font-bold text-white">{selectedNode.cpu?.toFixed(1) || 0}%</p>
                  <p className="text-xs text-slate-400">CPU</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <HardDrive className="mx-auto text-green-400 mb-1" size={20} />
                  <p className="text-2xl font-bold text-white">{selectedNode.memory?.toFixed(1) || 0}%</p>
                  <p className="text-xs text-slate-400">Memory</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <Activity className="mx-auto text-purple-400 mb-1" size={20} />
                  <p className="text-2xl font-bold text-white">{selectedNode.disk?.toFixed(1) || 0}%</p>
                  <p className="text-xs text-slate-400">Disk</p>
                </div>
              </div>

              {/* Token */}
              <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Node Token</p>
                    <p className="text-white text-sm font-mono truncate max-w-xs">{selectedNode.token}</p>
                  </div>
                  <button
                    onClick={() => handleRegenerateToken(selectedNode.id)}
                    className="px-3 py-1 bg-yellow-600/20 text-yellow-400 rounded-lg text-xs hover:bg-yellow-600/30 transition"
                  >
                    Regenerate
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditName(selectedNode.name)
                    setEditHostname(selectedNode.hostname)
                    setShowEdit(selectedNode.id)
                    closeDetail()
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Pencil size={16} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(selectedNode.id, selectedNode.name)}
                  className="flex-1 px-4 py-2 bg-red-600 rounded-lg text-white hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Nodes List */}
        {loading ? (
          <div className="text-slate-400 text-center py-12">Loading nodes...</div>
        ) : filteredNodes.length === 0 ? (
          <div className="text-slate-400 text-center py-12">
            {searchQuery ? 'No nodes match your search' : 'No nodes yet. Click "Add Node" to get started.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNodes.map((node) => (
              <div
                key={node.id}
                className="bg-slate-800 rounded-xl p-6 border border-white/5 hover:border-white/10 transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(node.status)} ${node.status === 'online' ? 'animate-pulse' : ''}`} />
                    <div>
                      <h3 className="text-white font-medium">{node.name}</h3>
                      <p className="text-xs text-slate-400">{node.hostname}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openDetail(node)}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
                      title="Detail"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setEditName(node.name)
                        setEditHostname(node.hostname)
                        setShowEdit(node.id)
                      }}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(node.id, node.name)}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-red-400 transition"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">CPU</p>
                    <p className="text-sm font-bold text-white">{node.cpu?.toFixed(1) || 0}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">RAM</p>
                    <p className="text-sm font-bold text-white">{node.memory?.toFixed(1) || 0}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Status</p>
                    <p className={`text-sm font-bold ${node.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                      {getStatusText(node.status)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}