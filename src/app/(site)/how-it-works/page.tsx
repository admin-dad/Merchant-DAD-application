'use client'

import {
  Store,
  Gift,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Share2,
  ShieldCheck,
  Smartphone,
  ShoppingBag,
  Wallet,
  CreditCard,
  ClipboardCheck,
  UserCheck,
  TrendingUp,
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
  FadeUp,
  BecomePartnerButton,
  SecondaryButton,
  CtaBand,
  DISPLAY,
} from "@/components/site/ui";

const customerJourneySteps = [
  {
    title: "Store visit & QR scan",
    desc: "Customer visits a registered Merchant Partner and scans the unique shop QR code using their smartphone.",
    icon: Store,
  },
  {
    title: "Quick verification",
    desc: "Customer enters or verifies basic contact information such as their mobile number and/or email address.",
    icon: Smartphone,
  },
  {
    title: "Digital scratch card issued",
    desc: "The system validates campaign rules and instantly delivers a digital scratch card via the web, WhatsApp, or email.",
    icon: Sparkles,
  },
  {
    title: "Scratch & win",
    desc: "The customer scratches the digital card to reveal their number and instantly discovers if they have won a prize.",
    icon: Gift,
  },
];

const merchantOnboardingSteps = [
  {
    phase: "Phase 01",
    title: "Registration & KYC",
    desc: "Merchants register with business details, owner info, category, GST details and KYC documents through the portal.",
    icon: ClipboardCheck,
  },
  {
    phase: "Phase 02",
    title: "Admin approval",
    desc: "The Super Admin reviews and verifies details to approve, reject, or manage merchant partner accounts securely.",
    icon: UserCheck,
  },
  {
    phase: "Phase 03",
    title: "Joining bonus & assets",
    desc: "On approval, the merchant receives a unique ID, dashboard, referral code, shop QR code and 200 Joining Points (₹100).",
    icon: Gift,
  },
  {
    phase: "Phase 04",
    title: "Grow & earn",
    desc: "Merchants display their QR, refer other businesses to earn 100 points per referral, and engage walk-in customers.",
    icon: TrendingUp,
  },
];

