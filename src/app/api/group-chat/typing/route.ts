import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update typing status
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { lastTypingAt: new Date() }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to update typing status', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
