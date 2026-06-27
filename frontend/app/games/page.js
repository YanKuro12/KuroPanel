'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { 
  Gamepad2, Plus, Play, Square, RotateCw, Trash2, 
  RefreshCw, Server, Users, Clock, HardDrive, Cpu,
  X, Search, Download, Archive, Eye, Terminal
} from 'lucide-react'
import { toast } from 'sonner'

export default function GamesPage() {
  const [games, setGames] = useState([])
  const [nodes, setNodes] = useState([])
  const [gameTypes, setGameTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDeploy, setShowDeploy] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deployForm, setDeployForm] = useState({
    name: '',
    type: 'minecraft',
    node_id: '',
    port: 25565,
    cpu: 2,
    memory: 2048,
    max_players: 20,
    world_name: 'world',
    backup_enabled: false,
    backup_interval: 24
  })
  const router = useRouter()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    loadGameTypes()
    loadNodes()
    loadGames()
  }, [])

  const loadGameTypes = async () => {
    try {
      const res = await fetch('/api/games/types', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setGameTypes(data || [])
    } catch (err) {
      toast.error('Failed to load game types')
    }
  }

  const loadNodes = async () => {
    try {
      const res = await fetch('/api/nodes', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setNodes(data || [])
      if (data.length > 0 && !deployForm.node_id) {
        setDeployForm(prev => ({ ...prev, node_id: data[0].id }))
      }
    } catch (err) {
      toast.error('Failed to load nodes')
    }
  }

  const loadGames = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/games', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setGames(data || [])
    } catch (err) {
      toast.error('Failed to load games')
    }
    setLoading(false)
  }

  const handleDeploy = async () => {
    if (!deployForm.name.trim()) {
      toast.error('Game name required')
      return
    }
    if (!deployForm.node_id) {
      toast.error('Select a node')
      return
    }

    try {
      const res = await fetch('/api/games/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(deployForm)
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('Game deploying...')
      setShowDeploy(false)
      setDeployForm({ ...deployForm, name: '', type: 'minecraft' })
      loadGames()
    } catch (err) {
      toast.error('Failed to deploy game')
    }
  }

  const handleStart = async (id) => {
    try {
      await fetch(`/api/games/${id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Game starting...')
      loadGames()
    } catch (err) {
      toast.error('Failed to start')
    }
  }

  const handleStop = async (id) => {
    try {
      await fetch(`/api/games/${id}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Game stopping...')
      loadGames()
    } catch (err) {
      toast.error('Failed to stop')
    }
  }

  const handleRestart = async (id) => {
    try {
      await fetch(`/api/games/${id}/restart`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Game restarting...')
      loadGames()
    } catch (err) {
      toast.error('Failed to restart')
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete game "${name}"?`)) return
    try {
      await fetch(`/api/games/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Game deleted')
      loadGames()
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const handleBackup = async (id) => {
    try {
      const res = await fetch(`/api/games/${id}/backup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('Backup created')
    } catch (err) {
      toast.error('Failed to backup')
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'running': return 'bg-green-500'
      case 'stopped': return 'bg-red-500'
      case 'starting': return 'bg-yellow-500 animate-pulse'
      case 'stopping': return 'bg-yellow-500 animate-pulse'
      case 'restarting': return 'bg-blue-500 animate-pulse'
      case 'deploying': return 'bg-purple-500 animate-pulse'
      default: return 'bg-slate-500'
    }
  }

  const getStatusText = (status) => {
    switch(status) {
      case 'running': return 'Running'
      case 'stopped': return 'Stopped'
      case 'starting': return 'Starting...'
      case 'stopping': return 'Stopping...'
      case 'restarting': return 'Restarting...'
      case 'deploying': return 'Deploying...'
      default: return 'Unknown'
    }
  }

  const getGameIcon = (type) => {
    switch(type) {
      case 'minecraft': return '⛏️'
      case 'rust': return '🦀'
      case 'csgo': return '🎯'
      case 'valheim': return '⚔️'
      case 'palworld': return '🎮'
      case 'terraria': return '🌍'
      case 'gmod': return '🛠️'
      case 'ark': return '🦕'
      default: return '🎮'
    }
  }

  const filteredGames = games.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const typeInfo = gameTypes.find(t => t.type === deployForm.type)

  if (!token) return null

  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar />
      <div className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Game Servers</h1>
            <p className="text-slate-400 text-sm mt-1">Deploy and manage game servers</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-700 rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
            <button onClick={loadGames} className="p-2 bg-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowDeploy(true)}
              className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus size={18} /> Deploy Game
            </button>
          </div>
        </div>

        {showDeploy && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-white/10 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Deploy Game Server</h2>
                <button onClick={() => setShowDeploy(false)} className="text-slate-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Game Name</label>
                  <input
                    type="text"
                    placeholder="My Minecraft Server"
                    value={deployForm.name}
                    onChange={(e) => setDeployForm({ ...deployForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Game Type</label>
                  <select
                    value={deployForm.type}
                    onChange={(e) => {
                      const type = gameTypes.find(t => t.type === e.target.value)
                      setDeployForm({ 
                        ...deployForm, 
                        type: e.target.value,
                        port: type?.default_port || 25565
                      })
                    }}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {gameTypes.map(t => (
                      <option key={t.type} value={t.type}>
                        {t.type.toUpperCase()} (Port: {t.default_port})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Node</label>
                  <select
                    value={deployForm.node_id}
                    onChange={(e) => setDeployForm({ ...deployForm, node_id: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400 block mb-1">Port</label>
                    <input
                      type="number"
                      value={deployForm.port}
                      onChange={(e) => setDeployForm({ ...deployForm, port: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 block mb-1">Max Players</label>
                    <input
                      type="number"
                      value={deployForm.max_players}
                      onChange={(e) => setDeployForm({ ...deployForm, max_players: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400 block mb-1">CPU (Cores)</label>
                    <input
                      type="number"
                      value={deployForm.cpu}
                      onChange={(e) => setDeployForm({ ...deployForm, cpu: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 block mb-1">Memory (MB)</label>
                    <input
                      type="number"
                      value={deployForm.memory}
                      onChange={(e) => setDeployForm({ ...deployForm, memory: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-sm text-slate-400">Auto Backup</label>
                  <input
                    type="checkbox"
                    checked={deployForm.backup_enabled}
                    onChange={(e) => setDeployForm({ ...deployForm, backup_enabled: e.target.checked })}
                    className="w-4 h-4 bg-slate-700 rounded border-white/10"
                  />
                  {deployForm.backup_enabled && (
                    <input
                      type="number"
                      placeholder="Hours"
                      value={deployForm.backup_interval}
                      onChange={(e) => setDeployForm({ ...deployForm, backup_interval: parseInt(e.target.value) })}
                      className="w-20 px-2 py-1 bg-slate-700 rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleDeploy}
                    className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition"
                  >
                    Deploy
                  </button>
                  <button
                    onClick={() => setShowDeploy(false)}
                    className="flex-1 px-4 py-2 bg-slate-600 rounded-lg text-white hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showDetail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl border border-white/10 max-h-[80vh] overflow-y-auto">
              {(() => {
                const game = games.find(g => g.id === showDetail)
                if (!game) return null
                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{getGameIcon(game.type)}</span>
                        <div>
                          <h2 className="text-xl font-bold text-white">{game.name}</h2>
                          <p className="text-xs text-slate-400">{game.type.toUpperCase()}</p>
                        </div>
                      </div>
                      <button onClick={() => setShowDetail(null)} className="text-slate-400 hover:text-white transition">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                        <Server className="mx-auto text-cyan-400 mb-1" size={20} />
                        <p className="text-xs text-slate-400">Node</p>
                        <p className="text-white text-sm font-medium">{nodes.find(n => n.id === game.node_id)?.name || 'Unknown'}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                        <Users className="mx-auto text-green-400 mb-1" size={20} />
                        <p className="text-xs text-slate-400">Players</p>
                        <p className="text-white text-sm font-medium">{game.players || 0}/{game.max_players}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                        <Clock className="mx-auto text-yellow-400 mb-1" size={20} />
                        <p className="text-xs text-slate-400">Status</p>
                        <p className={`text-sm font-medium ${game.status === 'running' ? 'text-green-400' : 'text-red-400'}`}>
                          {getStatusText(game.status)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-400">CPU</p>
                        <p className="text-white text-sm font-medium">{game.cpu} Cores</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-400">Memory</p>
                        <p className="text-white text-sm font-medium">{game.memory} MB</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-400">Port</p>
                        <p className="text-white text-sm font-medium">{game.port}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-400">World</p>
                        <p className="text-white text-sm font-medium">{game.world_name || 'default'}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap mb-4">
                      {game.status !== 'running' && game.status !== 'starting' && (
                        <button onClick={() => handleStart(game.id)} className="px-4 py-2 bg-green-600 rounded-lg text-white hover:bg-green-700 transition flex items-center gap-2 text-sm">
                          <Play size={16} /> Start
                        </button>
                      )}
                      {(game.status === 'running' || game.status === 'starting') && (
                        <button onClick={() => handleStop(game.id)} className="px-4 py-2 bg-yellow-600 rounded-lg text-white hover:bg-yellow-700 transition flex items-center gap-2 text-sm">
                          <Square size={16} /> Stop
                        </button>
                      )}
                      {game.status === 'running' && (
                        <button onClick={() => handleRestart(game.id)} className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition flex items-center gap-2 text-sm">
                          <RotateCw size={16} /> Restart
                        </button>
                      )}
                      <button onClick={() => handleBackup(game.id)} className="px-4 py-2 bg-purple-600 rounded-lg text-white hover:bg-purple-700 transition flex items-center gap-2 text-sm">
                        <Archive size={16} /> Backup
                      </button>
                      <button onClick={() => handleDelete(game.id, game.name)} className="px-4 py-2 bg-red-600 rounded-lg text-white hover:bg-red-700 transition flex items-center gap-2 text-sm">
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-slate-400 text-center py-12">Loading games...</div>
        ) : filteredGames.length === 0 ? (
          <div className="text-slate-400 text-center py-12">
            {searchQuery ? 'No games match your search' : 'No game servers deployed. Click "Deploy Game" to get started.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                className="bg-slate-800 rounded-xl p-6 border border-white/5 hover:border-white/10 transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getGameIcon(game.type)}</span>
                    <div>
                      <h3 className="text-white font-medium">{game.name}</h3>
                      <p className="text-xs text-slate-400">{game.type.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(game.status)}`} />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Players</p>
                    <p className="text-sm font-bold text-white">{game.players || 0}/{game.max_players}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Status</p>
                    <p className={`text-sm font-bold ${game.status === 'running' ? 'text-green-400' : 'text-red-400'}`}>
                      {getStatusText(game.status)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Port</p>
                    <p className="text-sm font-bold text-white">{game.port}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                  <button
                    onClick={() => setShowDetail(game.id)}
                    className="flex-1 px-3 py-1.5 bg-slate-700 rounded-lg text-white text-xs hover:bg-slate-600 transition flex items-center justify-center gap-1"
                  >
                    <Eye size={14} /> Detail
                  </button>
                  {game.status !== 'running' && game.status !== 'starting' && (
                    <button
                      onClick={() => handleStart(game.id)}
                      className="px-3 py-1.5 bg-green-600 rounded-lg text-white text-xs hover:bg-green-700 transition flex items-center justify-center gap-1"
                    >
                      <Play size={14} />
                    </button>
                  )}
                  {(game.status === 'running' || game.status === 'starting') && (
                    <button
                      onClick={() => handleStop(game.id)}
                      className="px-3 py-1.5 bg-yellow-600 rounded-lg text-white text-xs hover:bg-yellow-700 transition flex items-center justify-center gap-1"
                    >
                      <Square size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleRestart(game.id)}
                    className="px-3 py-1.5 bg-blue-600 rounded-lg text-white text-xs hover:bg-blue-700 transition flex items-center justify-center gap-1"
                  >
                    <RotateCw size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(game.id, game.name)}
                    className="px-3 py-1.5 bg-red-600 rounded-lg text-white text-xs hover:bg-red-700 transition flex items-center justify-center gap-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}