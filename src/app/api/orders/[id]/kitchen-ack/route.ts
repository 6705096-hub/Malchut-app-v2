import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = params.id

    // Record the acknowledgment
    await prisma.orderHistory.create({
      data: {
        orderId,
        userId: (session.user as any).id,
        action: 'KITCHEN_ACKNOWLEDGED'
      }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Failed to acknowledge order:', err)
    return NextResponse.json({ error: 'Failed to acknowledge order' }, { status: 500 })
  }
}
