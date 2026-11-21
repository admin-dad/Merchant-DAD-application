'use client'

import { useState } from 'react'
import { LockKeyhole, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/client'

export default function AdminChangePassword() {
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setError(''); setNotice('')
    if (password.length < 8) { setError('Use at least 8 characters for your new password.'); return }
    if (password !== confirm) { setError('New passwords do not match.'); return }
    if (password === current) { setError('Choose a password different from your current password.'); return }
    setBusy(true)
    try {
      const client = createAdminClient()
      const { data: { user }, error: userError } = await client.auth.getUser()
      if (userError || !user?.email) throw new Error('Your session has expired. Please log in again.')
      const { data: admin, error: adminError } = await client.from('admin').select('id').eq('id', user.id).maybeSingle()
      if (adminError || !admin) throw new Error('Admin access required.')
      const { error: verificationError } = await client.auth.signInWithPassword({ email: user.email, password: current })
      if (verificationError) throw new Error('Could not verify your current password. Check it and try again.')
      const { error: updateError } = await client.auth.updateUser({ password })
      if (updateError) throw updateError
      setCurrent(''); setPassword(''); setConfirm('')
      setNotice('Password changed successfully. Use your new password the next time you log in.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not change your password. Please try again.') }
    finally { setBusy(false) }
  }

  return <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="admin-password-heading">
    <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><LockKeyhole size={22} /></span><div><h2 id="admin-password-heading" className="text-base font-bold text-slate-900">Change Admin Password</h2><p className="mt-1 text-sm text-slate-500">Update the password for your own admin account.</p></div></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mb-4 flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700"><CheckCircle2 size={18} className="shrink-0" />{notice}</p>}
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">{[{ label: 'Current password', value: current, set: setCurrent, autocomplete: 'current-password' }, { label: 'New password', value: password, set: setPassword, autocomplete: 'new-password' }, { label: 'Confirm new password', value: confirm, set: setConfirm, autocomplete: 'new-password' }].map(field => <label key={field.label} className="block text-sm font-semibold text-slate-700">{field.label}<input required disabled={busy} type={visible ? 'text' : 'password'} autoComplete={field.autocomplete} minLength={field.autocomplete === 'new-password' ? 8 : undefined} value={field.value} onChange={event => field.set(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-black outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-4"><button type="button" onClick={() => setVisible(value => !value)} aria-pressed={visible} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">{visible ? <EyeOff size={16} /> : <Eye size={16} />}{visible ? 'Hide passwords' : 'Show passwords'}</button><button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}{busy ? 'Updating…' : 'Update Password'}</button></div>
    </form>
  </section>
}
