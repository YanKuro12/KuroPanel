const colorMap = {
  blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
  green: 'from-green-500/20 to-green-500/5 border-green-500/20',
  yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20',
  purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20',
}

export default function StatsCard({ title, value, color = 'blue' }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-6 backdrop-blur-xl bg-gradient-to-br ${colorMap[color]}`}>
      <div>
        <p className="text-sm text-slate-400">{title}</p>
        <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
      </div>
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl" />
    </div>
  )
}