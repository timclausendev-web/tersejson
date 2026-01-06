import { MongoClient, Db } from 'mongodb'

interface MongoConnection {
  client: MongoClient
  db: Db
}

let cached: MongoConnection | null = null

export async function connectToDatabase(): Promise<MongoConnection> {
  if (cached) {
    return cached
  }

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable')
  }

  const client = await MongoClient.connect(uri)
  const db = client.db('tersejson')

  cached = { client, db }
  return cached
}

// Collection helpers
export async function getCollection<T extends Document>(name: string) {
  const { db } = await connectToDatabase()
  return db.collection<T>(name)
}

// Initialize indexes
export async function initializeIndexes() {
  const { db } = await connectToDatabase()

  // Users collection
  await db.collection('users').createIndex({ email: 1 }, { unique: true })
  await db.collection('users').createIndex({ stripeCustomerId: 1 }, { sparse: true })

  // Projects collection
  await db.collection('projects').createIndex({ userId: 1 })
  await db.collection('projects').createIndex({ apiKey: 1 }, { unique: true })

  // Analytics events collection
  await db.collection('analytics_events').createIndex({ projectId: 1, timestamp: -1 })
  await db.collection('analytics_events').createIndex({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }) // 90 days TTL

  // Daily stats collection
  await db.collection('daily_stats').createIndex({ projectId: 1, date: -1 })
}
