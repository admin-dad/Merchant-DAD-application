'use client'

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageCircle,
  CheckCircle2,
  Clock,
  Store,
  QrCode,
  ShoppingBag,
  HelpCircle,
} from "lucide-react";
import {
  PageShell,
  PageHero,
  Highlight,
  Section,
  Stagger,
  StaggerItem,
  FadeUp,
  CtaBand,
  BecomePartnerButton,
  SecondaryButton,
  DISPLAY,
  EASE,
} from "@/components/site/ui";

const CHANNELS = [
  { icon: Mail, label: "Email support", value: "support@domain.com", tone: "bg-[#1857D6]/10 text-[#1857D6]" },
  { icon: Phone, label: "Helpline / WhatsApp", value: "+91 (Support line available)", tone: "bg-[#3E7A1C]/10 text-[#3E7A1C]" },
  { icon: MapPin, label: "Location", value: "India", tone: "bg-[#0B2E7A]/10 text-[#0B2E7A]" },
];

const TOPICS = [
  { icon: Store, label: "Merchant registration" },
  { icon: QrCode, label: "QR campaign setup" },
  { icon: ShoppingBag, label: "E-commerce" },
  { icon: HelpCircle, label: "Something else" },
];

const inputCls =
  "w-full rounded-xl border border-[#0B2E7A]/15 bg-[#FAFCFF] px-4 py-3 text-sm text-[#0B2E7A] outline-none transition placeholder:text-[#0B2E7A]/35 focus:border-[#3E7A1C] focus:bg-white focus:ring-4 focus:ring-[#3E7A1C]/10";
const labelCls = "mb-1.5 block text-xs font-semibold text-[#0B2E7A]/70";

