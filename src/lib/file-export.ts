import { Capacitor, registerPlugin } from '@capacitor/core'

type ExportPayload = { data: string; fileName: string; mimeType: string; title?: string }
interface FileExportPlugin {
  saveFile(options: ExportPayload): Promise<{ cancelled?: boolean }>
  shareFile(options: ExportPayload): Promise<void>
  shareText(options: { text: string; title: string }): Promise<void>
}
const NativeExport = registerPlugin<FileExportPlugin>('FileExport')

function isAndroidExport() {
  if (Capacitor.getPlatform() !== 'android') return false
  if (!Capacitor.isPluginAvailable('FileExport')) {
    throw new Error('Please install the updated Merchant DAD APK to enable downloads and sharing.')
  }
  return true
}

async function payload(blob: Blob, fileName: string): Promise<ExportPayload> {
  if (blob.size > 32 * 1024 * 1024) throw new Error('This file is too large to export. The limit is 32 MB.')
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('Could not read the generated file.'))
    reader.readAsDataURL(blob)
  })
  return { data, fileName, mimeType: blob.type.split(';')[0] || 'application/octet-stream' }
}

export function exportError(error: unknown) {
  return error instanceof Error ? error.message : 'Could not export the file. Please try again.'
}

export function canvasPNG(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('Could not create the PNG image.')), 'image/png'))
}

/** Android: system Save dialog. Browser: regular file download. False means cancelled. */
export async function saveFile(blob: Blob, fileName: string): Promise<boolean> {
  if (isAndroidExport()) {
    const result = await NativeExport.saveFile(await payload(blob, fileName))
    return !result.cancelled
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10000)
  return true
}

/** Share the actual file. Browsers without file sharing download it instead. */
export async function shareFile(file: File, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (isAndroidExport()) {
    await NativeExport.shareFile({ ...await payload(file, file.name), title })
    return 'shared'
  }
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title, files: [file] })
      return 'shared'
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
      throw error
    }
  }
  await saveFile(file, file.name)
  return 'downloaded'
}

export async function shareText(options: { title: string; text: string; url: string }) {
  if (isAndroidExport()) {
    await NativeExport.shareText({ title: options.title, text: `${options.text}\n${options.url}` })
    return
  }
  if (navigator.share) {
    try { await navigator.share(options) }
    catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) throw error }
  } else {
    await navigator.clipboard.writeText(options.url)
    alert('Share link copied to clipboard.')
  }
}
