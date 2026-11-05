'use client'

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
    Trophy,
    Sparkles,
    ArrowRight,
    Play,
    X,
    ExternalLink,
    Loader2,
    AlertCircle,
    Link as LinkIcon,
    Film,
    CalendarDays,
} from "lucide-react";
import {
    PageShell,
    PageHero,
    Highlight,
    Section,
    SectionHeading,
    Accent,
    FadeUp,
    BecomePartnerButton,
    SecondaryButton,
    CtaBand,
    DISPLAY,
    EASE,
} from "@/components/site/ui";

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
            <div className="relative aspect-video w-full overflow-hidden bg-[#0B2E7A]">
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg sm:h-14 sm:w-14">
                        <Play size={22} className="fill-[#3E7A1C] text-[#3E7A1C] translate-x-0.5" />
                    </div>
                </motion.div>
            </div>
        );
    }

    if (video.platform === "other") {
        return (
            <div className="relative aspect-video w-full overflow-hidden bg-black">
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg sm:h-14 sm:w-14">
                        <Play size={22} className="fill-[#3E7A1C] text-[#3E7A1C] translate-x-0.5" />
                    </div>
                </motion.div>
            </div>
        );
    }

    // Instagram (or a YouTube thumbnail that failed to load): gradient fallback
    return (
        <div
            className="relative flex aspect-video w-full items-center justify-center overflow-hidden"
            style={{ background: "linear-gradient(135deg, #3E7A1C 0%, #7BC142 60%, #1857D6 100%)" }}
        >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#7BC142]/20 blur-2xl" />
            <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <motion.div whileHover={{ scale: 1.1 }} className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg sm:h-14 sm:w-14">
                <Play size={22} className="fill-[#3E7A1C] text-[#3E7A1C] translate-x-0.5" />
            </motion.div>
        </div>
    );
}

type Filter = "all" | "youtube" | "instagram" | "other";

