import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { isPaidFeaturesEnabled } from '@/lib/feature-flags'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  // Check if paid features are enabled
  if (!isPaidFeaturesEnabled() || !stripe) {
    return NextResponse.json({ error: 'Paid features not enabled' }, { status: 404 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { db } = await connectToDatabase()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const { userId, plan } = session.metadata || {}

        if (userId && session.subscription && session.customer) {
          await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            {
              $set: {
                stripeCustomerId: session.customer as string,
                subscription: {
                  status: 'active',
                  plan,
                  stripeSubscriptionId: session.subscription as string,
                  currentPeriodEnd: null, // Will be updated by subscription.updated
                },
                updatedAt: new Date(),
              },
            }
          )
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription & { current_period_end: number }
        const userId = subscription.metadata?.userId

        if (userId) {
          const plan = subscription.metadata?.plan
          const periodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null
          await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            {
              $set: {
                'subscription.status': subscription.status === 'active' ? 'active' : subscription.status === 'past_due' ? 'past_due' : 'canceled',
                'subscription.plan': plan,
                'subscription.currentPeriodEnd': periodEnd,
                updatedAt: new Date(),
              },
            }
          )
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (userId) {
          await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            {
              $set: {
                subscription: null,
                updatedAt: new Date(),
              },
            }
          )
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        await db.collection('users').updateOne(
          { stripeCustomerId: customerId },
          {
            $set: {
              'subscription.status': 'past_due',
              updatedAt: new Date(),
            },
          }
        )
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
