'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Gift, Loader2, CheckCircle2, Frown, Sparkles, X, History as HistoryIcon, Trophy, Download } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Interactive Canvas Scratch Card Component
// ─────────────────────────────────────────────────────────────────────────
const ScratchCardCanvas = ({ onScratch }: { onScratch: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // 1. Draw metallic foil gradient (Purple/Silver themed for B2B)
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
    gradient.addColorStop(0, '#e2e8f0')
    gradient.addColorStop(0.2, '#c084fc')
    gradient.addColorStop(0.5, '#f1f5f9')
    gradient.addColorStop(0.8, '#a855f7')
    gradient.addColorStop(1, '#64748b')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, rect.width, rect.height)

    // 2. Draw dynamic wavy security pattern
    ctx.lineWidth = 3
    for (let i = 0; i < rect.width + rect.height; i += 24) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i - rect.height, rect.height)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.stroke()
    }

    // 3. Overlay a subtle dark vignette around edges
    const vignette = ctx.createRadialGradient(
      rect.width / 2, rect.height / 2, rect.width / 4,
      rect.width / 2, rect.height / 2, rect.width
    )
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,0.2)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, rect.width, rect.height)

    // 4. Draw Typography
    ctx.fillStyle = '#1e293b'
    ctx.font = '900 24px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(255,255,255,0.7)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetY = 1
    ctx.fillText('SCRATCH', rect.width / 2, rect.height / 2 - 8)

    ctx.font = '600 12px system-ui, -apple-system, sans-serif'
    ctx.fillText('TO REVEAL', rect.width / 2, rect.height / 2 + 16)

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
  }, [])

  const scratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.lineWidth = 45

    ctx.beginPath()
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()
    } else {
      ctx.arc(x, y, 22.5, 0, Math.PI * 2)
      ctx.fill()
    }

    lastPos.current = { x, y }
    onScratch()
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true
    lastPos.current = null
    scratch(e.clientX, e.clientY)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    scratch(e.clientX, e.clientY)
  }

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = false
    lastPos.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full touch-none z-10 cursor-crosshair rounded-2xl"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface ScratchCard {
  id: string
  prize_type: string
  prize_amount: number
  winning_probability: number
  campaign_id: string | null
}

interface MerchantCampaign {
  id: string
  name: string
  prize_details: string | null
  winning_probability: number
  total_cards: number
  issued_cards: number
  gift: { id: string; name: string; description: string | null; image_url: string | null } | null
}

interface HistoryCard {
  id: string
  status: string
  prize_amount: number
  created_at: string
  gift_name: string | null
  gift_image_url: string | null
}

