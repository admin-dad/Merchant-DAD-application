'use client'

import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";
import { 
  HelpCircle, 
  Sparkles, 
  ArrowUpRight, 
  Plus, 
  Minus, 
  Store, 
  ShieldCheck, 
  CreditCard 
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

const faqItems = [
  {
    question: "What is the primary purpose of our merchant ecosystem?",
    answer: "Our platform connects verified local merchants and business partners into a unified digital ecosystem, offering streamlined reward programs, promotional campaign tools, and e-commerce growth benefits.",
    category: "PLATFORM",
    icon: Store,
  },
  {
    question: "How can businesses register as official merchant partners?",
    answer: "Businesses can register by submitting their accurate store details, contact information, and retail category through our registration portal. Once reviewed, accounts are approved for ecosystem access.",
    category: "ONBOARDING",
    icon: ShieldCheck,
  },
  {
    question: "How do loyalty rewards and promotional campaigns function?",
    answer: "Active merchants can deploy campaign QR codes, scratch cards, and discount structures. Users and customers can interact with these campaigns to earn reward points and redeem commercial offers.",
    category: "REWARDS",
    icon: CreditCard,
  },
  {
    question: "Are merchant subscription plans and service fees refundable?",
    answer: "Subscription fees and membership packages are generally non-refundable once activated, unless there are verified billing discrepancies or explicit administrative approvals.",
    category: "BILLING",
    icon: HelpCircle,
  },
  {
    question: "How is business and user data protected?",
    answer: "We implement robust technical and organizational security measures to protect all sensitive records, ensuring data privacy and secure transactions across all platform interactions.",
    category: "SECURITY",
    icon: ShieldCheck,
  },
  {
    question: "Who should I contact if I encounter issues with my account?",
    answer: "You can reach out directly to our administrative and support team through our contact page with your registered merchant details for prompt assistance.",
    category: "SUPPORT",
    icon: Store,
  },
];

export default function FAQPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  
  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0.4]);

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
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
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="max-w-4xl text-4xl leading-tight sm:text-5xl md:text-6xl font-light tracking-tight"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Got{" "}
            <span className="text-[#3E7A1C] font-normal italic underline decoration-[#7BC142]/40 underline-offset-8">
              Questions
            </span>
            ? We've Got Answers.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            className="mt-6 max-w-2xl text-base leading-relaxed text-[#0B2E7A]/80 sm:text-lg font-normal"
          >
            Explore clear, detailed answers regarding our merchant partnership ecosystem, promotional campaigns, reward mechanics, and account security.
          </motion.p>
        </motion.div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* SECTION: FAQ ACCORDION LIST                                */}
      {/* ---------------------------------------------------------- */}
      <section className="px-6 py-20 relative">
        <div className="mx-auto max-w-4xl">
          <FadeUp className="mb-12 text-center">
            <span className="font-mono text-xs font-semibold tracking-[0.25em] text-[#3E7A1C] bg-[#3E7A1C]/10 px-3.5 py-1.5 rounded-full border border-[#3E7A1C]/20">
              KNOWLEDGE BASE
            </span>
            <h2 
              className="mt-4 text-3xl sm:text-4xl font-light text-[#0B2E7A]"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm text-[#0B2E7A]/70 max-w-xl mx-auto">
              Everything you need to know about operating within our digital platform.
            </p>
          </FadeUp>

          <div className="space-y-4">
            {faqItems.map((item, i) => {
              const isOpen = openIndex === i;
              const Icon = item.icon;
              return (
                <FadeUp key={item.question} delay={i * 0.05}>
                  <div className="overflow-hidden rounded-3xl bg-white border border-[#0B2E7A]/10 shadow-lg shadow-[#0B2E7A]/5 transition-all duration-300">
                    <button
                      onClick={() => toggleFAQ(i)}
                      className="flex w-full items-center justify-between p-6 sm:p-8 text-left transition-colors hover:bg-[#FAFCFF]/50"
                    >
                      <div className="flex items-center gap-4 pr-4">
                        <div className="hidden sm:flex p-3 rounded-2xl bg-[#FAFCFF] border border-[#0B2E7A]/10 text-[#0B2E7A]">
                          <Icon size={20} />
                        </div>
                        <div>
                          <span className="font-mono text-[10px] font-bold tracking-widest text-[#1857D6] bg-[#1857D6]/10 px-2.5 py-0.5 rounded-full uppercase mb-2 inline-block">
                            {item.category}
                          </span>
                          <h3 
                            className="text-xl sm:text-2xl text-[#0B2E7A] font-normal"
                            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                          >
                            {item.question}
                          </h3>
                        </div>
                      </div>
                      <div className="flex-shrink-0 p-2.5 rounded-full bg-[#1857D6]/10 text-[#1857D6] transition-transform duration-300">
                        {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: EASE }}
                        >
                          <div className="px-6 pb-8 sm:px-8 pt-0 text-sm sm:text-base leading-relaxed text-[#0B2E7A]/75 font-normal border-t border-[#0B2E7A]/5 mt-2 pt-4">
                            {item.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      <LedgerRule label="SECURE ECOSYSTEM PLATFORM" />

      {/* ---------------------------------------------------------- */}
      {/* CLOSING CALL TO ACTION                                     */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden px-6 py-20">
        <FadeUp className="mx-auto max-w-3xl text-center">
          <span className="inline-block font-mono text-xs font-semibold tracking-[0.25em] text-[#1857D6] bg-[#1857D6]/10 px-4 py-1.5 rounded-full border border-[#1857D6]/20 mb-6">
            STILL HAVE QUESTIONS?
          </span>
          <h2
            className="mt-4 text-3xl leading-tight sm:text-4xl md:text-5xl text-[#0B2E7A] font-light"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Can't find the answer you're looking for? Reach out to our support team.
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