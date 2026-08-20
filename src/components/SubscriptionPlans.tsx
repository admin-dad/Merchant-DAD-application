'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Zap, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  billing_interval: string
  features: string[]
}

declare global {
  interface Window {
    Razorpay: any
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}
export default function SubscriptionPlans({
  merchantId,
  currentPlanId,
}: {
  merchantId: string
  currentPlanId?: string | null
}) {
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message)
        else setPlans((data as Plan[]) ?? [])
        setLoading(false)
      })
  }, [])

  const handleUpgrade = async (plan: Plan) => {
    setError(null)
    setPayingPlanId(plan.id)

    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        setError('Could not load Razorpay checkout. Check your connection and try again.')
        setPayingPlanId(null)
        return
      }

      const orderRes = await fetch('/api/admin/subrazorpay/create-subscription-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: merchantId, plan_id: plan.id }),
      })
      const order = await orderRes.json()

      if (!orderRes.ok) {
        setError(order.error || 'Could not start payment. Please try again.')
        setPayingPlanId(null)
        return
      }

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: order.brand_name || 'Merchant Partner',
        description: order.description,
        order_id: order.order_id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/admin/subrazorpay/verify-subscription-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                merchant_id: merchantId,
                plan_id: plan.id,
                amount: order.total_amount,
                base_amount: order.base_amount,
                gst_amount: order.gst_amount,
              }),
            })
            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) {
              setError(
                verifyData.error || 'Payment succeeded but activation failed. Contact support.'
              )
              return
            }
            router.push('/profile')
            router.refresh()
          } finally {
            setPayingPlanId(null)
          }
        },
        modal: {
          ondismiss: () => setPayingPlanId(null),
        },
        theme: { color: '#1857D6' },
      })

      rzp.on('payment.failed', (resp: any) => {
        setError(resp.error?.description || 'Payment failed. Please try again.')
        setPayingPlanId(null)
      })

      rzp.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setPayingPlanId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-400">
        <Loader2 className="animate-spin" size={20} />
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {error && (
        <div className="sm:col-span-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlanId
        const isFree = Number(plan.price) === 0

        return (
          <div
            key={plan.id}
            className={`flex flex-col rounded-2xl border p-5 ${isCurrent ? 'border-[#1857D6] bg-[#1857D6]/5' : 'border-slate-200 bg-white'
              }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#0B0F19]">{plan.name}</h3>
              {isCurrent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#1857D6]/10 px-2.5 py-0.5 text-xs font-semibold text-[#1857D6]">
                  <CheckCircle2 size={12} /> Current plan
                </span>
              )}
            </div>

            <p className="mt-1 text-2xl font-bold text-[#0B0F19]">
              {isFree ? 'Free' : `₹${Number(plan.price).toFixed(0)}`}
              {!isFree && (
                <span className="text-sm font-normal text-slate-400">
                  /{plan.billing_interval}
                </span>
              )}
            </p>
            {!isFree && <p className="text-xs text-slate-400">+18% GST at checkout</p>}

            {plan.description && <p className="mt-1 text-sm text-slate-500">{plan.description}</p>}

            <ul className="mt-3 flex-1 space-y-1.5 text-sm text-slate-600">
              {(plan.features ?? []).map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Zap size={14} className="text-[#7BC142]" />
                  {f}
                </li>
              ))}
            </ul>

            {!isFree && !isCurrent && (
              <button
                onClick={() => handleUpgrade(plan)}
                disabled={payingPlanId === plan.id}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {payingPlanId === plan.id ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Processing…
                  </>
                ) : (
                  `Upgrade to ${plan.name}`
                )}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}