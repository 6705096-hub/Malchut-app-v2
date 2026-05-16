import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || ''
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { name, phone } = await req.json()

    // Note: We don't usually allow changing email as it's the identifier, but we allow name and phone.
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: { name, phone }
    })

    return NextResponse.json({ success: true, user: { name: user.name, email: user.email, phone: user.phone } })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
