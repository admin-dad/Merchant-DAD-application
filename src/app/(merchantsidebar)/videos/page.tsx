'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  Loader2,
  AlertCircle,
  Video,
  Link as LinkIcon,
  PlayCircle,
  Calendar,
  X
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Custom Brand Icons
// ─────────────────────────────────────────────────────────────────────────
const Youtube = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2.5 7.1c0 0-.2-1.7 1-2.9C4.6 3.1 5.9 3 6.5 2.9 9.6 2.7 12 2.7s2.4 0 5.5.2c.6.1 1.9.2 3 1.3 1.2 1.2 1 2.9 1 2.9s.2 1.7.2 3.4v1c0 1.7-.2 3.4-.2 3.4s-.2 1.7-1 2.9c-1.1 1.1-2.5 1.1-3.2 1.2-2.7.3-5.3.3-5.3.3s-2.4 0-5.5-.2c-.6-.1-1.9-.2-3-1.3-1.2-1.2-1-2.9-1-2.9s-.2-1.7-.2-3.4v-1c0-1.7.2-3.4.2-3.4z"/>
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

// ─────────────────────────────────────────────────────────────────────────
// YouTube ID Extractor
// ─────────────────────────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const cleanUrl = url.trim()

  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  const match = cleanUrl.match(regExp)
  if (match && match[1]) return match[1]

  try {
    const parsed = new URL(cleanUrl)
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '').split('?')[0]
    }
    if (parsed.searchParams.get('v')) {
      return parsed.searchParams.get('v')
    }
    if (parsed.pathname.includes('/shorts/')) {
      return parsed.pathname.split('/shorts/')[1].split('?')[0]
    }
    if (parsed.pathname.includes('/embed/')) {
      return parsed.pathname.split('/embed/')[1].split('?')[0]
    }
  } catch {
    return null
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-Component: Individual Video Card
// ─────────────────────────────────────────────────────────────────────────
const VideoCard = ({ 
  video, 
  playingId, 
  setPlayingId 
}: { 
  video: VideoRecord, 
  playingId: string | null, 
  setPlayingId: (id: string | null) => void 
}) => {
  const [igThumb, setIgThumb] = useState<string | null>(null)
  const isPlaying = playingId === video.id

  const ytId = extractYouTubeId(video.url)
  const isYouTube = video.platform === 'youtube' || Boolean(ytId)

  // Fetch Instagram Thumbnail dynamically
  useEffect(() => {
    if (video.platform === 'instagram' && !isYouTube) {
      const cleanUrl = video.url.split('?')[0]
      fetch(`https://api.microlink.io/?url=${encodeURIComponent(cleanUrl)}`)
        .then(res => res.json())
        .then(data => {
          if (data.data?.image?.url) {
            setIgThumb(data.data.image.url)
          }
        })
        .catch(() => {})
    }
  }, [video.url, video.platform, isYouTube])

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }

  const getPlatformIcon = (platform: string, size = 18) => {
    if (isYouTube || platform === 'youtube') return <Youtube size={size} className="text-white" />
    if (platform === 'instagram') return <Instagram size={size} className="text-white" />
    return <LinkIcon size={size} className="text-white" />
  }

  const getPlatformColor = (platform: string) => {
    if (isYouTube || platform === 'youtube') return 'bg-red-500'
    if (platform === 'instagram') return 'bg-pink-600'
    return 'bg-[#1857D6]'
  }

  const finalThumbnail = ytId
    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    : igThumb

  const getEmbedUrl = () => {
    if (ytId) {
      return `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&enablejsapi=1&rel=0`
    }
    if (video.platform === 'instagram') {
      let cleanUrl = video.url.split('?')[0].replace(/\/+$/, '')
      return `${cleanUrl}/embed/`
    }
    return video.url
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md text-left"
    >
      {/* ── Responsive Video Player Box (Auto-expands height for Instagram so 100% of reel is visible) ── */}
      <div 
        className={`relative w-full flex-shrink-0 overflow-hidden bg-black transition-all duration-300 ${
          isPlaying && video.platform === 'instagram' 
            ? 'h-[580px] sm:h-[620px]' 
            : 'aspect-video'
        }`}
      >
        {isPlaying ? (
          video.platform === 'other' && !video.url.match(/\.(mp4|webm|ogg|mov)$/i) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-50">
              <LinkIcon size={34} className="mb-2 text-slate-400" />
              <p className="mb-3 text-sm text-slate-500">Cannot play this link inline.</p>
              <a 
                href={video.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="rounded-xl bg-[#1857D6] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#0B2E7A] transition-colors"
              >
                Open Link
              </a>
            </div>
          ) : video.url.match(/\.(mp4|webm|ogg|mov)$/i) ? (
            <video 
              src={video.url} 
              autoPlay 
              controls 
              className="absolute inset-0 h-full w-full object-contain bg-black" 
            />
          ) : (
            <iframe
              src={getEmbedUrl()}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              scrolling="no"
              className="absolute inset-0 h-full w-full border-0 bg-white"
            />
          )
        ) : (
          <button 
            onClick={() => setPlayingId(video.id)}
            className="absolute inset-0 w-full h-full text-left focus:outline-none"
          >
            {finalThumbnail ? (
              <img 
                src={finalThumbnail} 
                alt={video.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
            )}
            
            {/* Play Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1857D6] shadow-xl">
                <PlayCircle size={32} className="text-white ml-1" />
              </div>
            </div>

            {/* Platform Tag */}
            <div className={`absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-2xl shadow-sm ${getPlatformColor(video.platform)}`}>
              {getPlatformIcon(video.platform, 18)}
            </div>
          </button>
        )}
      </div>

      {/* ── Content Details ── */}
      <div className="flex flex-1 flex-col p-6 w-full bg-white">
        <h3 className="mb-3 line-clamp-2 text-lg font-bold leading-snug text-slate-900 group-hover:text-[#1857D6] transition-colors">
          {video.title}
        </h3>
        
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100/80">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Calendar size={14} />
            {formatDate(video.created_at)}
          </span>
          
          {isPlaying ? (
            <button 
              onClick={() => setPlayingId(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
            >
              <X size={15} /> Close Video
            </button>
          ) : (
            <button
              onClick={() => setPlayingId(video.id)}
              className="flex items-center gap-1.5 text-xs font-bold text-[#1857D6] hover:underline"
            >
              Play Video
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────
export default function MerchantVideosPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [videos, setVideos] = useState<VideoRecord[]>([])
  
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'youtube' | 'instagram' | 'other'>('all')
  const [playingId, setPlayingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true)
      try {
        const { data, error: fetchError } = await supabase
          .from('merchant_videos')
          .select('*')
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        setVideos(data || [])
      } catch {
        setError('Failed to load videos. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [supabase])

  const filteredVideos = videos.filter(v => {
    const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = activeFilter === 'all' || v.platform === activeFilter
    return matchesSearch && matchesFilter
  })

  if (loading) {
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>
      
      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <PlayCircle size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Videos Hub
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Watch guides, tutorials, and promotional materials to maximize your store's growth.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-grow">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tutorials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          {(['all', 'youtube', 'instagram', 'other'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeFilter === filter
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white py-16 text-center shadow-sm">
          <Video size={40} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-900">No videos found</h3>
          <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredVideos.map((video) => (
            <VideoCard 
              key={video.id} 
              video={video} 
              playingId={playingId} 
              setPlayingId={setPlayingId} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
