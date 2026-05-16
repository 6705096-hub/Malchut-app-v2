import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderedIds } = await req.json()

    // orderedIds is an array of area IDs in the new correct order
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.deliveryArea.update({
          where: { id },
          data: { sortOrder: index }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reorder error:', error)
    return NextResponse.json({ error: 'Failed to reorder areas' }, { status: 500 })
  }
}
