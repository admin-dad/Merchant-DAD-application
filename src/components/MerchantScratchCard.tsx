'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Gift, Loader2, CheckCircle2, Frown, Sparkles } from 'lucide-react'

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
}

export default function MerchantScratchCard({ merchantId }: { merchantId: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [card, setCard] = useState<ScratchCard | null>(null)
  const [isScratching, setIsScratching] = useState(false)
  const [result, setResult] = useState<'win' | 'lose' | null>(null)

  useEffect(() => {
    const fetchPendingCard = async () => {
      const { data, error } = await supabase
        .from('merchant_scratch_cards')
        .select(`
    id,
    prize_type,
    prize_amount,
    winning_probability,
    campaign:campaigns!inner (
      id, name, type,
      gift:gifts ( id, name, description, image_url )
    )
  `)
        .eq('merchant_id', merchantId)
        .eq('status', 'pending')
        .eq('campaign.type', 'merchant')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log('scratch card fetch →', { data, error, merchantId })

      if (data) setCard(data as ScratchCard)
      setLoading(false)
    }
    fetchPendingCard()
  }, [merchantId, supabase])

  const handleScratch = async () => {
    if (!card || isScratching) return
    setIsScratching(true) // Triggers GPay particle animation

    const isWinner = Math.random() < card.winning_probability
    const newStatus = isWinner ? 'won' : 'lost'

    // 1. Update Scratch Card Status
    await supabase.from('merchant_scratch_cards').update({ status: newStatus }).eq('id', card.id)

    // 2. If won, credit wallet ledger so it reflects immediately in the Dashboard
    if (isWinner) {
      await supabase.from('merchant_transactions').insert([{
        merchant_id: merchantId,
        wallet_type: 'points', // STRICTLY POINTS
        transaction_type: 'credit',
        amount: card.prize_amount,
        description: 'Won B2B Scratch Card Reward!',
        category: 'reward'
      }])
    }

    // Wait 1.5s for the scratching experience before showing result
    setTimeout(() => {
      setResult(isWinner ? 'win' : 'lose')
      setIsScratching(false)
    }, 1500)
  }

  const handleClose = () => {
    setCard(null)
    setResult(null)
    // Reload page to show updated points balance
    window.location.reload()
  }

  if (loading || !card) return null

  return (
    <AnimatePresence>
      {card && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#090D16]/70 backdrop-blur-sm"
            onClick={result ? handleClose : undefined}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(9,13,22,0.35)] border border-slate-200 p-8 text-center"
          >
            {!result ? (
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
                    <div className="mt-4 px-6 py-3 bg-[#7BC142]/10 rounded-xl border border-[#7BC142]/30">
                      <span className="text-lg font-bold text-[#3E7A1C]">
                        {card.prize_amount} Reward Points
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                      <Frown size={32} className="text-red-500" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-[#0B0F19]">Better Luck Next Time!</h2>
                    <p className="mt-2 text-sm text-slate-500">Keep engaging customers to earn more rewards!</p>
                  </>
                )}
                <button
                  onClick={handleClose}
                  className="mt-6 w-full rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 py-3 text-sm font-semibold cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}