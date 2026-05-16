import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { hasPermission } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any)?.role || 'VIEWER'
    const permissions = (session.user as any)?.permissions || {}
    if (role !== 'ADMIN' && !hasPermission(role, permissions, 'settings', 'FULL')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orderedIds, context } = await req.json()
    if (!orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'Missing orderedIds array' }, { status: 400 })
    }
    
    if (context !== 'REGULAR' && context !== 'STORES') {
      return NextResponse.json({ error: 'Invalid context' }, { status: 400 })
    }

    // We can run a transaction to update all products
    const updates = orderedIds.map((id, index) => {
      const data = context === 'STORES' 
        ? { sortOrderStores: index }
        : { sortOrder: index }
      
      return prisma.product.update({
        where: { id },
        data
      })
    })

    await prisma.$transaction(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reorder products:', error)
    return NextResponse.json({ error: 'Failed to reorder products' }, { status: 500 })
  }
}
