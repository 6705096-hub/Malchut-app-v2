import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, date } = await req.json()
    if (!name || !date) {
      return NextResponse.json({ error: 'Missing name or date' }, { status: 400 })
    }

    const specialDate = await prisma.specialDate.update({
      where: { id: params.id },
      data: { name, date: new Date(date) }
    })
    
    return NextResponse.json(specialDate)
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optional: Check if orders exist for this special date before deleting
    // If we delete, it cascades or just nullifies depending on relation settings.
    // Our schema has specialDateId String? which means it can be nullified, or we can just reject deletion.
    
    await prisma.specialDate.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
