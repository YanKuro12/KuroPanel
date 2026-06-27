'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import {
  Users, Plus, Trash2, Edit, RefreshCw, Search,
  X, Check, Shield, ShieldCheck, ShieldX, Mail, User
} from 'lucide-react'
import { toast } from 'sonner'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user'
  })

  const [editUser, setEditUser] = useState({
    id: '',
    name: '',
    role: 'user'
  })

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    checkAdmin()
    loadUsers()
  }, [])

  const checkAdmin = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setIsAdmin(data.role === 'admin')
      if (data.role !== 'admin') {
        toast.error('Admin access required')
        router.push('/')
      }
    } catch (err) {
      toast.error('Failed to verify admin')
    }
  }

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setUsers(data || [])
    } catch (err) {
      toast.error('Failed to load users')
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!newUser.email.trim() || !newUser.password.trim() || !newUser.name.trim()) {
      toast.error('All fields required')
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          name: newUser.name
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('User created')
      setShowCreate(false)
      setNewUser({ email: '', password: '', name: '', role: 'user' })
      loadUsers()
    } catch (err) {
      toast.error('Failed to create user')
    }
  }

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editUser.name,
          role: editUser.role
        })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('User updated')
      setShowEdit(null)
      loadUsers()
    } catch (err) {
      toast.error('Failed to update user')
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete user "${name}"?`)) return
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('User deleted')
      loadUsers()
    } catch (err) {
      toast.error('Failed to delete user')
    }
  }

  const handleRoleChange = async (id, role) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('Role updated')
      loadUsers()
    } catch (err) {
      toast.error('Failed to update role')
    }
  }

  const getRoleBadge = (role) => {
    switch(role) {
      case 'admin':
        return { icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Admin' }
      case 'user':
        return { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'User' }
      default:
        return { icon: ShieldX, color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'Unknown' }
    }
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar />
      <div className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Users</h1>
            <p className="text-slate-400 text-sm mt-1">Manage user accounts</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-700 rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
            <button onClick={loadUsers} className="p-2 bg-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus size={18} /> Add User
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Add User</h2>
                <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCreate}
                    className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition"
                  >
                    Create
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

        {showEdit && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Edit User</h2>
                <button onClick={() => setShowEdit(null)} className="text-slate-400 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editUser.name}
                    onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Role</label>
                  <select
                    value={editUser.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleUpdate}
                    className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowEdit(null)}
                    className="flex-1 px-4 py-2 bg-slate-600 rounded-lg text-white hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-slate-400 text-center py-12">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-slate-400 text-center py-12">
            {searchQuery ? 'No users match your search' : 'No users registered yet'}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl overflow-hidden border border-white/5">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-slate-700/50 text-xs text-slate-400 font-medium">
              <div className="col-span-4">User</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            <div className="divide-y divide-white/5">
              {filteredUsers.map((user) => {
                const role = getRoleBadge(user.role)
                const RoleIcon = role.icon
                return (
                  <div key={user.id} className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-white/5 transition items-center">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.id}</p>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <p className="text-white text-sm">{user.email}</p>
                    </div>
                    <div className="col-span-2">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${role.bg} ${role.color}`}>
                        <RoleIcon size={12} />
                        {role.label}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-400 text-xs">{new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditUser({ id: user.id, name: user.name, role: user.role })
                          setShowEdit(user.id)
                        }}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-blue-400 transition"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.name)}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-red-400 transition"
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