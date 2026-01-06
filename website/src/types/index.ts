import { ObjectId } from 'mongodb'

// User types
export interface User {
  _id: ObjectId
  email: string
  name: string | null
  image: string | null
  emailVerified: Date | null
  stripeCustomerId: string | null
  subscription: {
    status: 'active' | 'canceled' | 'past_due' | null
    plan: 'starter' | 'team' | 'enterprise' | null
    stripeSubscriptionId: string | null
    currentPeriodEnd: Date | null
  } | null
  createdAt: Date
  updatedAt: Date
}

// Project types
export interface Project {
  _id: ObjectId
  userId: ObjectId
  name: string
  apiKey: string
  createdAt: Date
}

// Analytics types (matches TerseJSON library)
export interface CompressionEvent {
  _id?: ObjectId
  projectId: ObjectId
  timestamp: Date
  originalSize: number
  compressedSize: number
  objectCount: number
  keysCompressed: number
  endpoint?: string
  keyPattern: string
}

export interface DailyStats {
  _id: ObjectId
  projectId: ObjectId
  date: Date
  totalEvents: number
  totalOriginalBytes: number
  totalCompressedBytes: number
  totalBytesSaved: number
  totalObjects: number
}

export interface AnalyticsStats {
  totalEvents: number
  totalOriginalBytes: number
  totalCompressedBytes: number
  totalBytesSaved: number
  averageRatio: number
  totalObjects: number
  sessionStart: Date
  lastEvent: Date
}

// Subscription plans
export type PlanType = 'starter' | 'team' | 'enterprise'

export interface Plan {
  id: PlanType
  name: string
  price: number
  features: string[]
  stripePriceId: string
}

export const PLANS: Record<PlanType, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    features: [
      'Up to 100k requests/month',
      '1 project',
      '7-day data retention',
      'Email support',
    ],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || '',
  },
  team: {
    id: 'team',
    name: 'Team',
    price: 99,
    features: [
      'Up to 1M requests/month',
      '5 projects',
      '30-day data retention',
      'Priority support',
      'Team members',
    ],
    stripePriceId: process.env.STRIPE_TEAM_PRICE_ID || '',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    features: [
      'Unlimited requests',
      'Unlimited projects',
      '90-day data retention',
      'Dedicated support',
      'SSO/SAML',
      'Custom integrations',
    ],
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
  },
}

// Feature flags
export function isPaidFeaturesEnabled(): boolean {
  return process.env.ENABLE_PAID_FEATURES === 'true'
}
