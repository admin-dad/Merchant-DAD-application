'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  Loader2,
  AlertCircle,
  Video,
  Link as LinkIcon,
  Plus,
  Trash2,
  Pencil,
  PlayCircle,
  Calendar,
  X,
  UploadCloud,
  FileVideo
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Custom Brand Icons
// ─────────────────────────────────────────────────────────────────────────
const Youtube = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2.5 7.1c0 0-.2-1.7 1-2.9C4.6 3.1 5.9 3 6.5 2.9 9.6 2.7 12 2.7 12 2.7s2.4 0 5.5.2c.6.1 1.9.2 3 1.3 1.2 1.2 1 2.9 1 2.9s.2 1.7.2 3.4v1c0 1.7-.2 3.4-.2 3.4s-.2 1.7-1 2.9c-1.1 1.1-2.5 1.1-3.2 1.2-2.7.3-5.3.3-5.3.3s-2.4 0-5.5-.2c-.6-.1-1.9-.2-3-1.3-1.2-1.2-1-2.9-1-2.9s-.2-1.7-.2-3.4v-1c0-1.7.2-3.4.2-3.4z"/>
    <polygon points="9.7 15.5 15.8 11.5 9.7 7.5"/>
  </svg>
)

const Instagram = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
)

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface VideoRecord {
  id: string
  title: string
  url: string
  platform: 'youtube' | 'instagram' | 'other'
  created_at: string
}

