'use client'

import { motion } from "framer-motion";
import {
  QrCode,
  Store,
  Users,
  Truck,
  ArrowRight,
  Target,
  Eye,
  Gift,
  ScanLine,
  Receipt,
  Rocket,
} from "lucide-react";
import {
  PageShell,
  PageHero,
  Highlight,
  Section,
  SectionHeading,
  Accent,
  Stagger,
  StaggerItem,
  BecomePartnerButton,
  SecondaryButton,
  CtaBand,
  IconCard,
  DISPLAY,
} from "@/components/site/ui";

const pillars = [
  {
    tag: "Merchant",
    icon: Store,
    title: "Merchant partners",
    copy: "A dedicated dashboard, a unique QR code, a referral link and a digital wallet — the moment a business is approved, it’s earning.",
    tone: "bg-[#1857D6] shadow-[#1857D6]/25",
  },
  {
    tag: "Customer",
    icon: Users,
    title: "Customers",
    copy: "One scan of a shop’s QR code opens a scratch card, a reward, an offer — turning a routine visit into a moment of delight.",
    tone: "bg-[#3E7A1C] shadow-[#3E7A1C]/25",
  },
  {
    tag: "Vendor",
    icon: Truck,
    title: "Vendors & sellers",
    copy: "Approved vendors list and manage products inside the ecosystem, reaching merchants and customers on one shared rail.",
    tone: "bg-[#0B2E7A] shadow-[#0B2E7A]/25",
  },
];

const differentiators = [
  {
    icon: Gift,
    title: "Reward-driven growth",
    copy: "Merchants earn points for joining and for every business they bring in — turning their network into their net worth.",
  },
  {
    icon: ScanLine,
    title: "QR-powered engagement",
    copy: "One unique code per shop turns every counter into an interactive touchpoint for campaigns and rewards.",
  },
  {
    icon: Receipt,
    title: "Complete transparency",
    copy: "Points ledgers, wallet transactions, billing history — every entry is visible to the merchant and the admin alike.",
  },
  {
    icon: Rocket,
    title: "Built to scale",
    copy: "A centralised dashboard gives full visibility as the network grows — across merchants, campaigns and revenue.",
  },
];

const categories = [
  "Kirana Stores", "Grocery", "Fashion", "Electronics", "Restaurants", "Cafés",
  "Salons", "Medical Stores", "Hardware", "Furniture", "Jewellery", "Service Providers",
];

const stats = [
  { value: "200", label: "Joining points on approval" },
  { value: "100", label: "Referral points per merchant" },
  { value: "12+", label: "Business categories" },
  { value: "₹5", label: "Max engagement charge per scan" },
];

