'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      setLoading(false)
      return
    }

    try {
      // 1. Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (authError || !authData.user) {
        setError('Invalid email or password.')
        setLoading(false)
        return
      }

      // 2. SECURITY CHECK: Verify they exist in the 'admin' table
      const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (adminError || !adminData) {
        // If they are not an admin, sign them out immediately for security
        await supabase.auth.signOut()
        setError('Access Denied. You do not have Admin privileges.')
        setLoading(false)
        return
      }

      // 3. Success! Redirect to Admin Dashboard
      router.push('/admin-dashboard')
      router.refresh()

    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50" style={{ fontFamily: 'var(--font-display)' }}>
      
      {/* Left Branding Panel (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0B0F19] via-[#0B2E7A] to-[#1857D6] p-12 flex-col justify-between">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-80 w-80 rounded-full bg-[#7BC142]/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-80 w-80 rounded-full bg-[#4F8CFF]/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3 text-white">
          <div className="relative h-9 w-24 overflow-hidden flex items-center justify-start bg-white/10 rounded-lg p-1">
  <Image 
    src="/logo.jpeg" 
    alt="DAD Logo" 
    fill 
    className="object-contain object-left mix-blend-multiply contrast-125" 
  />
</div>
          <div>
            <p className="text-xs text-blue-200/80 font-semibold tracking-wider uppercase">Super Admin Portal</p>
          </div>
        </div>

        <div className="relative z-10 text-white">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold leading-tight max-w-md"
          >
            Centralized Control. <br/> Seamless Management.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-base text-blue-200/90 max-w-md leading-relaxed"
          >
            Manage merchants, approve payments, track QR scans, and configure platform campaigns all from one secure dashboard.
          </motion.p>
        </div>

        <div className="relative z-10 text-xs text-blue-200/60">
          © {new Date().getFullYear()} DAD Platform. All rights reserved.
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          
          {/* Mobile Logo (Visible on small screens) */}
          <div className="lg:hidden mb-8 flex items-center gap-3 justify-center">
            <div className="relative h-12 w-32 overflow-hidden flex items-center justify-center bg-white border border-slate-200 rounded-xl px-2 shadow-sm">
              <Image 
                src="/logo.jpeg" 
                alt="DAD Logo" 
                fill 
                className="object-contain p-1" 
              />
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#7BC142]/10 px-3 py-1 text-xs font-semibold text-[#3E7A1C]">
              <Lock size={12} />
              <span>Secure Access Only</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Admin Login</h2>
            <p className="mt-1.5 text-sm text-slate-500">Enter your credentials to access the control center.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                <Mail size={14} className="text-[#1857D6]" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dad.com"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                <Lock size={14} className="text-[#1857D6]" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <AnimatePresence mode="wait">
                    {showPassword ? (
                      <motion.div key="eye-off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <EyeOff size={16} />
                      </motion.div>
                    ) : (
                      <motion.div key="eye" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Eye size={16} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400">
              Protected by Supabase Auth. Unauthorized access is strictly prohibited.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}