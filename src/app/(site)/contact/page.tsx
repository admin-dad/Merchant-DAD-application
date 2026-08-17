'use client'

import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  Sparkles, 
  ArrowUpRight, 
  CheckCircle2 
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

export default function ContactPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  
  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0.4]);

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
            <span>GET IN TOUCH WITH US</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="max-w-4xl text-4xl leading-tight sm:text-5xl md:text-6xl font-light tracking-tight"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            We're here to support your{" "}
            <span className="text-[#3E7A1C] font-normal italic underline decoration-[#7BC142]/40 underline-offset-8">
              merchant journey
            </span>
            .
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            className="mt-6 max-w-2xl text-base leading-relaxed text-[#0B2E7A]/80 sm:text-lg font-normal"
          >
            Have questions about merchant registration, onboarding, QR campaign setup, or e-commerce integrations? Reach out to our support and administrative team.
          </motion.p>
        </motion.div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* SECTION: CONTACT CARDS & FORM                              */}
      {/* ---------------------------------------------------------- */}
      <section className="px-6 py-20 relative">
        <div className="mx-auto max-w-6xl grid gap-12 lg:grid-cols-3">
          
          {/* Contact Details Column */}
          <div className="space-y-6 lg:col-span-1">
            <FadeUp>
              <div className="rounded-3xl p-8 bg-white border border-[#0B2E7A]/10 shadow-lg shadow-[#0B2E7A]/5 space-y-6">
                <div>
                  <span className="font-mono text-xs font-bold tracking-widest text-[#1857D6] uppercase mb-2 block">
                    Support Channels
                  </span>
                  <h3 
                    className="text-2xl text-[#0B2E7A] font-normal"
                    style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                  >
                    Direct Inquiries
                  </h3>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-[#FAFCFF] border border-[#0B2E7A]/10 text-[#1857D6] shrink-0">
                      <Mail size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-[#0B2E7A]/60 uppercase">Email Support</div>
                      <div className="text-sm font-medium text-[#0B2E7A] mt-0.5">support@domain.com</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-[#FAFCFF] border border-[#0B2E7A]/10 text-[#3E7A1C] shrink-0">
                      <Phone size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-[#0B2E7A]/60 uppercase">Helpline / WhatsApp</div>
                      <div className="text-sm font-medium text-[#0B2E7A] mt-0.5">+91 (Support Line Available)</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-[#FAFCFF] border border-[#0B2E7A]/10 text-[#0B2E7A] shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-[#0B2E7A]/60 uppercase">Location</div>
                      <div className="text-sm font-medium text-[#0B2E7A] mt-0.5">India</div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>

          {/* Contact Form Column */}
          <div className="lg:col-span-2">
            <FadeUp delay={0.15}>
              <div className="rounded-3xl p-8 sm:p-10 bg-white border border-[#0B2E7A]/10 shadow-xl shadow-[#0B2E7A]/5 relative overflow-hidden">
                {submitted ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="inline-flex p-4 rounded-full bg-[#3E7A1C]/10 text-[#3E7A1C]">
                      <CheckCircle2 size={40} />
                    </div>
                    <h3 
                      className="text-3xl text-[#0B2E7A] font-normal"
                      style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                    >
                      Message Received Successfully
                    </h3>
                    <p className="text-sm text-[#0B2E7A]/75 max-w-md mx-auto">
                      Thank you for getting in touch. Our support team will review your inquiry and connect with you shortly.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B2E7A] px-6 py-3 font-mono text-xs font-semibold text-white transition-all hover:bg-[#1857D6]"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <span className="font-mono text-xs font-bold tracking-widest text-[#3E7A1C] uppercase mb-2 block">
                        Get In Touch
                      </span>
                      <h3 
                        className="text-2xl sm:text-3xl text-[#0B2E7A] font-normal"
                        style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                      >
                        Send Us a Message
                      </h3>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block font-mono text-xs font-semibold text-[#0B2E7A]/75 uppercase">
                          Full Name *
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="John Doe"
                          className="w-full rounded-xl border border-[#0B2E7A]/15 bg-[#FAFCFF] px-4 py-3 text-sm text-[#0B2E7A] placeholder:text-[#0B2E7A]/30 focus:border-[#1857D6] focus:outline-none focus:ring-2 focus:ring-[#1857D6]/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block font-mono text-xs font-semibold text-[#0B2E7A]/75 uppercase">
                          Mobile Number *
                        </label>
                        <input
                          required
                          type="tel"
                          placeholder="+91 98765 43210"
                          className="w-full rounded-xl border border-[#0B2E7A]/15 bg-[#FAFCFF] px-4 py-3 text-sm text-[#0B2E7A] placeholder:text-[#0B2E7A]/30 focus:border-[#1857D6] focus:outline-none focus:ring-2 focus:ring-[#1857D6]/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-mono text-xs font-semibold text-[#0B2E7A]/75 uppercase">
                        Email Address *
                      </label>
                      <input
                        required
                        type="email"
                        placeholder="name@business.com"
                        className="w-full rounded-xl border border-[#0B2E7A]/15 bg-[#FAFCFF] px-4 py-3 text-sm text-[#0B2E7A] placeholder:text-[#0B2E7A]/30 focus:border-[#1857D6] focus:outline-none focus:ring-2 focus:ring-[#1857D6]/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-mono text-xs font-semibold text-[#0B2E7A]/75 uppercase">
                        Message / Inquiry *
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Tell us about your business category or inquiry details..."
                        className="w-full rounded-xl border border-[#0B2E7A]/15 bg-[#FAFCFF] px-4 py-3 text-sm text-[#0B2E7A] placeholder:text-[#0B2E7A]/30 focus:border-[#1857D6] focus:outline-none focus:ring-2 focus:ring-[#1857D6]/20 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-[#3E7A1C] px-8 py-4 font-mono text-sm font-semibold tracking-wide text-white shadow-[0_6px_20px_rgba(62,122,28,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(62,122,28,0.5)] active:translate-y-0"
                    >
                      <span className="absolute inset-0 h-full w-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <span>Submit Inquiry</span>
                      <Send size={16} className="transition-transform group-hover:translate-x-1" />
                    </button>
                  </form>
                )}
              </div>
            </FadeUp>
          </div>

        </div>
      </section>

      <LedgerRule label="ECOSYSTEM PLATFORM" />

      {/* ---------------------------------------------------------- */}
      {/* CLOSING CALL TO ACTION                                     */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden px-6 py-20">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <span className="inline-block font-mono text-xs font-semibold tracking-[0.25em] text-[#1857D6] bg-[#1857D6]/10 px-4 py-1.5 rounded-full border border-[#1857D6]/20 mb-6">
            PARTNER NETWORK
          </span>
          <h2
            className="mt-4 text-3xl leading-tight sm:text-4xl md:text-5xl text-[#0B2E7A] font-light"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Ready to join the integrated merchant loyalty & e-commerce platform?
          </h2>
          
          <div className="mt-10 flex justify-center">
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