/** Use the public site, never localhost or the native WebView origin, in printed QR codes. */
export function merchantScanURL(merchantId: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://merchant-dad-application.vercel.app'
  return new URL(`/scan?merchant=${encodeURIComponent(merchantId)}`, origin).toString()
}

export async function createMerchantQRPoster(qr: HTMLCanvasElement) {
  const background = new window.Image()
  await new Promise<void>((resolve, reject) => {
    background.onload = () => resolve()
    background.onerror = () => reject(new Error('Could not load the QR poster. Please try again.'))
    background.src = '/merchant-qr-poster.png'
  })
  const canvas = document.createElement('canvas')
  canvas.width = background.naturalWidth
  canvas.height = background.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create the QR poster.')
  ctx.drawImage(background, 0, 0)
  const scaleX = canvas.width / 1032
  const scaleY = canvas.height / 1599
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(344 * scaleX, 810 * scaleY, 342 * scaleX, 250 * scaleY)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(qr, 365 * scaleX, 785 * scaleY, 300 * scaleX, 300 * scaleY)
  return canvas
}
