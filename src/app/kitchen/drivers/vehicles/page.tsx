import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { VehiclesClient } from './VehiclesClient'
import { format, addDays, nextSaturday } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function VehiclesPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!session || !['ADMIN', 'ORDERS_MANAGER', 'KITCHEN'].includes(role)) {
    redirect('/kitchen/drivers')
  }

  // Default to the upcoming Saturday
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilSat = dayOfWeek === 6 ? 0 : 6 - dayOfWeek
  const upcomingShabbat = addDays(today, daysUntilSat)
  const defaultWeekDate = format(upcomingShabbat, 'yyyy-MM-dd')

  const deliveryAreas = await prisma.deliveryArea.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  })

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true }
  })

  return (
    <VehiclesClient
      deliveryAreas={deliveryAreas}
      products={products}
      defaultWeekDate={defaultWeekDate}
    />
  )
}
