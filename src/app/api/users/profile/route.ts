import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    const email = session?.user?.email
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, image } = await req.json()

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (image !== undefined) updateData.image = image // base64 or null

    const user = await prisma.user.update({
      where: { email },
      data: updateData,
      select: { id: true, name: true, image: true, email: true }
    })

    return NextResponse.json({ success: true, user })
  } catch (error: any) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
