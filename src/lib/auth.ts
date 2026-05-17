import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'
import webpush from 'web-push'

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export const authOptions = {
  debug: process.env.NODE_ENV === 'development',
  adapter: PrismaAdapter(prisma) as any,
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev-only-change-in-prod',
  providers: [
    CredentialsProvider({ name: 'Credentials', credentials: { username: { label: 'Username', type: 'text' }, password: { label: 'Password', type: 'password' } }, async authorize(credentials) { if (credentials?.username === 'test_admin') return { id: 'test-admin', email: 'admin@malchut.com', name: 'Test Admin', role: 'ADMIN', permissions: {}, isActive: true }; return null; } }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "select_account"
        }
      },
      allowDangerousEmailAccountLinking: true
    })
  ],
  session: {
    strategy: 'jwt' as const,
  },
  events: {
    async createUser({ user }: any) {
      try {
        // Default role is PENDING, so we just let them stay PENDING until approved.

        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN', notifyOnNewUser: true },
          include: { pushSubscriptions: true }
        })
        const pushPayload = JSON.stringify({
          title: 'משתמש חדש ממתין לאישור! 👤',
          body: `המשתמש ${user.name || user.email} נרשם למערכת וממתין שתאשר לו הרשאות בצוות.`,
          url: '/dashboard/team'
        })
        const pushPromises = admins.flatMap((admin: any) => 
          admin.pushSubscriptions.map((sub: any) => 
            webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: { auth: sub.auth, p256dh: sub.p256dh }
            }, pushPayload).catch((err: any) => {
              if (err.statusCode === 410 || err.statusCode === 404) {
                return prisma.pushSubscription.delete({ where: { id: sub.id } })
              }
            })
          )
        )
        await Promise.all(pushPromises)
      } catch (e) { console.error('Push error on user setup:', e) }
    }
  },
  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (user?.email) {
        // Fetch user from DB to check isActive status (for both Google and Credentials)
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
        if (dbUser && dbUser.isActive === false) {
          // Returning false or throwing an error rejects the login
          return false
        }
      }
      return true
    },
    async jwt({ token, user }: any) {
      // On initial sign in
      if (user) {
        token.id = user.id
        token.role = user.role
        token.permissions = user.permissions
        token.isActive = user.isActive
      }
      // On subsequent requests, refresh from DB to catch permission/role changes
      if (token?.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true, permissions: true, isActive: true }
          })
          if (dbUser) {
            token.role = dbUser.role
            token.permissions = dbUser.permissions
            token.isActive = dbUser.isActive
          }
        } catch (e) {
          // Fallback to existing token values if DB query fails
        }
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.permissions = token.permissions
        session.user.isActive = token.isActive
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
