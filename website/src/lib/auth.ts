import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Sendgrid from 'next-auth/providers/sendgrid'
import type { NextAuthConfig } from 'next-auth'
import { connectToDatabase } from './mongodb'
import { ObjectId } from 'mongodb'
import type { User } from '@/types'

// Custom MongoDB adapter for NextAuth
const MongoDBAdapter = {
  async createUser(data: { email: string; name?: string; image?: string; emailVerified?: Date }) {
    const { db } = await connectToDatabase()
    const now = new Date()
    const user: Omit<User, '_id'> = {
      email: data.email,
      name: data.name || null,
      image: data.image || null,
      emailVerified: data.emailVerified || null,
      stripeCustomerId: null,
      subscription: null,
      createdAt: now,
      updatedAt: now,
    }
    const result = await db.collection('users').insertOne(user)
    return { id: result.insertedId.toString(), ...user, _id: result.insertedId }
  },

  async getUser(id: string) {
    const { db } = await connectToDatabase()
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) })
    if (!user) return null
    return { id: user._id.toString(), ...user }
  },

  async getUserByEmail(email: string) {
    const { db } = await connectToDatabase()
    const user = await db.collection('users').findOne({ email })
    if (!user) return null
    return { id: user._id.toString(), ...user }
  },

  async getUserByAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
    const { db } = await connectToDatabase()
    const account = await db.collection('accounts').findOne({ provider, providerAccountId })
    if (!account) return null
    const user = await db.collection('users').findOne({ _id: account.userId })
    if (!user) return null
    return { id: user._id.toString(), ...user }
  },

  async updateUser(data: { id: string; [key: string]: unknown }) {
    const { db } = await connectToDatabase()
    const { id, ...update } = data
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...update, updatedAt: new Date() } }
    )
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) })
    return { id: user!._id.toString(), ...user }
  },

  async deleteUser(id: string) {
    const { db } = await connectToDatabase()
    await db.collection('accounts').deleteMany({ userId: new ObjectId(id) })
    await db.collection('sessions').deleteMany({ userId: new ObjectId(id) })
    await db.collection('users').deleteOne({ _id: new ObjectId(id) })
  },

  async linkAccount(data: {
    userId: string
    provider: string
    providerAccountId: string
    type: string
    access_token?: string
    refresh_token?: string
    expires_at?: number
  }) {
    const { db } = await connectToDatabase()
    await db.collection('accounts').insertOne({
      ...data,
      userId: new ObjectId(data.userId),
    })
  },

  async unlinkAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
    const { db } = await connectToDatabase()
    await db.collection('accounts').deleteOne({ provider, providerAccountId })
  },

  async createSession(data: { sessionToken: string; userId: string; expires: Date }) {
    const { db } = await connectToDatabase()
    await db.collection('sessions').insertOne({
      ...data,
      userId: new ObjectId(data.userId),
    })
    return data
  },

  async getSessionAndUser(sessionToken: string) {
    const { db } = await connectToDatabase()
    const session = await db.collection('sessions').findOne({ sessionToken })
    if (!session) return null
    const user = await db.collection('users').findOne({ _id: session.userId })
    if (!user) return null
    return {
      session: { ...session, userId: session.userId.toString() },
      user: { id: user._id.toString(), ...user },
    }
  },

  async updateSession(data: { sessionToken: string; expires?: Date }) {
    const { db } = await connectToDatabase()
    const { sessionToken, ...update } = data
    await db.collection('sessions').updateOne({ sessionToken }, { $set: update })
    const session = await db.collection('sessions').findOne({ sessionToken })
    return session ? { ...session, userId: session.userId.toString() } : null
  },

  async deleteSession(sessionToken: string) {
    const { db } = await connectToDatabase()
    await db.collection('sessions').deleteOne({ sessionToken })
  },

  async createVerificationToken(data: { identifier: string; token: string; expires: Date }) {
    const { db } = await connectToDatabase()
    await db.collection('verification_tokens').insertOne(data)
    return data
  },

  async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
    const { db } = await connectToDatabase()
    const verificationToken = await db.collection('verification_tokens').findOne({ identifier, token })
    if (!verificationToken) return null
    await db.collection('verification_tokens').deleteOne({ identifier, token })
    return verificationToken
  },
}

export const authConfig: NextAuthConfig = {
  adapter: MongoDBAdapter as any,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Sendgrid({
      apiKey: process.env.SENDGRID_API_KEY!,
      from: process.env.EMAIL_FROM || 'noreply@tersejson.com',
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  session: {
    strategy: 'database',
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