/* Hero side visual: trophy stats card */
function TrophyCard({ total, youtube, instagram, loading }: { total: number; youtube: number; instagram: number; loading: boolean }) {
    const fmt = (n: number) => (loading ? "—" : String(n));
    return (
        <div className="relative mx-auto w-full max-w-md">
            <div aria-hidden="true" className="absolute inset-8 rounded-full bg-[#7BC142]/30 blur-3xl" />
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#3E7A1C] to-[#6BAF38] p-6 text-white shadow-2xl shadow-[#3E7A1C]/30 sm:p-7">
                <div aria-hidden="true" className="absolute -right-12 -top-12 h-44 w-44 rounded-full border-[24px] border-white/10" />
                <motion.span
                    animate={{ rotate: [0, -8, 8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"
                >
                    <Trophy size={26} />
                </motion.span>
                <p className="relative mt-5 text-6xl font-semibold leading-none" style={DISPLAY}>
                    {fmt(total)}
                </p>
                <p className="relative mt-2 text-sm text-white/85">Winner videos published</p>
            </div>
            <div className="relative mx-4 -mt-5 grid grid-cols-2 gap-3 rounded-[24px] border border-[#0B2E7A]/10 bg-white p-3 shadow-xl shadow-[#0B2E7A]/10">
                <div className="flex items-center gap-3 rounded-2xl bg-[#FAFCFF] p-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50"><Youtube size={18} className="text-red-500" /></span>
                    <div>
                        <p className="text-xl font-semibold text-[#0B2E7A]" style={DISPLAY}>{fmt(youtube)}</p>
                        <p className="text-[11px] text-[#0B2E7A]/55">YouTube</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-[#FAFCFF] p-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50"><Instagram size={18} className="text-pink-600" /></span>
                    <div>
                        <p className="text-xl font-semibold text-[#0B2E7A]" style={DISPLAY}>{fmt(instagram)}</p>
                        <p className="text-[11px] text-[#0B2E7A]/55">Instagram</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ==================================================================== */
/*  PAGE                                                                 */
/* ==================================================================== */
export default function WinnerVideoPage() {
    const supabase = useMemo(() => createClient(), []);

    const [videos, setVideos] = useState<WinnerVideoRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewVideo, setPreviewVideo] = useState<WinnerVideoRecord | null>(null);
    const [filter, setFilter] = useState<Filter>("all");

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
    const otherCount = videos.filter((v) => v.platform === "other").length;

    const tabs: { key: Filter; label: string; count: number }[] = [
        { key: "all", label: "All", count: videos.length },
        { key: "youtube", label: "YouTube", count: youtubeCount },
        { key: "instagram", label: "Instagram", count: instagramCount },
        ...(otherCount > 0 ? [{ key: "other" as Filter, label: "Other", count: otherCount }] : []),
    ];

    const visible = filter === "all" ? videos : videos.filter((v) => v.platform === filter);

    return (
        <PageShell>
            <PageHero
                eyebrow="Winner spotlight"
                eyebrowIcon={Trophy}
                title={
                    <>
                        Every winner has a <Highlight>story</Highlight> worth watching.
                    </>
                }
                desc="From surprise scratch-card wins to big campaign payouts — watch real merchants and customers celebrate their moment on the network."
                actions={
                    <>
                        <BecomePartnerButton />
                        <SecondaryButton href="#videos" icon={ArrowRight}>
                            Watch the winners
                        </SecondaryButton>
                        <span className="inline-flex items-center gap-2 text-sm text-[#0B2E7A]/65">
                            <Sparkles size={15} className="text-[#3E7A1C]" /> New stories added every week
                        </span>
                    </>
                }
                aside={<TrophyCard total={videos.length} youtube={youtubeCount} instagram={instagramCount} loading={loading} />}
            />

            {/* ---------------- VIDEO GRID ---------------- */}
            <Section id="videos">
                <SectionHeading
                    eyebrow="Watch the wins"
                    title={<>Real people, <Accent>real rewards</Accent></>}
                    desc="Tap any video to play it right here."
                />

                {!loading && !error && videos.length > 0 && (
                    <FadeUp className="mb-6 flex justify-center">
                        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-[#0B2E7A]/10 bg-white p-1 shadow-sm">
                            {tabs.map((t) => {
                                const active = filter === t.key;
                                return (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() => setFilter(t.key)}
                                        aria-pressed={active}
                                        className={`relative flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                                            active ? "text-white" : "text-[#0B2E7A]/70 hover:text-[#0B2E7A]"
                                        }`}
                                    >
                                        {active && (
                                            <motion.span
                                                layoutId="wv-tab"
                                                className="absolute inset-0 rounded-xl bg-[#3E7A1C]"
                                                transition={{ duration: 0.3, ease: EASE }}
                                            />
                                        )}
                                        <span className="relative">{t.label}</span>
                                        <span className={`relative rounded-full px-1.5 text-[11px] ${active ? "bg-white/20" : "bg-[#0B2E7A]/5"}`}>
                                            {t.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </FadeUp>
                )}

                {loading ? (
                    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="overflow-hidden rounded-3xl border border-[#0B2E7A]/10 bg-white">
                                <div className="aspect-video animate-pulse bg-[#0B2E7A]/5" />
                                <div className="space-y-2 p-5">
                                    <div className="h-4 w-3/4 animate-pulse rounded bg-[#0B2E7A]/5" />
                                    <div className="h-3 w-1/3 animate-pulse rounded bg-[#0B2E7A]/5" />
                                </div>
                            </div>
                        ))}
                        <span className="sr-only"><Loader2 /> Loading videos</span>
                    </div>
                ) : error ? (
                    <div className="mx-auto max-w-md rounded-3xl border border-[#0B2E7A]/10 bg-white p-10 text-center shadow-sm">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                            <AlertCircle size={26} />
                        </div>
                        <p className="text-sm text-[#0B2E7A]/70">{error}</p>
                    </div>
                ) : videos.length === 0 ? (
                    <div className="mx-auto max-w-md rounded-3xl border border-dashed border-[#0B2E7A]/20 bg-white p-10 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3E7A1C]/10 text-[#3E7A1C]">
                            <Film size={26} />
                        </div>
                        <p className="text-base font-semibold text-[#0B2E7A]">No winner videos yet</p>
                        <p className="mt-1 text-sm text-[#0B2E7A]/60">Check back soon — new stories are added every week.</p>
                    </div>
                ) : (
                    <motion.div layout className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                        <AnimatePresence mode="popLayout">
                            {visible.map((v) => (
                                <motion.button
                                    key={v.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={{ duration: 0.35, ease: EASE }}
                                    onClick={() => setPreviewVideo(v)}
                                    className="group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#0B2E7A]/10 bg-white text-left shadow-sm sm:rounded-3xl transition-shadow duration-300 hover:shadow-xl hover:shadow-[#0B2E7A]/10"
                                >
                                    <div className="relative">
                                        <VideoThumb video={v} />
                                        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] sm:left-3 sm:top-3 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[11px] font-semibold capitalize text-[#0B2E7A] shadow-sm">
                                            {getPlatformIcon(v.platform, 13)}
                                            {v.platform}
                                        </div>
                                        <div className="absolute right-2 top-2 hidden h-8 w-8 items-center sm:right-3 sm:top-3 sm:flex justify-center rounded-full bg-[#3E7A1C] text-white shadow-lg">
                                            <Trophy size={14} />
                                        </div>
                                    </div>
                                    <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-5">
                                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#0B2E7A] sm:text-lg" style={DISPLAY}>
                                            {v.title}
                                        </h3>
                                        <div className="mt-auto flex items-center justify-between text-[10px] text-[#0B2E7A]/55 sm:text-xs">
                                            <span className="flex items-center gap-1.5">
                                                <CalendarDays size={13} /> {formatDate(v.created_at)}
                                            </span>
                                            <span className="flex items-center gap-1 font-semibold text-[#3E7A1C] opacity-0 transition-opacity group-hover:opacity-100">
                                                <Play size={12} className="fill-current" /> Play
                                            </span>
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </Section>

            <CtaBand
                eyebrow="Your story could be next"
                title="Scan, win and get featured — one QR code at a time."
                desc="Bring the scratch-card experience to your counter and your customers could be our next winners."
            />

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
                                        style={DISPLAY}
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
                                    Couldn&apos;t load an inline preview for this link —{" "}
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
        </PageShell>
    );
}
