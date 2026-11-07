'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import {
  QrCode,
  Store,
  Users,
  Gift,
  Wallet,
  ShoppingBag,
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Share2,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  PieChart,
  Zap,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { createClient as createMerchantClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SocialLinks from "@/components/SocialLinks";
// NOTE: assumed prop shape { isOpen, onClose } to match the AuthModal
// pattern already used elsewhere in this project. Adjust the two usages
// below (near the bottom of this file, and the "Become a partner" button)
// if Merchant.tsx actually expects different props.
import SiteWelcome from "@/components/SiteWelcome";
import MerchantModal from "@/components/modals/Merchant";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ------------------------------------------------------------------ */
/*  DAP Brand Palette & Motion Tokens                                 */
/*  paper      #FAFCFF  – clean, crisp off-white                      */
/*  deepBlue   #0B2E7A  – profound structural backgrounds             */
/*  linkBlue   #1857D6  – electric vibrant blue accents               */
/*  deepGreen  #3E7A1C  – rich ribbon green for primary actions       */
/*  leafGreen  #7BC142  – luminous highlight green                    */
/*  Matches the palette + type + motion system used on the            */
/*  "How It Works" page, applied here to the merchant landing page.   */
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

/* --- Orchestrated reveal: parent triggers, children stagger in --- */
const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE },
  },
};

function StaggerGroup({
  children,
  className = "",
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul";
}) {
  const reduce = useReducedMotion();
  const MotionTag = as === "ul" ? motion.ul : motion.div;
  return (
    <MotionTag
      initial={reduce ? undefined : "hidden"}
      whileInView={reduce ? undefined : "show"}
      viewport={{ once: true, margin: "-80px" }}
      variants={reduce ? undefined : staggerContainer}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

function StaggerItem({
  children,
  className = "",
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const MotionTag = as === "li" ? motion.li : motion.div;
  return (
    <MotionTag variants={staggerItem} className={className}>
      {children}
    </MotionTag>
  );
}

/* --- Shared typography helpers --- */
const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display), Georgia, serif" };

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#3E7A1C]/20 bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3E7A1C] shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-[#7BC142]" />
      {children}
    </span>
  );
}

function Accent({ children }: { children: React.ReactNode }) {
  return <span className="text-[#3E7A1C]">{children}</span>;
}

function SectionHeading({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: React.ReactNode;
  desc?: string;
}) {
  return (
    <FadeUp className="mx-auto mb-7 max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[#0B2E7A] sm:text-[2.6rem]" style={DISPLAY}>
        {title}
      </h2>
      {desc && <p className="mx-auto mt-3 max-w-xl text-base text-[#0B2E7A]/65">{desc}</p>}
    </FadeUp>
  );
}

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  "Kirana Stores", "Grocery", "Supermarkets", "Fashion & Clothing",
  "Electronics", "Mobile Shops", "Restaurants", "Cafes", "Salons",
  "Medical Stores", "Hardware Shops", "Furniture", "Jewellery",
];

// STEPS and FEATURES are now generated by functions so the referral-points
// figure can be filled in live from points_config instead of being
// hardcoded. Pass a fallback while the config is still loading.
function getSteps(referralPoints: number) {
  return [
    {
      step: "01",
      title: "Register your shop",
      desc: "Share your business details and complete a quick digital KYC to apply as a Merchant Partner. No physical paperwork required.",
      detail: "Under 2 minutes",
      icon: Store,
    },
    {
      step: "02",
      title: "Get approved & receive your QR",
      desc: "Our team verifies your details. Once approved, you instantly receive a Merchant ID, a referral code, and your unique shop QR code.",
      detail: "24–48 hour approval",
      icon: ShieldCheck,
    },
    {
      step: "03",
      title: "Display your QR & refer shops",
      desc: "Place the QR code on your billing counter. Use your referral code to bring other merchants into the network and earn points.",
      detail: `${referralPoints} pts per referral`,
      icon: Share2,
    },
    {
      step: "04",
      title: "Customers scan & engage",
      desc: "Walk-in customers scan your QR, verify their mobile number via OTP, and immediately receive a digital scratch card.",
      detail: "Frictionless, no app",
      icon: Smartphone,
    },
    {
      step: "05",
      title: "Everyone earns",
      desc: "Customers win cashback or rewards. You earn engagement credits and points, redeemable across the B2B & B2C ecosystem.",
      detail: "Automated ledger update",
      icon: Gift,
    },
  ];
}

