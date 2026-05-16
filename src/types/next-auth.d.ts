import { DefaultSession, DefaultUser } from 'next-auth'
import { Role } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      permissions: any
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role: Role
    permissions: any
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    permissions: any
  }
}
