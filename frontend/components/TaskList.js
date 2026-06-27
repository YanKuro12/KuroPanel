import { useState, useEffect } from 'react'

export default function TaskList() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('/api/tasks', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setTasks(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-slate-400 text-sm">Loading...</div>
  if (tasks.length === 0) return <div className="text-slate-400 text-sm">No tasks</div>

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    done: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="space-y-2">
      {tasks.slice(0, 5).map((task) => (
        <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
          <div>
            <p className="text-white text-sm font-medium">{task.type}</p>
            <p className="text-xs text-slate-400">{task.target}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${statusColors[task.status] || 'bg-slate-500/20 text-slate-400'}`}>
            {task.status}
          </span>
        </div>
      ))}
    </div>
  )
}