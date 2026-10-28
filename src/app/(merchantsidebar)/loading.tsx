export default function MerchantPanelLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-6" role="status" aria-live="polite" aria-busy="true">
      <div className="text-center">
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" aria-hidden="true" />
        <p className="text-lg font-semibold text-slate-900">Loading merchant panel…</p>
      </div>
    </div>
  )
}
