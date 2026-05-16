import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { statusText } = await req.json()

    if (statusText && statusText.length > 50) {
      return NextResponse.json({ error: 'Status too long' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { statusText: statusText || null }
    })

    return NextResponse.json({ success: true, statusText: updated.statusText })
  } catch (error) {
    console.error('Failed to update status', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
