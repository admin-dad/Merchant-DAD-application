'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SignupRedirect() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const ref = params.get('ref')
    if (ref) sessionStorage.setItem('referral_code', ref)
    router.replace('/?openMerchant=register')
  }, [params, router])

  return null
}