function getFeatures(referralPoints: number) {
  return [
    {
      icon: Users,
      title: "Network Referral Program",
      body: `Every merchant gets a unique referral code and trackable link. Bring in another shop, and earn ${referralPoints} points the moment they're approved.`,
      accent: "blue" as const,
    },
    {
      icon: Wallet,
      title: "Points & Rewards Wallet",
      body: "Joining bonuses, referral points, and campaign rewards — all consolidated into one transparent ledger with clear redemption rules.",
      accent: "green" as const,
    },
    {
      icon: QrCode,
      title: "QR Customer Engagement",
      body: "A unique QR code turns every counter into a rewards moment. Scan, verify, and issue a digital scratch card in under 30 seconds.",
      accent: "leaf" as const,
    },
    {
      icon: Sparkles,
      title: "Scratch Card Campaigns",
      body: "Run time-bound promotional campaigns with configurable winners, prize tiers, and eligibility criteria — tracked automatically end-to-end.",
      accent: "blue" as const,
    },
    {
      icon: TrendingUp,
      title: "Benefits & Transparent Billing",
      body: "Category-based benefits, transparent per-customer billing, and full visibility into exactly what's owed and what's paid.",
      accent: "leaf" as const,
    },
  ];
}

const ACCENT_CLASSES: Record<
  "blue" | "green" | "leaf",
  { text: string; bg: string; border: string }
> = {
  blue: { text: "text-[#1857D6]", bg: "bg-[#1857D6]/10", border: "border-[#1857D6]/20" },
  green: { text: "text-[#3E7A1C]", bg: "bg-[#3E7A1C]/10", border: "border-[#3E7A1C]/20" },
  leaf: { text: "text-[#4C8A22]", bg: "bg-[#7BC142]/15", border: "border-[#7BC142]/30" },
};

const ECOSYSTEM = [
  { icon: Smartphone, title: "No App Required", body: "Customers don't need to download another app. The entire rewards flow works through the browser via QR scanning." },
  { icon: ShieldCheck, title: "Bank-Grade Security", body: "Customer data is OTP-verified and encrypted. We do not store personal payment details on the merchant side." },
  { icon: PieChart, title: "Real-Time Analytics", body: "Understand your footfall, scan rates, and customer return frequency through an intuitive merchant dashboard." },
  { icon: Zap, title: "Offline-First Architecture", body: "Even if your internet drops for a minute, the QR routes locally and syncs the engagement data the moment you reconnect." },
];

const CAPABILITY_STATS = [
  { value: "20+", label: "Business categories supported" },
  { value: "₹1–₹5", label: "Configurable engagement pricing" },
  { value: "100%", label: "Activity logged for audit" },
  { value: "<30s", label: "From QR scan to reward" },
];

const ONBOARDING_TIMELINE = [
  { phase: "DAY 01", title: "Application & KYC", desc: "Submit your shop details and complete digital KYC entirely online." },
  { phase: "DAY 02", title: "Verification & Approval", desc: "Our team reviews your application and approves your merchant account." },
  { phase: "DAY 03", title: "Kit Generation", desc: "Receive your Merchant ID, referral code, dashboard access, and digital QR." },
  { phase: "DAY 04", title: "Go Live", desc: "Print your QR, place it on the counter, and start earning points immediately." },
];

/* ------------------------------------------------------------------ */
/*  Hero banner visual — phone mockup with live reward flow           */
/* ------------------------------------------------------------------ */

