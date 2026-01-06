import { redirect } from 'next/navigation'
import { Header } from '@/components/landing/Header'
import { Pricing } from '@/components/landing/Pricing'
import { Footer } from '@/components/landing/Footer'
import { isPaidFeaturesEnabled } from '@/lib/feature-flags'

export default function PricingPage() {
  // Redirect to home if paid features are disabled
  if (!isPaidFeaturesEnabled()) {
    redirect('/')
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="pt-16">
        <Pricing />
      </div>
      <Footer />
    </main>
  )
}
