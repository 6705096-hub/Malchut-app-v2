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

    const blockedDates = await prisma.blockedDate.findMany({
      orderBy: { date: 'asc' }
    })
    return NextResponse.json(blockedDates)
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

    const { date, reason } = await req.json()
    if (!date) {
      return NextResponse.json({ error: 'Missing date' }, { status: 400 })
    }

    const blockedDate = await prisma.blockedDate.create({
      data: { date: new Date(date), reason }
    })
    return NextResponse.json(blockedDate)
  } catch (error) {
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: 'תאריך זה כבר חסום' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
