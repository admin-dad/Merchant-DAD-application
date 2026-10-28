import LegalPolicyPage from '@/components/LegalPolicyPage'

// Read the current published content on every request.
export const dynamic = 'force-dynamic'

export default function Page() {
  return <LegalPolicyPage slug="privacy" />
}
