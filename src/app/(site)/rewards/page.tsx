'use client'

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { 
  Gift, 
  Sparkles, 
  ArrowUpRight, 
  Coins, 
  QrCode, 
  Award, 
  TrendingUp, 
  ShieldCheck 
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  DAP Brand Palette & Motion Tokens                                 */
/*  paper      #FAFCFF  – clean, crisp off-white                      */
/*  deepBlue   #0B2E7A  – profound structural backgrounds             */
/*  linkBlue   #1857D6  – electric vibrant blue accents               */
/*  deepGreen  #3E7A1C  – rich ribbon green for primary actions       */
/*  leafGreen  #7BC142  – luminous highlight green                    */
/* ------------------------------------------------------------------ */

const EASE = [0.16, 1, 0.3, 1] as const;

function FadeUp({
  children,
  delay = 0,
  className = "",
  yOffset = 30,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  yOffset?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? {} : { opacity: 0, y: yOffset, filter: "blur(6px)" }}
      whileInView={reduce ? {} : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* --- Ledger Divider --- */
function LedgerRule({ label }: { label: string }) {
  return (
    <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-6">
      <span className="font-mono text-[11px] font-semibold tracking-[0.3em] text-[#0B2E7A]/60 flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3E7A1C] animate-ping" />
        {label}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-[#0B2E7A]/20 via-[#0B2E7A]/5 to-transparent" />
    </div>
  );
}

const rewardsSections = [
  {
    title: "1. Earning Reward Points",
    desc: "Accumulate reward points seamlessly through daily platform activities, merchant check-ins, successful e-commerce transactions, and participating in active campaigns.",
    icon: Coins,
    tag: "EARN",
  },
  {
    title: "2. Campaign & QR Interaction",
    desc: "Scan promotional QR codes and unlock digital scratch cards deployed by verified merchant partners to win instant bonuses and exclusive discount perks.",
    icon: QrCode,
    tag: "CAMPAIGNS",
  },
  {
    title: "3. Tier-Based Benefits",
    desc: "Upgrade your membership tier as you engage more with the platform, unlocking higher earning multipliers, priority customer support, and elite merchant perks.",
    icon: Award,
    tag: "TIERS",
  },
  {
    title: "4. Redeeming Points",
    desc: "Use your accumulated points directly toward commercial discounts, checkout savings, or exclusive ecosystem product redemptions with participating vendors.",
    icon: Gift,
    tag: "REDEMPTION",
  },
  {
    title: "5. Referral Bonus Rewards",
    desc: "Invite new merchants and business peers to the ecosystem using your custom referral link to earn bonus points upon successful onboarding milestones.",
    icon: TrendingUp,
    tag: "REFERRALS",
  },
  {
    title: "6. Secure & Transparent Ledger",
    desc: "Monitor your complete points history, active reward balances, and redemption records in real-time through your dedicated merchant dashboard analytics.",
    icon: ShieldCheck,
    tag: "SECURITY",
  },
];

export default function RewardsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  
  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0.4]);

  return (
    <div className="relative min-h-screen bg-[#FAFCFF] text-[#0B2E7A] selection:bg-[#7BC142] selection:text-[#0B2E7A] overflow-x-hidden font-sans">
      
      {/* ---------------------------------------------------------- */}
      {/* HERO SECTION                                               */}
      {/* ---------------------------------------------------------- */}
      <section
        ref={containerRef}
        className="relative flex min-h-[65vh] flex-col justify-center overflow-hidden border-b border-[#0B2E7A]/10 px-6 pt-20 pb-16"
      >
        {/* Ambient Gradient Orbs */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -right-20 top-10 h-96 w-96 rounded-full blur-[100px]"
          style={{ background: "#7BC142" }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="pointer-events-none absolute -left-20 bottom-0 h-96 w-96 rounded-full blur-[120px]"
          style={{ background: "#1857D6" }}
        />

        <motion.div
          style={{ y: heroTextY, opacity: heroOpacity }}
          className="relative z-10 mx-auto w-full max-w-6xl"
        >
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mb-5 inline-flex items-center gap-2.5 rounded-full bg-[#1857D6]/10 px-4 py-1.5 font-mono text-xs font-medium tracking-[0.2em] text-[#1857D6] border border-[#1857D6]/20 shadow-sm"
          >
            <Sparkles size={15} strokeWidth={2} />
            <span>LOYALTY & BENEFITS PROGRAM</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="max-w-4xl text-4xl leading-tight sm:text-5xl md:text-6xl font-light tracking-tight"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Platform{" "}
            <span className="text-[#3E7A1C] font-normal italic underline decoration-[#7BC142]/40 underline-offset-8">
              Rewards
            </span>
            .
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            className="mt-6 max-w-2xl text-base leading-relaxed text-[#0B2E7A]/80 sm:text-lg font-normal"
          >
            Discover how you can earn, track, and redeem reward points through active merchant participation, QR campaigns, and exclusive platform benefits.
          </motion.p>
        </motion.div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* SECTION: REWARDS CARDS GRID                                */}
      {/* ---------------------------------------------------------- */}
      <section className="px-6 py-20 relative">
        <div className="mx-auto max-w-6xl">
          <FadeUp className="mb-12 text-center">
            <span className="font-mono text-xs font-semibold tracking-[0.25em] text-[#3E7A1C] bg-[#3E7A1C]/10 px-3.5 py-1.5 rounded-full border border-[#3E7A1C]/20">
              PROGRAM OVERVIEW
            </span>
            <h2 
              className="mt-4 text-3xl sm:text-4xl font-light text-[#0B2E7A]"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              How Rewards & Perks Work
            </h2>
            <p className="mt-2 text-sm text-[#0B2E7A]/70 max-w-xl mx-auto">
              Transparent mechanisms designed to maximize your value and engagement across the ecosystem.
            </p>
          </FadeUp>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rewardsSections.map((item, i) => {
              const Icon = item.icon;
              return (
                <FadeUp key={item.title} delay={i * 0.1}>
                  <div className="group relative flex h-full flex-col rounded-3xl p-8 bg-white border border-[#0B2E7A]/10 shadow-lg shadow-[#0B2E7A]/5 hover:shadow-xl transition-all duration-300">
                    <div className="mb-6 flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold tracking-widest text-[#1857D6] bg-[#1857D6]/10 px-3 py-1 rounded-full uppercase">
                        {item.tag}
                      </span>
                      <div className="p-3 rounded-2xl bg-[#FAFCFF] border border-[#0B2E7A]/10 group-hover:scale-110 transition-transform">
                        <Icon size={22} className="text-[#0B2E7A]" />
                      </div>
                    </div>
                    <h3 
                      className="mb-3 text-2xl text-[#0B2E7A] font-normal"
                      style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm leading-relaxed text-[#0B2E7A]/75 font-normal">
                      {item.desc}
                    </p>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      <LedgerRule label="SECURE ECOSYSTEM PLATFORM" />

      {/* ---------------------------------------------------------- */}
      {/* CLOSING CALL TO ACTION                                     */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden px-6 py-20">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <span className="inline-block font-mono text-xs font-semibold tracking-[0.25em] text-[#1857D6] bg-[#1857D6]/10 px-4 py-1.5 rounded-full border border-[#1857D6]/20 mb-6">
            START EARNING TODAY
          </span>
          <h2
            className="mt-4 text-3xl leading-tight sm:text-4xl md:text-5xl text-[#0B2E7A] font-light"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Ready to check your balance and unlock exciting platform rewards?
          </h2>
          
          <div className="mt-10 flex justify-center">
            <a
              href="/dashboard"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-[#3E7A1C] px-9 py-4 font-mono text-sm font-semibold tracking-wide text-white shadow-[0_8px_25px_rgba(62,122,28,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(62,122,28,0.55)] active:translate-y-0"
            >
              <span className="absolute inset-0 h-full w-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span>View Reward Dashboard</span>
              <ArrowUpRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
              />
            </a>
          </div>
        </FadeUp>
      </section>
    </div>
  );
}