import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN'].includes((session.user as any)?.role || '')) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const pendingUsers = await prisma.user.findMany({
      where: {
        role: 'PENDING'
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ pendingUsers })
  } catch (error) {
    console.error('Error fetching pending users:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
