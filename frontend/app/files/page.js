'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { 
  Folder, File, Plus, Upload, Download, Trash2, Pencil, 
  Save, X, Copy, Move, Archive, ChevronRight, Home,
  Search, RefreshCw, Eye
} from 'lucide-react'
import { toast } from 'sonner'

export default function FilesPage() {
  const [path, setPath] = useState('/')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [editorContent, setEditorContent] = useState('')
  const [nodeId, setNodeId] = useState(null)
  const [nodes, setNodes] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('file')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  // Get nodes
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    fetch('/api/nodes', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setNodes(data)
        if (data.length > 0) {
          setNodeId(data[0].id)
        }
        setLoading(false)
      })
      .catch(() => {
        localStorage.removeItem('token')
        router.push('/login')
      })
  }, [])

  // Load files
  const loadFiles = useCallback(async () => {
    if (!nodeId) return
    setLoading(true)

    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/files/list/${nodeId}?path=${encodeURIComponent(path)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setFiles(data.files || [])
    } catch (err) {
      toast.error('Failed to load files')
    }
    setLoading(false)
  }, [nodeId, path])

  useEffect(() => {
    if (nodeId) {
      loadFiles()
    }
  }, [nodeId, path, loadFiles])

  // Get file content for editing
  const handleEdit = async (filePath) => {
    if (!nodeId) return
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/files/content/${nodeId}?path=${encodeURIComponent(filePath)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setEditing(filePath)
      setEditorContent(data.content || '')
    } catch (err) {
      toast.error('Failed to load file content')
    }
  }

  // Save file
  const handleSave = async () => {
    if (!nodeId || !editing) return
    const token = localStorage.getItem('token')
    try {
      await fetch(`/api/files/save/${nodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: editing, content: editorContent })
      })
      toast.success('File saved')
      setEditing(null)
      loadFiles()
    } catch (err) {
      toast.error('Failed to save file')
    }
  }

  // Delete file/folder
  const handleDelete = async (filePath) => {
    if (!confirm(`Delete ${filePath}?`)) return
    if (!nodeId) return
    const token = localStorage.getItem('token')
    try {
      await fetch(`/api/files/delete/${nodeId}?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Deleted')
      loadFiles()
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  // Create file/folder
  const handleCreate = async () => {
    if (!nodeId || !newName.trim()) return
    const token = localStorage.getItem('token')
    try {
      await fetch(`/api/files/create/${nodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          path: path,
          name: newName.trim(),
          isDir: newType === 'folder'
        })
      })
      toast.success(`${newType} created`)
      setShowCreate(false)
      setNewName('')
      loadFiles()
    } catch (err) {
      toast.error('Failed to create')
    }
  }

  // Upload file
  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !nodeId) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('token')

    try {
      await fetch(`/api/files/upload/${nodeId}?path=${encodeURIComponent(path)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      toast.success('File uploaded')
      loadFiles()
    } catch (err) {
      toast.error('Upload failed')
    }
    setUploading(false)
    e.target.value = ''
  }

  // Download file
  const handleDownload = async (filePath) => {
    if (!nodeId) return
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/files/download/${nodeId}?path=${encodeURIComponent(filePath)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filePath.split('/').pop()
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error('Download failed')
    }
  }

  // Rename
  const handleRename = async (oldPath, newName) => {
    if (!nodeId || !newName.trim()) return
    const token = localStorage.getItem('token')
    try {
      await fetch(`/api/files/rename/${nodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ oldPath, newName: newName.trim() })
      })
      toast.success('Renamed')
      loadFiles()
    } catch (err) {
      toast.error('Rename failed')
    }
  }

  // Chmod
  const handleChmod = async (filePath, perm) => {
    if (!nodeId || !perm) return
    const token = localStorage.getItem('token')
    try {
      await fetch(`/api/files/chmod/${nodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: filePath, perm })
      })
      toast.success('Permission updated')
      loadFiles()
    } catch (err) {
      toast.error('Chmod failed')
    }
  }

  // Zip
  const handleZip = async (targetPath, name) => {
    if (!nodeId || !name.trim()) return
    const token = localStorage.getItem('token')
    try {
      await fetch(`/api/files/zip/${nodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: targetPath, name: name.trim() })
      })
      toast.success('Zipped')
      loadFiles()
    } catch (err) {
      toast.error('Zip failed')
    }
  }

  // Unzip
  const handleUnzip = async (zipPath) => {
    if (!nodeId) return
    const token = localStorage.getItem('token')
    try {
      await fetch(`/api/files/unzip/${nodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: zipPath })
      })
      toast.success('Unzipped')
      loadFiles()
    } catch (err) {
      toast.error('Unzip failed')
    }
  }

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getFileIcon = (file) => {
    if (file.is_dir) return <Folder className="text-yellow-400" size={20} />
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (['js', 'ts', 'jsx', 'tsx', 'json'].includes(ext)) return <File className="text-yellow-400" size={20} />
    if (['py', 'rb', 'go', 'rs'].includes(ext)) return <File className="text-blue-400" size={20} />
    if (['html', 'css', 'scss', 'less'].includes(ext)) return <File className="text-orange-400" size={20} />
    if (['jpg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return <File className="text-green-400" size={20} />
    if (['zip', 'rar', 'gz', 'tar'].includes(ext)) return <File className="text-purple-400" size={20} />
    return <File className="text-slate-400" size={20} />
  }

  if (!nodeId && nodes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">No nodes available. Please create a node first.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar />
      <div className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">File Manager</h1>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={nodeId || ''}
                onChange={(e) => setNodeId(e.target.value)}
                className="bg-slate-700 text-white px-3 py-1 rounded-lg text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
              <span className={`text-xs px-2 py-1 rounded ${nodes.find(n => n.id === nodeId)?.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {nodes.find(n => n.id === nodeId)?.status || 'offline'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-700 rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
            <button onClick={loadFiles} className="p-2 bg-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm mb-4 bg-slate-800 p-3 rounded-xl">
          <button onClick={() => setPath('/')} className="text-slate-400 hover:text-white transition">
            <Home size={16} />
          </button>
          {path.split('/').filter(Boolean).map((part, i, arr) => {
            const currentPath = '/' + arr.slice(0, i + 1).join('/')
            return (
              <div key={i} className="flex items-center gap-1">
                <ChevronRight size={14} className="text-slate-600" />
                <button
                  onClick={() => setPath(currentPath)}
                  className="text-slate-300 hover:text-white transition"
                >
                  {part}
                </button>
              </div>
            )
          })}
        </div>

        {/* Editor */}
        {editing && (
          <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-blue-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">Editing: {editing}</span>
              <div className="flex gap-2">
                <button onClick={handleSave} className="px-4 py-2 bg-green-600 rounded-lg text-white text-sm hover:bg-green-700 transition flex items-center gap-2">
                  <Save size={16} /> Save
                </button>
                <button onClick={() => setEditing(null)} className="px-4 py-2 bg-slate-600 rounded-lg text-white text-sm hover:bg-slate-700 transition flex items-center gap-2">
                  <X size={16} /> Close
                </button>
              </div>
            </div>
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              className="w-full h-96 bg-slate-900 text-white p-4 rounded-lg font-mono text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              spellCheck={false}
            />
          </div>
        )}

        {/* Create dialog */}
        {showCreate && (
          <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-blue-500/20">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="px-4 py-2 bg-slate-700 rounded-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="file">File</option>
                <option value="folder">Folder</option>
              </select>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition">
                Create
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-slate-600 rounded-lg text-white hover:bg-slate-700 transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 rounded-lg text-white text-sm hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus size={16} /> New
          </button>
          <label className="px-4 py-2 bg-slate-600 rounded-lg text-white text-sm hover:bg-slate-700 transition flex items-center gap-2 cursor-pointer">
            <Upload size={16} /> Upload
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>
          {uploading && <span className="text-slate-400 text-sm">Uploading...</span>}
        </div>

        {/* Files list */}
        {loading ? (
          <div className="text-slate-400 text-center py-12">Loading files...</div>
        ) : (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-700/50 text-xs text-slate-400 font-medium">
              <div className="col-span-5">Name</div>
              <div className="col-span-3">Size</div>
              <div className="col-span-3">Modified</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            <div className="divide-y divide-white/5">
              {filteredFiles.length === 0 ? (
                <div className="text-slate-400 text-center py-12">Empty directory</div>
              ) : (
                filteredFiles.map((file) => (
                  <div key={file.path} className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-white/5 transition items-center">
                    <div className="col-span-5 flex items-center gap-3">
                      {getFileIcon(file)}
                      <button
                        onClick={() => file.is_dir ? setPath(file.path) : handleEdit(file.path)}
                        className="text-white hover:text-blue-400 transition text-sm truncate"
                      >
                        {file.name}
                      </button>
                    </div>
                    <div className="col-span-3 text-xs text-slate-400">
                      {file.is_dir ? '—' : formatSize(file.size)}
                    </div>
                    <div className="col-span-3 text-xs text-slate-400">
                      {new Date(file.created_at).toLocaleString()}
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      {!file.is_dir && (
                        <button
                          onClick={() => handleDownload(file.path)}
                          className="p-1 rounded hover:bg-white/10 text-green-400 hover:text-green-300 transition"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                      )}
                      {!file.is_dir && (
                        <button
                          onClick={() => handleEdit(file.path)}
                          className="p-1 rounded hover:bg-white/10 text-blue-400 hover:text-blue-300 transition"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {file.is_dir && (
                        <button
                          onClick={() => {
                            const name = prompt('Zip name:', file.name)
                            if (name) handleZip(file.path, name)
                          }}
                          className="p-1 rounded hover:bg-white/10 text-purple-400 hover:text-purple-300 transition"
                          title="Zip"
                        >
                          <Archive size={14} />
                        </button>
                      )}
                      {file.name.endsWith('.zip') && (
                        <button
                          onClick={() => handleUnzip(file.path)}
                          className="p-1 rounded hover:bg-white/10 text-purple-400 hover:text-purple-300 transition"
                          title="Unzip"
                        >
                          <Archive size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const newName = prompt('New name:', file.name)
                          if (newName) handleRename(file.path, newName)
                        }}
                        className="p-1 rounded hover:bg-white/10 text-yellow-400 hover:text-yellow-300 transition"
                        title="Rename"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(file.path)}
                        className="p-1 rounded hover:bg-white/10 text-red-400 hover:text-red-300 transition"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}