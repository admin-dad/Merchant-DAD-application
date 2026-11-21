'use client'
import PasswordPageShell from '@/components/PasswordPageShell'
import Link from 'next/link'
import { Capacitor } from '@capacitor/core'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Loader2 } from 'lucide-react'
export default function ForgotPasswordPage() {
  const [email,setEmail]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [sent,setSent]=useState(false)
  const submit=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);setError('');try{
    const origin=Capacitor.isNativePlatform() ? 'https://merchant-dad-application.vercel.app' : window.location.origin
    const {error}=await createClient().auth.resetPasswordForEmail(email.trim(),{redirectTo:new URL('/reset-password',origin).toString()})
    if(error)throw error;setSent(true)
  }catch(error){setError(error instanceof Error?error.message:'Could not send reset email. Please try again.')}finally{setBusy(false)}}
  return <PasswordPageShell><Mail className="mb-5 h-14 w-14 rounded-2xl bg-blue-50 p-3 text-blue-600" size={32}/><h1 className="text-2xl font-bold tracking-tight text-[#0B2E7A] sm:text-3xl">Forgot password?</h1><p className="mt-3 text-sm leading-relaxed text-slate-500">Enter your registered merchant email to receive a password reset link.</p>{error&&<p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-relaxed text-red-700">{error}</p>}{sent?<p role="status" className="my-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">If an account exists for this email, a reset link has been sent. Check your inbox and spam folder.</p>:<form onSubmit={submit} className="my-6 space-y-4"><label className="block text-sm font-semibold text-slate-700">Email address<input required type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm text-black outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50" placeholder="you@example.com"/></label><button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/10 transition hover:brightness-110 disabled:opacity-50">{busy&&<Loader2 size={18} className="animate-spin"/>}{busy?'Sending…':'Send reset link'}</button></form>}<Link href="/" className="text-sm font-semibold text-blue-600">Back to website & login</Link></PasswordPageShell>
}
