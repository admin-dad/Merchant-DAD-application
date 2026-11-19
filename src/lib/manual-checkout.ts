export function openManualCheckout(details: { purpose: string; amount: number; metadata?: Record<string, unknown> }) {
  window.dispatchEvent(new CustomEvent('manual-checkout', { detail: details }))
}