/* Hero side visual: support availability card */
function SupportCard() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div aria-hidden="true" className="absolute inset-8 rounded-full bg-[#7BC142]/25 blur-3xl" />
      <div className="relative rounded-[28px] border border-[#0B2E7A]/10 bg-white/90 p-5 shadow-2xl shadow-[#0B2E7A]/10 backdrop-blur sm:p-6">
        <div className="flex items-center gap-3">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3E7A1C] text-white">
            <MessageCircle size={22} />
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-[#7BC142] ring-2 ring-white" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#0B2E7A]">Merchant support team</p>
            <p className="flex items-center gap-1.5 text-xs text-[#0B2E7A]/55">
              <Clock size={12} /> Usually replies within a working day
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-2.5">
          <div className="w-fit max-w-[85%] rounded-2xl rounded-tl-md bg-[#FAFCFF] px-4 py-2.5 text-sm text-[#0B2E7A]/80 ring-1 ring-[#0B2E7A]/5">
            Hi! How can we help your shop today?
          </div>
          <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-[#3E7A1C] px-4 py-2.5 text-sm text-white">
            How do I set up my QR campaign?
          </div>
          <div className="w-fit max-w-[85%] rounded-2xl rounded-tl-md bg-[#FAFCFF] px-4 py-2.5 text-sm text-[#0B2E7A]/80 ring-1 ring-[#0B2E7A]/5">
            Easy — we’ll walk you through it step by step.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [topic, setTopic] = useState(TOPICS[0].label);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Contact us"
        eyebrowIcon={MessageCircle}
        title={
          <>
            We’re here to support your <Highlight>merchant journey</Highlight>.
          </>
        }
        desc="Questions about registration, onboarding, QR campaign setup or e-commerce? Reach out to our support and admin team."
        actions={
          <>
            <BecomePartnerButton />
            <SecondaryButton href="#message" icon={Send}>
              Send a message
            </SecondaryButton>
          </>
        }
        aside={<SupportCard />}
      />

      <Section>
        {/* Channel cards */}
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {CHANNELS.map(({ icon: Icon, label, value, tone }, i) => (
            <StaggerItem key={label} className={i === 2 ? "col-span-2 sm:col-span-1" : ""}>
              <div className="flex h-full flex-col items-start gap-3 rounded-2xl border border-[#0B2E7A]/10 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:rounded-3xl sm:p-5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0B2E7A]/5">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${tone}`}>
                  <Icon size={21} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#0B2E7A]/55">{label}</p>
                  <p className="mt-0.5 break-words text-[13px] font-semibold text-[#0B2E7A] sm:text-sm">{value}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Form */}
        <FadeUp className="mt-5">
          <div id="message" className="grid scroll-mt-24 overflow-hidden rounded-[32px] border border-[#0B2E7A]/10 bg-white shadow-xl shadow-[#0B2E7A]/5 lg:grid-cols-[0.8fr_1.2fr]">
            {/* Side panel */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#3E7A1C] to-[#6BAF38] p-7 text-white sm:p-10">
              <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />
              <div aria-hidden="true" className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
              <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">Get in touch</p>
              <h2 className="relative mt-3 text-3xl font-semibold leading-tight sm:text-4xl" style={DISPLAY}>
                Send us a message
              </h2>
              <p className="relative mt-3 text-sm leading-relaxed text-white/85">
                Tell us a little about your business and what you need. Our team reviews every inquiry personally.
              </p>
              <ul className="relative mt-7 space-y-3">
                {["Registration & KYC help", "QR & scratch card campaigns", "Points, wallet & billing", "Vendor & e-commerce questions"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 size={16} className="shrink-0 text-[#D7F5B8]" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Form body */}
            <div className="p-6 sm:p-10">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="flex h-full flex-col items-center justify-center py-10 text-center"
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3E7A1C]/10 text-[#3E7A1C]">
                      <CheckCircle2 size={34} />
                    </span>
                    <h3 className="mt-5 text-2xl font-semibold text-[#0B2E7A] sm:text-3xl" style={DISPLAY}>
                      Message received
                    </h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-[#0B2E7A]/70">
                      Thank you for getting in touch. Our support team will review your inquiry and connect with you shortly.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#3E7A1C] px-5 py-2.5 text-sm font-semibold text-[#3E7A1C] transition hover:bg-[#3E7A1C] hover:text-white"
                    >
                      Send another message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    <div>
                      <span className={labelCls}>What can we help with?</span>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {TOPICS.map(({ icon: Icon, label }) => {
                          const active = topic === label;
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => setTopic(label)}
                              aria-pressed={active}
                              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-medium transition ${
                                active
                                  ? "border-[#3E7A1C] bg-[#3E7A1C]/10 text-[#3E7A1C]"
                                  : "border-[#0B2E7A]/10 bg-[#FAFCFF] text-[#0B2E7A]/70 hover:border-[#0B2E7A]/25"
                              }`}
                            >
                              <Icon size={18} />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block">
                        <span className={labelCls}>Full name *</span>
                        <input required type="text" placeholder="Your name" className={inputCls} />
                      </label>
                      <label className="block">
                        <span className={labelCls}>Mobile number *</span>
                        <input required type="tel" inputMode="tel" placeholder="10-digit mobile number" className={inputCls} />
                      </label>
                    </div>

                    <label className="block">
                      <span className={labelCls}>Email address *</span>
                      <input required type="email" placeholder="name@business.com" className={inputCls} />
                    </label>

                    <label className="block">
                      <span className={labelCls}>Message *</span>
                      <textarea
                        required
                        rows={4}
                        placeholder="Tell us about your business category or inquiry details…"
                        className={`${inputCls} resize-none`}
                      />
                    </label>

                    <button
                      type="submit"
                      className="group relative inline-flex w-full cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-[#3E7A1C] px-8 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(62,122,28,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(62,122,28,0.45)]"
                    >
                      <span className="absolute inset-0 -translate-x-full skew-x-12 bg-white/20 transition-transform duration-700 group-hover:translate-x-full" />
                      <span className="relative">Submit inquiry</span>
                      <Send size={16} className="relative transition-transform group-hover:translate-x-1" />
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </FadeUp>
      </Section>

      <CtaBand
        eyebrow="Partner network"
        title="Ready to join the merchant loyalty & e-commerce platform?"
        desc="Register in under two minutes — approval in 24–48 hours."
        buttonLabel="Register as Merchant Partner"
      />
    </PageShell>
  );
}
