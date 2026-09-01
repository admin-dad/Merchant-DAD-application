'use client'

import MerchantModal from '@/components/modals/Merchant'
import { useRef, useState, useEffect } from "react";
import {
    motion,
    AnimatePresence,
    useScroll,
    useTransform,
    useReducedMotion,
    useInView,
} from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
    Trophy,
    Sparkles,
    ArrowUpRight,
    Play,
    X,
    ExternalLink,
    Loader2,
    AlertCircle,
    Link as LinkIcon,
    Film,
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
const FLAG_COLORS = ["#1857D6", "#3E7A1C", "#7BC142", "#0B2E7A", "#1857D6"];

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface WinnerVideoRecord {
    id: string;
    title: string;
    url: string;
    platform: "youtube" | "instagram" | "other";
    created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Embed / thumbnail helpers
// ─────────────────────────────────────────────────────────────────────────
const getYouTubeId = (url: string): string | null => {
    try {
        const patterns = [
            /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
            /(?:youtu\.be\/)([^?&\s]+)/,
            /(?:youtube\.com\/shorts\/)([^?&\s]+)/,
            /(?:youtube\.com\/embed\/)([^?&\s]+)/,
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match?.[1]) return match[1];
        }
        return null;
    } catch {
        return null;
    }
};

const getYouTubeEmbedUrl = (url: string): string | null => {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
};

const getYouTubeThumbnail = (url: string): string | null => {
    const id = getYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};

const getInstagramEmbedUrl = (url: string): string | null => {
    try {
        const match = url.match(/instagram\.com\/(?:reel|p|tv)\/([^/?&\s]+)/);
        if (match?.[1]) {
            const type = url.includes("/reel/") ? "reel" : "p";
            return `https://www.instagram.com/${type}/${match[1]}/embed`;
        }
        return null;
    } catch {
        return null;
    }
};

// ─────────────────────────────────────────────────────────────────────────
// Custom Brand Icons
// ─────────────────────────────────────────────────────────────────────────
const Youtube = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2.5 7.1c0 0-.2-1.7 1-2.9C4.6 3.1 5.9 3 6.5 2.9 9.6 2.7 12 2.7 12 2.7s2.4 0 5.5.2c.6.1 1.9.2 3 1.3 1.2 1.2 1 2.9 1 2.9s.2 1.7.2 3.4v1c0 1.7-.2 3.4-.2 3.4s-.2 1.7-1 2.9c-1.1 1.1-2.5 1.1-3.2 1.2-2.7.3-5.3.3-5.3.3s-2.4 0-5.5-.2c-.6-.1-1.9-.2-3-1.3-1.2-1.2-1-2.9-1-2.9s-.2-1.7-.2-3.4v-1c0-1.7.2-3.4.2-3.4z" />
        <polygon points="9.7 15.5 15.8 11.5 9.7 7.5" />
    </svg>
);

const Instagram = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
);

// ─────────────────────────────────────────────────────────────────────────
// Shared motion primitives (kept identical to the About page)
// ─────────────────────────────────────────────────────────────────────────
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

