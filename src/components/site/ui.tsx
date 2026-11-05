'use client'

/* ------------------------------------------------------------------ */
/*  Shared site UI — the design language used by the home page,        */
/*  reused across How It Works, Winner Video, Merchant Benefits,       */
/*  About Us and Contact Us so every page looks like one product.      */
/*                                                                     */
/*  paper #FAFCFF · navy #0B2E7A · blue #1857D6                        */
/*  green #3E7A1C · leaf #7BC142                                       */
/* ------------------------------------------------------------------ */

import { useState } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import MerchantModal from '@/components/modals/Merchant'

export const EASE = [0.16, 1, 0.3, 1] as const
export const DISPLAY: React.CSSProperties = { fontFamily: 'var(--font-display), Georgia, serif' }

/* ---------------- Motion primitives ---------------- */

export function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}
const staggerItem: Variants = {
  hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: EASE } },
}

export function Stagger({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? undefined : 'hidden'}
      whileInView={reduce ? undefined : 'show'}
      viewport={{ once: true, margin: '-60px' }}
      variants={reduce ? undefined : staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  )
}

/* ---------------- Typography ---------------- */

export function Eyebrow({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#3E7A1C]/20 bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3E7A1C] shadow-sm">
      {Icon ? <Icon size={13} strokeWidth={2.2} /> : <span className="h-1.5 w-1.5 rounded-full bg-[#7BC142]" />}
      {children}
    </span>
  )
}

export function Accent({ children }: { children: React.ReactNode }) {
  return <span className="text-[#3E7A1C]">{children}</span>
}

export function SectionHeading({
  eyebrow,
  title,
  desc,
  align = 'center',
}: {
  eyebrow: string
  title: React.ReactNode
  desc?: React.ReactNode
  align?: 'center' | 'left'
}) {
  return (
    <FadeUp className={align === 'center' ? 'mx-auto mb-8 max-w-2xl text-center' : 'mb-8 max-w-2xl'}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[#0B2E7A] sm:text-[2.5rem]" style={DISPLAY}>
        {title}
      </h2>
      {desc && <p className={`mt-3 text-base text-[#0B2E7A]/65 ${align === 'center' ? 'mx-auto max-w-xl' : ''}`}>{desc}</p>}
    </FadeUp>
  )
}

/* ---------------- Layout ---------------- */

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FAFCFF] font-sans text-[#0B2E7A] selection:bg-[#7BC142] selection:text-[#0B2E7A]">
      {children}
    </div>
  )
}

export function Section({
  children,
  className = '',
  id,
  tone = 'plain',
}: {
  children: React.ReactNode
  className?: string
  id?: string
  tone?: 'plain' | 'green' | 'white'
}) {
  const bg =
    tone === 'green'
      ? 'bg-gradient-to-b from-[#F3F9EC] to-[#FAFCFF]'
      : tone === 'white'
        ? 'border-y border-[#0B2E7A]/10 bg-white'
        : ''
  return (
    <section id={id} className={`relative scroll-mt-20 px-5 pb-10 pt-6 sm:px-8 sm:pb-12 sm:pt-8 ${bg} ${className}`}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  )
}

/* ---------------- Page hero banner ---------------- */

export function PageHero({
  eyebrow,
  eyebrowIcon,
  title,
  desc,
  actions,
  aside,
}: {
  eyebrow: string
  eyebrowIcon?: LucideIcon
  title: React.ReactNode
  desc: React.ReactNode
  actions?: React.ReactNode
  aside?: React.ReactNode
}) {
  const reduce = useReducedMotion()
  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE },
        }

  return (
    <section className="relative overflow-hidden border-b border-[#0B2E7A]/10 bg-gradient-to-br from-[#F3F9EC] via-white to-[#EAF2FD]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(24,87,214,0.10),transparent_60%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full bg-[#7BC142]/25 blur-[120px]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(#0B2E7A 1px, transparent 1px), linear-gradient(90deg, #0B2E7A 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      <div
        className={`relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-5 pb-10 pt-6 sm:px-8 sm:pb-12 sm:pt-8 lg:px-10 ${aside ? 'lg:grid-cols-[1.1fr_0.9fr]' : ''}`}
      >
        <div>
          <motion.div {...enter(0)}>
            <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>
          </motion.div>
          <motion.h1
            {...enter(0.1)}
            className="mt-5 max-w-3xl text-[2.4rem] font-medium leading-[1.08] tracking-tight text-[#0B2E7A] sm:text-5xl xl:text-6xl"
            style={DISPLAY}
          >
            {title}
          </motion.h1>
          <motion.p {...enter(0.2)} className="mt-5 max-w-xl text-base leading-relaxed text-[#0B2E7A]/75 sm:text-lg">
            {desc}
          </motion.p>
          {actions && (
            <motion.div {...enter(0.3)} className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              {actions}
            </motion.div>
          )}
        </div>
        {aside && <motion.div {...enter(0.25)}>{aside}</motion.div>}
      </div>
    </section>
  )
}

