import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createBillingPortalSession } from '@/lib/stripe'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { isPaidFeaturesEnabled } from '@/lib/feature-flags'

export async function POST(request: NextRequest) {
  // Check if paid features are enabled
  if (!isPaidFeaturesEnabled()) {
    return NextResponse.json({ error: 'Paid features not enabled' }, { status: 404 })
  }

  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) })

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
    }

    const returnUrl = `${process.env.NEXTAUTH_URL}/dashboard/settings`
    const portalSession = await createBillingPortalSession(user.stripeCustomerId, returnUrl)

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Billing portal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
