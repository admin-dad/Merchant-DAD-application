'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
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
// Main Scan Component
// ─────────────────────────────────────────────────────────────────────────
function ScanContent() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [merchantName, setMerchantName] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form States
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Scan & Scratch Card States
  const [scanRecordId, setScanRecordId] = useState<string | null>(null)
  const [activeCampaign, setActiveCampaign] = useState<any>(null)
  const [isScratching, setIsScratching] = useState(false)
  const [scratchResult, setScratchResult] = useState<'win' | 'lose' | null>(null)
  const [prizeWon, setPrizeWon] = useState<string | null>(null)
  const [alreadyParticipated, setAlreadyParticipated] = useState(false)

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

    // ── DUPLICATE PARTICIPATION CHECK (SOW Section 23 & 28) ──
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { data: existingScans, error: checkError } = await supabase
      .from('qr_scans')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('customer_phone', phone.trim())
      .gte('created_at', startOfDay.toISOString())

    if (checkError) {
      setError('Could not verify participation. Please try again.')
      setSubmitting(false)
      return
    }

    if (existingScans && existingScans.length > 0) {
      setAlreadyParticipated(true)
      setSubmitting(false)
      return
    }

    // ── FETCH ACTIVE CAMPAIGN ──
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('id, name, winning_probability, prize_details, total_cards, winning_numbers')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const activeCampaignId = campaignData?.id || null
    setActiveCampaign(campaignData)

    // ── CHECK INVENTORY LIMIT (SOW Section 12) ──
    if (activeCampaignId) {
      const { count } = await supabase
        .from('qr_scans')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', activeCampaignId)

      if (count !== null && count >= (campaignData?.total_cards || 999999)) {
        setError('Sorry, this campaign has reached its maximum scratch card limit!')
        setSubmitting(false)
        return
      }
    }

    // ── INSERT NEW SCAN RECORD (With Customer Name!) ──
    const { data, error: insertError } = await supabase
      .from('qr_scans')
      .insert([
        {
          merchant_id: merchantId,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          status: 'Pending',
          campaign_id: activeCampaignId,
        },
      ])
      .select('id')
      .single()

    if (insertError || !data) {
      setError('Could not submit your details. Please try again.')
      setSubmitting(false)
      return
    }

    setScanRecordId(data.id)
    setSubmitting(false)
  }

  // ── 3. Handle Scratch Card Reveal (Robust Win/Loss Logic) ────────────
  const handleScratch = async () => {
    if (isScratching || !scanRecordId) return
    setIsScratching(true) // Triggers the particle animation state

    let isWinner = false
    const wonPrize = activeCampaign?.prize_details || 'Exciting Reward!'

    const winProb = activeCampaign?.winning_probability ?? 0.1
    const winNumsStr = activeCampaign?.winning_numbers?.trim()

    // Robust check: If specific winning numbers are set, check them. Otherwise strictly use probability.
    if (winNumsStr && winNumsStr.length > 0) {
      const winNums = winNumsStr
        .split(',')
        .map((n: string) => parseInt(n.trim()))
        .filter((n: number) => !isNaN(n))

      if (winNums.length > 0) {
        const generatedNumber = Math.floor(Math.random() * 100) + 1
        if (winNums.includes(generatedNumber)) {
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
        setPrizeWon(wonPrize)

        await supabase
          .from('qr_scans')
          .update({ status: 'Reward Won', prize_won: wonPrize })
          .eq('id', scanRecordId)
      } else {
        setScratchResult('lose')
        setPrizeWon(null)

        await supabase
          .from('qr_scans')
          .update({ status: 'No Win', prize_won: null })
          .eq('id', scanRecordId)
      }

      setIsScratching(false)
    }, 1500)
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md w-full shadow-[0_24px_70px_rgba(9,13,22,0.35)] relative overflow-hidden"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142] absolute top-0 left-0" />

        <div className="pt-4">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7BC142]/10 to-[#1857D6]/10 px-3 py-1 text-xs font-semibold text-[#3E7A1C]">
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
                className="flex flex-col items-center text-center pt-6"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                  <Ban size={32} className="text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold text-[#0B0F19]">Already Participated!</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Our records show that <strong className="text-[#0B0F19]">{name}</strong> (+91 {phone})
                  has already scanned and played today at {merchantName}.
                  <br />
                  <br />
                  Please come back tomorrow for another chance to win!
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
                >
                  <h2 className="text-2xl font-semibold text-[#0B0F19] sm:text-[28px]">
                    Win Exciting Rewards!
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    Enter your details to participate in exclusive campaigns at this store.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {/* Full Name Input */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <User size={14} className="text-[#1857D6]" />
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/15 transition-all"
                      />
                    </div>

                    {/* Mobile Number Input */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Smartphone size={14} className="text-[#1857D6]" />
                        Mobile Number
                      </label>
                      <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:bg-white focus-within:border-[#1857D6] focus-within:ring-2 focus-within:ring-[#1857D6]/15 transition-all">
                        <span className="pl-3.5 pr-2 text-sm font-medium text-slate-500 border-r border-slate-200 h-full py-2.5 flex items-center">
                          +91
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="10-digit mobile number"
                          className="w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                      {error && (
                        <p className="mt-1 text-xs font-medium text-red-500">{error}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(62,122,28,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(62,122,28,0.55)] active:translate-y-0 disabled:opacity-50 cursor-pointer"
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
                className="flex flex-col items-center text-center pt-6"
              >
                {scratchResult === 'win' ? (
                  <>
                    <motion.div
                      initial={{ rotate: -10, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                      className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#7BC142]/15 to-[#1857D6]/15"
                    >
                      <CheckCircle2 size={32} className="text-[#3E7A1C]" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-[#0B0F19]">Congratulations, {name}! 🎉</h2>
                    <p className="mt-2 text-sm text-slate-500">You won a special reward from {merchantName}:</p>
                    <div className="mt-4 px-6 py-3 bg-[#7BC142]/10 rounded-xl border border-[#7BC142]/30">
                      <span className="text-lg font-bold text-[#3E7A1C]">{prizeWon}</span>
                    </div>
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
                    <h2 className="text-2xl font-bold text-[#0B0F19]">Better Luck Next Time, {name}!</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      You didn't win this time, but keep shopping at {merchantName} and scan again tomorrow for more chances!
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

// Default export wrapping in Suspense
export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-[#1857D6]" /></div>}>
      <ScanContent />
    </Suspense>
  )
}