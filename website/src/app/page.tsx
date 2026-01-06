import { Header } from '@/components/landing/Header'
import { Hero } from '@/components/landing/Hero'
import { Demo } from '@/components/landing/Demo'
import { JsonTester } from '@/components/landing/JsonTester'
import { Features } from '@/components/landing/Features'
import { SavingsCalculator } from '@/components/landing/SavingsCalculator'
import { CodeExamples } from '@/components/landing/CodeExamples'
import { Pricing } from '@/components/landing/Pricing'
import { Footer } from '@/components/landing/Footer'
import { isPaidFeaturesEnabled } from '@/lib/feature-flags'

export default function Home() {
  const showPricing = isPaidFeaturesEnabled()

  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Demo />
      <JsonTester />
      <Features />
      <SavingsCalculator />
      <CodeExamples />
      {showPricing && <Pricing />}
      <Footer />
    </main>
  )
}
