import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

interface IncomingEvent {
  timestamp: number
  originalSize: number
  compressedSize: number
  objectCount: number
  keysCompressed: number
  endpoint?: string
  keyPattern: string
}

interface IncomingPayload {
  apiKey: string
  projectId: string
  stats: {
    totalEvents: number
    totalOriginalBytes: number
    totalCompressedBytes: number
    totalBytesSaved: number
    averageRatio: number
    totalObjects: number
    sessionStart: number
    lastEvent: number
  }
  events: IncomingEvent[]
}

export async function POST(request: NextRequest) {
  try {
    const body: IncomingPayload = await request.json()

    const { apiKey, events } = body

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }

    const { db } = await connectToDatabase()

    // Validate API key and get project
    const project = await db.collection('projects').findOne({ apiKey })

    if (!project) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const projectId = project._id

    // Store events
    if (events && events.length > 0) {
      const eventsToInsert = events.map((event) => ({
        projectId,
        timestamp: new Date(event.timestamp),
        originalSize: event.originalSize,
        compressedSize: event.compressedSize,
        objectCount: event.objectCount,
        keysCompressed: event.keysCompressed,
        endpoint: event.endpoint || null,
        keyPattern: event.keyPattern,
      }))

      await db.collection('analytics_events').insertMany(eventsToInsert)

      // Update daily stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const totals = events.reduce(
        (acc, event) => ({
          totalEvents: acc.totalEvents + 1,
          totalOriginalBytes: acc.totalOriginalBytes + event.originalSize,
          totalCompressedBytes: acc.totalCompressedBytes + event.compressedSize,
          totalBytesSaved: acc.totalBytesSaved + (event.originalSize - event.compressedSize),
          totalObjects: acc.totalObjects + event.objectCount,
        }),
        { totalEvents: 0, totalOriginalBytes: 0, totalCompressedBytes: 0, totalBytesSaved: 0, totalObjects: 0 }
      )

      await db.collection('daily_stats').updateOne(
        { projectId, date: today },
        {
          $inc: totals,
          $setOnInsert: { projectId, date: today },
        },
        { upsert: true }
      )
    }

    return NextResponse.json({ success: true, eventsReceived: events?.length || 0 })
  } catch (error) {
    console.error('Analytics ingestion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', version: '1' })
}
