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
  ShieldCheck, 
  ArrowUpRight, 
  Tag, 
  TrendingUp, 
  Megaphone, 
  Award,
  Crown,
  Percent,
  Zap
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

const merchantBenefitsList = [
  {
    title: "E-Commerce Reward Points",
    desc: "Earn and accumulate redeemable reward points that can be utilized to purchase eligible products across the B2B and B2C e-commerce platform[cite: 1].",
    icon: Gift,
    tag: "REWARDS",
  },
  {
    title: "Exclusive Business Discounts",
    desc: "Access special promotional pricing and commercial discounts tailored specifically to your merchant category and membership level[cite: 1].",
    icon: Percent,
    tag: "SAVINGS",
  },
  {
    title: "Promotional & Marketing Support",
    desc: "Leverage digital marketing offers, promotional tools, and campaign-specific support to drive walk-in customer footfall[cite: 1].",
    icon: Megaphone,
    tag: "GROWTH",
  },
  {
    title: "Priority Campaign Access",
    desc: "Get early access to digital scratch card campaigns, lucky number contests, and high-engagement promotional events[cite: 1].",
    icon: Zap,
    tag: "CAMPAIGNS",
  },
  {
    title: "Partner Offers & Business Services",
    desc: "Unlock exclusive deals, corporate partnerships, and professional business services integrated directly within your merchant dashboard[cite: 1].",
    icon: Crown,
    tag: "PARTNERSHIPS",
  },
  {
    title: "Referral Incentives",
    desc: "Earn 100 referral points for every successful merchant partner you bring into the ecosystem, tracked securely via your dashboard[cite: 1].",
    icon: TrendingUp,
    tag: "REFERRALS",
  },
];

const assignmentCriteria = [
  {
    label: "Merchant Category",
    desc: "Benefits are tailored to suit specific retail types such as Kirana stores, electronics, apparel, or pharmacies[cite: 1]."
  },
  {
    label: "Membership Plan",
    desc: "Tiered advantages mapped directly to your active membership level within the ecosystem[cite: 1]."
  },
  {
    label: "Business Level & Performance",
    desc: "Earn enhanced rewards and priority privileges based on active customer engagement and successful referrals[cite: 1]."
  },
  {
    label: "Campaign Participation",
    desc: "Unlock special rewards dynamically when participating in platform-wide promotional events[cite: 1]."
  },
];

export default function MerchantBenefitsPage() {
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
        className="relative flex min-h-[75vh] flex-col justify-center overflow-hidden border-b border-[#0B2E7A]/10 px-6 pt-20 pb-16"
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
            <span>DEDICATED MERCHANT BENEFITS MODULE</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="max-w-4xl text-4xl leading-tight sm:text-5xl md:text-6xl font-light tracking-tight"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Exclusive advantages designed to{" "}
            <span className="text-[#3E7A1C] font-normal italic underline decoration-[#7BC142]/40 underline-offset-8">
              accelerate your business
            </span>
            .
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            className="mt-6 max-w-2xl text-base leading-relaxed text-[#0B2E7A]/80 sm:text-lg font-normal"
          >
            As a registered Merchant Partner, explore a dedicated section inside your dashboard featuring rewards, commercial discounts, promotional support, and priority campaign privileges[cite: 1].
          </motion.p>
        </motion.div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* SECTION 1: CORE BENEFITS GRID                              */}
      {/* ---------------------------------------------------------- */}
      <section className="px-6 py-20 relative">
        <div className="mx-auto max-w-6xl">
          <FadeUp className="mb-12 text-center">
            <span className="font-mono text-xs font-semibold tracking-[0.25em] text-[#3E7A1C] bg-[#3E7A1C]/10 px-3.5 py-1.5 rounded-full border border-[#3E7A1C]/20">
              MERCHANT PERKS
            </span>
            <h2 
              className="mt-4 text-3xl sm:text-4xl font-light text-[#0B2E7A]"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              What You Unlock as a Partner
            </h2>
            <p className="mt-2 text-sm text-[#0B2E7A]/70 max-w-xl mx-auto">
              Dynamic benefits created, updated, and assigned directly through the Super Admin dashboard[cite: 1].
            </p>
          </FadeUp>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {merchantBenefitsList.map((item, i) => {
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

      <LedgerRule label="DYNAMIC ALLOCATION & CONFIGURATION" />

      {/* ---------------------------------------------------------- */}
      {/* SECTION 2: HOW BENEFITS ARE ASSIGNED                       */}
      {/* ---------------------------------------------------------- */}
      <section className="px-6 py-20 bg-gradient-to-b from-transparent via-[#1857D6]/[0.02] to-transparent">
        <div className="mx-auto max-w-6xl">
          <FadeUp className="mb-12 text-center">
            <span className="font-mono text-xs font-semibold tracking-[0.25em] text-[#1857D6] bg-[#1857D6]/10 px-3.5 py-1.5 rounded-full border border-[#1857D6]/20">
              TARGETED ASSIGNMENT
            </span>
            <h2 
              className="mt-4 text-3xl sm:text-4xl font-light text-[#0B2E7A]"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              Personalized for Your Business Account
            </h2>
            <p className="mt-2 text-sm text-[#0B2E7A]/70 max-w-xl mx-auto">
              Each merchant sees only the benefits and offers specifically applicable to their account profile[cite: 1].
            </p>
          </FadeUp>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {assignmentCriteria.map((crit, i) => (
              <FadeUp key={crit.label} delay={i * 0.15}>
                <div className="flex h-full flex-col rounded-3xl p-7 bg-white border border-[#0B2E7A]/10 shadow-md shadow-[#0B2E7A]/5">
                  <div className="mb-4 inline-flex p-2.5 rounded-xl bg-[#3E7A1C]/10 text-[#3E7A1C] w-fit">
                    <ShieldCheck size={20} />
                  </div>
                  <h3 
                    className="mb-2 text-xl text-[#0B2E7A] font-normal"
                    style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                  >
                    {crit.label}
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-[#0B2E7A]/75 font-normal">
                    {crit.desc}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* CALL TO ACTION                                             */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden px-6 py-20">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <span className="inline-block font-mono text-xs font-semibold tracking-[0.25em] text-[#3E7A1C] bg-[#3E7A1C]/10 px-4 py-1.5 rounded-full border border-[#3E7A1C]/20 mb-6">
            JOIN THE ECOSYSTEM
          </span>
          <h2
            className="mt-4 text-3xl leading-tight sm:text-4xl md:text-5xl text-[#0B2E7A] font-light"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Ready to access exclusive merchant benefits and grow your retail store?
          </h2>
          
          <div className="mt-10 flex justify-center">
            <a
              href="/register"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-[#3E7A1C] px-9 py-4 font-mono text-sm font-semibold tracking-wide text-white shadow-[0_8px_25px_rgba(62,122,28,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(62,122,28,0.55)] active:translate-y-0"
            >
              <span className="absolute inset-0 h-full w-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span>Register & Claim Benefits</span>
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