function Bunting() {
    const reduce = useReducedMotion();
    const count = 18;
    const flags = Array.from({ length: count });

    return (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center overflow-visible">
            <svg viewBox="0 0 1200 50" className="h-12 w-full max-w-7xl px-6" preserveAspectRatio="none">
                <path d="M0,5 Q600,45 1200,5" fill="none" stroke="#0B2E7A" strokeOpacity={0.12} strokeWidth={1.5} />
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
                                        skewX: [i % 2 === 0 ? -4 : 4, i % 2 === 0 ? 4 : -4, i % 2 === 0 ? -4 : 4],
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
                                style={{ background: color, clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
                            />
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

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

const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const getPlatformIcon = (platform: string, size = 15) => {
    switch (platform) {
        case "youtube":
            return <Youtube size={size} className="text-red-500" />;
        case "instagram":
            return <Instagram size={size} className="text-pink-600" />;
        default:
            return <LinkIcon size={size} className="text-[#1857D6]" />;
    }
};

/* ==================================================================== */
/*  VIDEO CARD THUMBNAIL                                                 */
/*  Shows a real preview of the video instead of a flat gradient box:    */
/*  - YouTube  -> actual YouTube thumbnail image                         */
/*  - Other    -> muted <video> frame preview (first frame of the file)  */
/*  - Instagram-> gradient fallback (no public thumbnail without API)    */
/* ==================================================================== */
function VideoThumb({ video }: { video: WinnerVideoRecord }) {
    const [imgFailed, setImgFailed] = useState(false);
    const youtubeThumb = video.platform === "youtube" ? getYouTubeThumbnail(video.url) : null;

    if (video.platform === "youtube" && youtubeThumb && !imgFailed) {
        return (
            <div className="relative h-44 w-full overflow-hidden bg-[#0B2E7A]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={youtubeThumb}
                    alt={video.title}
                    onError={() => setImgFailed(true)}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/10" />
                <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
                        <Play size={22} className="fill-[#0B2E7A] text-[#0B2E7A] translate-x-0.5" />
                    </div>
                </motion.div>
            </div>
        );
    }

    if (video.platform === "other") {
        return (
            <div className="relative h-44 w-full overflow-hidden bg-black">
                <video
                    src={video.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/10" />
                <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
                        <Play size={22} className="fill-[#0B2E7A] text-[#0B2E7A] translate-x-0.5" />
                    </div>
                </motion.div>
            </div>
        );
    }

    // Instagram (or a YouTube thumbnail that failed to load): gradient fallback
    return (
        <div
            className="relative flex h-44 items-center justify-center overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0B2E7A 0%, #1857D6 100%)" }}
        >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#7BC142]/20 blur-2xl" />
            <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <motion.div whileHover={{ scale: 1.1 }} className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <Play size={22} className="fill-[#0B2E7A] text-[#0B2E7A] translate-x-0.5" />
            </motion.div>
        </div>
    );
}

/* ==================================================================== */
/*  PAGE                                                                 */
/* ==================================================================== */
export default function WinnerVideoPage() {
    const supabase = createClient();
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
    const heroTextY = useTransform(scrollYProgress, [0, 1], [0, -60]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0.4]);

    const [videos, setVideos] = useState<WinnerVideoRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewVideo, setPreviewVideo] = useState<WinnerVideoRecord | null>(null);
    const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false)
    useEffect(() => {
        const fetchVideos = async () => {
            setLoading(true);
            try {
                const { data, error: fetchError } = await supabase
                    .from("winner_videos")
                    .select("*")
                    .order("created_at", { ascending: false });

                if (fetchError) throw fetchError;
                setVideos(data || []);
            } catch {
                setError("Failed to load winner videos right now.");
            } finally {
                setLoading(false);
            }
        };
        fetchVideos();
    }, [supabase]);

    useEffect(() => {
        if (!previewVideo) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setPreviewVideo(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [previewVideo]);

    const youtubeCount = videos.filter((v) => v.platform === "youtube").length;
    const instagramCount = videos.filter((v) => v.platform === "instagram").length;

    return (
        <div className="relative min-h-screen bg-[#FAFCFF] text-[#0B2E7A] selection:bg-[#7BC142] selection:text-[#0B2E7A] overflow-x-hidden font-sans">
            {/* ---------------------------------------------------------- */}
            {/* HERO SECTION WITH PARALLAX & GLOWS                         */}
            {/* ---------------------------------------------------------- */}
            <section
                ref={containerRef}
                className="relative flex min-h-[70vh] flex-col justify-center overflow-hidden border-b border-[#0B2E7A]/10 px-6 pt-16 pb-12"
            >
                <Bunting />

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

                <motion.div style={{ y: heroTextY, opacity: heroOpacity }} className="relative z-0 mx-auto w-full max-w-6xl">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, ease: EASE }}
                        className="mb-5 inline-flex items-center gap-2.5 rounded-full bg-[#1857D6]/10 px-4 py-1.5 font-mono text-xs font-medium tracking-[0.2em] text-[#1857D6] border border-[#1857D6]/20 shadow-sm"
                    >
                        <Trophy size={15} strokeWidth={2} className="animate-pulse" />
                        <span>WINNER SPOTLIGHT</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
                        className="max-w-4xl text-4xl leading-tight sm:text-5xl md:text-6xl font-light tracking-tight"
                        style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                    >
                        Every winner has a{" "}
                        <span className="text-[#3E7A1C] font-normal italic underline decoration-[#7BC142]/40 underline-offset-8">
                            story
                        </span>{" "}
                        worth watching.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
                        className="mt-6 max-w-xl text-base leading-relaxed text-[#0B2E7A]/80 sm:text-lg font-normal"
                    >
                        From surprise scratch-card wins to big campaign payouts — watch real
                        merchants and customers celebrate their moment on the network.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.45, ease: EASE }}
                        className="mt-8 flex flex-wrap items-center gap-5"
                    >
                        <a
                            href="#videos"
                            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xl bg-[#3E7A1C] px-7 py-3.5 font-mono text-xs sm:text-sm font-semibold tracking-wide text-white shadow-[0_6px_20px_rgba(62,122,28,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(62,122,28,0.5)] active:translate-y-0"
                        >
                            <span className="absolute inset-0 h-full w-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            <span>Watch the winners</span>
                            <ArrowUpRight size={17} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                        </a>

                        <div className="flex items-center gap-2 text-xs font-mono text-[#0B2E7A]/70 bg-white/80 backdrop-blur-md px-4 py-3 rounded-xl border border-[#0B2E7A]/10 shadow-sm">
                            <Sparkles size={15} className="text-[#3E7A1C]" />
                            <span>New stories added every week</span>
                        </div>
                    </motion.div>
                </motion.div>
            </section>

            {/* ---------------------------------------------------------- */}
            {/* STATS STRIP                                                 */}
            {/* ---------------------------------------------------------- */}
            <section className="px-6 py-14">
                <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8">
                    {[
                        { to: videos.length, suffix: "", label: "Winner videos published" },
                        { to: youtubeCount, suffix: "", label: "Featured on YouTube" },
                        { to: instagramCount, suffix: "", label: "Featured on Instagram" },
                    ].map((s, i) => (
                        <FadeUp
                            key={s.label}
                            delay={i * 0.08}
                            className="p-6 rounded-2xl bg-white border border-[#0B2E7A]/10 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="text-3xl sm:text-4xl text-[#3E7A1C] font-semibold tracking-tight">
                                <CountUp to={s.to} suffix={s.suffix} />
                            </div>
                            <div className="mt-2 text-xs sm:text-sm leading-snug text-[#0B2E7A]/75 font-medium">{s.label}</div>
                        </FadeUp>
                    ))}
                </div>
            </section>

            <LedgerRule label="WATCH THE WINS" />

            {/* ---------------------------------------------------------- */}
            {/* VIDEO GRID                                                  */}
            {/* ---------------------------------------------------------- */}
            <section id="videos" className="px-6 py-16 scroll-mt-24">
                <div className="mx-auto max-w-6xl">
                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 size={28} className="animate-spin text-[#1857D6]" />
                        </div>
                    ) : error ? (
                        <div className="mx-auto max-w-md rounded-3xl border border-[#0B2E7A]/10 bg-white p-10 text-center shadow-sm">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                                <AlertCircle size={26} />
                            </div>
                            <p className="text-sm text-[#0B2E7A]/70">{error}</p>
                        </div>
                    ) : videos.length === 0 ? (
                        <div className="mx-auto max-w-md rounded-3xl border border-[#0B2E7A]/10 bg-white p-10 text-center shadow-sm">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1857D6]/10 text-[#1857D6]">
                                <Film size={26} />
                            </div>
                            <p className="text-sm text-[#0B2E7A]/70">No winner videos yet — check back soon.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {videos.map((v, i) => (
                                <FadeUp key={v.id} delay={(i % 6) * 0.08} className="h-full">
                                    <motion.button
                                        onClick={() => setPreviewVideo(v)}
                                        whileHover={{ y: -6, transition: { duration: 0.3, ease: EASE } }}
                                        className="group relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-[#0B2E7A]/10 bg-white text-left shadow-lg shadow-[#0B2E7A]/5 transition-shadow duration-300 hover:shadow-xl hover:shadow-[#0B2E7A]/10"
                                    >
                                        {/* Real video preview / thumbnail */}
                                        <div className="relative">
                                            <VideoThumb video={v} />
                                            <div className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 shadow-sm">
                                                {getPlatformIcon(v.platform)}
                                            </div>
                                        </div>

                                        {/* Meta */}
                                        <div className="flex flex-1 flex-col gap-2 p-5">
                                            <h3
                                                className="text-lg leading-snug text-[#0B2E7A] font-normal line-clamp-2"
                                                style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                                            >
                                                {v.title}
                                            </h3>
                                            <div className="mt-auto flex items-center justify-between pt-2 text-xs font-mono text-[#0B2E7A]/60">
                                                <span className="capitalize">{v.platform}</span>
                                                <span>{formatDate(v.created_at)}</span>
                                            </div>
                                        </div>
                                    </motion.button>
                                </FadeUp>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ---------------------------------------------------------- */}
            {/* CLOSING CTA                                                 */}
            {/* ---------------------------------------------------------- */}
            <section className="relative overflow-hidden px-6 py-20">
                <FadeUp className="mx-auto max-w-3xl text-center">
                    <span className="inline-block font-mono text-xs font-semibold tracking-[0.25em] text-[#1857D6] bg-[#1857D6]/10 px-4 py-1.5 rounded-full border border-[#1857D6]/20 mb-6">
                        YOUR STORY COULD BE NEXT
                    </span>
                    <h2
                        className="mt-4 text-3xl leading-tight sm:text-4xl md:text-5xl text-[#0B2E7A] font-light"
                        style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                    >
                        Scan, win, and get featured — one QR code at a time.
                    </h2>

                    <div className="mt-10 flex justify-center">
                        <button
                            onClick={() => setIsMerchantModalOpen(true)}
                            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#7BC142] to-[#3E7A1C] px-6 py-3 text-sm text-white shadow-[0_4px_16px_rgba(62,122,28,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(62,122,28,0.6)] active:translate-y-0 cursor-pointer"
                        >
                            <span className="absolute inset-0 h-full w-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            <Sparkles size={16} />
                            <span>Become a partner</span>
                        </button>
                    </div>
                </FadeUp>
            </section>

            {/* ---------------------------------------------------------- */}
            {/* VIDEO PREVIEW POPUP                                         */}
            {/* ---------------------------------------------------------- */}
            <AnimatePresence>
                {previewVideo && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPreviewVideo(null)}
                            className="absolute inset-0 bg-[#0B2E7A]/70 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="relative w-full max-w-2xl rounded-3xl border border-[#0B2E7A]/10 bg-white p-4 shadow-2xl sm:p-5"
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex min-w-0 items-center gap-2">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B2E7A]/5">
                                        {getPlatformIcon(previewVideo.platform)}
                                    </div>
                                    <h3
                                        className="truncate text-base text-[#0B2E7A] font-normal"
                                        style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                                    >
                                        {previewVideo.title}
                                    </h3>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <a
                                        href={previewVideo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Open original link"
                                        className="rounded-full p-1.5 text-[#0B2E7A]/40 hover:bg-[#0B2E7A]/5 hover:text-[#1857D6]"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                    <button
                                        onClick={() => setPreviewVideo(null)}
                                        className="rounded-full p-1.5 text-[#0B2E7A]/40 hover:bg-[#0B2E7A]/5 hover:text-[#0B2E7A]"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-2xl bg-black">
                                {previewVideo.platform === "youtube" && getYouTubeEmbedUrl(previewVideo.url) ? (
                                    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                                        <iframe
                                            src={getYouTubeEmbedUrl(previewVideo.url)!}
                                            title={previewVideo.title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="absolute inset-0 h-full w-full"
                                        />
                                    </div>
                                ) : previewVideo.platform === "instagram" && getInstagramEmbedUrl(previewVideo.url) ? (
                                    <div className="flex justify-center bg-white" style={{ maxHeight: "75vh", overflowY: "auto" }}>
                                        <iframe
                                            src={getInstagramEmbedUrl(previewVideo.url)!}
                                            title={previewVideo.title}
                                            className="w-full border-0"
                                            style={{ minHeight: "520px", maxWidth: 400 }}
                                            scrolling="no"
                                        />
                                    </div>
                                ) : (
                                    <video src={previewVideo.url} controls autoPlay className="max-h-[70vh] w-full" />
                                )}
                            </div>

                            {previewVideo.platform === "instagram" && !getInstagramEmbedUrl(previewVideo.url) && (
                                <p className="mt-2 text-center text-xs text-[#0B2E7A]/40">
                                    Couldn't load an inline preview for this link —{" "}
                                    <a href={previewVideo.url} target="_blank" rel="noopener noreferrer" className="text-[#1857D6] hover:underline">
                                        open it directly
                                    </a>
                                    .
                                </p>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

                  <MerchantModal isOpen={isMerchantModalOpen} onClose={() => setIsMerchantModalOpen(false)} />
            
        </div>
    );
}