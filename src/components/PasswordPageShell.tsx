import Image from 'next/image'
import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

export default function PasswordPageShell({ children }: { children: ReactNode }) {
  return <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#F5F8FC] px-4 py-10 text-slate-900 sm:px-6">
    <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
    <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-lime-200/40 blur-3xl" />
    <div className="relative w-full max-w-[480px]">
      <Link href="/" aria-label="Merchant DAD home" className="mb-7 flex flex-col items-center gap-2"><Image src="/homelg.png" alt="DAD" width={160} height={91} priority className="h-auto w-36 object-contain" /><span className="text-sm font-semibold tracking-wide text-[#0B2E7A]">Merchant DAD</span></Link>
      <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_70px_-25px_rgba(11,46,122,0.3)]">
        <div className="h-1.5 bg-gradient-to-r from-[#1857D6] via-[#4F8CFF] to-[#7BC142]" />
        <div className="p-6 sm:p-9">{children}</div>
      </section>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-slate-500"><Link href="/" className="inline-flex items-center gap-1.5 font-semibold text-[#1857D6] hover:underline"><ArrowLeft size={14} />Back to home</Link><span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-green-600" />Secure account recovery</span></div>
    </div>
  </main>
}