export default function AdminVideosPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [videos, setVideos] = useState<VideoRecord[]>([])
  
  // Stats
  const [totalVideos, setTotalVideos] = useState(0)
  const [youtubeCount, setYoutubeCount] = useState(0)
  const [instagramCount, setInstagramCount] = useState(0)

  // Filters & Modal States
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingVideo, setEditingVideo] = useState<VideoRecord | null>(null)

  // Add Form State
  const [inputType, setInputType] = useState<'url' | 'file'>('url')
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newPlatform, setNewPlatform] = useState<'youtube' | 'instagram' | 'other'>('youtube')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit Form State
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editPlatform, setEditPlatform] = useState<'youtube' | 'instagram' | 'other'>('youtube')

  // ── Fetch Video Data ──────────────────────────────────────────────────
  const fetchVideos = async () => {
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('merchant_videos')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setVideos(data || [])
      setTotalVideos(data?.length || 0)
      setYoutubeCount(data?.filter(v => v.platform === 'youtube').length || 0)
      setInstagramCount(data?.filter(v => v.platform === 'instagram').length || 0)

    } catch {
      setError('Failed to load video data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos()
  }, [supabase])

  // ── Helper: Upload local video file to Supabase Storage ─────────────
  const uploadVideoFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
    const filePath = `uploads/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('merchant_videos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage
      .from('merchant_videos')
      .getPublicUrl(filePath)

    return publicUrlData.publicUrl
  }

  // ── Add New Video ────────────────────────────────────────────────────
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle) return
    if (inputType === 'url' && !newUrl) return
    if (inputType === 'file' && !selectedFile) {
      alert('Please select a video file to upload.')
      return
    }

    setIsSubmitting(true)
    try {
      let finalUrl = newUrl
      let finalPlatform = newPlatform

      if (inputType === 'file' && selectedFile) {
        finalUrl = await uploadVideoFile(selectedFile)
        finalPlatform = 'other'
      }

      const { error: insertError } = await supabase
        .from('merchant_videos')
        .insert([
          { title: newTitle, url: finalUrl, platform: finalPlatform }
        ])

      if (insertError) throw insertError

      // Reset
      setNewTitle('')
      setNewUrl('')
      setSelectedFile(null)
      setNewPlatform('youtube')
      setInputType('url')
      if (fileInputRef.current) fileInputRef.current.value = ''
      setShowAddForm(false)
      fetchVideos()
    } catch (err: any) {
      alert(err.message || 'Error saving video. Please verify your Supabase storage bucket.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Open Edit Modal ──────────────────────────────────────────────────
  const openEditModal = (video: VideoRecord) => {
    setEditingVideo(video)
    setEditTitle(video.title)
    setEditUrl(video.url)
    setEditPlatform(video.platform)
  }

  // ── Save Edited Video ────────────────────────────────────────────────
  const handleUpdateVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingVideo || !editTitle || !editUrl) return

    setIsSubmitting(true)
    try {
      const { error: updateError } = await supabase
        .from('merchant_videos')
        .update({
          title: editTitle,
          url: editUrl,
          platform: editPlatform
        })
        .eq('id', editingVideo.id)

      if (updateError) throw updateError

      setEditingVideo(null)
      fetchVideos()
    } catch {
      alert('Error updating video.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Delete Video ─────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this video?')) return

    try {
      const { error: deleteError } = await supabase
        .from('merchant_videos')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      fetchVideos()
    } catch {
      alert('Error deleting video.')
    }
  }

  // ── Filter Logic ─────────────────────────────────────────────────────
  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getPlatformIcon = (platform: string, size = 16) => {
    switch (platform) {
      case 'youtube': return <Youtube size={size} className="text-red-500" />
      case 'instagram': return <Instagram size={size} className="text-pink-600" />
      default: return <LinkIcon size={size} className="text-[#1857D6]" />
    }
  }

  if (loading && videos.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      
      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <Video size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Merchant Video Portal
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Upload and manage instructional videos, tutorials, and promotional links for merchants.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1857D6] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#0B2E7A] focus:outline-none focus:ring-2 focus:ring-[#1857D6]/50"
          >
            {showAddForm ? <X size={18} /> : <Plus size={18} />}
            {showAddForm ? 'Cancel' : 'Add New Video'}
          </button>
        </div>
      </div>

      {/* Add Video Form (Animated Dropdown) */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <PlayCircle size={18} className="text-[#1857D6]" />
                  <h2 className="text-base font-semibold text-slate-900">Add New Video</h2>
                </div>

                {/* Switcher: URL link vs File Upload */}
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setInputType('url')}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      inputType === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Link URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputType('file')}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      inputType === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Upload File (.mp4/.mov)
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddVideo} className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">Video Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., How to scan QR codes"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                  />
                </div>

                {inputType === 'url' ? (
                  <>
                    <div className="sm:col-span-5">
                      <label className="mb-1.5 block text-xs font-medium text-slate-700">Video URL</label>
                      <input
                        type="url"
                        required
                        placeholder="https://..."
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="mb-1.5 block text-xs font-medium text-slate-700">Platform Type</label>
                      <select
                        value={newPlatform}
                        onChange={(e) => setNewPlatform(e.target.value as 'youtube' | 'instagram' | 'other')}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                      >
                        <option value="youtube">YouTube</option>
                        <option value="instagram">Instagram</option>
                        <option value="other">Other Link</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-8">
                    <label className="mb-1.5 block text-xs font-medium text-slate-700">Choose Video File from System</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="video/*"
                        required
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-800 file:mr-3 file:rounded-lg file:border-0 file:bg-[#1857D6] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-[#0B2E7A]"
                      />
                    </div>
                    {selectedFile && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <FileVideo size={13} /> Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                      </p>
                    )}
                  </div>
                )}

                <div className="sm:col-span-12 flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7BC142] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#3E7A1C] disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {inputType === 'file' ? 'Uploading Video...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        {inputType === 'file' ? <UploadCloud size={16} /> : <Plus size={16} />}
                        Save Video
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Videos</span>
            <div className="p-2 bg-blue-50 rounded-lg"><Video size={16} className="text-[#1857D6]" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{totalVideos}</h3>
          <p className="text-xs text-slate-400 mt-1">Available to merchants</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">YouTube Links</span>
            <div className="p-2 bg-red-50 rounded-lg"><Youtube size={16} className="text-red-500" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{youtubeCount}</h3>
          <p className="text-xs text-slate-400 mt-1">Active tutorials</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Instagram Links</span>
            <div className="p-2 bg-pink-50 rounded-lg"><Instagram size={16} className="text-pink-600" /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{instagramCount}</h3>
          <p className="text-xs text-slate-400 mt-1">Promotional content</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="relative w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search videos by title or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
          />
        </div>
      </div>

      {/* Videos Table */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <PlayCircle size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Uploaded Videos</h2>
            <p className="text-xs text-slate-500">Showing {filteredVideos.length} links.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-3 px-4 font-medium">Video Title</th>
                <th className="py-3 px-4 font-medium hidden sm:table-cell">Platform</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">Target URL</th>
                <th className="py-3 px-4 font-medium hidden lg:table-cell">Date Added</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVideos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No videos found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredVideos.map((v) => (
                  <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    
                    {/* Video Title */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                          {getPlatformIcon(v.platform)}
                        </div>
                        <p className="font-semibold text-slate-900">{v.title}</p>
                      </div>
                    </td>
                    
                    {/* Platform */}
                    <td className="py-4 px-4 hidden sm:table-cell">
                      <span className="capitalize text-slate-600">{v.platform}</span>
                    </td>
                    
                    {/* URL */}
                    <td className="py-4 px-4 hidden md:table-cell">
                      <a 
                        href={v.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#1857D6] hover:underline flex items-center gap-1.5 truncate max-w-[200px]"
                      >
                        <LinkIcon size={12} />
                        {v.url.replace(/^https?:\/\//, '')}
                      </a>
                    </td>
                    
                    {/* Date */}
                    <td className="py-4 px-4 hidden lg:table-cell">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Calendar size={12} className="text-slate-400" />
                        {formatDate(v.created_at)}
                      </span>
                    </td>
                    
                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => openEditModal(v)}
                          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-[#1857D6] transition-colors"
                          title="Edit Video"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(v.id)}
                          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete Video"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Edit Video Modal ── */}
      <AnimatePresence>
        {editingVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingVideo(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Pencil size={18} className="text-[#1857D6]" />
                  <h3 className="text-base font-semibold text-slate-900">Edit Video Details</h3>
                </div>
                <button
                  onClick={() => setEditingVideo(null)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateVideo} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">Video Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">Video URL</label>
                  <input
                    type="url"
                    required
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">Platform Type</label>
                  <select
                    value={editPlatform}
                    onChange={(e) => setEditPlatform(e.target.value as 'youtube' | 'instagram' | 'other')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="other">Other Link / Direct Video</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingVideo(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1857D6] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#0B2E7A] disabled:opacity-70"
                  >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    Update Video
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}