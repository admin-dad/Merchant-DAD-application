'use client'

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useInView,
} from "framer-motion";
import { 
  QrCode, 
  Store, 
  Users, 
  Gift, 
  Wallet, 
  ShoppingBag, 
  ArrowUpRight, 
  CheckCircle2, 
  Sparkles, 
  Share2, 
  ShieldCheck,
  Smartphone
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

const customerJourneySteps = [
  {
    step: "01",
    title: "Store Visit & QR Scan",
    desc: "Customer visits a registered Merchant Partner and scans the unique shop QR code using their smartphone[cite: 1].",
    icon: Store,
  },
  {
    step: "02",
    title: "Quick Verification",
    desc: "Customer enters or verifies basic contact information such as their mobile number and/or email address[cite: 1].",
    icon: Smartphone,
  },
  {
    step: "03",
    title: "Digital Scratch Card Issued",
    desc: "The system validates campaign rules and instantly delivers a digital scratch card via the web experience, WhatsApp, or email[cite: 1].",
    icon: Sparkles,
  },
  {
    step: "04",
    title: "Scratch & Win",
    desc: "The customer scratches the digital card to reveal their generated number and instantly discovers if they have won a prize[cite: 1].",
    icon: Gift,
  },
];

const merchantOnboardingSteps = [
  {
    phase: "PHASE 01",
    title: "Registration & KYC",
    desc: "Merchants register by providing business details, owner info, category, GST details, and KYC documents through the portal[cite: 1].",
  },
  {
    phase: "PHASE 02",
    title: "Super Admin Approval",
    desc: "The Super Admin reviews and verifies details to approve, reject, or manage merchant partner accounts securely[cite: 1].",
  },
  {
    phase: "PHASE 03",
    title: "Joining Bonus & Assets",
    desc: "Upon approval, the merchant receives a unique ID, dedicated dashboard, referral code, shop QR code, and 200 Joining Points equivalent to ₹100[cite: 1].",
  },
  {
    phase: "PHASE 04",
    title: "Grow & Earn",
    desc: "Merchants display their QR code, refer other businesses to earn 100 points per referral, and engage walk-in customers seamlessly[cite: 1].",
  },
];

export default function HowItWorksPage() {
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
            className="mb-5 inline-flex items-center gap-2.5 rounded-full bg-[#3E7A1C]/10 px-4 py-1.5 font-mono text-xs font-medium tracking-[0.2em] text-[#3E7A1C] border border-[#3E7A1C]/20 shadow-sm"
          >
            <ShieldCheck size={15} strokeWidth={2} />
            <span>PLATFORM ARCHITECTURE & WORKFLOW</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="max-w-4xl text-4xl leading-tight sm:text-5xl md:text-6xl font-light tracking-tight"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            How the B2B & B2C ecosystem{" "}
            <span className="text-[#3E7A1C] font-normal italic underline decoration-[#7BC142]/40 underline-offset-8">
              powers local commerce
            </span>
            .
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            className="mt-6 max-w-2xl text-base leading-relaxed text-[#0B2E7A]/80 sm:text-lg font-normal"
          >
            Discover the end-to-end journey of merchants, customers, and administrators on our integrated digital platform combining loyalty rewards, QR engagement, referrals, and e-commerce[cite: 1].
          </motion.p>
        </motion.div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* SECTION 1: MERCHANT ONBOARDING & JOINING BONUS             */}
      {/* ---------------------------------------------------------- */}
      <section className="px-6 py-20 relative">
        <div className="mx-auto max-w-6xl">
          <FadeUp className="mb-12 text-center">
            <span className="font-mono text-xs font-semibold tracking-[0.25em] text-[#1857D6] bg-[#1857D6]/10 px-3.5 py-1.5 rounded-full border border-[#1857D6]/20">
              MERCHANT JOURNEY
            </span>
            <h2 
              className="mt-4 text-3xl sm:text-4xl font-light text-[#0B2E7A]"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              Onboarding & Instant Rewards
            </h2>
            <p className="mt-2 text-sm text-[#0B2E7A]/70 max-w-xl mx-auto">
              From registration to receiving unique QR codes and joining bonuses[cite: 1].
            </p>
          </FadeUp>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {merchantOnboardingSteps.map((item, i) => (
              <FadeUp key={item.phase} delay={i * 0.15}>
                <div className="group relative flex h-full flex-col rounded-3xl p-7 bg-white border border-[#0B2E7A]/10 shadow-lg shadow-[#0B2E7A]/5 hover:shadow-xl transition-all duration-300">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#1857D6] bg-[#1857D6]/10 px-3 py-1 rounded-full">
                      {item.phase}
                    </span>
                    <CheckCircle2 size={20} className="text-[#3E7A1C]" />
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
            ))}
          </div>

          {/* Joining Bonus Highlight Card */}
          <FadeUp delay={0.4} className="mt-10">
            <div className="rounded-3xl bg-gradient-to-r from-[#0B2E7A] to-[#1857D6] p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
              <div className="relative z-10 grid gap-6 sm:grid-cols-2 items-center">
                <div>
                  <span className="font-mono text-xs font-semibold tracking-widest text-[#7BC142] uppercase">
                    Joining Privilege
                  </span>
                  <h3 
                    className="mt-2 text-3xl font-light"
                    style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                  >
                    200 Joining Points = ₹100 Value
                  </h3>
                  <p className="mt-2 text-sm text-slate-200 leading-relaxed font-normal">
                    Every eligible new Merchant Partner receives a joining reward of 200 Points upon approval, with fully configurable conversion values managed directly from the Admin Dashboard[cite: 1].
                  </p>
                </div>
                <div className="flex sm:justify-end">
                  <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
                    <div className="font-mono text-3xl font-bold text-[#7BC142]">200 Pts</div>
                    <div className="mt-1 text-xs text-slate-300 font-mono tracking-wider">Configurable Conversion</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <LedgerRule label="CUSTOMER ENGAGEMENT & QR FLOW" />

      {/* ---------------------------------------------------------- */}
      {/* SECTION 2: CUSTOMER QR SCAN & SCRATCH CARD FLOW            */}
      {/* ---------------------------------------------------------- */}
      <section className="px-6 py-20 bg-gradient-to-b from-transparent via-[#1857D6]/[0.02] to-transparent">
        <div className="mx-auto max-w-6xl">
          <FadeUp className="mb-12 text-center">
            <span className="font-mono text-xs font-semibold tracking-[0.25em] text-[#3E7A1C] bg-[#3E7A1C]/10 px-3.5 py-1.5 rounded-full border border-[#3E7A1C]/20">
              CUSTOMER JOURNEY
            </span>
            <h2 
              className="mt-4 text-3xl sm:text-4xl font-light text-[#0B2E7A]"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              The 9-Step QR Scan & Scratch Card Experience
            </h2>
            <p className="mt-2 text-sm text-[#0B2E7A]/70 max-w-xl mx-auto">
              Turning walk-in store visits into interactive digital reward moments[cite: 1].
            </p>
          </FadeUp>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {customerJourneySteps.map((item, i) => {
              const Icon = item.icon;
              return (
                <FadeUp key={item.step} delay={i * 0.15}>
                  <div className="group relative flex h-full flex-col rounded-3xl p-7 bg-white border border-[#0B2E7A]/10 shadow-lg shadow-[#0B2E7A]/5 hover:shadow-xl transition-all duration-300">
                    <div className="mb-6 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#3E7A1C] bg-[#3E7A1C]/10 px-3 py-1 rounded-full">
                        STEP {item.step}
                      </span>
                      <div className="p-2.5 rounded-xl bg-[#FAFCFF] border border-[#0B2E7A]/10 group-hover:scale-110 transition-transform">
                        <Icon size={20} className="text-[#0B2E7A]" />
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

      <LedgerRule label="REFERRALS & E-COMMERCE ECOSYSTEM" />

      {/* ---------------------------------------------------------- */}
      {/* SECTION 3: REFERRAL PROGRAM & E-COMMERCE REDEMPTION        */}
      {/* ---------------------------------------------------------- */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl grid gap-8 sm:grid-cols-2">
          
          {/* Referral Program Card */}
          <FadeUp>
            <div className="flex h-full flex-col rounded-3xl p-8 bg-white border border-[#0B2E7A]/10 shadow-lg shadow-[#0B2E7A]/5">
              <div className="mb-6 inline-flex p-3 rounded-2xl bg-[#1857D6]/10 text-[#1857D6] w-fit">
                <Share2 size={24} />
              </div>
              <span className="font-mono text-xs font-bold tracking-widest text-[#1857D6] uppercase mb-2">
                Merchant Referral Network
              </span>
              <h3 
                className="mb-4 text-3xl text-[#0B2E7A] font-normal"
                style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                Earn 100 Points Per Successful Referral
              </h3>
              <p className="text-sm leading-relaxed text-[#0B2E7A]/75 font-normal">
                Every registered merchant receives a unique referral code and link. When an existing merchant refers another business that successfully registers and meets approval criteria, the referring merchant receives 100 Referral Points instantly, tracked completely in the points ledger[cite: 1].
              </p>
            </div>
          </FadeUp>

          {/* E-Commerce & Hybrid Payment Card */}
          <FadeUp delay={0.15}>
            <div className="flex h-full flex-col rounded-3xl p-8 bg-white border border-[#0B2E7A]/10 shadow-lg shadow-[#0B2E7A]/5">
              <div className="mb-6 inline-flex p-3 rounded-2xl bg-[#3E7A1C]/10 text-[#3E7A1C] w-fit">
                <ShoppingBag size={24} />
              </div>
              <span className="font-mono text-xs font-bold tracking-widest text-[#3E7A1C] uppercase mb-2">
                B2B & B2C E-Commerce
              </span>
              <h3 
                className="mb-4 text-3xl text-[#0B2E7A] font-normal"
                style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                Points Redemption & Hybrid Payments
              </h3>
              <p className="text-sm leading-relaxed text-[#0B2E7A]/75 font-normal">
                Merchants can use accumulated reward points to purchase eligible products. If points are insufficient, the platform supports hybrid payment combining reward points, wallet balance, and secure online payment gateways seamlessly[cite: 1].
              </p>
            </div>
          </FadeUp>

        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* CLOSING CALL TO ACTION                                     */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden px-6 py-20">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <span className="inline-block font-mono text-xs font-semibold tracking-[0.25em] text-[#1857D6] bg-[#1857D6]/10 px-4 py-1.5 rounded-full border border-[#1857D6]/20 mb-6">
            INTEGRATED ECOSYSTEM
          </span>
          <h2
            className="mt-4 text-3xl leading-tight sm:text-4xl md:text-5xl text-[#0B2E7A] font-light"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Ready to experience seamless merchant engagement and reward management?
          </h2>
          
          <div className="mt-10 flex justify-center gap-4 flex-wrap">
            <a
              href="/register"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-[#3E7A1C] px-9 py-4 font-mono text-sm font-semibold tracking-wide text-white shadow-[0_8px_25px_rgba(62,122,28,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(62,122,28,0.55)] active:translate-y-0"
            >
              <span className="absolute inset-0 h-full w-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span>Register as Merchant Partner</span>
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