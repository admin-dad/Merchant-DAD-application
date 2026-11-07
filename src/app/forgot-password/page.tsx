'use client'
import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Loader2 } from 'lucide-react'
export default function ForgotPasswordPage() {
  const [email,setEmail]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [sent,setSent]=useState(false)
  const submit=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);setError('');try{
    const origin=process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const {error}=await createClient().auth.resetPasswordForEmail(email.trim(),{redirectTo:new URL('/reset-password',origin).toString()})
    if(error)throw error;setSent(true)
  }catch(error){setError(error instanceof Error?error.message:'Could not send reset email. Please try again.')}finally{setBusy(false)}}
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><Mail className="mb-5 text-blue-600" size={32}/><h1 className="text-2xl font-bold text-slate-900">Forgot password?</h1><p className="mt-2 text-sm text-slate-500">Enter your registered merchant email to receive a password reset link.</p>{error&&<p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}{sent?<p role="status" className="my-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">If an account exists for this email, a reset link has been sent. Check your inbox and spam folder.</p>:<form onSubmit={submit} className="my-6 space-y-4"><label className="block text-sm font-semibold text-slate-700">Email address<input required type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-black" placeholder="you@example.com"/></label><button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 font-semibold text-white disabled:opacity-50">{busy&&<Loader2 size={18} className="animate-spin"/>}{busy?'Sending…':'Send reset link'}</button></form>}<Link href="/" className="text-sm font-semibold text-blue-600">Back to website & login</Link></section></main>
}
