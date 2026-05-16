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

    const body = await req.json().catch(() => ({}))
    const assignedRole = body.role || 'USER'

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: assignedRole }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error('Error approving user:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
