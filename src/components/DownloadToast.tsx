'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
export default function DownloadToast() {
  const [message, setMessage] = useState('')
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const show = (event: Event) => {
      setMessage(String((event as CustomEvent).detail))
      clearTimeout(timeout)
      timeout = setTimeout(() => setMessage(''), 5000)
    }
    window.addEventListener('file-export-success', show)
    return () => { window.removeEventListener('file-export-success', show); clearTimeout(timeout) }
  }, [])
  return message ? <div role="status" aria-live="polite" className="fixed inset-x-4 bottom-6 z-[10000] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 text-sm font-medium text-slate-900 shadow-xl"><CheckCircle2 size={23} className="shrink-0 text-emerald-600" /><span className="flex-1">{message}</span><button aria-label="Dismiss download notification" onClick={() => setMessage('')} className="rounded-lg p-1 text-slate-500"><X size={18} /></button></div> : null
}
