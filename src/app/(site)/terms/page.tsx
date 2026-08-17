'use client'

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  ArrowUpRight, 
  CheckCircle, 
  Scale, 
  Lock, 
  RefreshCw 
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

const termsSections = [
  {
    title: "1. Acceptance of Terms",
    desc: "By accessing and registering on our platform as a merchant or user, you agree to comply with and be bound by these Terms and Conditions. If you do not agree to these terms, please refrain from using our services.",
    icon: CheckCircle,
    tag: "AGREEMENT",
  },
  {
    title: "2. Merchant Accounts & Registration",
    desc: "Merchant partners must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and all activities that occur under your account.",
    icon: ShieldCheck,
    tag: "ACCOUNTS",
  },
  {
    title: "3. Rewards, Benefits & Campaigns",
    desc: "Platform benefits, e-commerce reward points, promotional pricing, and campaign access are subject to eligibility criteria, merchant categories, and active membership levels managed by the administration.",
    icon: Scale,
    tag: "BENEFITS",
  },
  {
    title: "4. User Privacy & Data Protection",
    desc: "We respect your data and maintain robust security standards. All personal and business data provided is utilized strictly for platform operations, merchant analytics, and verified communication services.",
    icon: Lock,
    tag: "PRIVACY",
  },
  {
    title: "5. Modifications & Updates",
    desc: "We reserve the right to update, modify, or replace any part of these Terms and Conditions at our sole discretion. Continued use of the platform following any changes constitutes acceptance of those changes.",
    icon: RefreshCw,
    tag: "UPDATES",
  },
  {
    title: "6. Governing Law",
    desc: "These terms shall be governed by and construed in accordance with local regulatory guidelines and applicable commercial laws without regard to conflict of law provisions.",
    icon: FileText,
    tag: "LEGAL",
  },
];

export default function TermsPage() {
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
            <span>LEGAL & COMPLIANCE AGREEMENT</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="max-w-4xl text-4xl leading-tight sm:text-5xl md:text-6xl font-light tracking-tight"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Terms and{" "}
            <span className="text-[#3E7A1C] font-normal italic underline decoration-[#7BC142]/40 underline-offset-8">
              Conditions
            </span>
            .
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            className="mt-6 max-w-2xl text-base leading-relaxed text-[#0B2E7A]/80 sm:text-lg font-normal"
          >
            Please read these terms and conditions carefully before using our platform, registering as a merchant partner, or participating in loyalty campaigns.
          </motion.p>
        </motion.div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* SECTION: TERMS CARDS GRID                                  */}
      {/* ---------------------------------------------------------- */}
      <section className="px-6 py-20 relative">
        <div className="mx-auto max-w-6xl">
          <FadeUp className="mb-12 text-center">
            <span className="font-mono text-xs font-semibold tracking-[0.25em] text-[#3E7A1C] bg-[#3E7A1C]/10 px-3.5 py-1.5 rounded-full border border-[#3E7A1C]/20">
              PLATFORM GUIDELINES
            </span>
            <h2 
              className="mt-4 text-3xl sm:text-4xl font-light text-[#0B2E7A]"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              Overview of Rules & Policies
            </h2>
            <p className="mt-2 text-sm text-[#0B2E7A]/70 max-w-xl mx-auto">
              Transparent terms governing accounts, merchant benefits, rewards, and platform security.
            </p>
          </FadeUp>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {termsSections.map((item, i) => {
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

      <LedgerRule label="ECOSYSTEM COMPLIANCE" />

      {/* ---------------------------------------------------------- */}
      {/* CLOSING CALL TO ACTION                                     */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden px-6 py-20">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <span className="inline-block font-mono text-xs font-semibold tracking-[0.25em] text-[#1857D6] bg-[#1857D6]/10 px-4 py-1.5 rounded-full border border-[#1857D6]/20 mb-6">
            QUESTIONS OR CONCERNS?
          </span>
          <h2
            className="mt-4 text-3xl leading-tight sm:text-4xl md:text-5xl text-[#0B2E7A] font-light"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Need further clarification regarding our terms or merchant policies?
          </h2>
          
          <div className="mt-10 flex justify-center">
            <a
              href="/contact"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-[#3E7A1C] px-9 py-4 font-mono text-sm font-semibold tracking-wide text-white shadow-[0_8px_25px_rgba(62,122,28,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(62,122,28,0.55)] active:translate-y-0"
            >
              <span className="absolute inset-0 h-full w-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span>Contact Support Team</span>
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