/** Green underline-swoosh highlight used inside hero titles. */
export function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block text-[#3E7A1C]">
      {children}
      <svg aria-hidden="true" viewBox="0 0 300 12" preserveAspectRatio="none" className="absolute -bottom-1.5 left-0 h-2.5 w-full text-[#7BC142]">
        <path d="M2 9 C 80 2, 200 2, 298 7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </span>
  )
}

/* ---------------- Buttons ---------------- */

const primaryCls =
  'group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-[#3E7A1C] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(62,122,28,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(62,122,28,0.5)] cursor-pointer'
const secondaryCls =
  'group inline-flex items-center justify-center gap-2 rounded-2xl border border-[#0B2E7A]/20 bg-white px-6 py-3.5 text-sm font-semibold text-[#0B2E7A] transition-all hover:-translate-y-0.5 hover:bg-[#0B2E7A]/5'

function Shine() {
  return <span className="absolute inset-0 -translate-x-full skew-x-12 bg-white/20 transition-transform duration-700 group-hover:translate-x-full" />
}

export function PrimaryButton({
  children,
  href,
  onClick,
  icon: Icon = ArrowUpRight,
}: {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  icon?: LucideIcon
}) {
  const inner = (
    <>
      <Shine />
      <span className="relative">{children}</span>
      <Icon size={17} className="relative transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </>
  )
  return href ? (
    <a href={href} className={primaryCls}>{inner}</a>
  ) : (
    <button type="button" onClick={onClick} className={primaryCls}>{inner}</button>
  )
}

export function SecondaryButton({ children, href, icon: Icon }: { children: React.ReactNode; href: string; icon?: LucideIcon }) {
  return (
    <a href={href} className={secondaryCls}>
      {children}
      {Icon && <Icon size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />}
    </a>
  )
}

/** Primary button that opens the merchant registration modal. */
export function BecomePartnerButton({ children = 'Become a partner — it’s free' }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <PrimaryButton onClick={() => setOpen(true)}>{children}</PrimaryButton>
      <MerchantModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}

/* ---------------- Closing CTA ---------------- */

export function CtaBand({
  eyebrow,
  title,
  desc,
  buttonLabel,
}: {
  eyebrow: string
  title: React.ReactNode
  desc?: React.ReactNode
  buttonLabel?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <section className="px-5 pb-12 pt-6 sm:px-8 sm:pb-16 sm:pt-8">
      <FadeUp className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#3E7A1C] via-[#4C8A22] to-[#6BAF38] px-6 py-10 shadow-2xl shadow-[#3E7A1C]/25 sm:px-12 sm:py-14">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[40px] border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                {eyebrow}
              </span>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-[2.6rem]" style={DISPLAY}>
                {title}
              </h2>
              {desc && <p className="mt-3 text-base leading-relaxed text-white/85">{desc}</p>}
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="group inline-flex shrink-0 cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-white px-8 py-4 text-sm font-semibold text-[#3E7A1C] shadow-xl shadow-black/10 transition-transform hover:-translate-y-0.5"
            >
              {buttonLabel ?? 'Become a partner'}
              <ArrowUpRight size={17} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </FadeUp>
      <MerchantModal isOpen={open} onClose={() => setOpen(false)} />
    </section>
  )
}

/* ---------------- Cards ---------------- */

export function IconCard({
  icon: Icon,
  title,
  body,
  tag,
  tone = 'green',
}: {
  icon: LucideIcon
  title: React.ReactNode
  body: React.ReactNode
  tag?: string
  tone?: 'green' | 'blue'
}) {
  const iconCls = tone === 'blue' ? 'bg-[#1857D6]/10 text-[#1857D6]' : 'bg-[#3E7A1C]/10 text-[#3E7A1C]'
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-[#0B2E7A]/10 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#3E7A1C]/30 hover:shadow-xl hover:shadow-[#0B2E7A]/5 sm:rounded-3xl sm:p-7">
      <div className="mb-3 flex items-start justify-between gap-2 sm:mb-5 sm:items-center">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform sm:h-12 sm:w-12 sm:rounded-2xl duration-300 group-hover:scale-110 ${iconCls}`}>
          <Icon size={20} strokeWidth={1.9} />
        </span>
        {tag && (
          <span className="rounded-full bg-[#0B2E7A]/5 px-2 py-0.5 text-[9px] sm:px-3 sm:py-1 sm:text-[10px] font-bold uppercase tracking-[0.15em] text-[#0B2E7A]/60">
            {tag}
          </span>
        )}
      </div>
      <h3 className="text-base font-semibold leading-snug text-[#0B2E7A] sm:text-xl" style={DISPLAY}>
        {title}
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-[#0B2E7A]/70 sm:mt-2 sm:text-sm">{body}</p>
    </div>
  )
}
