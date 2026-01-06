import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createCheckoutSession } from '@/lib/stripe'
import { isPaidFeaturesEnabled } from '@/lib/feature-flags'
import type { PlanType } from '@/types'

export async function POST(request: NextRequest) {
  // Check if paid features are enabled
  if (!isPaidFeaturesEnabled()) {
    return NextResponse.json({ error: 'Paid features not enabled' }, { status: 404 })
  }

  try {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { plan } = body as { plan: PlanType }

    if (!plan || !['starter', 'team', 'enterprise'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const returnUrl = `${process.env.NEXTAUTH_URL}/dashboard/settings`

    const checkoutSession = await createCheckoutSession(
      session.user.id,
      session.user.email,
      plan,
      returnUrl
    )

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