/* Hero side visual: stats mosaic */
function StatsMosaic() {
  return (
    <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-3">
      <div aria-hidden="true" className="absolute inset-8 rounded-full bg-[#7BC142]/25 blur-3xl" />
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`relative rounded-3xl p-5 shadow-xl ${
            i === 0
              ? "bg-gradient-to-br from-[#3E7A1C] to-[#6BAF38] text-white shadow-[#3E7A1C]/25"
              : i === 3
                ? "bg-gradient-to-br from-[#1857D6] to-[#4F8CFF] text-white shadow-[#1857D6]/25"
                : "border border-[#0B2E7A]/10 bg-white text-[#0B2E7A] shadow-[#0B2E7A]/5"
          } ${i % 2 === 1 ? "translate-y-6" : ""}`}
        >
          <p className="text-4xl font-semibold" style={DISPLAY}>
            {s.value}
          </p>
          <p className={`mt-1 text-xs leading-snug ${i === 0 || i === 3 ? "text-white/80" : "text-[#0B2E7A]/60"}`}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function AboutPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="About us"
        eyebrowIcon={QrCode}
        title={
          <>
            Every scan is an <Highlight>opening-day</Highlight> moment.
          </>
        }
        desc="We’re building the network that lets a Kirana store, a salon or a boutique earn, refer and grow the way big chains do — one QR code, one dashboard, one wallet at a time."
        actions={
          <>
            <BecomePartnerButton />
            <SecondaryButton href="#pillars" icon={ArrowRight}>
              Who’s on the network
            </SecondaryButton>
          </>
        }
        aside={<StatsMosaic />}
      />

      {/* ---------------- MISSION & VISION ---------------- */}
      <Section>
        <Stagger className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <StaggerItem>
            <div className="relative h-full overflow-hidden rounded-[32px] bg-gradient-to-br from-[#EAF2FD] via-white to-[#F3F9EC] p-7 ring-1 ring-[#0B2E7A]/10 sm:p-10">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3E7A1C] text-white">
                <Target size={22} />
              </span>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#3E7A1C]">Our mission</p>
              <p className="mt-2text-2xl font-medium leading-snug text-[#0B2E7A] sm:text-[1.9rem]" style={DISPLAY}>
                Small and medium businesses rarely get the loyalty, referral and engagement tools that large chains take for granted.{" "}
                <Accent>We built this platform to close that gap</Accent> — without the complexity or the cost.
              </p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="relative flex h-full flex-col overflow-hidden rounded-[32px] bg-gradient-to-br from-[#3E7A1C] to-[#5E9E2E] p-7 text-white shadow-xl shadow-[#3E7A1C]/20 sm:p-10">
              <div aria-hidden="true" className="absolute -right-14 -top-14 h-48 w-48 rounded-full border-[26px] border-white/10" />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Eye size={22} />
              </span>
              <p className="relative mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">Our vision</p>
              <p className="relative mt-2 text-xl font-medium leading-snug sm:text-2xl" style={DISPLAY}>
                The largest connected network of local merchant partners — where every business, big or small, has the tools to thrive.
              </p>
            </div>
          </StaggerItem>
        </Stagger>
      </Section>

      {/* ---------------- PILLARS ---------------- */}
      <Section id="pillars" tone="green">
        <SectionHeading
          eyebrow="Who’s on the network"
          title={<>Three sides, <Accent>one shared rail</Accent></>}
        />
        <Stagger className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
          {pillars.map((p, i) => (
            <StaggerItem key={p.title} className={i === 2 ? "col-span-2 md:col-span-1" : ""}>
              <div className="group flex h-full flex-col rounded-2xl border border-[#0B2E7A]/10 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0B2E7A]/5">
                <div className="flex items-center justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg sm:h-14 sm:w-14 sm:rounded-2xl transition-transform group-hover:-rotate-6 ${p.tone}`}>
                    <p.icon size={24} />
                  </span>
                  <span className="rounded-full bg-[#0B2E7A]/5 px-2 py-0.5 text-[9px] font-bold sm:px-3 sm:py-1 sm:text-[10px] uppercase tracking-[0.15em] text-[#0B2E7A]/60">
                    {p.tag}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#0B2E7A] sm:mt-6 sm:text-2xl" style={DISPLAY}>
                  {p.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#0B2E7A]/70 sm:mt-2 sm:text-sm">{p.copy}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* ---------------- CATEGORY MARQUEE ---------------- */}
      <div
        className="overflow-hidden border-y border-[#0B2E7A]/10 bg-white py-4"
        style={{
          maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <motion.div
          className="flex w-max gap-3"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
        >
          {[...categories, ...categories].map((c, i) => (
            <span
              key={i}
              className="flex items-center gap-2 whitespace-nowrap rounded-full border border-[#0B2E7A]/10 bg-[#FAFCFF] px-4 py-2 text-xs font-medium text-[#0B2E7A]/75"
            >
              <Store size={13} className="text-[#3E7A1C]" />
              {c}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ---------------- WHAT SETS US APART ---------------- */}
      <Section>
        <SectionHeading
          eyebrow="What sets us apart"
          title={<>Built for every counter, <Accent>every shop front</Accent></>}
        />
        <Stagger className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {differentiators.map((f, i) => (
            <StaggerItem key={f.title}>
              <IconCard icon={f.icon} title={f.title} body={f.copy} tone={i % 2 ? "blue" : "green"} />
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <CtaBand
        eyebrow="Join the network"
        title="Give your shop the tools the big chains have."
        desc="One QR code, one dashboard, one wallet — approval in 24–48 hours."
        buttonLabel="Become a Merchant Partner"
      />
    </PageShell>
  );
}
