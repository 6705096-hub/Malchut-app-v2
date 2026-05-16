import { getSession } from '@/lib/session'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { HistoryClient } from './HistoryClient'
import { hasPermission } from '@/lib/permissions'

export const metadata = { title: 'היסטוריית ייצור - מלכות קוגל' }

export default async function ProductionHistoryPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const role = (session.user as any)?.role || 'VIEWER'
  const permissions = (session.user as any)?.permissions || {}

  // Only admins or those with FULL kitchen_production permissions
  if (role !== 'ADMIN' && !hasPermission(role, permissions, 'kitchen_production', 'FULL')) {
    redirect('/dashboard')
  }

  const products = await prisma.product.findMany({
    where: { isActive: true, isManufactured: true },
    select: { id: true, name: true, category: true }
  })

  const logs = await prisma.productionLog.findMany({
    orderBy: { dateString: 'desc' }
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">היסטוריית ייצור</h1>
        <p className="text-gray-500 mt-1 font-medium">מעקב, סיכום וניתוח של נתוני הייצור במטבח</p>
      </div>

      <HistoryClient products={products} logs={logs} />
    </div>
  )
}
