'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PLANS, type PlanType } from '@/types'

interface PricingProps {
  onSelectPlan?: (plan: PlanType) => void
}

export function Pricing({ onSelectPlan }: PricingProps) {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Start free with the npm package. Upgrade for analytics and team features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free tier */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Open Source</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-zinc-500">forever</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                'Full compression library',
                'All key patterns',
                'All framework integrations',
                'MIT License',
                'Community support',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                  <span className="text-zinc-300">{feature}</span>
                </li>
              ))}
            </ul>

            <a href="https://www.npmjs.com/package/tersejson" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" className="w-full">
                npm install tersejson
              </Button>
            </a>
          </div>

          {/* Paid tiers */}
          {Object.values(PLANS).map((plan, index) => {
            const isPopular = plan.id === 'team'
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-8 relative ${
                  isPopular
                    ? 'border-2 border-primary-500 bg-gradient-to-b from-primary-950/30 to-zinc-900/50'
                    : 'border border-zinc-800 bg-zinc-900/50'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary-600 text-xs font-medium text-white">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                    <span className="text-zinc-500">/month</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isPopular ? 'primary' : 'secondary'}
                  className="w-full"
                  onClick={() => onSelectPlan?.(plan.id)}
                >
                  Get Started
                </Button>
              </div>
            )
          })}
        </div>

        <p className="text-center text-zinc-500 text-sm mt-8">
          All paid plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  )
}
