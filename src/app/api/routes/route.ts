import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'KITCHEN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const routes = await prisma.route.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { areas: true } } }
    })
    return NextResponse.json({ routes })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch routes' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'KITCHEN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { name, type } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const newRoute = await prisma.route.create({
      data: { name, type: type || 'SHABBAT' }
    })
    return NextResponse.json({ success: true, route: newRoute })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Route name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create route' }, { status: 500 })
  }
}
