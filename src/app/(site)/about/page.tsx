'use client'

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useInView,
} from "framer-motion";
import { QrCode, Store, Users, Truck, ArrowUpRight, Sparkles, ShieldCheck, Zap } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  DAP Brand Palette & Motion Tokens                                 */
/*  paper      #FAFCFF  – clean, crisp off-white                      */
/*  deepBlue   #0B2E7A  – profound structural backgrounds             */
/*  linkBlue   #1857D6  – electric vibrant blue accents               */
/*  deepGreen  #3E7A1C  – rich ribbon green for primary actions       */
/*  leafGreen  #7BC142  – luminous highlight green                    */
/* ------------------------------------------------------------------ */

const EASE = [0.16, 1, 0.3, 1] as const;
const FLAG_COLORS = ["#1857D6", "#3E7A1C", "#7BC142", "#0B2E7A", "#1857D6"];

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

/* --- Dynamic SVG Bunting with Sway Physics --- */
function Bunting() {
  const reduce = useReducedMotion();
  const count = 18;
  const flags = Array.from({ length: count });

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center overflow-visible">
      <svg
        viewBox="0 0 1200 50"
        className="h-12 w-full max-w-7xl px-6"
        preserveAspectRatio="none"
      >
        <path
          d="M0,5 Q600,45 1200,5"
          fill="none"
          stroke="#0B2E7A"
          strokeOpacity={0.12}
          strokeWidth={1.5}
        />
      </svg>
      <div className="absolute top-0 flex w-full max-w-7xl justify-between px-10">
        {flags.map((_, i) => {
          const t = i / (count - 1);
          const dip = Math.sin(t * Math.PI) * 26;
          const color = FLAG_COLORS[i % FLAG_COLORS.length];
          return (
            <motion.div
              key={i}
              style={{ marginTop: dip }}
              animate={
                reduce
                  ? {}
                  : {
                      rotate: [i % 2 === 0 ? -6 : 6, i % 2 === 0 ? 6 : -6, i % 2 === 0 ? -6 : 6],
                      skewX: [i % 2 === 0 ? -4 : 4, i % 2 === 0 ? 4 : -4, i % 2 === 0 ? -4 : 4]
                    }
              }
              transition={{
                duration: 3.2 + (i % 5) * 0.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.08,
              }}
              className="origin-top"
            >
              <div
                className="h-7 w-6 shadow-sm"
                style={{
                  background: color,
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                }}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* --- Ledger Divider with Interactive Pulse --- */
function LedgerRule({ label }: { label: string }) {
  return (
    <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
      <span className="font-mono text-[11px] font-semibold tracking-[0.3em] text-[#0B2E7A]/60 flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3E7A1C] animate-ping" />
        {label}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-[#0B2E7A]/20 via-[#0B2E7A]/5 to-transparent" />
    </div>
  );
}

/* --- Smooth Number Counter --- */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {reduce || !inView ? (
        `${to}${suffix}`
      ) : (
        <motion.span
          initial={{ "--num": 0 } as never}
          animate={{ "--num": to } as never}
          transition={{ duration: 1.6, ease: EASE }}
          onUpdate={(latest) => {
            const el = ref.current as unknown as HTMLElement | null;
            if (el) el.textContent = `${Math.round((latest as any)["--num"])}${suffix}`;
          }}
        />
      )}
    </span>
  );
}

const pillars = [
  {
    tag: "ENTRY / MERCHANT",
    icon: Store,
    title: "Merchant Partners",
    copy: "A dedicated dashboard, a unique QR code, a referral link, and a digital wallet — the moment a business is approved, it's earning.",
    bg: "linear-gradient(135deg, #EEF4FF 0%, #D8E5FF 100%)",
    border: "#1857D6",
    accent: "#1857D6",
    badgeBg: "bg-[#1857D6]/10 text-[#1857D6]"
  },
  {
    tag: "ENTRY / CUSTOMER",
    icon: Users,
    title: "Customers",
    copy: "One scan of a shop's QR code opens a scratch card, a reward, an offer — turning a routine visit into a small moment of delight.",
    bg: "linear-gradient(135deg, #F2F9EC 0%, #DFF2D0 100%)",
    border: "#3E7A1C",
    accent: "#3E7A1C",
    badgeBg: "bg-[#3E7A1C]/10 text-[#3E7A1C]"
  },
  {
    tag: "ENTRY / VENDOR",
    icon: Truck,
    title: "Vendors & Sellers",
    copy: "Approved vendors list and manage products directly inside the ecosystem, reaching merchants and customers on one shared rail.",
    bg: "linear-gradient(135deg, #EBF3FC 0%, #D2E4FC 100%)",
    border: "#0B2E7A",
    accent: "#0B2E7A",
    badgeBg: "bg-[#0B2E7A]/10 text-[#0B2E7A]"
  },
];

const categories = [
  "Kirana Stores",
  "Grocery",
  "Fashion",
  "Electronics",
  "Restaurants",
  "Cafés",
  "Salons",
  "Medical Stores",
  "Hardware",
  "Furniture",
  "Jewellery",
  "Service Providers",
];

export default function AboutPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  
  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0.4]);

  return (
    <div className="relative min-h-screen bg-[#FAFCFF] text-[#0B2E7A] selection:bg-[#7BC142] selection:text-[#0B2E7A] overflow-x-hidden font-sans">
      
      {/* ---------------------------------------------------------- */}
      {/* HERO SECTION WITH PARALLAX & GLOWS                         */}
      {/* ---------------------------------------------------------- */}
      <section
        ref={containerRef}
        className="relative flex min-h-[85vh] flex-col justify-center overflow-hidden border-b border-[#0B2E7A]/10 px-6 pt-16 pb-12"
      >
        <Bunting />

        {/* Ambient Gradient Orbs */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -right-20 top-10 h-96 w-96 rounded-full blur-[100px]"
          style={{ background: "#7BC142" }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="pointer-events-none absolute -left-20 bottom-0 h-96 w-96 rounded-full blur-[120px]"
          style={{ background: "#1857D6" }}
        />

        <motion.div
          style={{ y: heroTextY, opacity: heroOpacity }}
          className="relative z-0 mx-auto w-full max-w-6xl"
        >
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mb-5 inline-flex items-center gap-2.5 rounded-full bg-[#1857D6]/10 px-4 py-1.5 font-mono text-xs font-medium tracking-[0.2em] text-[#1857D6] border border-[#1857D6]/20 shadow-sm"
          >
            <QrCode size={15} strokeWidth={2} className="animate-pulse" />
            <span>RAKVIH SOLUTIONS · MERCHANT ECOSYSTEM</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="max-w-4xl text-4xl leading-tight sm:text-5xl md:text-6xl font-light tracking-tight"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Every scan is an{" "}
            <span className="text-[#3E7A1C] font-normal italic underline decoration-[#7BC142]/40 underline-offset-8">
              opening-day
            </span>{" "}
            moment.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            className="mt-6 max-w-xl text-base leading-relaxed text-[#0B2E7A]/80 sm:text-lg font-normal"
          >
            We're building the network that lets a Kirana store, a salon, or
            a boutique earn, refer, and grow the same way the big chains do —
            one QR code, one dashboard, one wallet at a time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease: EASE }}
            className="mt-8 flex flex-wrap items-center gap-5"
          >
            <a
              href="#pillars"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xl bg-[#3E7A1C] px-7 py-3.5 font-mono text-xs sm:text-sm font-semibold tracking-wide text-white shadow-[0_6px_20px_rgba(62,122,28,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(62,122,28,0.5)] active:translate-y-0"
            >
              <span className="absolute inset-0 h-full w-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span>See how it works</span>
              <ArrowUpRight
                size={17}
                className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
              />
            </a>
            
            <div className="flex items-center gap-2 text-xs font-mono text-[#0B2E7A]/70 bg-white/80 backdrop-blur-md px-4 py-3 rounded-xl border border-[#0B2E7A]/10 shadow-sm">
              <Sparkles size={15} className="text-[#3E7A1C]" />
              <span>Instant Setup & Verification</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* MISSION STATEMENT WITH HOVER DEPTH                         */}
      {/* ---------------------------------------------------------- */}
      <section className="px-6 py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1857D6]/[0.02] to-transparent pointer-events-none" />
        <FadeUp className="mx-auto max-w-4xl text-center">
          <div className="inline-block p-3 rounded-2xl bg-[#3E7A1C]/10 text-[#3E7A1C] mb-6 shadow-inner">
            <ShieldCheck size={28} strokeWidth={1.5} />
          </div>
          <p
            className="text-2xl leading-snug sm:text-3xl md:text-4xl font-light text-[#0B2E7A]"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Small and medium businesses rarely get the loyalty, referral, and
            engagement tools that large retail chains take for granted.{" "}
            <span className="text-[#1857D6] font-normal italic">
              We built this platform to close that gap
            </span>{" "}
            — without the complexity or the cost.
          </p>
        </FadeUp>
      </section>

      <LedgerRule label="WHO'S ON THE NETWORK" />

      {/* ---------------------------------------------------------- */}
      {/* THREE PILLARS (INTERACTIVE CARD HOVER EFFECTS)             */}
      {/* ---------------------------------------------------------- */}
      <section id="pillars" className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-3">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <FadeUp key={p.title} delay={i * 0.15} className="h-full">
                <motion.div
                  whileHover={{ y: -8, transition: { duration: 0.3, ease: EASE } }}
                  className="group relative flex h-full flex-col rounded-3xl p-8 border border-[#0B2E7A]/10 shadow-lg shadow-[#0B2E7A]/5 backdrop-blur-xl overflow-hidden transition-shadow duration-300 hover:shadow-xl hover:shadow-[#0B2E7A]/10"
                  style={{ background: p.bg }}
                >
                  {/* Subtle top light border glow on hover */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="flex items-center justify-between mb-8">
                    <span
                      className={`inline-block font-mono text-[11px] font-bold tracking-[0.2em] px-3 py-1 rounded-full ${p.badgeBg}`}
                    >
                      {p.tag}
                    </span>
                    <div className="p-3 rounded-2xl bg-white/80 shadow-sm border border-black/5 group-hover:scale-110 transition-transform duration-300">
                      <Icon size={24} strokeWidth={1.75} style={{ color: p.accent }} />
                    </div>
                  </div>

                  <h3
                    className="mb-3 text-2xl sm:text-3xl text-[#0B2E7A] font-normal"
                    style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                  >
                    {p.title}
                  </h3>
                  
                  <p className="text-xs sm:text-sm leading-relaxed text-[#0B2E7A]/75 font-normal">
                    {p.copy}
                  </p>

                  <div className="mt-8 pt-4 border-t border-[#0B2E7A]/10 flex items-center gap-2 text-xs font-mono font-semibold" style={{ color: p.accent }}>
                    <span>Explore integration</span>
                    <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </motion.div>
              </FadeUp>
            );
          })}
        </div>
      </section>

      <LedgerRule label="BUILT FOR EVERY COUNTER, EVERY SHOP FRONT" />

      {/* ---------------------------------------------------------- */}
      {/* CATEGORY MARQUEE & ANIMATED STATS GRID                     */}
      {/* ---------------------------------------------------------- */}
      <section className="overflow-hidden py-16">
        <div className="relative flex select-none overflow-hidden py-4">
          <motion.div
            className="flex shrink-0 gap-10 pr-10 items-center"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          >
            {[...categories, ...categories].map((c, i) => (
              <span
                key={i}
                className="whitespace-nowrap font-mono text-xs sm:text-sm tracking-wider font-medium text-[#0B2E7A]/70 bg-white px-4 py-2 rounded-xl shadow-sm border border-[#0B2E7A]/10"
              >
                {c} <span className="ml-3 text-[#3E7A1C]">✦</span>
              </span>
            ))}
          </motion.div>
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-2 gap-6 px-6 sm:grid-cols-4 sm:gap-8">
          {[
            { to: 200, suffix: "", label: "Joining points on approval" },
            { to: 100, suffix: "", label: "Referral points, per merchant" },
            { to: 12, suffix: "+", label: "Business categories supported" },
            { to: 5, suffix: "₹", label: "Max engagement charge per scan" },
          ].map((s, i) => (
            <FadeUp key={s.label} delay={i * 0.08} className="p-6 rounded-2xl bg-white border border-[#0B2E7A]/10 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl sm:text-4xl text-[#3E7A1C] font-semibold tracking-tight">
                <CountUp to={s.to} suffix={s.suffix} />
              </div>
              <div className="mt-2 text-xs sm:text-sm leading-snug text-[#0B2E7A]/75 font-medium">
                {s.label}
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* WHY WE EXIST (DARK CONTRAST CARD WITH GLOWS)               */}
      {/* ---------------------------------------------------------- */}
      <section className="px-6 py-16">
        <motion.div 
          whileInView={{ scale: [0.98, 1] }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mx-auto max-w-6xl rounded-3xl bg-[#0B2E7A] px-8 py-16 text-white sm:px-16 sm:py-20 shadow-2xl relative overflow-hidden"
        >
          {/* Ambient Lighting inside card */}
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#1857D6]/30 blur-[90px] pointer-events-none" />
          <div className="absolute -left-24 -bottom-24 h-80 w-80 rounded-full bg-[#3E7A1C]/20 blur-[90px] pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold tracking-[0.25em] text-[#7BC142] bg-[#7BC142]/10 px-3.5 py-1.5 rounded-full border border-[#7BC142]/20 mb-6">
              <Zap size={14} />
              <span>WHAT SETS US APART</span>
            </div>

            <div className="mt-6 grid gap-12 sm:grid-cols-2">
              {[
                {
                  title: "Reward-driven growth",
                  copy: "Merchants earn points for joining and for every business they bring in — turning their network into their net worth.",
                },
                {
                  title: "QR-powered engagement",
                  copy: "One unique code per shop turns every counter into an interactive touchpoint for campaigns and rewards.",
                },
                {
                  title: "Complete transparency",
                  copy: "Points ledgers, wallet transactions, billing history — every entry is visible to the merchant and the admin alike.",
                },
                {
                  title: "Built to scale",
                  copy: "A centralized dashboard gives full visibility as the network grows — across merchants, campaigns, and revenue.",
                },
              ].map((f, i) => (
                <FadeUp key={f.title} delay={i * 0.1}>
                  <div className="group p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors duration-300">
                    <h4
                      className="mb-2 text-xl sm:text-2xl text-[#7BC142] font-normal"
                      style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                    >
                      {f.title}
                    </h4>
                    <p className="text-sm leading-relaxed text-slate-300 font-normal">
                      {f.copy}
                    </p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* VISION / CLOSING CTA                                       */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden px-6 py-20">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <span className="inline-block font-mono text-xs font-semibold tracking-[0.25em] text-[#1857D6] bg-[#1857D6]/10 px-4 py-1.5 rounded-full border border-[#1857D6]/20 mb-6">
            OUR VISION
          </span>
          <h2
            className="mt-4 text-3xl leading-tight sm:text-4xl md:text-5xl text-[#0B2E7A] font-light"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            The largest connected network of local merchant partners —
            where every business, big or small, has the tools to thrive.
          </h2>
          
          <div className="mt-10 flex justify-center">
            <a
              href="/contact"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-[#3E7A1C] px-9 py-4 font-mono text-sm font-semibold tracking-wide text-white shadow-[0_8px_25px_rgba(62,122,28,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(62,122,28,0.55)] active:translate-y-0"
            >
              <span className="absolute inset-0 h-full w-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span>Become a Merchant Partner</span>
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