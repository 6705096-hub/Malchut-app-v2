import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { isPinned } = await req.json()

    // Optionally check if user is admin, but we'll let anyone pin for now or check role
    const userRole = session.user.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can pin messages' }, { status: 403 })
    }

    // Unpin all other messages if we are pinning this one to only have 1 pinned message
    if (isPinned) {
      await prisma.groupMessage.updateMany({
        where: { isPinned: true },
        data: { isPinned: false }
      })
    }

    const message = await prisma.groupMessage.update({
      where: { id: params.id },
      data: { isPinned }
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('Failed to pin message', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
