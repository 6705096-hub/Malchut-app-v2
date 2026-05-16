import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await req.json()

    // Clear any existing driver that has this userId
    if (userId) {
      await prisma.driver.updateMany({
        where: { userId },
        data: { userId: null }
      })
    }

    const updated = await prisma.driver.update({
      where: { id: params.id },
      data: { userId }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error linking driver:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
