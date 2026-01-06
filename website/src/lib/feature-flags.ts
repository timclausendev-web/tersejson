// Feature flags for controlling paid features visibility

export function isPaidFeaturesEnabled(): boolean {
  return process.env.ENABLE_PAID_FEATURES === 'true'
}

export function isStripeEnabled(): boolean {
  return isPaidFeaturesEnabled() && !!process.env.STRIPE_SECRET_KEY
}

export function getFeatureFlags() {
  return {
    paidFeatures: isPaidFeaturesEnabled(),
    stripe: isStripeEnabled(),
    showPricing: isPaidFeaturesEnabled(),
    requireSubscription: isPaidFeaturesEnabled(),
  }
}
