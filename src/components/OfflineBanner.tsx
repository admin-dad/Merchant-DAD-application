'use client'

import { useSyncExternalStore } from 'react'
import { WifiOff } from 'lucide-react'

function subscribe(onChange: () => void) {
  window.addEventListener('offline', onChange)
  window.addEventListener('online', onChange)
  return () => {
    window.removeEventListener('offline', onChange)
    window.removeEventListener('online', onChange)
  }
}

export default function OfflineBanner() {
  const offline = useSyncExternalStore(subscribe, () => !navigator.onLine, () => false)
  if (!offline) return null
  return (
    <div role="alert" aria-live="polite" className="pointer-events-none fixed inset-x-4 z-[10000] mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-xl"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
      <WifiOff size={21} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
      <div>
        <p className="text-sm font-bold">No internet connection</p>
        <p className="mt-1 text-xs leading-relaxed">Your current page stays open. Reconnect to load pages, save changes, or make payments.</p>
      </div>
    </div>
  )
}