/* Hero side visual: compact "flow" card */
function FlowCard() {
  const rows = [
    { icon: Store, label: "Merchant registers", meta: "KYC in minutes", tone: "blue" },
    { icon: ShieldCheck, label: "Admin approves", meta: "24–48 hours", tone: "blue" },
    { icon: Smartphone, label: "Customer scans QR", meta: "No app needed", tone: "green" },
    { icon: Gift, label: "Everyone earns", meta: "+200 pts joining bonus", tone: "green" },
  ] as const;
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div aria-hidden="true" className="absolute inset-6 rounded-full bg-[#7BC142]/25 blur-3xl" />
      <div className="relative rounded-[28px] border border-[#0B2E7A]/10 bg-white/90 p-5 shadow-2xl shadow-[#0B2E7A]/10 backdrop-blur sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#0B2E7A]">The ecosystem flow</p>
          <span className="flex items-center gap-1.5 rounded-full bg-[#3E7A1C]/10 px-2.5 py-1 text-[11px] font-semibold text-[#3E7A1C]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3E7A1C]" /> Live
          </span>
        </div>
        <ol className="relative space-y-3">
          <span aria-hidden="true" className="absolute bottom-6 left-[22px] top-6 w-px bg-gradient-to-b from-[#1857D6]/30 to-[#7BC142]/60" />
          {rows.map(({ icon: Icon, label, meta, tone }) => (
            <li key={label} className="relative flex items-center gap-3 rounded-2xl border border-[#0B2E7A]/5 bg-[#FAFCFF] p-2.5">
              <span
                className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  tone === "blue" ? "bg-[#1857D6] text-white" : "bg-[#3E7A1C] text-white"
                }`}
              >
                <Icon size={19} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0B2E7A]">{label}</p>
                <p className="text-xs text-[#0B2E7A]/55">{meta}</p>
              </div>
              <CheckCircle2 size={17} className="ml-auto shrink-0 text-[#7BC142]" />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Platform workflow"
        eyebrowIcon={ShieldCheck}
        title={
          <>
            How our ecosystem <Highlight>powers local commerce</Highlight>.
          </>
        }
        desc="The end-to-end journey of merchants, customers and administrators on one platform — combining loyalty rewards, QR engagement, referrals and e-commerce."
        actions={
          <>
            <BecomePartnerButton />
            <SecondaryButton href="#merchant-journey" icon={ArrowRight}>
              Explore the journey
            </SecondaryButton>
          </>
        }
        aside={<FlowCard />}
      />

      {/* ---------------- MERCHANT JOURNEY ---------------- */}
      <Section id="merchant-journey">
        <SectionHeading
          eyebrow="Merchant journey"
          title={<>Onboarding & <Accent>instant rewards</Accent></>}
          desc="From registration to receiving your unique QR code and joining bonus."
        />

        <Stagger className="relative grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          <div aria-hidden="true" className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-gradient-to-r from-[#1857D6]/30 via-[#3E7A1C]/40 to-[#7BC142]/40 lg:block" />
          {merchantOnboardingSteps.map((item, i) => (
            <StaggerItem key={item.phase}>
              <div className="group relative flex h-full flex-col rounded-2xl border border-[#0B2E7A]/10 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0B2E7A]/5">
                <div className="flex items-center justify-between">
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#1857D6]/10 sm:h-12 sm:w-12 sm:rounded-2xl text-[#1857D6] transition-colors group-hover:bg-[#1857D6] group-hover:text-white">
                    <item.icon size={21} />
                  </span>
                  <span className="text-3xl font-semibold text-[#0B2E7A]/10 sm:text-4xl" style={DISPLAY}>
                    0{i + 1}
                  </span>
                </div>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#1857D6] sm:mt-5 sm:text-[11px]">{item.phase}</p>
                <h3 className="mt-1 text-base font-semibold leading-snug text-[#0B2E7A] sm:mt-1.5 sm:text-xl" style={DISPLAY}>
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#0B2E7A]/70 sm:mt-2 sm:text-sm">{item.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Joining bonus highlight */}
        <FadeUp className="mt-5">
          <div className="relative grid items-center gap-6 overflow-hidden rounded-3xl border border-[#3E7A1C]/15 bg-gradient-to-r from-[#F3F9EC] to-[#EAF2FD] p-6 sm:p-8 md:grid-cols-[1fr_auto]">
            <div aria-hidden="true" className="absolute -right-10 -top-16 h-48 w-48 rounded-full border-[24px] border-[#7BC142]/15" />
            <div className="relative">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#3E7A1C]">Joining privilege</span>
              <h3 className="mt-2 text-2xl font-semibold text-[#0B2E7A] sm:text-3xl" style={DISPLAY}>
                200 joining points = ₹100 value
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#0B2E7A]/70">
                Every eligible new Merchant Partner receives 200 points on approval, with conversion values managed directly from the Admin Dashboard.
              </p>
            </div>
            <div className="relative flex gap-3">
              <div className="rounded-2xl bg-white px-6 py-4 text-center shadow-lg shadow-[#0B2E7A]/5">
                <p className="text-3xl font-semibold text-[#3E7A1C]" style={DISPLAY}>200</p>
                <p className="text-[11px] font-medium text-[#0B2E7A]/55">Joining pts</p>
              </div>
              <div className="rounded-2xl bg-white px-6 py-4 text-center shadow-lg shadow-[#0B2E7A]/5">
                <p className="text-3xl font-semibold text-[#1857D6]" style={DISPLAY}>100</p>
                <p className="text-[11px] font-medium text-[#0B2E7A]/55">Per referral</p>
              </div>
            </div>
          </div>
        </FadeUp>
      </Section>

      {/* ---------------- CUSTOMER JOURNEY ---------------- */}
      <Section tone="green">
        <SectionHeading
          eyebrow="Customer journey"
          title={<>The QR scan & <Accent>scratch card</Accent> experience</>}
          desc="Turning walk-in store visits into interactive digital reward moments."
        />

        <Stagger className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {customerJourneySteps.map((item, i) => (
            <StaggerItem key={item.title} className="relative">
              <div className="group flex h-full flex-col rounded-2xl border border-[#0B2E7A]/10 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#3E7A1C]/30 sm:rounded-3xl sm:p-6 hover:shadow-xl hover:shadow-[#0B2E7A]/5">
                <div className="relative mb-4 w-fit sm:mb-5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3E7A1C] text-white sm:h-14 sm:w-14 shadow-lg shadow-[#3E7A1C]/25 transition-transform group-hover:-rotate-6">
                    <item.icon size={23} />
                  </span>
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#1857D6] text-[10px] font-bold text-white ring-4 ring-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-base font-semibold leading-snug text-[#0B2E7A] sm:text-xl" style={DISPLAY}>
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#0B2E7A]/70 sm:mt-2 sm:text-sm">{item.desc}</p>
              </div>
              {i < customerJourneySteps.length - 1 && (
                <span aria-hidden="true" className="absolute -right-4 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2E7A]/10 bg-white text-[#3E7A1C] shadow lg:flex">
                  <ArrowRight size={14} />
                </span>
              )}
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* ---------------- REFERRALS & E-COMMERCE ---------------- */}
      <Section>
        <SectionHeading
          eyebrow="Referrals & e-commerce"
          title={<>Grow your network, <Accent>spend your points</Accent></>}
        />
        <Stagger className="grid gap-5 lg:grid-cols-2">
          <StaggerItem>
            <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-[#3E7A1C] to-[#5E9E2E] p-7 text-white shadow-xl shadow-[#3E7A1C]/20 sm:p-9">
              <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />
              <span className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Share2 size={22} />
              </span>
              <span className="relative text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">Merchant referral network</span>
              <h3 className="relative mt-2 text-2xl font-semibold sm:text-3xl" style={DISPLAY}>
                Earn 100 points per successful referral
              </h3>
              <p className="relative mt-3 text-sm leading-relaxed text-white/85 sm:text-base">
                Every merchant gets a unique referral code and link. When a business you refer registers and is approved, you receive 100 Referral Points instantly — tracked in your points ledger.
              </p>
              <div className="relative mt-auto flex flex-wrap gap-2 pt-6">
                {["Unique code", "Trackable link", "Instant credit"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
                    <CheckCircle2 size={13} /> {t}
                  </span>
                ))}
              </div>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="flex h-full flex-col rounded-3xl border border-[#0B2E7A]/10 bg-white p-7 shadow-sm sm:p-9">
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1857D6]/10 text-[#1857D6]">
                <ShoppingBag size={22} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1857D6]">B2B & B2C e-commerce</span>
              <h3 className="mt-2 text-2xl font-semibold text-[#0B2E7A] sm:text-3xl" style={DISPLAY}>
                Points redemption & hybrid payments
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#0B2E7A]/70 sm:text-base">
                Use accumulated reward points to buy eligible products. If points fall short, combine them with your wallet balance and secure online payment.
              </p>
              <div className="mt-auto grid grid-cols-3 gap-2 pt-6">
                {[
                  { icon: Gift, label: "Points" },
                  { icon: Wallet, label: "Wallet" },
                  { icon: CreditCard, label: "Online pay" },
                ].map(({ icon: Icon, label }, i) => (
                  <div key={label} className="relative flex flex-col items-center gap-1.5 rounded-2xl bg-[#FAFCFF] p-3 ring-1 ring-[#0B2E7A]/5">
                    <Icon size={18} className="text-[#1857D6]" />
                    <span className="text-xs font-medium text-[#0B2E7A]/70">{label}</span>
                    {i < 2 && (
                      <span aria-hidden="true" className="absolute -right-2 top-1/2 z-10 -translate-y-1/2 text-sm font-bold text-[#3E7A1C]">+</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </StaggerItem>
        </Stagger>
      </Section>

      <CtaBand
        eyebrow="Integrated ecosystem"
        title="Ready for seamless merchant engagement and rewards?"
        desc="Register your shop today — approval in 24–48 hours, with 200 joining points on approval."
        buttonLabel="Register as Merchant Partner"
      />
    </PageShell>
  );
}
