'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import StatsCard from '@/components/StatsCard'
import NodeList from '@/components/NodeList'
import RecentTasks from '@/components/RecentTasks'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, Server, Zap, Cpu } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    fetch('/api/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => {
        localStorage.removeItem('token')
        router.push('/login')
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar />
      <div className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>System Online</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard title="Total Nodes" value={stats?.totalNodes || 0} icon={<Server size={20} />} color="blue" />
          <StatsCard title="Online Nodes" value={stats?.onlineNodes || 0} icon={<Activity size={20} />} color="green" />
          <StatsCard title="Pending Tasks" value={stats?.pendingTasks || 0} icon={<Zap size={20} />} color="yellow" />
          <StatsCard title="CPU Usage" value={stats?.cpuUsage || '0%'} icon={<Cpu size={20} />} color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">System Activity</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <XAxis dataKey="time" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="cpu" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="memory" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-3 bg-blue-600 rounded-xl text-white text-sm hover:bg-blue-700 transition">Add Node</button>
              <button className="p-3 bg-green-600 rounded-xl text-white text-sm hover:bg-green-700 transition">New Task</button>
              <button className="p-3 bg-purple-600 rounded-xl text-white text-sm hover:bg-purple-700 transition">File Manager</button>
              <button className="p-3 bg-yellow-600 rounded-xl text-white text-sm hover:bg-yellow-700 transition">Monitor</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Nodes</h2>
            <NodeList />
          </div>
          <div className="glass rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Recent Tasks</h2>
            <RecentTasks />
          </div>
        </div>
      </div>
    </div>
  )
}