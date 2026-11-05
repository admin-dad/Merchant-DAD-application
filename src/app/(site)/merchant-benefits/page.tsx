'use client'

import {
  Gift,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Megaphone,
  Crown,
  Percent,
  Zap,
  Tags,
  BadgeCheck,
  BarChart3,
  CalendarCheck,
  Store,
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
  IconCard,
  DISPLAY,
} from "@/components/site/ui";

const merchantBenefitsList = [
  {
    title: "E-commerce reward points",
    desc: "Earn and accumulate redeemable points to buy eligible products across the B2B and B2C e-commerce platform.",
    icon: Gift,
    tag: "Rewards",
  },
  {
    title: "Exclusive business discounts",
    desc: "Special promotional pricing and commercial discounts tailored to your merchant category and membership level.",
    icon: Percent,
    tag: "Savings",
  },
  {
    title: "Promotional & marketing support",
    desc: "Digital marketing offers, promotional tools and campaign support to drive walk-in customer footfall.",
    icon: Megaphone,
    tag: "Growth",
  },
  {
    title: "Priority campaign access",
    desc: "Early access to digital scratch card campaigns, lucky number contests and high-engagement promotional events.",
    icon: Zap,
    tag: "Campaigns",
  },
  {
    title: "Partner offers & business services",
    desc: "Exclusive deals, corporate partnerships and business services integrated directly within your merchant dashboard.",
    icon: Crown,
    tag: "Partnerships",
  },
  {
    title: "Referral incentives",
    desc: "Earn 100 referral points for every merchant partner you bring into the ecosystem, tracked via your dashboard.",
    icon: TrendingUp,
    tag: "Referrals",
  },
];

const assignmentCriteria = [
  {
    label: "Merchant category",
    desc: "Benefits tailored to your retail type — Kirana stores, electronics, apparel, pharmacies and more.",
    icon: Store,
  },
  {
    label: "Membership plan",
    desc: "Tiered advantages mapped directly to your active membership level within the ecosystem.",
    icon: BadgeCheck,
  },
  {
    label: "Business level & performance",
    desc: "Enhanced rewards and priority privileges based on customer engagement and successful referrals.",
    icon: BarChart3,
  },
  {
    label: "Campaign participation",
    desc: "Special rewards unlock dynamically when you take part in platform-wide promotional events.",
    icon: CalendarCheck,
  },
];

/* Hero side visual: a "benefits wallet" card */
function BenefitsWallet() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div aria-hidden="true" className="absolute inset-8 rounded-full bg-[#7BC142]/30 blur-3xl" />
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#3E7A1C] to-[#6BAF38] p-6 text-white shadow-2xl shadow-[#3E7A1C]/30">
        <div aria-hidden="true" className="absolute -right-12 -top-12 h-40 w-40 rounded-full border-[22px] border-white/10" />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">Your benefits wallet</p>
        <p className="relative mt-2 text-5xl font-semibold" style={DISPLAY}>
          300 <span className="text-2xl text-white/80">pts</span>
        </p>
        <p className="relative mt-1 text-sm text-white/80">200 joining + 100 referral</p>
      </div>
      <div className="relative -mt-6 mx-4 space-y-2.5 rounded-[24px] border border-[#0B2E7A]/10 bg-white p-4 shadow-xl shadow-[#0B2E7A]/10">
        {[
          { icon: Tags, label: "Category discount unlocked", tone: "text-[#1857D6] bg-[#1857D6]/10" },
          { icon: Zap, label: "Priority campaign access", tone: "text-[#3E7A1C] bg-[#3E7A1C]/10" },
          { icon: Crown, label: "Partner offers available", tone: "text-[#1857D6] bg-[#1857D6]/10" },
        ].map(({ icon: Icon, label, tone }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl bg-[#FAFCFF] p-2.5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
              <Icon size={17} />
            </span>
            <span className="text-sm font-medium text-[#0B2E7A]">{label}</span>
            <span className="ml-auto h-2 w-2 rounded-full bg-[#7BC142]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MerchantBenefitsPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Merchant benefits"
        eyebrowIcon={Sparkles}
        title={
          <>
            Exclusive advantages to <Highlight>accelerate your business</Highlight>.
          </>
        }
        desc="As a registered Merchant Partner you get a dedicated section in your dashboard with rewards, commercial discounts, promotional support and priority campaign privileges."
        actions={
          <>
            <BecomePartnerButton>Register & claim benefits</BecomePartnerButton>
            <SecondaryButton href="#perks" icon={ArrowRight}>
              See all perks
            </SecondaryButton>
          </>
        }
        aside={<BenefitsWallet />}
      />

      {/* ---------------- PERKS ---------------- */}
      <Section id="perks">
        <SectionHeading
          eyebrow="Merchant perks"
          title={<>What you unlock as a <Accent>partner</Accent></>}
          desc="Benefits are created, updated and assigned directly from the admin dashboard."
        />
        <Stagger className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {merchantBenefitsList.map((item, i) => (
            <StaggerItem key={item.title}>
              <IconCard icon={item.icon} title={item.title} body={item.desc} tag={item.tag} tone={i % 2 ? "blue" : "green"} />
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* ---------------- PERSONALISED ASSIGNMENT ---------------- */}
      <Section tone="green">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-12">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Targeted assignment"
              title={<>Personalised for <Accent>your business</Accent></>}
              desc="Each merchant sees only the benefits and offers that apply to their account profile — decided by four factors."
            />
            <FadeUp>
              <div className="flex items-center gap-4 rounded-2xl border border-[#0B2E7A]/10 bg-white p-4 shadow-sm">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#3E7A1C] text-white">
                  <BadgeCheck size={22} />
                </span>
                <p className="text-sm text-[#0B2E7A]/75">
                  <span className="font-semibold text-[#0B2E7A]">Always up to date.</span> New benefits appear in your dashboard the moment they’re assigned.
                </p>
              </div>
            </FadeUp>
          </div>

          <Stagger className="grid grid-cols-2 gap-3 sm:gap-4">
            {assignmentCriteria.map((crit, i) => (
              <StaggerItem key={crit.label}>
                <div className="group flex h-full flex-col rounded-2xl border border-[#0B2E7A]/10 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0B2E7A]/5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1857D6]/10 sm:h-11 sm:w-11 text-[#1857D6] transition-colors group-hover:bg-[#1857D6] group-hover:text-white">
                      <crit.icon size={20} />
                    </span>
                    <span className="text-2xl font-semibold text-[#0B2E7A]/10 sm:text-3xl" style={DISPLAY}>0{i + 1}</span>
                  </div>
                  <h3 className="mt-3 text-[15px] font-semibold leading-snug text-[#0B2E7A] sm:mt-4 sm:text-lg" style={DISPLAY}>
                    {crit.label}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#0B2E7A]/70 sm:mt-1.5 sm:text-sm">{crit.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <CtaBand
        eyebrow="Join the ecosystem"
        title="Ready to unlock exclusive merchant benefits?"
        desc="Register your shop and start with 200 joining points the moment you’re approved."
        buttonLabel="Register & claim benefits"
      />
    </PageShell>
  );
}
