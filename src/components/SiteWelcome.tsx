'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, ArrowRight, QrCode, Gift, Users, Sparkles, CheckCircle2, LogIn } from 'lucide-react'

const benefits = [
  { icon: QrCode, title: 'Your own shop QR', text: 'Customers scan and discover your store instantly.' },
  { icon: Gift, title: 'Rewards that bring them back', text: 'Turn every visit into a reason to return.' },
  { icon: Users, title: 'Join the merchant network', text: 'Get found by shoppers across the DAD community.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } }),
}

export default function SiteWelcome({ onClose, onChoose }: { onClose: () => void; onChoose: (mode: 'login' | 'register') => void }) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element?.close(); document.body.style.overflow = previous }
  }, [])

  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      aria-labelledby="welcome-title"
      aria-describedby="welcome-desc"
      style={{ clipPath: 'inset(0 round 28px)', WebkitClipPath: 'inset(0 round 28px)' }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_2rem)] max-w-3xl isolate overflow-hidden rounded-[28px] border-0 bg-white p-0 backdrop:bg-slate-950/70 backdrop:backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative grid max-h-[92dvh] overflow-y-auto rounded-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(2,6,23,0.6)] md:grid-cols-[1fr_1.15fr]"
      >
        <button
          autoFocus
          onClick={onClose}
          aria-label="Close welcome popup"
          className="absolute right-3 top-3 z-20 rounded-full bg-white/80 p-2 text-slate-500 shadow-sm ring-1 ring-slate-200 backdrop-blur transition hover:bg-white hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:bg-white"
        >
          <X size={18} />
        </button>

        {/* Brand panel */}
        <div className="relative isolate overflow-hidden rounded-t-[28px] bg-gradient-to-br from-blue-700 via-blue-900 to-slate-950 px-6 pb-8 pt-7 text-white sm:px-8 md:rounded-l-[28px] md:rounded-tr-none md:py-10">
          <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 -z-10 h-56 w-56 rounded-full bg-blue-400/40 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-10 -z-10 h-56 w-56 rounded-full bg-lime-400/30 blur-3xl" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              maskImage: 'radial-gradient(ellipse at 30% 30%, black 20%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 30% 30%, black 20%, transparent 70%)',
            }}
          />

          <div className="inline-flex rounded-2xl  px-4 py-2.5 shadow-lg shadow-blue-950/30">
            <img src="/homelg.png" alt="Merchant DAD" className="h-9 w-auto object-contain" />
          </div>

          <p className="mt-6 hidden text-sm leading-relaxed text-blue-100/90 md:block">
            The simplest way for local shops to get discovered, reward loyal customers and grow together.
          </p>

          {/* Mock QR reward card */}
          <motion.div
            initial={{ opacity: 0, y: 20, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -3 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto mt-6 hidden w-full max-w-[250px] md:block"
          >
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">Scan &amp; earn</span>
                <span className="rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">LIVE</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-white">
                  <QrCode size={44} className="text-slate-900" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Your Shop</p>
                  <p className="text-xs text-blue-100/80">Customer scanned</p>
                  <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-white/20">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '72%' }}
                      transition={{ delay: 0.6, duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-lime-300 to-lime-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 18 }}
              className="absolute -bottom-4 -right-3 flex rotate-3 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-xl"
            >
              <Gift size={14} className="text-lime-600" /> +50 reward points
            </motion.div>
          </motion.div>
        </div>

        {/* Content panel */}
        <div className="flex flex-col px-6 pb-6 pt-7 sm:px-8 md:rounded-l-[28px] md:rounded-tr-none md:py-10">
          <motion.p custom={0} variants={fadeUp} initial="hidden" animate="show" className="inline-flex w-fit items-center gap-1.5 rounded-full bg-lime-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-lime-700 ring-1 ring-lime-200">
            <Sparkles size={13} /> Welcome to Merchant DAD
          </motion.p>

          <motion.h2 custom={1} variants={fadeUp} initial="hidden" animate="show" id="welcome-title" className="mt-4 text-[1.75rem] font-extrabold leading-[1.15] tracking-tight text-slate-950 sm:text-3xl">
            Grow your shop.{' '}
            <span className="bg-gradient-to-r from-blue-600 to-lime-500 bg-clip-text text-transparent">Reward your customers.</span>
          </motion.h2>

          <motion.p custom={2} variants={fadeUp} initial="hidden" animate="show" id="welcome-desc" className="mt-3 text-sm leading-relaxed text-slate-600">
            Connect your store to our merchant network. Let customers scan your shop QR, discover rewards, and keep coming back.
          </motion.p>

          <ul className="mt-6 space-y-3">
            {benefits.map(({ icon: Icon, title, text }, i) => (
              <motion.li key={title} custom={3 + i} variants={fadeUp} initial="hidden" animate="show" className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-50 to-lime-50 text-blue-600 ring-1 ring-blue-100">
                  <Icon size={19} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{title}</span>
                  <span className="block text-xs leading-relaxed text-slate-500">{text}</span>
                </span>
              </motion.li>
            ))}
          </ul>

          <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show" className="mt-7 space-y-3">
            <button
              onClick={() => onChoose('register')}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:shadow-blue-600/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-[0.99]"
            >
              <span aria-hidden className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 transition-all duration-700 group-hover:left-[120%]" />
              Become a Partner
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => onChoose('login')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <LogIn size={16} className="text-slate-500" />
              Already registered? Login
            </button>
          </motion.div>

          <motion.p custom={7} variants={fadeUp} initial="hidden" animate="show" className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <CheckCircle2 size={14} className="text-lime-600" /> Join the growing DAD merchant community
          </motion.p>
        </div>
      </motion.div>
    </dialog>
  )
}
