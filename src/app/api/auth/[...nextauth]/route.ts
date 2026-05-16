import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

if (!process.env.NEXTAUTH_URL) {
  console.warn('NEXTAUTH_URL missing, applying fallback to malchut-app-production.up.railway.app')
  process.env.NEXTAUTH_URL = 'https://malchut-app-production.up.railway.app'
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
