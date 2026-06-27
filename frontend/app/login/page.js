'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (data.token) {
        localStorage.setItem('token', data.token)
        toast.success('Login successful')
        router.push('/')
      } else {
        toast.error(data.error || 'Login failed')
      }
    } catch (err) {
      toast.error('Network error')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-slate-800 p-8 rounded-2xl w-96 border border-white/10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text">KuroPanel</h1>
          <p className="text-slate-400 text-sm mt-2">Infrastructure Management Platform</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="text-slate-300 text-sm block mb-2">Email</label>
            <input
              type="email"
              className="w-full p-3 bg-slate-700 rounded-xl text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="admin@kuropanel.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="text-slate-300 text-sm block mb-2">Password</label>
            <input
              type="password"
              className="w-full p-3 bg-slate-700 rounded-xl text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-bold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-500">
          Default: admin@kuropanel.com / admin123
        </div>
      </div>
    </div>
  )
}