import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    const { db } = await connectToDatabase()

    // Verify project ownership
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(session.user.id),
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const projectId = new ObjectId(id)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Get daily stats
    const dailyStats = await db
      .collection('daily_stats')
      .find({
        projectId,
        date: { $gte: startDate },
      })
      .sort({ date: 1 })
      .toArray()

    // Get aggregate totals
    const aggregatePipeline = [
      {
        $match: {
          projectId,
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: '$totalEvents' },
          totalOriginalBytes: { $sum: '$totalOriginalBytes' },
          totalCompressedBytes: { $sum: '$totalCompressedBytes' },
          totalBytesSaved: { $sum: '$totalBytesSaved' },
          totalObjects: { $sum: '$totalObjects' },
        },
      },
    ]

    const [totals] = await db.collection('daily_stats').aggregate(aggregatePipeline).toArray()

    // Get top endpoints
    const topEndpointsPipeline = [
      {
        $match: {
          projectId,
          timestamp: { $gte: startDate },
          endpoint: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$endpoint',
          count: { $sum: 1 },
          totalSaved: { $sum: { $subtract: ['$originalSize', '$compressedSize'] } },
        },
      },
      {
        $sort: { count: -1 as const },
      },
      {
        $limit: 10,
      },
    ]

    const topEndpoints = await db.collection('analytics_events').aggregate(topEndpointsPipeline).toArray()

    return NextResponse.json({
      period: { start: startDate, end: new Date(), days },
      totals: totals || {
        totalEvents: 0,
        totalOriginalBytes: 0,
        totalCompressedBytes: 0,
        totalBytesSaved: 0,
        totalObjects: 0,
      },
      dailyStats: dailyStats.map((stat) => ({
        date: stat.date,
        events: stat.totalEvents,
        originalBytes: stat.totalOriginalBytes,
        compressedBytes: stat.totalCompressedBytes,
        bytesSaved: stat.totalBytesSaved,
        objects: stat.totalObjects,
      })),
      topEndpoints: topEndpoints.map((ep) => ({
        endpoint: ep._id,
        count: ep.count,
        totalSaved: ep.totalSaved,
      })),
    })
  } catch (error) {
    console.error('Get project stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