// ─────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────
export default function MerchantScratchCard({ merchantId }: { merchantId: string }) {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [merchantName, setMerchantName] = useState<string>('')   // ← fetched from DB
  const [card, setCard] = useState<ScratchCard | null>(null)
  const [campaign, setCampaign] = useState<MerchantCampaign | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isScratching, setIsScratching] = useState(false)
  const [result, setResult] = useState<'win' | 'lose' | null>(null)
  const [wonAmount, setWonAmount] = useState<number>(0)
  const [wonAt, setWonAt] = useState<Date | null>(null)           // ← exact win timestamp
  const [isDownloading, setIsDownloading] = useState(false)

  // Rewards history
  const [history, setHistory] = useState<HistoryCard[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  // ── Fetch merchant name + pending card + active campaign in parallel ──
  useEffect(() => {
    const fetchAll = async () => {
      const merchantPromise = supabase
        .from('merchants')
        .select('business_name')
        .eq('id', merchantId)
        .single()

      const campaignPromise = supabase
        .from('campaigns')
        .select(`
          id, name, prize_details, winning_probability, total_cards, issued_cards,
          gift:gifts ( id, name, description, image_url )
        `)
        .eq('type', 'merchant')
        .eq('status', 'active')
        .maybeSingle()

      const cardPromise = supabase
        .from('merchant_scratch_cards')
        .select(`
          id, prize_type, prize_amount, winning_probability, campaign_id,
          campaign:campaigns ( id, name, type )
        `)
        .eq('merchant_id', merchantId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      const [
        { data: merchantData },
        { data: campaignData, error: campaignError },
        { data: cardData, error: cardError },
      ] = await Promise.all([merchantPromise, campaignPromise, cardPromise])

      console.log('active merchant campaign →', { campaignData, campaignError })
      console.log('scratch card fetch →', { cardData, cardError, merchantId })

      // Store merchant name for the download image + UI
      if (merchantData?.business_name) {
        setMerchantName(merchantData.business_name)
      }

      if (campaignData) {
        const giftJoin = Array.isArray(campaignData.gift) ? campaignData.gift[0] : campaignData.gift
        setCampaign({
          id: campaignData.id,
          name: campaignData.name,
          prize_details: campaignData.prize_details,
          winning_probability: campaignData.winning_probability,
          total_cards: campaignData.total_cards,
          issued_cards: campaignData.issued_cards,
          gift: giftJoin ?? null,
        })
      }

      if (!cardError && cardData) {
        type Row = ScratchCard & { campaign: { id: string; type: string } | null }
        const eligible = (cardData as unknown as Row[]).find(
          (row) => !row.campaign_id || row.campaign?.type === 'merchant'
        )
        if (eligible) setCard(eligible as ScratchCard)
      }

      setLoading(false)
    }
    fetchAll()
  }, [merchantId, supabase])

  // ── Lazy-load rewards history ─────────────────────────────────────────
  const fetchHistory = async () => {
    setHistoryLoading(true)
    const { data, error } = await supabase
      .from('merchant_scratch_cards')
      .select(`
        id, status, prize_amount, created_at,
        campaign:campaigns ( gift:gifts ( name, image_url ) )
      `)
      .eq('merchant_id', merchantId)
      .neq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error(
        'Error fetching scratch card history:',
        JSON.stringify(error, Object.getOwnPropertyNames(error)),
        error
      )
    } else if (data) {
      type Row = {
        id: string
        status: string
        prize_amount: number
        created_at: string
        campaign: { gift: { name: string; image_url: string | null } | { name: string; image_url: string | null }[] | null } | { gift: { name: string; image_url: string | null } | { name: string; image_url: string | null }[] | null }[] | null
      }
      const flattened: HistoryCard[] = (data as unknown as Row[]).map((row) => {
        const campaignJoin = Array.isArray(row.campaign) ? row.campaign[0] : row.campaign
        const giftJoin = campaignJoin?.gift
          ? Array.isArray(campaignJoin.gift)
            ? campaignJoin.gift[0]
            : campaignJoin.gift
          : null
        return {
          id: row.id,
          status: row.status,
          prize_amount: row.prize_amount,
          created_at: row.created_at,
          gift_name: giftJoin?.name ?? null,
          gift_image_url: giftJoin?.image_url ?? null,
        }
      })
      setHistory(flattened)
    }
    setHistoryLoaded(true)
    setHistoryLoading(false)
  }

  const handleOpen = () => {
    setIsOpen(true)
    if (!card && !historyLoaded) fetchHistory()
  }

  // ── Scratch handler ───────────────────────────────────────────────────
  const handleScratch = async () => {
    if (!card || isScratching) return
    setIsScratching(true)

    const effectiveProbability = campaign?.winning_probability ?? card.winning_probability
    const isWinner = Math.random() < effectiveProbability
    const newStatus = isWinner ? 'won' : 'lost'
    const linkedCampaignId = campaign?.id ?? card.campaign_id ?? null

    await supabase
      .from('merchant_scratch_cards')
      .update({ status: newStatus, campaign_id: linkedCampaignId })
      .eq('id', card.id)

    if (isWinner) {
      const rewardLabel = campaign?.gift?.name
        ? campaign.gift.name
        : campaign?.prize_details
          ? campaign.prize_details
          : 'B2B Scratch Card Reward'

      await supabase.from('merchant_transactions').insert([{
        merchant_id: merchantId,
        wallet_type: 'points',
        transaction_type: 'credit',
        amount: card.prize_amount,
        description: `Won ${rewardLabel}!`,
        category: 'reward'
      }])

      setWonAmount(card.prize_amount)
      setWonAt(new Date()) // ← record exact win time for the download image

      if (campaign) {
        await supabase
          .from('campaigns')
          .update({ issued_cards: campaign.issued_cards + 1 })
          .eq('id', campaign.id)
      }
    }

    setTimeout(() => {
      setResult(isWinner ? 'win' : 'lose')
      setIsScratching(false)
    }, 1500)
  }

  // ── Download reward as PNG ────────────────────────────────────────────
  // Draws a branded card with: merchant name, reward points, gift details,
  // and the exact date + time the card was won.
  // File is saved as:  <merchant-name>-reward-<timestamp>.png
  const handleDownloadReward = async () => {
    if (isDownloading) return
    setIsDownloading(true)

    try {
      const width = 800
      const height = 980
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas not supported')

      // ── Background ──
      const bg = ctx.createLinearGradient(0, 0, width, height)
      bg.addColorStop(0, '#0f172a')
      bg.addColorStop(0.5, '#3b0764')
      bg.addColorStop(1, '#0f172a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      // ── Top accent bar ──
      const accent = ctx.createLinearGradient(0, 0, width, 0)
      accent.addColorStop(0, '#9333EA')
      accent.addColorStop(0.5, '#6366F1')
      accent.addColorStop(1, '#1857D6')
      ctx.fillStyle = accent
      ctx.fillRect(0, 0, width, 14)

      // ── Card panel ──
      const pad = 48
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      drawRoundRect(ctx, pad, 100, width - pad * 2, height - 100 - pad, 24)
      ctx.fill()

      // ── "🎉 B2B REWARD WON 🎉" ──
      ctx.textAlign = 'center'
      ctx.fillStyle = '#a855f7'
      ctx.font = '700 20px system-ui, -apple-system, sans-serif'
      ctx.fillText('🎉  B2B REWARD WON  🎉', width / 2, 160)

      // ── Merchant name (large, prominent) ──
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 38px system-ui, -apple-system, sans-serif'
      ctx.fillText(merchantName || 'Your Store', width / 2, 218)

      // ── Divider ──
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(pad + 20, 242)
      ctx.lineTo(width - pad - 20, 242)
      ctx.stroke()

      // ── Gift photo (CORS-safe, silently skipped on failure) ──
      let imageBottomY = 272
      if (campaign?.gift?.image_url) {
        try {
          const img = await loadImage(campaign.gift.image_url)
          const imgSize = 260
          const imgX = width / 2 - imgSize / 2
          const imgY = 272
          ctx.save()
          drawRoundRect(ctx, imgX, imgY, imgSize, imgSize, 20)
          ctx.clip()
          ctx.drawImage(img, imgX, imgY, imgSize, imgSize)
          ctx.restore()
          imageBottomY = imgY + imgSize + 30
        } catch {
          imageBottomY = 292
        }
      } else {
        imageBottomY = 292
      }

      // ── Reward points ──
      ctx.fillStyle = '#FDE047'
      ctx.font = '800 44px system-ui, -apple-system, sans-serif'
      ctx.fillText(`${wonAmount} Reward Points`, width / 2, imageBottomY + 56)

      // ── Prize / gift name ──
      const prizeLabel = campaign?.gift?.name ?? campaign?.prize_details ?? null
      if (prizeLabel) {
        ctx.fillStyle = '#d8b4fe'
        ctx.font = '600 22px system-ui, -apple-system, sans-serif'
        wrapText(ctx, prizeLabel, width / 2, imageBottomY + 106, width - pad * 2 - 40, 30)
      }

      // ── Gift description ──
      if (campaign?.gift?.description) {
        ctx.fillStyle = '#94a3b8'
        ctx.font = '400 16px system-ui, -apple-system, sans-serif'
        wrapText(
          ctx,
          campaign.gift.description,
          width / 2,
          imageBottomY + (prizeLabel ? 154 : 116),
          width - pad * 2 - 60,
          24
        )
      }

      // ── Won date & time (exact timestamp) ──
      const displayDate = (wonAt ?? new Date()).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
      ctx.fillStyle = '#64748b'
      ctx.font = '400 14px system-ui, -apple-system, sans-serif'
      ctx.fillText(`Won on ${displayDate}`, width / 2, height - 60)

      // ── Trigger download — filename uses merchant name ──
      canvas.toBlob((blob) => {
        if (!blob) { setIsDownloading(false); return }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const safeName = (merchantName || 'merchant').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
        a.download = `${safeName}-reward-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setIsDownloading(false)
      }, 'image/png')
    } catch (err) {
      console.error('Failed to generate reward image:', err)
      setIsDownloading(false)
    }
  }

  // ── Done / Close ──────────────────────────────────────────────────────
  const handleDone = () => {
    setIsOpen(false)
    setCard(null)
    setResult(null)
    setWonAt(null)
    window.location.reload()
  }

  const handleCloseModal = () => {
    if (result) {
      handleDone()
    } else {
      setIsOpen(false)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  if (loading) return null

  const isWin = (status: string) => {
    const s = (status || '').toLowerCase()
    return s !== 'lost' && s !== 'lose' && s !== 'pending'
  }
  const wins = history.filter((h) => isWin(h.status))
  const totalWonPoints = wins.reduce((sum, h) => sum + (h.prize_amount || 0), 0)

  return (
    <>
      {/* Floating trigger icon */}
      {!isOpen && (
        <motion.button
          type="button"
          onClick={handleOpen}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          aria-label={card ? 'Open your scratch card reward' : 'View your rewards history'}
          className="fixed bottom-6 right-6 z-[90] flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#9333EA] via-[#1857D6] to-[#9333EA] text-white shadow-[0_10px_30px_rgba(147,51,234,0.45)] cursor-pointer"
        >
          {card && (
            <motion.span
              className="absolute inset-0 rounded-full bg-[#9333EA]/50"
              animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <Gift size={26} className="relative z-10" />
          {card && (
            <span className="absolute -right-0.5 -top-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-[#0B0F19] ring-2 ring-white">
              1
            </span>
          )}
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm"
              onClick={handleCloseModal}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(9,13,22,0.35)] border border-slate-200 p-8 text-center max-h-[85vh] overflow-y-auto"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label="Close"
                className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              {card ? (
                !result ? (
                  // ── STEP 1: The Interactive Scratch Card ──
                  <div className="flex flex-col items-center">
                    <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600">
                      <Sparkles size={13} /> B2B Reward Received!
                    </div>
                    <h2 className="text-2xl font-bold text-[#0B0F19] mb-2">You got a Scratch Card!</h2>
                    <p className="text-sm text-slate-500 mb-6">
                      {isScratching ? 'Hold on, revealing your reward...' : 'Rub the card below to scratch and reveal!'}
                    </p>

                    <div className="relative w-64 h-40 select-none">
                      <motion.div
                        className="absolute -inset-3 rounded-[1.75rem] bg-gradient-to-r from-[#9333EA] via-[#1857D6] to-[#9333EA] blur-xl"
                        animate={
                          isScratching
                            ? { opacity: [0.35, 0.85, 0.35], scale: [1, 1.04, 1] }
                            : { opacity: [0.2, 0.4, 0.2], scale: 1 }
                        }
                        transition={{ duration: isScratching ? 0.7 : 3, repeat: Infinity, ease: 'easeInOut' }}
                      />

                      <motion.div
                        whileHover={!isScratching ? { scale: 1.02 } : {}}
                        className="relative w-64 h-40 rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 bg-white"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#3b0764] to-[#0f172a] flex flex-col items-center justify-center text-white p-4">
                          <motion.div
                            className="absolute inset-0 border-[40px] border-[#a855f7]/20 rounded-full blur-2xl"
                            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                          />
                          <motion.div
                            animate={isScratching ? { scale: [0.95, 1.1, 1], rotate: [0, -3, 3, 0] } : { scale: 1, rotate: 0 }}
                            transition={{ duration: 0.6, repeat: isScratching ? Infinity : 0, ease: 'easeInOut' }}
                            className="z-0 flex flex-col items-center"
                          >
                            <Gift size={36} className="mb-2 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 drop-shadow-sm">
                              Unlocking...
                            </span>
                          </motion.div>
                        </div>

                        <ScratchCardCanvas onScratch={() => { if (!isScratching) handleScratch() }} />

                        {isScratching && (
                          <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden">
                            {Array.from({ length: 24 }).map((_, i) => {
                              const angle = (i / 24) * Math.PI * 2
                              const velocity = 50 + Math.random() * 70
                              const size = 3 + Math.random() * 5
                              const colors = ['#FDE047', '#A855F7', '#34D399', '#60A5FA', '#F472B6']
                              const color = colors[i % colors.length]
                              return (
                                <motion.div
                                  key={`sparkle-${i}`}
                                  className="absolute rounded-full"
                                  style={{ backgroundColor: color, width: size, height: size, boxShadow: `0 0 8px ${color}` }}
                                  initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                                  animate={{ x: Math.cos(angle) * velocity, y: Math.sin(angle) * velocity, opacity: [1, 1, 0], scale: [0, 1.2, 0.5] }}
                                  transition={{ duration: 0.6 + Math.random() * 0.4, repeat: Infinity, ease: 'easeOut', delay: Math.random() * 0.2 }}
                                />
                              )
                            })}
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </div>
                ) : (
                  // ── STEP 2: Result Screen ──
                  <div className="flex flex-col items-center pt-6">
                    {result === 'win' ? (
                      <>
                        <motion.div
                          initial={{ rotate: -10, scale: 0 }}
                          animate={{ rotate: 0, scale: 1 }}
                          transition={{ delay: 0.1, type: 'spring' }}
                          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"
                        >
                          <CheckCircle2 size={32} className="text-[#3E7A1C]" />
                        </motion.div>

                        <h2 className="text-2xl font-bold text-[#0B0F19]">Congratulations! 🎉</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {merchantName && <span className="font-semibold text-slate-700">{merchantName}</span>}
                          {merchantName ? ' — you won a special B2B reward:' : 'You won a special B2B reward:'}
                        </p>

                        {campaign?.gift?.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={campaign.gift.image_url}
                            alt={campaign.gift.name}
                            className="mt-4 h-20 w-20 rounded-xl object-cover shadow-sm"
                          />
                        )}

                        <div className="mt-4 px-6 py-3 bg-[#7BC142]/10 rounded-xl border border-[#7BC142]/30">
                          <span className="text-lg font-bold text-[#3E7A1C]">{wonAmount} Reward Points</span>
                        </div>

                        {(campaign?.gift?.name || campaign?.prize_details) && (
                          <p className="mt-3 max-w-xs text-xs text-slate-500">
                            {campaign?.gift?.name ?? campaign?.prize_details}
                            {campaign?.gift?.description ? ` — ${campaign.gift.description}` : ''}
                          </p>
                        )}

                        {/* Won timestamp shown in UI */}
                        {wonAt && (
                          <p className="mt-2 text-xs text-slate-400">
                            Won on {wonAt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                          </p>
                        )}

                        {/* Download button */}
                        <button
                          type="button"
                          onClick={handleDownloadReward}
                          disabled={isDownloading}
                          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#1857D6] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Preparing...</span>
                            </>
                          ) : (
                            <>
                              <Download size={16} />
                              <span>Download Reward</span>
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <motion.div
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50"
                        >
                          <Frown size={32} className="text-red-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-[#0B0F19]">Better Luck Next Time!</h2>
                        <p className="mt-2 text-sm text-slate-500">Keep engaging customers to earn more rewards!</p>
                      </>
                    )}
                    <button
                      onClick={handleDone}
                      className="mt-6 w-full rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 py-3 text-sm font-semibold cursor-pointer transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )
              ) : (
                // ── NO PENDING CARD: Rewards History ──
                <div className="flex flex-col items-center text-left w-full">
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600 self-center">
                    <HistoryIcon size={13} /> Rewards History
                  </div>
                  <h2 className="text-2xl font-bold text-[#0B0F19] mb-1 self-center">Your Scratch Card Wins</h2>
                  <p className="text-sm text-slate-500 mb-6 self-center text-center">
                    No new card right now — here&apos;s what you&apos;ve won so far.
                  </p>

                  {historyLoading ? (
                    <div className="flex w-full items-center justify-center py-10">
                      <Loader2 size={24} className="animate-spin text-[#9333EA]" />
                    </div>
                  ) : history.length === 0 ? (
                    <div className="flex w-full flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-10 px-6">
                      <Gift size={28} className="mb-2 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">No scratch cards played yet</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Check back after your next reward — this is where your wins will show up.
                      </p>
                    </div>
                  ) : (
                    <div className="w-full">
                      {/* Summary strip */}
                      <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#7BC142]/30 bg-[#7BC142]/10 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Trophy size={16} className="text-[#3E7A1C]" />
                          <span className="text-xs font-semibold text-[#3E7A1C]">
                            {wins.length} win{wins.length === 1 ? '' : 's'} total
                          </span>
                        </div>
                        <span className="text-sm font-bold text-[#3E7A1C]">
                          {totalWonPoints.toLocaleString()} Points
                        </span>
                      </div>

                      {/* List */}
                      <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-200/80 divide-y divide-slate-100">
                        {history.map((h, index) => {
                          const won = isWin(h.status)

                          // 10 light bg colours cycling for "No Reward" rows
                          const noRewardColors = [
                            'bg-rose-50     text-rose-600',
                            'bg-violet-50   text-violet-600',
                            'bg-amber-50    text-amber-600',
                            'bg-pink-50     text-pink-600',
                            'bg-emerald-50  text-emerald-600',
                            'bg-orange-50   text-orange-600',
                            'bg-teal-50     text-teal-600',
                            'bg-sky-50      text-sky-600',
                            'bg-red-50      text-red-600',
                            'bg-indigo-50   text-indigo-600',
                          ]
                          const noRewardColor = noRewardColors[index % noRewardColors.length]

                          return (
                            <div key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                {won && h.gift_image_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={h.gift_image_url}
                                    alt={h.gift_name ?? 'Reward'}
                                    className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-black/5"
                                  />
                                ) : (
                                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${won ? 'bg-emerald-50 text-[#3E7A1C]' : noRewardColor}`}>
                                    {won ? <CheckCircle2 size={18} /> : <Frown size={18} />}
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {won ? (h.gift_name || 'Reward Won') : 'No Reward'}
                                  </p>
                                  <p className="text-xs text-slate-400">{formatDate(h.created_at)}</p>
                                </div>
                              </div>
                              {won && (
                                <span className="text-sm font-bold text-[#3E7A1C] shrink-0">
                                  +{h.prize_amount} pts
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Canvas helpers
// ─────────────────────────────────────────────────────────────────────────

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ')
  let line = ''
  let curY = y
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i]
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, curY)
      line = words[i]
      curY += lineHeight
    } else {
      line = testLine
    }
  }
  if (line) ctx.fillText(line, x, curY)
}