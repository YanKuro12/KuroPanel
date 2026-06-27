'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import {
  Settings, Save, Moon, Sun, Monitor, Key, Globe, Shield,
  Database, Bell, Mail, User, Server, HardDrive, RefreshCw,
  Check, X, AlertCircle, Lock, Eye, EyeOff
} from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [apiKeys, setApiKeys] = useState([])
  const [newApiKey, setNewApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [settings, setSettings] = useState({
    appName: 'KuroPanel',
    appUrl: '',
    timezone: 'Asia/Jakarta',
    maintenance: false,
    registration: true,
    emailNotifications: true,
    backupEnabled: true,
    backupInterval: 24,
    retentionDays: 30
  })
  const router = useRouter()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data) {
        setSettings(data)
        setTheme(data.theme || 'dark')
        setApiKeys(data.apiKeys || [])
      }
    } catch (err) {
      toast.error('Failed to load settings')
    }
    setLoading(false)
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...settings, theme })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('Settings saved')
    } catch (err) {
      toast.error('Failed to save settings')
    }
    setSaving(false)
  }

  const handleGenerateApiKey = async () => {
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newApiKey || 'API Key' })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      toast.success('API Key generated')
      setNewApiKey('')
      setShowApiKey(true)
      setApiKeys([...apiKeys, data])
      setTimeout(() => setShowApiKey(false), 10000)
    } catch (err) {
      toast.error('Failed to generate API key')
    }
  }

  const handleDeleteApiKey = async (id) => {
    if (!confirm('Delete this API key?')) return
    try {
      await fetch(`/api/settings/api-keys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('API Key deleted')
      setApiKeys(apiKeys.filter(k => k.id !== id))
    } catch (err) {
      toast.error('Failed to delete API key')
    }
  }

  const handleReset = () => {
    if (!confirm('Reset all settings to default?')) return
    setSettings({
      appName: 'KuroPanel',
      appUrl: '',
      timezone: 'Asia/Jakarta',
      maintenance: false,
      registration: true,
      emailNotifications: true,
      backupEnabled: true,
      backupInterval: 24,
      retentionDays: 30
    })
    setTheme('dark')
    toast.info('Settings reset to default')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar />
      <div className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="text-slate-400 text-sm mt-1">Configure your KuroPanel instance</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition flex items-center gap-2"
            >
              <RefreshCw size={18} /> Reset
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 rounded-2xl p-6 border border-white/5">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Settings size={20} /> General
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Application Name</label>
                  <input
                    type="text"
                    value={settings.appName}
                    onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Application URL</label>
                  <input
                    type="text"
                    placeholder="https://panel.example.com"
                    value={settings.appUrl}
                    onChange={(e) => setSettings({ ...settings, appUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Timezone</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Asia/Jakarta">Asia/Jakarta (UTC+7)</option>
                    <option value="Asia/Makassar">Asia/Makassar (UTC+8)</option>
                    <option value="Asia/Jayapura">Asia/Jayapura (UTC+9)</option>
                    <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 border border-white/5">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Globe size={20} /> System
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                  <div>
                    <p className="text-white font-medium">Maintenance Mode</p>
                    <p className="text-xs text-slate-400">Disable all non-admin access</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, maintenance: !settings.maintenance })}
                    className={`px-4 py-2 rounded-lg text-white transition ${
                      settings.maintenance ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-600 hover:bg-slate-500'
                    }`}
                  >
                    {settings.maintenance ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                  <div>
                    <p className="text-white font-medium">User Registration</p>
                    <p className="text-xs text-slate-400">Allow new users to register</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, registration: !settings.registration })}
                    className={`px-4 py-2 rounded-lg text-white transition ${
                      settings.registration ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-500'
                    }`}
                  >
                    {settings.registration ? 'Open' : 'Closed'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 border border-white/5">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Database size={20} /> Backup
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                  <div>
                    <p className="text-white font-medium">Auto Backup</p>
                    <p className="text-xs text-slate-400">Automatically backup database</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, backupEnabled: !settings.backupEnabled })}
                    className={`px-4 py-2 rounded-lg text-white transition ${
                      settings.backupEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-500'
                    }`}
                  >
                    {settings.backupEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                {settings.backupEnabled && (
                  <>
                    <div>
                      <label className="text-sm text-slate-400 block mb-1">Backup Interval (hours)</label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={settings.backupInterval}
                        onChange={(e) => setSettings({ ...settings, backupInterval: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 block mb-1">Retention Days</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.retentionDays}
                        onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800 rounded-2xl p-6 border border-white/5">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Moon size={20} /> Appearance
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-xl border-2 transition ${
                    theme === 'dark' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <Moon className="w-6 h-6 text-white mx-auto mb-1" />
                  <p className="text-xs text-slate-400">Dark</p>
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-xl border-2 transition ${
                    theme === 'light' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <Sun className="w-6 h-6 text-white mx-auto mb-1" />
                  <p className="text-xs text-slate-400">Light</p>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`p-4 rounded-xl border-2 transition ${
                    theme === 'system' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <Monitor className="w-6 h-6 text-white mx-auto mb-1" />
                  <p className="text-xs text-slate-400">System</p>
                </button>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 border border-white/5">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Key size={20} /> API Keys
              </h2>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Key name..."
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-700 rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleGenerateApiKey}
                    className="px-4 py-2 bg-blue-600 rounded-lg text-white text-sm hover:bg-blue-700 transition"
                  >
                    Generate
                  </button>
                </div>

                {showApiKey && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                    <p className="text-green-400 text-xs font-mono break-all">
                      {apiKeys[apiKeys.length - 1]?.key || 'Generated'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Copy this key now. It won't be shown again.</p>
                  </div>
                )}

                {apiKeys.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">No API keys generated</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {apiKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                        <div>
                          <p className="text-white text-sm">{key.name}</p>
                          <p className="text-xs text-slate-400">{key.created_at}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteApiKey(key.id)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-red-400 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 border border-white/5">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Server size={20} /> System Info
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Version</span>
                  <span className="text-white">1.0.0</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Go Version</span>
                  <span className="text-white">1.25</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Database</span>
                  <span className="text-white">PostgreSQL 15</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Cache</span>
                  <span className="text-white">Redis 7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}