function HeroPhone({
  referralPoints,
  joiningBonusPoints,
}: {
  referralPoints: number;
  joiningBonusPoints: number;
}) {
  const reduce = useReducedMotion();
  const float = (delay: number) =>
    reduce
      ? {}
      : {
          animate: { y: [0, -10, 0] },
          transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const, delay },
        };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 40, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 1, delay: 0.25, ease: EASE }}
      className="relative mx-auto mt-4 flex w-full max-w-[440px] items-center justify-center py-2 lg:mt-14"
    >
      {/* Glow + rings */}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7BC142]/25 blur-[90px]" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[105%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#0B2E7A]/10" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#3E7A1C]/25" />

      {/* Phone */}
      <div className="relative z-10 w-[250px] rounded-[42px] border border-white/20 bg-[#06194A] p-2.5 shadow-[0_40px_80px_-20px_rgba(11,46,122,0.45)] sm:w-[270px]">
        <div className="absolute left-1/2 top-4 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-[#06194A]" />
        <div className="overflow-hidden rounded-[34px] bg-[#FAFCFF]">
          {/* Screen header */}
          <div className="bg-gradient-to-br from-[#1857D6] to-[#0B2E7A] px-5 pb-6 pt-10 text-white">
            <p className="font-mono text-[10px] tracking-[0.25em] text-blue-100/80">SHARMA KIRANA</p>
            <p className="mt-1 text-lg font-semibold leading-tight" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
              Scan. Verify. Win.
            </p>
          </div>

          <div className="-mt-4 px-4 pb-5">
            {/* QR tile */}
            <div className="relative rounded-2xl border border-slate-100 bg-white p-4 shadow-lg shadow-[#0B2E7A]/10">
              <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-xl bg-[#F2F8EB]">
                <QrCode size={84} strokeWidth={1.3} className="text-[#0B2E7A]" />
                {!reduce && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute left-2 right-2 h-0.5 rounded-full bg-[#7BC142] shadow-[0_0_12px_2px_rgba(123,193,66,0.7)]"
                    animate={{ top: ["12%", "88%", "12%"] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </div>
              <p className="mt-3 text-center text-[11px] font-medium text-slate-500">Point camera at counter QR</p>
            </div>

            {/* Scratch card */}
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.1, ease: EASE }}
              className="relative mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#3E7A1C] to-[#7BC142] p-4 text-white"
            >
              <div aria-hidden="true" className="absolute -right-6 -top-6 h-20 w-20 rounded-full border-[10px] border-white/15" />
              <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-white/80">
                <Sparkles size={12} /> SCRATCH CARD
              </p>
              <p className="mt-1 text-2xl font-semibold" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
                ₹25 cashback
              </p>
              <p className="text-[11px] text-white/80">Credited to your wallet</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Floating chips */}
      <motion.div {...float(0)} className="absolute left-0 top-10 z-20 flex items-center gap-2.5 rounded-2xl border border-[#0B2E7A]/10 bg-white px-3.5 py-2.5 shadow-xl shadow-[#0B2E7A]/10 sm:-left-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3E7A1C]/10 text-[#3E7A1C]"><Gift size={16} /></span>
        <div>
          <p className="text-xs font-semibold text-[#0B2E7A]">+{joiningBonusPoints} pts</p>
          <p className="text-[10px] text-slate-500">Joining bonus</p>
        </div>
      </motion.div>

      <motion.div {...float(1.2)} className="absolute right-0 top-1/3 z-20 flex items-center gap-2.5 rounded-2xl border border-[#0B2E7A]/10 bg-white px-3.5 py-2.5 shadow-xl shadow-[#0B2E7A]/10 sm:-right-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1857D6]/10 text-[#1857D6]"><Users size={16} /></span>
        <div>
          <p className="text-xs font-semibold text-[#0B2E7A]">+{referralPoints} pts</p>
          <p className="text-[10px] text-slate-500">Per referral</p>
        </div>
      </motion.div>

      <motion.div {...float(0.6)} className="absolute bottom-8 left-2 z-20 flex items-center gap-2 rounded-full border border-[#0B2E7A]/10 bg-white px-3.5 py-2 shadow-xl shadow-[#0B2E7A]/10 sm:-left-2">
        <ShieldCheck size={15} className="text-[#3E7A1C]" />
        <p className="text-[11px] font-semibold text-[#0B2E7A]">OTP verified · &lt;30s</p>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Register demo — ledger-styled application form                    */
/* ------------------------------------------------------------------ */

function RegisterDemo() {
  const [form, setForm] = useState({ shop: "", category: CATEGORIES[0], phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [merchantId, setMerchantId] = useState("");

  const update =
    (key: "shop" | "category" | "phone") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.shop.trim() || form.phone.trim().length < 10) return;
    setMerchantId(`RK-${Math.floor(1000 + Math.random() * 9000)}`);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex h-full flex-col items-center rounded-3xl bg-white p-8 text-center shadow-xl"
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
        >
          <CheckCircle2 size={32} className="text-[#3E7A1C]" strokeWidth={1.75} />
        </motion.div>
        <h3
          className="mt-4 text-2xl text-[#0B2E7A]"
          style={DISPLAY}
        >
          Application received
        </h3>
        <p className="mt-2 text-sm text-[#0B2E7A]/70">
          <strong className="font-semibold text-[#0B2E7A]">{form.shop}</strong> is queued for
          verification under <strong className="font-semibold text-[#0B2E7A]">{form.category}</strong>.
        </p>
        <div className="mt-5 w-full rounded-2xl bg-[#FAFCFF] px-6 py-4">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#0B2E7A]/50">
            Merchant ID
          </span>
          <div className="mt-1 text-xl font-semibold text-[#0B2E7A]">{merchantId}</div>
        </div>
        <p className="mt-4 text-xs text-[#0B2E7A]/50">
          This is a demo confirmation — no data leaves your browser yet.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setForm({ shop: "", category: CATEGORIES[0], phone: "" });
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-[#1857D6] px-5 py-2.5 font-mono text-xs font-semibold text-[#1857D6] transition hover:bg-[#1857D6] hover:text-white"
        >
          Start another application
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col rounded-3xl bg-white p-8 shadow-xl">
      <h3
        className="text-2xl text-[#0B2E7A]"
        style={DISPLAY}
      >
        Apply as a Merchant Partner
      </h3>
      <p className="mt-1.5 text-sm text-[#0B2E7A]/60">Takes under two minutes. No commitment</p>

      <label className="mt-6 flex flex-col gap-1.5">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0B2E7A]/60">
          Shop name
        </span>
        <input
          value={form.shop}
          onChange={update("shop")}
          placeholder="e.g. Sri Lakshmi Kirana Store"
          required
          className="rounded-xl border border-[#0B2E7A]/15 bg-[#FAFCFF] px-4 py-3 text-sm text-[#0B2E7A] outline-none transition focus:border-[#1857D6] focus:bg-white focus:ring-4 focus:ring-[#1857D6]/10"
        />
      </label>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0B2E7A]/60">
          Business category
        </span>
        <select
          value={form.category}
          onChange={update("category")}
          className="rounded-xl border border-[#0B2E7A]/15 bg-[#FAFCFF] px-4 py-3 text-sm text-[#0B2E7A] outline-none transition focus:border-[#1857D6] focus:bg-white focus:ring-4 focus:ring-[#1857D6]/10"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0B2E7A]/60">
          Mobile number
        </span>
        <input
          value={form.phone}
          onChange={update("phone")}
          placeholder="10-digit mobile number"
          inputMode="numeric"
          required
          className="rounded-xl border border-[#0B2E7A]/15 bg-[#FAFCFF] px-4 py-3 text-sm text-[#0B2E7A] outline-none transition focus:border-[#1857D6] focus:bg-white focus:ring-4 focus:ring-[#1857D6]/10"
        />
      </label>

      <button
        type="submit"
        className="group relative mt-7 inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-[#3E7A1C] px-6 py-3.5 font-mono text-sm font-semibold tracking-wide text-white shadow-[0_8px_25px_rgba(62,122,28,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(62,122,28,0.5)]"
      >
        <span className="absolute inset-0 h-full w-full -translate-x-full skew-x-12 transform bg-white/20 transition-transform duration-700 group-hover:translate-x-full" />
        <span>Submit application</span>
        <ArrowRight size={16} strokeWidth={2} className="transition-transform duration-300 group-hover:translate-x-1" />
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

// Fallbacks used only until the live points_config row loads, chosen to
// match the numbers that used to be hardcoded on this page.
const DEFAULT_POINTS_CONFIG = {
  value_per_point: 0.5,
  points_per_referral: 100,
  joining_bonus_points: 200,
};

export default function RakvihLanding() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('code') || new URLSearchParams(url.hash.slice(1)).get('type') === 'recovery') {
      window.location.replace('/reset-password' + url.search + url.hash);
    }
  }, []);

  const [checkingAppSession, setCheckingAppSession] = useState(true);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) { setCheckingAppSession(false); return; }
    let active = true;
    let redirecting = false;
    const client = createMerchantClient();
    void (async () => {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (!session || !active) return;
        const { data: merchant } = await client.from('merchants').select('id, status').eq('user_id', session.user.id).maybeSingle();
        if (active && merchant && ['approved', 'active'].includes(merchant.status)) {
          redirecting = true;
          window.location.replace('/dashboard');
        }
      } finally {
        if (active && !redirecting) setCheckingAppSession(false);
      }
    })().catch(console.error);
    return () => { active = false; };
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0.4]);

  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [merchantInitialMode, setMerchantInitialMode] = useState<'login' | 'register'>('register');
  useEffect(() => {
    if (checkingAppSession) return;
    setWelcomeOpen(true);
    const onReturn = () => {
      if (Capacitor.isNativePlatform() && document.visibilityState === 'visible') setWelcomeOpen(true);
    };
    document.addEventListener('visibilitychange', onReturn);
    return () => document.removeEventListener('visibilitychange', onReturn);
  }, [checkingAppSession]);


  // Real approved-merchant count from Supabase. We deliberately only ever
  // display HALF of it (rounded down) per request — e.g. 50 real approved
  // merchants shows as "25+" on the page.
  const [merchantCount, setMerchantCount] = useState<number | null>(null);

  const [pointsConfig, setPointsConfig] = useState<typeof DEFAULT_POINTS_CONFIG | null>(null);

  useEffect(() => {
    const fetchNetworkStats = async () => {
      const [merchantRes, pointsRes] = await Promise.all([
        supabase
          .from("merchants")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved"),
        supabase
          .from("points_config")
          .select("value_per_point, points_per_referral, joining_bonus_points")
          .eq("id", 1)
          .single(),
      ]);

      if (typeof merchantRes.count === "number") {
        setMerchantCount(merchantRes.count);
      }
      if (pointsRes.data) {
        setPointsConfig(pointsRes.data as typeof DEFAULT_POINTS_CONFIG);
      }
    };

    fetchNetworkStats();
  }, []);

  const merchantDisplayCount = useMemo(() => {
    if (merchantCount === null) return null;
    return Math.floor(merchantCount / 2);
  }, [merchantCount]);

  const activePointsConfig = pointsConfig ?? DEFAULT_POINTS_CONFIG;

  const STEPS = useMemo(
    () => getSteps(activePointsConfig.points_per_referral),
    [activePointsConfig.points_per_referral]
  );
  const FEATURES = useMemo(
    () => getFeatures(activePointsConfig.points_per_referral),
    [activePointsConfig.points_per_referral]
  );

  const joiningBonusRupees = Math.round(
    activePointsConfig.joining_bonus_points * activePointsConfig.value_per_point
  );

  const applyBenefits = useMemo(
    () => [
      `${activePointsConfig.joining_bonus_points} joining points on approval, equivalent to ₹${joiningBonusRupees}`,
      `${activePointsConfig.points_per_referral} points per successful merchant referral`,
      "Zero setup cost or hardware investment",
      "Free standard QR stand shipped to your shop",
    ],
    [activePointsConfig, joiningBonusRupees]
  );

  return (
    <>
      {checkingAppSession && <div role="status" aria-label="Opening Merchant DAD" className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-white">
        <img src="/homelg.png" alt="Merchant DAD" className="h-auto w-48 object-contain" />
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
      </div>}
    <div inert={checkingAppSession} style={{ visibility: checkingAppSession ? 'hidden' : 'visible' }} className="relative min-h-screen overflow-x-hidden bg-[#FAFCFF] font-sans text-[#0B2E7A] selection:bg-[#7BC142] selection:text-[#0B2E7A]">
 <Header />
      {/* ---------------------------------------------------------- */}
      {/* HERO BANNER                                                 */}
      {/* ---------------------------------------------------------- */}
      <section ref={containerRef} className="relative">
        <div className="relative overflow-hidden border-b border-[#0B2E7A]/10 bg-gradient-to-br from-[#F3F9EC] via-white to-[#EAF2FD]">
          {/* Background layers */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(24,87,214,0.10),transparent_60%)]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full bg-[#7BC142]/25 blur-[120px]" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(#0B2E7A 1px, transparent 1px), linear-gradient(90deg, #0B2E7A 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            }}
          />

          <div className="relative z-10 mx-auto grid max-w-7xl items-start gap-6 px-5 pb-4 pt-3 sm:px-8 sm:pt-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:px-10 lg:pb-6 lg:pt-4">
            <motion.div style={{ y: heroTextY, opacity: heroOpacity }}>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="inline-flex items-center gap-2.5 rounded-full border border-[#3E7A1C]/20 bg-white py-1.5 pl-1.5 pr-4 shadow-sm"
              >
                <span className="rounded-full bg-[#3E7A1C] px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.15em] text-white">
                  NEW
                </span>
                <span className="font-mono text-[11px] font-medium tracking-[0.2em] text-[#3E7A1C]">
                  MERCHANT PARTNER NETWORK
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
                className="mt-5 max-w-xl text-[2.6rem] font-medium leading-[1.05] tracking-tight text-[#0B2E7A] sm:text-6xl xl:text-7xl"
                style={{ fontFamily: "var(--font-display), Georgia, serif" }}
              >
                Turn every counter into a{" "}
                <span className="relative inline-block text-[#3E7A1C]">
                  growth engine
                  <svg aria-hidden="true" viewBox="0 0 300 12" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-[#7BC142]">
                    <path d="M2 9 C 80 2, 200 2, 298 7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
                .
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
                className="mt-6 max-w-lg text-base leading-relaxed text-[#0B2E7A]/75 sm:text-lg"
              >
                One QR code turns walk-in customers into rewards, referrals into revenue,
                and every sale into a redeemable point — for Kirana stores, salons,
                electronics shops and 20+ categories.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.42, ease: EASE }}
                className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4"
              >
                <motion.button
                  type="button"
                  onClick={() => setIsMerchantModalOpen(true)}
                  whileHover={{ y: -3 }}
                  whileTap={{ y: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-[#3E7A1C] px-8 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(62,122,28,0.35)] transition-shadow duration-300 hover:shadow-[0_14px_36px_rgba(62,122,28,0.5)]"
                >
                  <span className="absolute inset-0 -translate-x-full skew-x-12 bg-white/20 transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">Become a partner — it&apos;s free</span>
                  <ArrowUpRight size={17} className="relative transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
                </motion.button>
                <motion.a
                  href="/how-it-works"
                  whileHover={{ y: -3 }}
                  whileTap={{ y: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-[#0B2E7A]/20 bg-white px-7 py-4 text-sm font-semibold text-[#0B2E7A] transition-colors hover:bg-[#0B2E7A]/5"
                >
                  See how it works
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </motion.a>
              </motion.div>

              {/* Social proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="mt-7 flex items-center gap-4"
              >
                <div aria-hidden="true" className="flex -space-x-2.5">
                  {[Store, ShoppingBag, Smartphone, Gift].map((Icon, i) => (
                    <span key={i} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#F2F8EB] text-[#3E7A1C] shadow-sm">
                      <Icon size={15} strokeWidth={2} />
                    </span>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0B2E7A]">
                    {merchantDisplayCount !== null ? `${merchantDisplayCount}+ merchants` : "Merchants"} already onboard
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-[#0B2E7A]/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#3E7A1C] animate-pulse" />
                    Approval in 24–48 hours
                  </p>
                </div>
              </motion.div>
            </motion.div>

            <HeroPhone
              referralPoints={activePointsConfig.points_per_referral}
              joiningBonusPoints={activePointsConfig.joining_bonus_points}
            />
          </div>

          {/* Stats strip */}
          <StaggerGroup className="relative z-10 mx-auto grid max-w-7xl grid-cols-2 border-t border-[#0B2E7A]/10 lg:grid-cols-4">
            {CAPABILITY_STATS.map((s, i) => (
              <StaggerItem
                key={s.label}
                className={`px-5 py-5 sm:px-8 ${i % 2 === 1 ? "border-l border-[#0B2E7A]/10" : ""} ${i >= 2 ? "border-t border-[#0B2E7A]/10 lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
              >
                <p className="text-2xl font-semibold text-[#0B2E7A] sm:text-3xl" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
                  {s.value}
                </p>
                <p className="mt-1 text-xs text-[#0B2E7A]/60 sm:text-sm">{s.label}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section aria-labelledby="home-social-heading" className="border-b border-[#0B2E7A]/10 bg-white px-5 py-6 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="home-social-heading" className="text-sm font-semibold text-[#0B2E7A]">Follow us</h2>
          <SocialLinks />
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* CATEGORY MARQUEE                                            */}
      {/* ---------------------------------------------------------- */}
      <div
        className="relative overflow-hidden border-b border-[#0B2E7A]/10 bg-white py-4"
        style={{
          maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <motion.div
          className="flex w-max gap-3"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          {[...CATEGORIES, ...CATEGORIES].map((c, i) => (
            <span
              key={i}
              className="flex items-center gap-2 whitespace-nowrap rounded-full border border-[#0B2E7A]/10 bg-[#FAFCFF] px-4 py-2 text-xs font-medium text-[#0B2E7A]/75"
            >
              <Store size={13} strokeWidth={2} className="text-[#3E7A1C]" />
              {c}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* HOW IT WORKS — FIVE-STEP FLOW                               */}
      {/* ---------------------------------------------------------- */}
      <section id="how" className="relative px-5 pt-6 pb-10 sm:px-8 sm:pt-8 sm:pb-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="How it works"
            title={<>From registration to reward, <Accent>tracked at every step</Accent></>}
            desc="No apps for your customers to download, no hardware to buy — just a simple flow that benefits everyone."
          />

          <div className="relative">
            {/* connector line (desktop) */}
            <div aria-hidden="true" className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-gradient-to-r from-[#1857D6]/30 via-[#3E7A1C]/40 to-[#7BC142]/30 lg:block" />
            <StaggerGroup className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-5 lg:grid-cols-5 lg:gap-4">
              {STEPS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <StaggerItem key={item.step} className={i === 4 ? "col-span-2 lg:col-span-1" : ""}>
                    <div className="group relative flex h-full flex-col items-start lg:items-center lg:text-center">
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border sm:h-14 sm:w-14 border-[#0B2E7A]/10 bg-white text-[#3E7A1C] shadow-lg shadow-[#0B2E7A]/10 transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-[#3E7A1C] group-hover:text-white">
                        <Icon size={22} strokeWidth={1.9} />
                        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#1857D6] text-[10px] font-bold text-white ring-4 ring-[#FAFCFF]">
                          {i + 1}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-1 flex-col lg:mt-5 lg:items-center">
                        <h3 className="text-[15px] font-semibold leading-snug text-[#0B2E7A] sm:text-lg" style={DISPLAY}>
                          {item.title}
                        </h3>
                        <p className="mt-1.5 flex-1 text-xs leading-relaxed text-[#0B2E7A]/70 sm:mt-2 sm:text-sm">{item.desc}</p>
                        <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#3E7A1C]/10 px-2.5 py-1 text-[10px] sm:mt-4 sm:px-3 sm:text-[11px] font-semibold text-[#3E7A1C]">
                          <CheckCircle2 size={12} /> {item.detail}
                        </span>
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerGroup>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* FEATURES — BENTO GRID                                       */}
      {/* ---------------------------------------------------------- */}
      <section className="relative bg-gradient-to-b from-[#F3F9EC] to-[#FAFCFF] px-5 pt-6 pb-10 sm:px-8 sm:pt-8 sm:pb-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Platform modules"
            title={<>Everything a merchant partner <Accent>needs</Accent></>}
            desc="A complete toolkit to acquire, engage, and retain customers while building a peer network."
          />

          <StaggerGroup className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const c = ACCENT_CLASSES[f.accent];
              const featured = i === 0;
              return (
                <StaggerItem key={f.title} className={featured ? "col-span-2 lg:col-span-1 lg:row-span-2" : ""}>
                  <motion.div
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className={
                      featured
                        ? "relative flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-[#3E7A1C] to-[#5E9E2E] p-6 text-white sm:p-8 shadow-xl shadow-[#3E7A1C]/20"
                        : "group flex h-full flex-col rounded-2xl border border-[#0B2E7A]/10 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-7 transition-shadow hover:border-[#3E7A1C]/30 hover:shadow-xl hover:shadow-[#0B2E7A]/5"
                    }
                  >
                    {featured && (
                      <>
                        <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />
                        <div aria-hidden="true" className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                      </>
                    )}
                    <div
                      className={
                        featured
                          ? "relative mb-6 inline-flex w-fit rounded-2xl bg-white/15 p-3.5 text-white"
                          : `mb-3 inline-flex w-fit rounded-xl border ${c.border} ${c.bg} p-2.5 ${c.text} sm:mb-5 sm:rounded-2xl sm:p-3`
                      }
                    >
                      <f.icon size={featured ? 26 : 22} strokeWidth={2} />
                    </div>
                    <h3
                      className={featured ? "relative text-2xl font-semibold sm:text-3xl" : "mb-1.5 text-[15px] font-semibold leading-snug text-[#0B2E7A] sm:mb-2 sm:text-xl"}
                      style={DISPLAY}
                    >
                      {f.title}
                    </h3>
                    <p className={featured ? "relative mt-3 text-base leading-relaxed text-white/85" : "text-xs leading-relaxed text-[#0B2E7A]/70 sm:text-sm"}>
                      {f.body}
                    </p>
                    {featured && (
                      <div className="relative mt-auto pt-8">
                        <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                          <p className="text-xs font-medium text-white/75">Earned per approved referral</p>
                          <p className="mt-1 text-4xl font-semibold" style={DISPLAY}>
                            +{activePointsConfig.points_per_referral} pts
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsMerchantModalOpen(true)}
                          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white hover:underline"
                        >
                          Start referring <ArrowRight size={15} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                </StaggerItem>
              );
            })}
          </StaggerGroup>

          {/* Ecosystem tiles */}
          <StaggerGroup className="mt-3 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-5 lg:grid-cols-4">
            {ECOSYSTEM.map((e) => (
              <StaggerItem key={e.title}>
                <div className="flex h-full flex-col rounded-2xl border border-[#0B2E7A]/10 bg-white/70 p-4 backdrop-blur sm:rounded-3xl sm:p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1857D6]/10 text-[#1857D6]">
                    <e.icon size={19} strokeWidth={2} />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-[#0B2E7A] sm:mt-4 sm:text-base">{e.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-[#0B2E7A]/65 sm:mt-1.5 sm:text-[13px]">{e.body}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* SCENARIO — A DAY AT THE COUNTER                             */}
      {/* ---------------------------------------------------------- */}
      <section className="px-5 pt-6 pb-10 sm:px-8 sm:pt-8 sm:pb-12">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <FadeUp>
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#EAF2FD] via-white to-[#F3F9EC] p-8 ring-1 ring-[#0B2E7A]/10 sm:p-12">
              <span aria-hidden="true" className="absolute -top-6 left-6 text-[160px] leading-none text-[#7BC142]/25" style={DISPLAY}>
                &ldquo;
              </span>
              <p className="relative text-2xl font-medium leading-snug text-[#0B2E7A] sm:text-3xl" style={DISPLAY}>
                The QR sits by the billing counter. A customer scans it while I pack their
                order — by the time they&apos;ve paid, they&apos;ve already scratched a card.
              </p>
              <div className="relative mt-8 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3E7A1C] text-white">
                  <Store size={19} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#0B2E7A]">Kirana store owner</p>
                  <p className="text-xs text-[#0B2E7A]/55">Illustrative example — daily engagement flow</p>
                </div>
              </div>
            </div>
          </FadeUp>

          <div>
            <FadeUp>
              <Eyebrow>A day at the counter</Eyebrow>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#0B2E7A] sm:text-4xl" style={DISPLAY}>
                Every scan is a <Accent>logged, rewarded</Accent> moment
              </h2>
            </FadeUp>
            <StaggerGroup className="mt-6 flex flex-col">
              {[
                "Customer scans the shop's unique QR at checkout.",
                "Mobile number verified instantly via secure OTP.",
                "Digital scratch card delivered to their browser.",
                "Win or not, the interaction is logged to your dashboard.",
                "Merchant earns engagement credit and points automatically.",
              ].map((s, i, arr) => (
                <StaggerItem key={i} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < arr.length - 1 && (
                    <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-[#0B2E7A]/10" />
                  )}
                  <span className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#3E7A1C]/10 text-xs font-bold text-[#3E7A1C] ring-4 ring-[#FAFCFF]">
                    {i + 1}
                  </span>
                  <p className="pt-1 text-[15px] leading-relaxed text-[#0B2E7A]/80">{s}</p>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* ONBOARDING TIMELINE                                         */}
      {/* ---------------------------------------------------------- */}
      <section className="border-y border-[#0B2E7A]/10 bg-white px-5 pt-6 pb-10 sm:px-8 sm:pt-8 sm:pb-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Go live in 4 days"
            title={<>A streamlined path to <Accent>earning</Accent></>}
          />

          <StaggerGroup className="relative grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-8 lg:grid-cols-4 lg:gap-6">
            <div aria-hidden="true" className="absolute left-0 right-0 top-[9px] hidden h-1 rounded-full bg-gradient-to-r from-[#1857D6]/20 via-[#3E7A1C]/30 to-[#7BC142] lg:block" />
            {ONBOARDING_TIMELINE.map((item, i) => (
              <StaggerItem key={item.phase} className="relative">
                <span className={`relative z-10 block h-5 w-5 rounded-full border-4 border-white shadow ${i === ONBOARDING_TIMELINE.length - 1 ? "bg-[#7BC142]" : "bg-[#3E7A1C]"}`} />
                <p className="mt-5 text-xs font-bold tracking-[0.2em] text-[#1857D6]">{item.phase}</p>
                <h3 className="mt-1.5 text-base font-semibold text-[#0B2E7A] sm:mt-2 sm:text-xl" style={DISPLAY}>
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#0B2E7A]/70 sm:mt-2 sm:text-sm">{item.desc}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* APPLY — CLOSING CTA + REGISTRATION FORM                     */}
      {/* ---------------------------------------------------------- */}
      <section id="apply" className="relative px-5 pt-6 pb-10 sm:px-8 sm:pt-8 sm:pb-12">
        <div className="mx-auto max-w-7xl">
          <FadeUp>
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#3E7A1C] via-[#4C8A22] to-[#6BAF38] p-7 shadow-2xl shadow-[#3E7A1C]/25 sm:p-12">
              <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[40px] border-white/10" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold tracking-[0.15em] text-white">
                    <Gift size={14} /> JOINING PRIVILEGE
                  </span>
                  <h2 className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-5xl" style={DISPLAY}>
                    Ready to put a QR on your counter?
                  </h2>
                  <p className="mt-4 max-w-md text-base leading-relaxed text-white/85">
                    Applications are reviewed within 24–48 hours. Once approved, your Merchant ID,
                    referral code, and shop QR are generated automatically.
                  </p>
                  <StaggerGroup as="ul" className="mt-7 grid grid-cols-2 gap-2 sm:gap-3">
                    {applyBenefits.map((li) => (
                      <StaggerItem
                        key={li}
                        as="li"
                        className="flex items-start gap-2 rounded-2xl bg-white/10 p-3 text-xs text-white sm:gap-2.5 sm:p-3.5 sm:text-sm"
                      >
                        <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0 text-[#D7F5B8]" strokeWidth={2} />
                        {li}
                      </StaggerItem>
                    ))}
                  </StaggerGroup>
                </div>
                <RegisterDemo />
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

         <Footer />

      {welcomeOpen && <SiteWelcome onClose={() => setWelcomeOpen(false)} onChoose={mode => { setWelcomeOpen(false); setMerchantInitialMode(mode); setIsMerchantModalOpen(true); }} />}
      <MerchantModal initialMode={merchantInitialMode} isOpen={isMerchantModalOpen} onClose={() => setIsMerchantModalOpen(false)} />
    </div>
    </>
  );
}