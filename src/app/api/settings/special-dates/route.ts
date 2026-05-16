import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const specialDates = await prisma.specialDate.findMany({
      orderBy: { date: 'asc' }
    })
    return NextResponse.json(specialDates)
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, date } = await req.json()
    if (!name || !date) {
      return NextResponse.json({ error: 'Missing name or date' }, { status: 400 })
    }

    const specialDate = await prisma.specialDate.create({
      data: { name, date: new Date(date) }
    })
    return NextResponse.json(specialDate)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'תאריך ספציפי זה כבר קיים ברשימה' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
