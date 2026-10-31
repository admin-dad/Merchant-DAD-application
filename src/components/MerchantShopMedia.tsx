'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Save, Trash2, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'merchant-shop-media'
const SLOTS = ['shop_image_1_path', 'shop_image_2_path', 'shop_video_path'] as const
type Slot = (typeof SLOTS)[number]
type MediaPaths = Record<Slot, string | null>
type MediaItem = { path: string | null; preview: string | null; file: File | null }
type MediaState = Record<Slot, MediaItem>
const EMPTY_PATHS: MediaPaths = { shop_image_1_path: null, shop_image_2_path: null, shop_video_path: null }
const emptyMedia = (): MediaState => ({ shop_image_1_path: { path: null, preview: null, file: null }, shop_image_2_path: { path: null, preview: null, file: null }, shop_video_path: { path: null, preview: null, file: null } })
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/webm']
const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' }

export default function MerchantShopMedia({ merchantId }: { merchantId: string }) {
  const [media, setMedia] = useState<MediaState>(emptyMedia)
  const [savedPaths, setSavedPaths] = useState<MediaPaths>(EMPTY_PATHS)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const objectURLs = useRef(new Set<string>())
  const dirty = SLOTS.some(slot => media[slot].file || media[slot].path !== savedPaths[slot])

  useEffect(() => {
    const urls = objectURLs.current
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear() }
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('Please log in again to manage your shop media.')
        const { data, error } = await supabase.from('merchants').select('shop_image_1_path, shop_image_2_path, shop_video_path')
          .eq('id', merchantId).eq('user_id', user.id).single()
        if (error || !data) throw new Error('Could not load shop media. Ensure the merchant_shop_media.sql migration is installed, then try again.')
        const paths = data as MediaPaths
        const next = emptyMedia()
        for (const slot of SLOTS) {
          const path = paths[slot]
          let preview: string | null = null
          if (path) {
            const { data: signed, error: previewError } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
            if (!previewError) preview = signed?.signedUrl ?? null
          }
          next[slot] = { path, preview, file: null }
        }
        if (active) { setSavedPaths(paths); setMedia(next); setReady(true) }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load shop media.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [merchantId, attempt])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const discardPreview = (item: MediaItem) => {
    if (item.preview && objectURLs.current.delete(item.preview)) URL.revokeObjectURL(item.preview)
  }
  const choose = (slot: Slot, file: File | undefined) => {
    if (!file || saving) return
    const video = slot === 'shop_video_path'
    const types = video ? VIDEO_TYPES : IMAGE_TYPES
    const maximum = video ? 50_000_000 : 5_000_000
    if (!types.includes(file.type)) { setError(video ? 'Choose an MP4 or WebM video.' : 'Choose a JPG, PNG or WebP image.'); return }
    if (file.size > maximum || file.size === 0) { setError(video ? 'Video must be non-empty and no larger than 50 MB.' : 'Image must be non-empty and no larger than 5 MB.'); return }
    discardPreview(media[slot])
    const preview = URL.createObjectURL(file)
    objectURLs.current.add(preview)
    setMedia(previous => ({ ...previous, [slot]: { ...previous[slot], file, preview } }))
    setError(null)
    setNotice(null)
  }
  const remove = (slot: Slot) => {
    discardPreview(media[slot])
    setMedia(previous => ({ ...previous, [slot]: { path: null, preview: null, file: null } }))
    setNotice(null)
  }

  const save = async () => {
    if (!ready || !dirty || saving) return
    setSaving(true)
    setError(null)
    setNotice(null)
    const supabase = createClient()
    const uploaded: string[] = []
    let persistStarted = false
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Please log in again before saving.')
      const paths = { ...savedPaths }
      for (const slot of SLOTS) {
        const item = media[slot]
        paths[slot] = item.path
        if (item.file) {
          const path = `${user.id}/${merchantId}/${slot}-${crypto.randomUUID()}.${EXTENSIONS[item.file.type]}`
          const { error } = await supabase.storage.from(BUCKET).upload(path, item.file, { contentType: item.file.type, upsert: false })
          if (error) throw new Error('An upload failed. Check your connection and storage setup, then try again.')
          uploaded.push(path)
          paths[slot] = path
        }
      }
      persistStarted = true
      // This narrow RPC checks ownership and only updates the three media fields.
      const { error } = await supabase.rpc('save_merchant_shop_media', {
        p_merchant_id: merchantId,
        p_image_1: paths.shop_image_1_path,
        p_image_2: paths.shop_image_2_path,
        p_video: paths.shop_video_path,
      })
      if (error) throw new Error('Could not save shop media. Check the SQL setup and try again. Your selected files are still here.')
      setMedia(previous => Object.fromEntries(SLOTS.map(slot => [slot, { ...previous[slot], path: paths[slot], file: null }])) as MediaState)
      setSavedPaths(paths)
      setNotice('Shop images and video saved successfully.')
      // Remove replaced files only after the profile references have been saved.
      const obsolete = SLOTS.map(slot => savedPaths[slot]).filter((path): path is string => !!path && !Object.values(paths).includes(path))
      if (obsolete.length) {
        const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([...new Set(obsolete)])
        if (cleanupError) setNotice('Shop media saved. Some replaced files could not be removed from storage.')
      }
    } catch (err) {
      // Do not delete uploads after a network-ambiguous save: the DB may have committed.
      if (!persistStarted && uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded)
      setError(err instanceof Error ? err.message : 'Could not save shop media.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="shop-media-heading" className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      <header className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6]"><ImagePlus size={21} /></div>
        <div><h2 id="shop-media-heading" className="text-base font-semibold text-slate-900">Shop Images & Video</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Add up to two shop images and one video. These uploads are optional and saved separately from your business details.</p></div>
      </header>
      {loading ? <p role="status" className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Loading shop media…</p> : <>
        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {!ready ? <button type="button" onClick={() => { setLoading(true); setError(null); setAttempt(previous => previous + 1) }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Try again</button> : <>
          <fieldset disabled={saving} className="grid gap-5 disabled:opacity-70 sm:grid-cols-2 xl:grid-cols-3">
            {SLOTS.map((slot, index) => {
              const video = slot === 'shop_video_path'
              const item = media[slot]
              const label = video ? 'Shop video' : `Shop image ${index + 1}`
              return <div key={slot} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">{video ? <Video size={17} /> : <ImagePlus size={17} />}{label}</h3>
                <div className="mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-200 bg-white">
                  {item.preview ? video ? <video src={item.preview} controls preload="metadata" className="h-full w-full object-contain" aria-label="Shop video preview" /> : <Image src={item.preview} alt={`${label} preview`} width={640} height={360} unoptimized className="h-full w-full object-contain" /> : <div className="px-3 text-center text-xs text-slate-400">{item.path ? 'Preview unavailable. Reload the page or replace this file.' : video ? 'No video added' : 'No image added'}</div>}
                </div>
                <input id={slot} type="file" disabled={saving} accept={(video ? VIDEO_TYPES : IMAGE_TYPES).join(',')} aria-label={`Upload ${label.toLowerCase()}`} onChange={event => { choose(slot, event.target.files?.[0]); event.target.value = '' }} className="block w-full min-w-0 text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700" />
                <p className="mt-2 text-[11px] text-slate-400">{video ? 'MP4 or WebM · Up to 50 MB' : 'JPG, PNG or WebP · Up to 5 MB'}</p>
                {item.file && <p className="mt-2 truncate text-xs text-slate-600">Selected: {item.file.name}</p>}
                {(item.file || item.path) && <button type="button" onClick={() => remove(slot)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600"><Trash2 size={14} />Remove {video ? 'video' : 'image'}</button>}
              </div>
            })}
          </fieldset>
          <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">{dirty ? 'You have unsaved media changes.' : 'Your shop media is up to date.'}</p>
            <button type="button" onClick={save} disabled={saving || !dirty} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? 'Uploading & saving…' : 'Save shop media'}</button>
          </div>
          {notice && <p role="status" className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
        </>}
      </>}
    </section>
  )
}
