import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/permissions'
import { ProductionClient } from './ProductionClient'
import { parseISO, format, isValid } from 'date-fns'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: '\u05d4\u05d6\u05e0\u05ea \u05d9\u05d9\u05e6\u05d5\u05e8 \u05d9\u05d5\u05de\u05d9',
}

export default async function ProductionPage({ searchParams }: { searchParams: { date?: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = (session.user as any)?.role || 'VIEWER'
  const permissions = (session.user as any)?.permissions || {}

  if (!hasPermission(role, permissions, 'kitchen_production', 'READ')) {
    redirect('/kitchen')
  }

  const canEdit = hasPermission(role, permissions, 'kitchen_production', 'FULL')

  // Default to today if no date param
  let targetDate = new Date()
  if (searchParams?.date) {
    const parsed = parseISO(searchParams.date)
    if (isValid(parsed)) targetDate = parsed
  }
  const dateStr = format(targetDate, 'yyyy-MM-dd')

  const allProducts = await prisma.product.findMany({
    where: { isActive: true, isManufactured: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }]
  })

  const allLogs = await prisma.productionLog.findMany({
    orderBy: { dateString: 'desc' },
    select: { dateString: true, productId: true, quantityProduced: true }
  })

  const productsData = allProducts.map(p => {
    const todayLog = allLogs.find(l => l.productId === p.id && l.dateString === dateStr)
    return {
      id: p.id,
      name: p.name,
      produced: todayLog?.quantityProduced ?? 0,
      inStock: p.inStock
    }
  })

  return (
    <div className="pb-24">
      <ProductionClient targetDateISO={dateStr} productsData={productsData} canEdit={canEdit} />
    </div>
  )
}
