'use client'

import { saveFile, canvasPNG, exportError } from '@/lib/file-export'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import ScanLegalPolicyModal from '@/components/ScanLegalPolicyModal'
import {
  Store,
  Smartphone,
  User,
  Loader2,
  AlertCircle,
  Gift,
  Sparkles,
  CheckCircle2,
  Frown,
  Ban,
  Download,
} from 'lucide-react'

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

    // 1. Draw metallic foil gradient
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
    gradient.addColorStop(0, '#e2e8f0') // Light silver
    gradient.addColorStop(0.2, '#94a3b8') // Darker silver
    gradient.addColorStop(0.5, '#f1f5f9') // Highlight
    gradient.addColorStop(0.8, '#cbd5e1') // Mid silver
    gradient.addColorStop(1, '#64748b') // Deep silver

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, rect.width, rect.height)

    // 2. Draw dynamic wavy security pattern (like real scratch cards)
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
    vignette.addColorStop(1, 'rgba(0,0,0,0.15)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, rect.width, rect.height)

    // 4. Draw Typography
    ctx.fillStyle = '#1e293b'
    ctx.font = '900 24px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(255,255,255,0.6)'
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
// Types
// ─────────────────────────────────────────────────────────────────────────
interface GiftInfo {
  id: string
  name: string
  description: string | null
  image_url: string | null
}

interface CampaignInfo {
  id: string
  name: string
  winning_probability: number
  prize_details: string | null
  total_cards: number | null
  winning_numbers: string | null
  gift_id: string | null
  gift: GiftInfo | null
}

// ─────────────────────────────────────────────────────────────────────────
// Main Scan Component
// ─────────────────────────────────────────────────────────────────────────
function ScanContent() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [merchantName, setMerchantName] = useState<string | null>(null)
  const [wonAt, setWonAt] = useState<Date | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form States
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [activePolicy, setActivePolicy] = useState<'terms' | 'customer-agreement' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Scan & Scratch Card States
  const [scanRecordId, setScanRecordId] = useState<string | null>(null)
  const [scanNumber, setScanNumber] = useState<number | null>(null)
  const [activeCampaign, setActiveCampaign] = useState<CampaignInfo | null>(null)
  const [isScratching, setIsScratching] = useState(false)
  const [scratchResult, setScratchResult] = useState<'win' | 'lose' | null>(null)
  const [prizeWon, setPrizeWon] = useState<string | null>(null)
  const [prizeGift, setPrizeGift] = useState<GiftInfo | null>(null)
  const [alreadyParticipated, setAlreadyParticipated] = useState(false)


  // Download-as-image state for the win screen
  const [isDownloading, setIsDownloading] = useState(false)

  // ── 1. Read Merchant ID from URL & Fetch Merchant Name ───────────────
  useEffect(() => {
    const id = searchParams.get('merchant')

    if (!id) {
      setError('Invalid QR Code. No merchant identified.')
      setLoading(false)
      return
    }

    setMerchantId(id)

    const fetchMerchant = async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select('business_name')
        .eq('id', id)
        .single()

      if (error || !data) {
        setError('Merchant not found.')
      } else {
        setMerchantName(data.business_name)
      }
      setLoading(false)
    }

    fetchMerchant()
  }, [searchParams, supabase])

  // ── 2. Handle Customer Details Submit ────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreedToTerms) {
      setError('Please agree to the Terms & Conditions and Customer Agreement to continue.')
      return
    }
    setSubmitting(true)
    setError(null)

    if (!merchantId) {
      setError('Merchant ID is missing.')
      setSubmitting(false)
      return
    }

    if (!name.trim()) {
      setError('Please enter your full name.')
      setSubmitting(false)
      return
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setError('Please enter a valid 10-digit mobile number.')
      setSubmitting(false)
      return
    }


    // ── FETCH ACTIVE CUSTOMER-TYPE CAMPAIGN (with linked gift) ──
    let activeCampaignId: string | null = null

    try {
      const resCamp = await fetch('/api/scan/active-campaign', { cache: 'no-store' })
      const { campaign: campaignData, count, error: campaignError } = await resCamp.json()

      if (campaignError) {
        console.error('campaign fetch error →', campaignError)
      }

      const normalizedCampaign: CampaignInfo | null = campaignData
        ? {
            ...campaignData,
            gift: Array.isArray(campaignData.gift) ? campaignData.gift[0] ?? null : campaignData.gift,
          }
        : null

      activeCampaignId = normalizedCampaign?.id || null
      setActiveCampaign(normalizedCampaign)

      // ── CHECK INVENTORY LIMIT (SOW Section 12) ──
      if (activeCampaignId && count !== undefined) {
        if (count >= (normalizedCampaign?.total_cards || 999999)) {
          setError('Sorry, this campaign has reached its maximum scratch card limit!')
          setSubmitting(false)
          return
        }
      }
    } catch (err) {
      console.error('Failed to fetch active campaign:', err)
    }

    // ── INSERT NEW SCAN RECORD (With Customer Name!) ──
    const res = await fetch('/api/scan/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant_id: merchantId,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        status: 'Pending',
        campaign_id: activeCampaignId,
      }),
    })

    const data = await res.json()

    if (!res.ok || !data.id) {
      if (res.status === 429) {
        setAlreadyParticipated(true)
        setSubmitting(false)
        return
      }
      console.error('Submit error:', data.error)
      setError('Could not submit your details. Please try again.')
      setSubmitting(false)
      return
    }
    
    setScanRecordId(data.id)
    if (data.scan_number) {
      setScanNumber(data.scan_number)
    }
    setSubmitting(false)
  }

  // ── 3. Handle Scratch Card Reveal (Robust Win/Loss Logic) ────────────
  const handleScratch = async () => {
    if (isScratching || !scanRecordId) return
    setIsScratching(true) // Triggers the particle animation state

    let isWinner = false
    const wonPrize = activeCampaign?.gift?.name || activeCampaign?.prize_details || 'Exciting Reward!'

    const winProb = activeCampaign?.winning_probability ?? 0.1
    const winNumsStr = activeCampaign?.winning_numbers?.trim()

    // Robust check: If specific winning numbers are set, check them. Otherwise strictly use probability.
    if (winNumsStr && winNumsStr.length > 0) {
      const winNums = winNumsStr
        .split(',')
        .map((n: string) => parseInt(n.trim()))
        .filter((n: number) => !isNaN(n))

      if (winNums.length > 0) {
        if (scanNumber !== null && winNums.includes(scanNumber)) {
          isWinner = true
        }
      } else {
        isWinner = Math.random() < winProb
      }
    } else {
      isWinner = Math.random() < winProb
    }

    setTimeout(async () => {
      if (isWinner) {
        setScratchResult('win')
        setWonAt(new Date())
        setPrizeWon(wonPrize)
        setPrizeGift(activeCampaign?.gift || null)

        await fetch('/api/scan/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scan_id: scanRecordId,
            status: 'Reward Won',
            prize_won: wonPrize,
          }),
        })
      } else {
        setScratchResult('lose')
        setPrizeWon(null)
        setPrizeGift(null)

        await fetch('/api/scan/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scan_id: scanRecordId,
            status: 'No Win',
            prize_won: null,
          }),
        })
      }

      setIsScratching(false)
    }, 1500)
  }

  // ── 4. Download the win as a shareable image ──────────────────────────
  // Draws a simple branded "reward card" onto a canvas (merchant name,
  // prize name/description, gift photo if available, date) and triggers a
  // PNG download. Built with plain canvas — no extra libraries — so it
  // works the same way the scratch-foil canvas above does.
  const handleDownloadReward = async () => {
    if (isDownloading) return
    setIsDownloading(true)

    try {
      const width = 800
      const pad = 48
      const textWidth = width - pad * 2 - 64
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas not supported')

      // Measure the content first so the photo can be large without leaving
      // a fixed blank area between the description and the date.
      ctx.font = '900 48px system-ui, -apple-system, sans-serif'
      const heading = canvasTextLines(ctx, `${name || 'You'} won a reward!`, textWidth)
      ctx.font = '600 28px system-ui, -apple-system, sans-serif'
      const merchantLines = canvasTextLines(ctx, `at ${merchantName || 'this store'}`, textWidth)
      ctx.font = '800 34px system-ui, -apple-system, sans-serif'
      const prizeLines = canvasTextLines(ctx, prizeWon || 'Reward', textWidth)
      ctx.font = '400 19px system-ui, -apple-system, sans-serif'
      const description = prizeGift?.description ? canvasTextLines(ctx, prizeGift.description, textWidth) : []
      let photo: HTMLImageElement | null = null
      if (prizeGift?.image_url) {
        try { photo = await loadImage(prizeGift.image_url) } catch { /* Keep the reward details available if the photo cannot load. */ }
      }
      const headingY = 164
      const merchantY = headingY + (heading.length - 1) * 58 + 46
      const photoY = merchantY + (merchantLines.length - 1) * 36 + 40
      const photoSize = 600
      const prizeY = photo ? photoY + photoSize + 46 : photoY + 16
      const descriptionY = prizeY + (prizeLines.length - 1) * 42 + 32
      const contentBottom = description.length ? descriptionY + (description.length - 1) * 27 : prizeY + (prizeLines.length - 1) * 42
      const dateY = contentBottom + 44
      const height = dateY + 54
      canvas.width = width
      canvas.height = height

      const bg = ctx.createLinearGradient(0, 0, width, height)
      bg.addColorStop(0, '#0f172a')
      bg.addColorStop(0.5, '#1e3a8a')
      bg.addColorStop(1, '#0f172a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)
      const accent = ctx.createLinearGradient(0, 0, width, 0)
      accent.addColorStop(0, '#1857D6')
      accent.addColorStop(0.5, '#4F8CFF')
      accent.addColorStop(1, '#7BC142')
      ctx.fillStyle = accent
      ctx.fillRect(0, 0, width, 12)
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      roundRect(ctx, pad, 48, width - pad * 2, height - 80, 24)
      ctx.fill()
      ctx.textAlign = 'center'
      ctx.fillStyle = '#A3DC73'
      ctx.font = '800 30px system-ui, -apple-system, sans-serif'
      ctx.fillText('🎉 CONGRATULATIONS 🎉', width / 2, 96)
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 48px system-ui, -apple-system, sans-serif'
      heading.forEach((line, index) => ctx.fillText(line, width / 2, headingY + index * 58))
      ctx.fillStyle = '#93c5fd'
      ctx.font = '600 28px system-ui, -apple-system, sans-serif'
      merchantLines.forEach((line, index) => ctx.fillText(line, width / 2, merchantY + index * 36))
      if (photo) {
        const x = (width - photoSize) / 2
        ctx.save()
        roundRect(ctx, x, photoY, photoSize, photoSize, 22)
        ctx.clip()
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(x, photoY, photoSize, photoSize)
        const ratio = Math.min(photoSize / photo.naturalWidth, photoSize / photo.naturalHeight)
        const photoWidth = photo.naturalWidth * ratio
        const photoHeight = photo.naturalHeight * ratio
        ctx.drawImage(photo, x + (photoSize - photoWidth) / 2, photoY + (photoSize - photoHeight) / 2, photoWidth, photoHeight)
        ctx.restore()
      }
      ctx.fillStyle = '#FDE047'
      ctx.font = '800 34px system-ui, -apple-system, sans-serif'
      prizeLines.forEach((line, index) => ctx.fillText(line, width / 2, prizeY + index * 42))
      ctx.fillStyle = '#cbd5e1'
      ctx.font = '400 19px system-ui, -apple-system, sans-serif'
      description.forEach((line, index) => ctx.fillText(line, width / 2, descriptionY + index * 27))
      ctx.fillStyle = '#94a3b8'
      ctx.font = '400 16px system-ui, -apple-system, sans-serif'
      const dateStr = (wonAt ?? new Date()).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
      ctx.fillText(`Won on ${dateStr}`, width / 2, dateY)

      // Trigger download
      const safeName = (merchantName || 'reward').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      await saveFile(await canvasPNG(canvas), `${safeName}-reward-${Date.now()}.png`)
      setIsDownloading(false)
    } catch (err) {
      console.error('Failed to generate reward image:', err)
      alert(exportError(err))
      setIsDownloading(false)
    }
  }

  // ── Loading State ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#1857D6]" />
      </div>
    )
  }

  // ── Error State (Invalid QR) ────────────────────────────────────────
  if (error && !merchantName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-6 rounded-2xl border border-red-200 text-center max-w-md shadow-sm">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-[#0B0F19]">Scan Error</h2>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="scratch-result-panel bg-white p-5 sm:p-8 rounded-2xl border border-slate-200 max-w-md w-full shadow-[0_24px_70px_rgba(9,13,22,0.35)] relative overflow-x-hidden overflow-y-auto flex flex-col"
        style={{ fontFamily: 'var(--font-display)', maxHeight: 'calc(100dvh - 24px)' }}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142] absolute top-0 left-0" />

        <div className="pt-2 sm:pt-4 overflow-y-auto hide-scrollbar">
          <div className="mb-2 sm:mb-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7BC142]/10 to-[#1857D6]/10 px-3 py-1 text-xs font-semibold text-[#3E7A1C]">
            <Store size={13} />
            <span>{merchantName}</span>
          </div>

          <AnimatePresence mode="wait">
            {/* ── ALREADY PARTICIPATED STATE ── */}
            {alreadyParticipated ? (
              <motion.div
                key="already-participated"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center text-center pt-4 sm:pt-6"
              >
                <div className="mb-3 sm:mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-amber-50">
                  <Ban size={28} className="text-amber-500" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0B0F19]">Every 10 Minutes = Another Chance</h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-500">
                  Shop again after 10 minutes and scan the QR code for more chances to win rewards.
                </p>
              </motion.div>
            ) : (
              /* ── STEP 1: Name & Phone Entry ── */
              !scanRecordId && (
                <motion.div
                  key="details-entry"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col"
                >
                  <h2 className="text-xl font-semibold text-[#0B0F19] sm:text-[28px] leading-tight">
                    Win Exciting Rewards!
                  </h2>
                  <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-500">
                    Enter your details to participate in exclusive campaigns.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                    {/* Full Name Input */}
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <User size={14} className="text-[#1857D6]" />
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/15 transition-all"
                      />
                    </div>

                    {/* Mobile Number Input */}
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Smartphone size={14} className="text-[#1857D6]" />
                        Mobile Number
                      </label>
                      <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:bg-white focus-within:border-[#1857D6] focus-within:ring-2 focus-within:ring-[#1857D6]/15 transition-all">
                        <span className="pl-3 pr-2 sm:pl-3.5 sm:pr-2 text-xs sm:text-sm font-medium text-slate-500 border-r border-slate-200 h-full py-2 sm:py-2.5 flex items-center">
                          +91
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="10-digit mobile number"
                          className="w-full bg-transparent px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                      {error && (
                        <p className="mt-1 text-[10px] sm:text-xs font-medium text-red-500">{error}</p>
                      )}
                    </div>

                    {/* Terms & Conditions Checkbox and Points */}
                    <div className="mt-2 sm:mt-4 space-y-3 sm:space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                      <label className="flex items-start gap-2 sm:gap-3 cursor-pointer">
                        <div className="flex h-4 sm:h-5 items-center mt-0.5 sm:mt-0">
                          <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded border-slate-300 text-[#1857D6] focus:ring-[#1857D6]"
                          />
                        </div>
                        <span className="text-[10px] sm:text-xs text-slate-600 leading-snug">
                          I agree to the{' '}
                          <button type="button" onClick={() => setActivePolicy('terms')} className="font-semibold text-[#1857D6] hover:underline">Terms & Conditions</button>
                          {' '}and{' '}
                          <button type="button" onClick={() => setActivePolicy('customer-agreement')} className="font-semibold text-[#1857D6] hover:underline">Customer Agreement</button>.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || !agreedToTerms}
                      className="group relative mt-1 sm:mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-5 py-2.5 sm:px-6 sm:py-3.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(62,122,28,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(62,122,28,0.55)] active:translate-y-0 disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <Gift size={16} />
                          <span>Get Scratch Card</span>
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )
            )}

            {/* ── STEP 2: The Interactive Scratch Card ── */}
            {scanRecordId && scratchResult === null && !alreadyParticipated && (
              <motion.div
                key="scratch-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center text-center select-none"
              >
                <h2 className="text-2xl font-semibold text-[#0B0F19]">Welcome, {name}! 🎉</h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  {isScratching
                    ? 'Hold on, revealing your reward...'
                    : 'Rub the card below to scratch and reveal!'}
                </p>

                {/* Card wrapper */}
                <div className="relative mt-6 w-64 h-40">
                  {/* Ambient pulsing glow behind the card */}
                  <motion.div
                    className="absolute -inset-3 rounded-[1.75rem] bg-gradient-to-r from-[#7BC142] via-[#1857D6] to-[#7BC142] blur-xl"
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
                    className="relative w-64 h-40 rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5"
                  >
                    {/* Base Layer (Sits underneath foil, Revealed upon scratching) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a] flex flex-col items-center justify-center text-white p-4">
                      {/* Animated Magic Rings */}
                      <motion.div
                        className="absolute inset-0 border-[40px] border-[#3b82f6]/20 rounded-full blur-2xl"
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
                          const colors = ['#FDE047', '#60A5FA', '#34D399', '#F87171', '#A78BFA']
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
              </motion.div>
            )}

            {/* ── STEP 3: The Result ── */}
            {scratchResult !== null && !alreadyParticipated && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="flex flex-col items-center text-center pt-3 sm:pt-6"
              >
                {scratchResult === 'win' ? (
                  <>
                    <motion.div
                      initial={{ rotate: -10, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                      className="mb-2 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#7BC142]/15 to-[#1857D6]/15"
                    >
                      <CheckCircle2 size={28} className="text-[#3E7A1C]" />
                    </motion.div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#0B0F19]">Congratulations, {name}! 🎉</h2>
                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-500">You won a special reward from {merchantName}:</p>

                    {/* Gift photo, pulled from the gifts table via campaigns.gift_id */}
                    {prizeGift?.image_url && (
                      <motion.img
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                        src={prizeGift.image_url}
                        alt={prizeGift.name}
                        title="960 × 960"
                        className="mt-4 block h-auto max-h-[44dvh] w-auto max-w-full rounded-2xl object-contain shadow-lg ring-1 ring-black/5 sm:max-h-[420px]"
                      />
                    )}

                    <div className="mt-4 rounded-xl border border-[#7BC142]/30 bg-[#7BC142]/10 px-6 py-3">
                      <span className="block text-lg font-bold text-[#3E7A1C]">{prizeWon || prizeGift?.name || 'Reward'}</span>
                      {prizeGift?.description && <p className="mt-1 text-sm text-slate-600">{prizeGift.description}</p>}
                    </div>

                    {/* Download the reward as a shareable image */}
                    <button
                      type="button"
                      onClick={handleDownloadReward}
                      disabled={isDownloading}
                      className="mt-3 sm:mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Preparing...</span>
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          <span>Save to Phone</span>
                        </>
                      )}
                    </button>
                    <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500">Please claim this at the store counter.</p>
                  </>
                ) : (
                  <div className="flex min-h-[min(44dvh,360px)] w-full flex-col items-center justify-center px-2 py-6 text-center">
                    <motion.div
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="mb-5 flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-full bg-red-50 ring-8 ring-red-50/50"
                    >
                      <Frown size={42} strokeWidth={1.5} className="text-red-500" />
                    </motion.div>
                    <h2 className="text-xl sm:text-2xl font-bold leading-snug text-[#0B0F19]">Better Luck Next Time, {name}!</h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-500">
                      You didn't win this time, but keep shopping at {merchantName} and scan again tomorrow for more chances!
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {activePolicy && <ScanLegalPolicyModal
        key={activePolicy}
        slug={activePolicy}
        onClose={() => setActivePolicy(null)}
      />}

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Canvas helpers for the downloadable reward image
// ─────────────────────────────────────────────────────────────────────────

// Draws a rounded rectangle path (used for both the panel and the gift photo mask).
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Loads an external image for drawing onto the canvas. crossOrigin is set
// so the resulting canvas can still be exported via toBlob/toDataURL — if
// the image host doesn't send permissive CORS headers this will reject,
// and the caller falls back to skipping the photo.
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    // Append cache-buster so the browser doesn't reuse the non-CORS cached image from the HTML <img> tag
    img.src = src + (src.includes('?') ? '&' : '?') + 'cb=' + Date.now()
  })
}

// Measure wrapped canvas text, including long unbroken names, before drawing.
function canvasTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split(/\r?\n/)) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && ctx.measureText(`${line} ${word}`).width > maxWidth) { lines.push(line); line = '' }
      for (const character of word) {
        if (line && ctx.measureText(line + character).width > maxWidth) { lines.push(line); line = '' }
        line += character
      }
      line += ' '
    }
    if (line.trim()) lines.push(line.trim())
  }
  return lines.length ? lines : ['']
}

// Default export wrapping in Suspense
export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-[#1857D6]" /></div>}>
      <ScanContent />
    </Suspense>
  )
}