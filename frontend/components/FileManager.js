'use client'
import { useState, useEffect } from 'react'
import { 
  Folder, File, Plus, Upload, Download, Trash2, Pencil, 
  Save, X, Archive, ChevronRight, Home, Search, RefreshCw 
} from 'lucide-react'
import { toast } from 'sonner'

export default function FileManager({ nodeId }) {
  const [path, setPath] = useState('/')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [editorContent, setEditorContent] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('file')
  const [searchQuery, setSearchQuery] = useState('')
  const [uploading, setUploading] = useState(false)

  const loadFiles = async (currentPath) => {
    if (!nodeId) return
    setLoading(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/files/list/${nodeId}?path=${encodeURIComponent(currentPath)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setFiles(data.files || [])
    } catch (err) {
      toast.error('Failed to load files')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadFiles(path)
  }, [path, nodeId])

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
      loadFiles(path)
    } catch (err) {
      toast.error('Failed to save file')
    }
  }

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
      loadFiles(path)
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

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
      loadFiles(path)
    } catch (err) {
      toast.error('Failed to create')
    }
  }

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
      loadFiles(path)
    } catch (err) {
      toast.error('Upload failed')
    }
    setUploading(false)
    e.target.value = ''
  }

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

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (editing) {
    return (
      <div className="bg-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold">Editing: {editing}</h3>
          <div className="flex gap-2">
            <button onClick={() => setEditing(null)} className="px-4 py-2 bg-slate-600 rounded-lg text-white">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 rounded-lg text-white flex items-center gap-2">
              <Save size={16} /> Save
            </button>
          </div>
        </div>
        <textarea
          value={editorContent}
          onChange={(e) => setEditorContent(e.target.value)}
          className="w-full h-96 bg-slate-900 text-white p-4 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setPath('/')} className="text-white hover:text-blue-400">
            <Home size={16} />
          </button>
          <span className="text-slate-400 text-sm">{path}</span>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-700 rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
            />
          </div>
          <button onClick={() => loadFiles(path)} className="p-2 bg-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowCreate(true)} className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition">
            <Plus size={16} />
          </button>
          <label className="p-2 bg-slate-600 rounded-lg text-white hover:bg-slate-500 transition cursor-pointer relative">
            <Upload size={16} />
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-1 text-sm mb-3 flex-wrap">
        {path.split('/').filter(Boolean).map((part, i, arr) => {
          const currentPath = '/' + arr.slice(0, i + 1).join('/')
          return (
            <div key={i} className="flex items-center gap-1">
              <ChevronRight size={12} className="text-slate-600" />
              <button
                onClick={() => setPath(currentPath)}
                className="text-slate-300 hover:text-white transition text-xs"
              >
                {part}
              </button>
            </div>
          )
        })}
      </div>

      {showCreate && (
        <div className="bg-slate-700 p-3 rounded-lg mb-3 flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-1.5 bg-slate-600 rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="px-3 py-1.5 bg-slate-600 rounded-lg text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="file">File</option>
            <option value="folder">Folder</option>
          </select>
          <button onClick={handleCreate} className="px-3 py-1.5 bg-green-600 rounded-lg text-white text-sm hover:bg-green-700 transition">
            Create
          </button>
          <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 bg-red-600 rounded-lg text-white text-sm hover:bg-red-700 transition">
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-center py-8 text-sm">Loading...</div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-slate-400 text-center py-8 text-sm">Empty directory</div>
      ) : (
        <div className="space-y-1">
          {filteredFiles.map((file) => (
            <div key={file.path} className="flex items-center justify-between p-2.5 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition group">
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(file)}
                <button
                  onClick={() => file.is_dir ? setPath(file.path) : handleEdit(file.path)}
                  className="text-white hover:text-blue-400 transition text-sm truncate"
                >
                  {file.name}
                </button>
                {!file.is_dir && <span className="text-xs text-slate-500 flex-shrink-0">{formatSize(file.size)}</span>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {!file.is_dir && (
                  <button onClick={() => handleDownload(file.path)} className="p-1 rounded hover:bg-white/10 text-green-400 hover:text-green-300 transition" title="Download">
                    <Download size={14} />
                  </button>
                )}
                {!file.is_dir && (
                  <button onClick={() => handleEdit(file.path)} className="p-1 rounded hover:bg-white/10 text-blue-400 hover:text-blue-300 transition" title="Edit">
                    <Pencil size={14} />
                  </button>
                )}
                {file.is_dir && (
                  <button
                    onClick={() => {
                      const name = prompt('Zip name:', file.name)
                      if (name) {
                        const token = localStorage.getItem('token')
                        fetch(`/api/files/zip/${nodeId}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ path: file.path, name })
                        }).then(() => { toast.success('Zipped'); loadFiles(path) })
                      }
                    }}
                    className="p-1 rounded hover:bg-white/10 text-purple-400 hover:text-purple-300 transition" title="Zip"
                  >
                    <Archive size={14} />
                  </button>
                )}
                {file.name.endsWith('.zip') && (
                  <button
                    onClick={() => {
                      const token = localStorage.getItem('token')
                      fetch(`/api/files/unzip/${nodeId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ path: file.path })
                      }).then(() => { toast.success('Unzipped'); loadFiles(path) })
                    }}
                    className="p-1 rounded hover:bg-white/10 text-purple-400 hover:text-purple-300 transition" title="Unzip"
                  >
                    <Archive size={14} />
                  </button>
                )}
                <button onClick={() => handleDelete(file.path)} className="p-1 rounded hover:bg-white/10 text-red-400 hover:text-red-300 transition" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}