import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// GET /api/drivers — list all drivers
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'MIDWEEK' | 'SHABBAT' | 'BOTH'
    const city = searchParams.get('city') // 'JERUSALEM' | 'BEIT_SHEMESH'

    const where: any = { isActive: true }
    if (type) where.type = { in: [type, 'BOTH'] }
    if (city) where.city = { in: [city, 'BOTH'] }

    const drivers = await prisma.driver.findMany({
      where,
      include: { assignedAreas: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    })

    return NextResponse.json({ drivers })
  } catch (err: any) {
    console.error('GET /api/drivers error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/drivers — create a new driver
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, city, type, userId } = body

    if (!name || !city || !type) {
      return NextResponse.json({ error: 'name, city, type are required' }, { status: 400 })
    }

    const driver = await prisma.driver.create({
      data: { name, city, type, userId: userId || null }
    })

    return NextResponse.json({ driver })
  } catch (err: any) {
    console.error('POST /api/drivers error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
