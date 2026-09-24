'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Gift, Loader2, CheckCircle2, Frown, Sparkles, X, History as HistoryIcon, Trophy, Download, Dices } from 'lucide-react'

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
    gradient.addColorStop(0.2, '#c084fc') // subtle purple
    gradient.addColorStop(0.5, '#f1f5f9')
    gradient.addColorStop(0.8, '#a855f7') // deeper purple
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
      rect.width / 2,
      rect.height / 2,
      rect.width / 4,
      rect.width / 2,
      rect.height / 2,
      rect.width
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

    // Reset shadow for the actual scratching operation
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
    ctx.lineWidth = 45 // Size of the scratch brush

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
    onScratch() // Triggers API call on the very first scratch
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
// Main Component
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

// A past scratch card (won or lost), used to render the Rewards History list.
interface HistoryCard {
  id: string
  status: string // 'won' / 'lost' / other non-pending values
  prize_amount: number
  created_at: string
  gift_name: string | null
  gift_image_url: string | null
}

export default function MerchantScratchCard({ merchantId }: { merchantId: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [card, setCard] = useState<ScratchCard | null>(null)
  const [campaign, setCampaign] = useState<MerchantCampaign | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isScratching, setIsScratching] = useState(false)
  const [result, setResult] = useState<'win' | 'lose' | null>(null)
  const [wonAmount, setWonAmount] = useState<number>(0)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadReward = async () => {
    if (isDownloading || result !== 'win') return
    setIsDownloading(true)
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')

      const dpr = window.devicePixelRatio || 1
      const width = 800
      const height = 1000
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      // Background gradient (brand colors matching customer theme)
      const bg = ctx.createLinearGradient(0, 0, width, height)
      bg.addColorStop(0, '#0f172a')
      bg.addColorStop(0.5, '#1e3a8a')
      bg.addColorStop(1, '#0f172a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      // Decorative top accent bar (matches the app's brand gradient)
      const accent = ctx.createLinearGradient(0, 0, width, 0)
      accent.addColorStop(0, '#1857D6')
      accent.addColorStop(0.5, '#4F8CFF')
      accent.addColorStop(1, '#7BC142')
      ctx.fillStyle = accent
      ctx.fillRect(0, 0, width, 14)

      // Card panel
      const pad = 48
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      roundRect(ctx, pad, 100, width - pad * 2, height - 100 - pad, 24)
      ctx.fill()

      // "YOU WON!" heading
      ctx.textAlign = 'center'
      ctx.fillStyle = '#7BC142'
      ctx.font = '700 22px system-ui, -apple-system, sans-serif'
      ctx.fillText('🎉 CONGRATULATIONS 🎉', width / 2, 170)

      ctx.fillStyle = '#ffffff'
      ctx.font = '900 40px system-ui, -apple-system, sans-serif'
      ctx.fillText(`You won a reward!`, width / 2, 225)

      // Merchant context
      ctx.fillStyle = '#93c5fd'
      ctx.font = '600 18px system-ui, -apple-system, sans-serif'
      ctx.fillText(`Merchant Reward`, width / 2, 258)

      // Gift photo
      let imageBottomY = 300
      if (campaign?.gift?.image_url) {
        try {
          const img = await loadImage(campaign.gift.image_url)
          const imgSize = 300
          const imgX = width / 2 - imgSize / 2
          const imgY = 300
          ctx.save()
          roundRect(ctx, imgX, imgY, imgSize, imgSize, 20)
          ctx.clip()
          ctx.drawImage(img, imgX, imgY, imgSize, imgSize)
          ctx.restore()
          imageBottomY = imgY + imgSize + 40
        } catch {
          imageBottomY = 320
        }
      } else {
        imageBottomY = 320
      }

      // Main Prize Name (Gift Name or Prize Details)
      const mainPrizeText = (campaign?.gift?.name ?? campaign?.prize_details) as string || 'Special Reward'
      ctx.fillStyle = '#FDE047'
      ctx.font = '800 32px system-ui, -apple-system, sans-serif'
      wrapText(ctx, mainPrizeText, width / 2, imageBottomY, width - pad * 2 - 40, 40)

      // Points (as subtitle)
      if (wonAmount > 0) {
        ctx.fillStyle = '#cbd5e1'
        ctx.font = '600 20px system-ui, -apple-system, sans-serif'
        wrapText(ctx, `+ ${wonAmount} Reward Points`, width / 2, imageBottomY + 50, width - pad * 2 - 60, 24)
      }

      // Footer: date
      ctx.fillStyle = '#64748b'
      ctx.font = '400 14px system-ui, -apple-system, sans-serif'
      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      ctx.fillText(`Won on ${dateStr}`, width / 2, height - 70)

      // Trigger download
      canvas.toBlob((blob) => {
        if (!blob) {
          setIsDownloading(false)
          return
        }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `merchant-reward-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setIsDownloading(false)
      }, 'image/png')
    } catch (err) {
      console.error(err)
      setIsDownloading(false)
    }
  }

  // Rewards history (past won/lost cards) — shown when the merchant opens
  // the popup and has no pending card to scratch right now.
  const [history, setHistory] = useState<HistoryCard[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  useEffect(() => {
    const fetchPendingCardAndCampaign = async () => {
      // There is exactly one active campaign per type (enforced by the
      // partial unique index on campaigns(type) where status='active'), so
      // this is the single source of truth for merchant scratch-card odds
      // and prize info — NOT the static prize_amount/winning_probability
      // that may be sitting on the individual scratch_cards row.
      const campaignPromise = supabase
        .from('campaigns')
        .select(`
          id, name, prize_details, winning_probability, total_cards, issued_cards,
          gift:gifts ( id, name, description, image_url )
        `)
        .eq('type', 'merchant')
        .eq('status', 'active')
        .maybeSingle()

      // NOTE: campaign_id is null on most legacy cards, so this MUST be a
      // LEFT join (`campaigns`, not `campaigns!inner`) — an inner join
      // drops any row whose foreign key doesn't resolve, and null never
      // resolves. We fetch all pending cards and pick the first eligible
      // one in JS instead of filtering campaign type in the query.
      const cardPromise = supabase
        .from('merchant_scratch_cards')
        .select(`
          id, prize_type, prize_amount, winning_probability, campaign_id,
          campaign:campaigns ( id, name, type )
        `)
        .eq('merchant_id', merchantId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      const [{ data: campaignData, error: campaignError }, { data: cardData, error: cardError }] =
        await Promise.all([campaignPromise, cardPromise])

      console.log('active merchant campaign →', { campaignData, campaignError })
      console.log('scratch card fetch →', { cardData, cardError, merchantId })

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
    fetchPendingCardAndCampaign()
  }, [merchantId, supabase])

  // Loads past won/lost scratch cards for the Rewards History view.
  // Lazy: only fetched the first time the merchant opens the popup with no
  // pending card, so we don't do this extra query on every dashboard load.
  const fetchHistory = async () => {
    setHistoryLoading(true)
    // Deliberately NOT filtering on an exact status string here — cards
    // created through other flows (e.g. an admin panel) may have written
    // 'Won'/'Redeemed'/etc instead of the lowercase 'won'/'lost' this
    // component writes. We only exclude 'pending' (still-unscratched
    // cards) and classify win vs. loss case-insensitively below instead.
    //
    // NOTE: not selecting `updated_at` here — no other query against
    // merchant_scratch_cards in this app selects that column, so it may
    // not exist on the table. We sort/display by created_at instead.
    //
    // LEFT join to campaigns→gifts (not `campaigns!inner`) for the same
    // reason the pending-card fetch above uses a left join: campaign_id is
    // null on most legacy cards, and an inner join would silently drop
    // those rows. Legacy rows just render without a gift photo.
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
      // Postgrest errors sometimes carry their useful fields as
      // non-enumerable or the object otherwise doesn't stringify with a
      // plain {message, details, hint, code} spread — dump every own
      // property name so we can see what's actually there.
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
    // If there's no pending card to scratch, this open is for viewing
    // history instead — load it (once) on demand.
    if (!card && !historyLoaded) {
      fetchHistory()
    }
  }

  const handleScratch = async () => {
    if (!card || isScratching) return
    setIsScratching(true) // Triggers GPay particle animation

    // The active campaign is the source of truth for odds — fall back to
    // whatever is on the card itself only if no active campaign exists.
    const effectiveProbability = campaign?.winning_probability ?? card.winning_probability
    const isWinner = Math.random() < effectiveProbability
    const newStatus = isWinner ? 'won' : 'lost'

    // The points amount still lives on the scratch card row (campaigns
    // doesn't carry a numeric prize amount, only prize_details/gift text),
    // so that stays as-is — we just record which campaign this card was
    // played against.
    const linkedCampaignId = campaign?.id ?? card.campaign_id ?? null

    // 1. Update Scratch Card Status + link the campaign it was played under
    await supabase
      .from('merchant_scratch_cards')
      .update({ status: newStatus, campaign_id: linkedCampaignId })
      .eq('id', card.id)

    // 2. If won, credit wallet ledger so it reflects immediately in the Dashboard
    if (isWinner) {
      const rewardLabel = campaign?.gift?.name
        ? campaign.gift.name
        : campaign?.prize_details
          ? campaign.prize_details
          : 'B2B Scratch Card Reward'

      await supabase.from('merchant_transactions').insert([{
        merchant_id: merchantId,
        wallet_type: 'points', // STRICTLY POINTS
        transaction_type: 'credit',
        amount: card.prize_amount,
        description: `Won ${rewardLabel}!`,
        category: 'reward'
      }])

      setWonAmount(card.prize_amount)

      // 3. Track redemption against the campaign's card count. Best-effort:
      // read-then-write since Supabase's client API has no atomic
      // increment without an RPC function.
      if (campaign) {
        await supabase
          .from('campaigns')
          .update({ issued_cards: campaign.issued_cards + 1 })
          .eq('id', campaign.id)
      }
    }

    // Wait 1.5s for the scratching experience before showing result
    setTimeout(() => {
      setResult(isWinner ? 'win' : 'lose')
      setIsScratching(false)
    }, 1500)
  }

  // Called after a win/lose result — the ledger has changed, so reload to
  // pull fresh point totals into the rest of the dashboard.
  const handleDone = () => {
    setIsOpen(false)
    setCard(null)
    setResult(null)
    window.location.reload()
  }

  // Called from the X button (or backdrop). If there's a scratch result
  // pending acknowledgement, treat it the same as "Done" so the dashboard
  // refreshes. Otherwise (including when just browsing history) simply
  // close the modal — the floating icon stays so they can reopen anytime.
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

  // Case-insensitive match so cards written as 'Won', 'WON', 'redeemed',
  // etc. by other flows still count as wins here — only an explicit
  // "lost"/"lose"-style status is treated as a non-win.
  const isWin = (status: string) => {
    const s = (status || '').toLowerCase()
    return s !== 'lost' && s !== 'lose' && s !== 'pending'
  }
  const wins = history.filter((h) => isWin(h.status))
  const totalWonPoints = wins.reduce((sum, h) => sum + (h.prize_amount || 0), 0)

  return (
    <>
      {/* Floating trigger icon — always visible so merchants can check their
          rewards history even when there's no pending card. Shows a badge
          only when a card is actually waiting to be scratched. */}
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

            {/* Modal Container */}
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

                    {/* Card wrapper */}
                    <div className="relative w-64 h-40 select-none">
                      {/* Ambient pulsing glow behind the card (Purple theme) */}
                      <motion.div
                        className="absolute -inset-3 rounded-[1.75rem] bg-gradient-to-r from-[#9333EA] via-[#1857D6] to-[#9333EA] blur-xl"
                        animate={
                          isScratching
                            ? { opacity: [0.35, 0.85, 0.35], scale: [1, 1.04, 1] }
                            : { opacity: [0.2, 0.4, 0.2], scale: 1 }
                        }
                        transition={{
                          duration: isScratching ? 0.7 : 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />

                      <motion.div
                        whileHover={!isScratching ? { scale: 1.02 } : {}}
                        className="relative w-64 h-40 rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 bg-white"
                      >
                        {/* Base Layer (Sits underneath foil, Revealed upon scratching) */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#3b0764] to-[#0f172a] flex flex-col items-center justify-center text-white p-4">
                          {/* Animated Magic Rings */}
                          <motion.div
                            className="absolute inset-0 border-[40px] border-[#a855f7]/20 rounded-full blur-2xl"
                            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                          />

                          <motion.div
                            animate={
                              isScratching
                                ? { scale: [0.95, 1.1, 1], rotate: [0, -3, 3, 0] }
                                : { scale: 1, rotate: 0 }
                            }
                            transition={{
                              duration: 0.6,
                              repeat: isScratching ? Infinity : 0,
                              ease: 'easeInOut',
                            }}
                            className="z-0 flex flex-col items-center"
                          >
                            <Gift
                              size={36}
                              className="mb-2 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]"
                            />
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 drop-shadow-sm">
                              Unlocking...
                            </span>
                          </motion.div>
                        </div>

                        {/* Interactive HTML5 Canvas Foil (Sits on top) */}
                        <ScratchCardCanvas
                          onScratch={() => {
                            if (!isScratching) handleScratch()
                          }}
                        />

                        {/* GPay style particle burst over top of the canvas when scratched */}
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
                                  style={{
                                    backgroundColor: color,
                                    width: size,
                                    height: size,
                                    boxShadow: `0 0 8px ${color}`,
                                  }}
                                  initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                                  animate={{
                                    x: Math.cos(angle) * velocity,
                                    y: Math.sin(angle) * velocity,
                                    opacity: [1, 1, 0],
                                    scale: [0, 1.2, 0.5],
                                  }}
                                  transition={{
                                    duration: 0.6 + Math.random() * 0.4,
                                    repeat: Infinity,
                                    ease: 'easeOut',
                                    delay: Math.random() * 0.2,
                                  }}
                                />
                              )
                            })}
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </div>
                ) : (
                  // ── STEP 2: The Result Screen ──
                  <div className="flex flex-col items-center pt-6">
                    {result === 'win' ? (
                      <>
                        <motion.div initial={{ rotate: -10, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.1, type: 'spring' }} className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                          <CheckCircle2 size={32} className="text-[#3E7A1C]" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-[#0B0F19]">Congratulations! 🎉</h2>
                        <p className="mt-2 text-sm text-slate-500">You won a special B2B reward:</p>

                        {campaign?.gift?.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={campaign.gift.image_url}
                            alt={campaign.gift.name}
                            className="mt-4 h-20 w-20 rounded-xl object-cover shadow-sm"
                          />
                        )}

                        <div className="mt-4 px-6 py-3 bg-[#7BC142]/10 rounded-xl border border-[#7BC142]/30">
                          <span className="text-lg font-bold text-[#3E7A1C]">
                            {wonAmount} Reward Points
                          </span>
                        </div>

                        {(campaign?.gift?.name || campaign?.prize_details) && (
                          <p className="mt-3 max-w-xs text-xs text-slate-500">
                            {campaign?.gift?.name ?? campaign?.prize_details}
                            {campaign?.gift?.description ? ` — ${campaign.gift.description}` : ''}
                          </p>
                        )}

                        {/* Download the reward as a shareable image */}
                        <button
                          type="button"
                          onClick={handleDownloadReward}
                          disabled={isDownloading}
                          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
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
                          initial={{ y: -10, opacity: 0, scale: 0.9 }} 
                          animate={{ y: 0, opacity: 1, scale: 1 }} 
                          transition={{ duration: 0.4 }}
                          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-50 via-red-50 to-orange-50 shadow-inner ring-4 ring-rose-50"
                        >
                          <motion.div
                            animate={{ y: [0, -6, 0], scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                          >
                            <Frown size={34} className="text-rose-500 drop-shadow-sm" />
                          </motion.div>
                        </motion.div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-red-400 bg-clip-text text-transparent">Better Luck Next Time!</h2>
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
                // ── NO PENDING CARD: Rewards History View ──
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
                          const lossColors = [
                            'bg-rose-50 text-rose-500 border border-rose-100',
                            'bg-indigo-50 text-indigo-500 border border-indigo-100',
                            'bg-amber-50 text-amber-500 border border-amber-100',
                            'bg-sky-50 text-sky-500 border border-sky-100',
                            'bg-purple-50 text-purple-500 border border-purple-100',
                            'bg-pink-50 text-pink-500 border border-pink-100',
                          ]
                          const noWinColor = lossColors[index % lossColors.length]

                          return (
                            <div key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Prize photo when we have one (won cards
                                    linked to a campaign with a gift image),
                                    otherwise fall back to the status icon. */}
                                {won && h.gift_image_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={h.gift_image_url}
                                    alt={h.gift_name ?? 'Reward'}
                                    className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-black/5"
                                  />
                                ) : (
                                  <span
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${won ? 'bg-emerald-50 text-[#3E7A1C]' : noWinColor
                                      }`}
                                  >
                                    {won ? <CheckCircle2 size={18} /> : (
                                      <motion.div
                                        animate={{ y: [0, -2, 0], scale: [1, 1.1, 1] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                                      >
                                        <Frown size={18} className="opacity-90" />
                                      </motion.div>
                                    )}
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {won ? (h.gift_name || 'Reward Won') : 'No Reward'}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {formatDate(h.created_at)}
                                  </p>
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
// Canvas helpers for the downloadable reward image
// ─────────────────────────────────────────────────────────────────────────

// Draws a rounded rectangle path
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Loads an external image for drawing onto the canvas
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src + (src.includes('?') ? '&' : '?') + 'cb=' + Date.now()
  })
}

// Simple word-wrap for canvas text
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
    const testWidth = ctx.measureText(testLine).width
    if (testWidth > maxWidth && line) {
      ctx.fillText(line, x, curY)
      line = words[i]
      curY += lineHeight
    } else {
      line = testLine
    }
  }
  if (line) ctx.fillText(line, x, curY)
}