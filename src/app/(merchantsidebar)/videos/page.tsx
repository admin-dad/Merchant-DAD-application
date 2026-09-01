'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  Loader2,
  AlertCircle,
  Video,
  Link as LinkIcon,
  PlayCircle,
  Calendar,
  X,
  ArrowUpRight,
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

const PLATFORM_STYLES: Record<
  'youtube' | 'instagram' | 'other',
  { accent: string; badgeBg: string; chipText: string; chipBg: string; label: string }
> = {
  youtube: {
    accent: 'bg-red-500',
    badgeBg: 'bg-red-500',
    chipText: 'text-red-600',
    chipBg: 'bg-red-50',
    label: 'YouTube',
  },
  instagram: {
    accent: 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-amber-400',
    badgeBg: 'bg-pink-600',
    chipText: 'text-pink-600',
    chipBg: 'bg-pink-50',
    label: 'Instagram',
  },
  other: {
    accent: 'bg-gradient-to-r from-[#1857D6] to-[#0B2E7A]',
    badgeBg: 'bg-[#1857D6]',
    chipText: 'text-[#1857D6]',
    chipBg: 'bg-blue-50',
    label: 'Resource',
  },
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
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

function resolvePlatform(video: VideoRecord, ytId: string | null): 'youtube' | 'instagram' | 'other' {
  const isYouTube = video.platform === 'youtube' || Boolean(ytId)
  if (isYouTube) return 'youtube'
  if (video.platform === 'instagram' || video.url.includes('instagram.com')) return 'instagram'
  return 'other'
}

function getEmbedUrl(video: VideoRecord, ytId: string | null) {
  if (ytId) {
    return `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0&enablejsapi=1&rel=0`
  }
  if (video.platform === 'instagram' || video.url.includes('instagram.com')) {
    // Append /embed/ with hidecaption parameter to make it clean and compact
    const cleanUrl = video.url.split('?')[0].replace(/\/+$/, '')
    return `${cleanUrl}/embed/?hidecaption=true`
  }
  return video.url
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-Component: Individual Video Card
// ─────────────────────────────────────────────────────────────────────────
const VideoCard = ({
  video,
  onPlay,
}: {
  video: VideoRecord
  onPlay: (video: VideoRecord) => void
}) => {
  const [igThumb, setIgThumb] = useState<string | null>(null)

  const ytId = extractYouTubeId(video.url)
  const resolvedPlatform = resolvePlatform(video, ytId)
  const styles = PLATFORM_STYLES[resolvedPlatform]

  useEffect(() => {
    if (resolvedPlatform === 'instagram') {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.url, resolvedPlatform])

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }

  const getPlatformIcon = (size = 15) => {
    if (resolvedPlatform === 'youtube') return <Youtube size={size} className="text-white" />
    if (resolvedPlatform === 'instagram') return <Instagram size={size} className="text-white" />
    return <LinkIcon size={size} className="text-white" />
  }

  const finalThumbnail = ytId
    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    : igThumb

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-lg text-left"
    >
      <div className={`h-1.5 w-full shrink-0 ${styles.accent}`} />

      <div className="relative w-full flex-shrink-0 aspect-video overflow-hidden bg-black">
        <button
          onClick={() => onPlay(video)}
          className="absolute inset-0 w-full h-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1857D6] focus-visible:ring-offset-2"
        >
          {finalThumbnail ? (
            <img
              src={finalThumbnail}
              alt={video.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <Instagram size={36} className="text-white/40" />
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1857D6] shadow-xl">
              <PlayCircle size={32} className="text-white ml-1" />
            </div>
          </div>

          <div className={`absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-2xl shadow-sm ${styles.badgeBg}`}>
            {getPlatformIcon()}
          </div>
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5 w-full bg-white">
        <span className={`mb-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles.chipBg} ${styles.chipText}`}>
          {getPlatformIcon(10)}
          {styles.label}
        </span>

        <h3 className="mb-3 line-clamp-2 text-base font-bold leading-snug text-slate-900 group-hover:text-[#1857D6] transition-colors">
          {video.title}
        </h3>

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100/80">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <Calendar size={13} />
            {formatDate(video.created_at)}
          </span>

          <button
            onClick={() => onPlay(video)}
            className="flex items-center gap-1 text-[11px] font-bold text-[#1857D6] hover:text-[#0B2E7A] transition-colors cursor-pointer"
          >
            Watch now
            <ArrowUpRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-Component: Compact Video Player Popup
// ─────────────────────────────────────────────────────────────────────────
function VideoPlayerModal({
  video,
  onClose,
}: {
  video: VideoRecord | null
  onClose: () => void
}) {
  const isOpen = Boolean(video)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!video) return null

  const ytId = extractYouTubeId(video.url)
  const resolvedPlatform = resolvePlatform(video, ytId)
  const styles = PLATFORM_STYLES[resolvedPlatform]
  const isDirectFile = video.url.match(/\.(mp4|webm|ogg|mov)$/i)
  const canEmbed = ytId || resolvedPlatform === 'instagram' || isDirectFile
  const isInstagram = resolvedPlatform === 'instagram'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#090D16]/85 backdrop-blur-sm"
          />

          {/* Compact Modal Box */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={video.title}
            className={`relative z-10 w-full ${isInstagram ? 'max-w-[340px] sm:max-w-[380px]' : 'max-w-3xl'} overflow-hidden rounded-2xl bg-black shadow-[0_24px_70px_rgba(0,0,0,0.5)] my-auto`}
          >
            {/* Top accent strip */}
            <div className={`h-1.5 w-full ${styles.accent}`} />

            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-5 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer shadow-md"
            >
              <X size={16} />
            </button>

            {/* Player Container */}
            <div className={`relative w-full ${isInstagram ? 'aspect-[9/16] max-h-[580px]' : 'aspect-video'} bg-black flex items-center justify-center`}>
              {isDirectFile ? (
                <video
                  src={video.url}
                  autoPlay
                  controls
                  className="absolute inset-0 h-full w-full object-contain bg-black"
                />
              ) : canEmbed ? (
                <iframe
                  src={getEmbedUrl(video, ytId)}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  scrolling="no"
                  className="absolute inset-0 h-full w-full border-0 bg-black"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900">
                  <LinkIcon size={34} className="mb-2 text-slate-400" />
                  <p className="mb-3 text-sm text-slate-300">Cannot play this link inline.</p>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-[#1857D6] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#0B2E7A] transition-colors"
                  >
                    Open Link
                  </a>
                </div>
              )}
            </div>

            {/* Compact Title / Footer bar */}
            <div className="flex items-center justify-between gap-3 bg-[#0B0F19] px-4 py-3">
              <div className="min-w-0">
                <span className={`mb-0.5 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${styles.chipBg} ${styles.chipText}`}>
                  {styles.label}
                </span>
                <h3 className="truncate text-xs font-semibold text-white sm:text-sm">
                  {video.title}
                </h3>
              </div>
              
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Original
                <ArrowUpRight size={11} />
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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

  const [playingVideo, setPlayingVideo] = useState<VideoRecord | null>(null)

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

  const countFor = (filter: 'all' | 'youtube' | 'instagram' | 'other') =>
    filter === 'all' ? videos.length : videos.filter(v => v.platform === filter).length

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-4 py-16 text-center bg-white" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-white" style={{ fontFamily: 'var(--font-display)' }}>

      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1857D6] to-[#0B2E7A] text-white shadow-lg shadow-blue-500/20">
              <PlayCircle size={30} />
            </div>
            <div>
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7BC142]/10 to-[#1857D6]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#3E7A1C]">
                Merchant Academy
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Training & Resources
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Watch guides, tutorials, and promotional materials to maximize your store&apos;s growth.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-[#1857D6] shrink-0">
            <Video size={16} />
            <span className="text-sm font-bold">{videos.length}</span>
            <span className="text-xs font-medium text-blue-500">video{videos.length === 1 ? '' : 's'} available</span>
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
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                activeFilter === filter
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeFilter === filter ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
              }`}>
                {countFor(filter)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white py-16 text-center shadow-sm">
          <Video size={40} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-950">No videos found</h3>
          <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onPlay={setPlayingVideo}
            />
          ))}
        </div>
      )}

      {/* Popup player */}
      <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />
    </div>
  )
}