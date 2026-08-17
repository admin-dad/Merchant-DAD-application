'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SignupRedirectContent() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const ref = params.get('ref')

    if (ref) {
      sessionStorage.setItem('referral_code', ref)
    }

    router.replace('/?openMerchant=register')
  }, [params, router])

  return null
}

export default function SignupRedirect() {
  return (
    <Suspense fallback={null}>
      <SignupRedirectContent />
    </Suspense>
  )
}