import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN'].includes((session.user as any)?.role || '')) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const userId = params.id
    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 })
    }

    // Set user as inactive instead of deleting so they can be unblocked later
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error rejecting user:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
