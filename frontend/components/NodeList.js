import { useState, useEffect } from 'react'
import { MoreVertical, RefreshCw } from 'lucide-react'

export default function NodeList() {
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('/api/nodes', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setNodes(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-slate-400 text-sm">Loading...</div>
  if (nodes.length === 0) return <div className="text-slate-400 text-sm">No nodes connected</div>

  return (
    <div className="space-y-2">
      {nodes.map((node) => (
        <div key={node.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <div>
              <p className="text-white text-sm font-medium">{node.name}</p>
              <p className="text-xs text-slate-400">{node.hostname}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{node.cpu || 0}% CPU</span>
            <button className="p-1 rounded-lg hover:bg-white/10 transition">
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
            <button className="p-1 rounded-lg hover:bg-white/10 transition">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}