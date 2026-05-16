import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { MyRouteClient } from './MyRouteClient'
import { format } from 'date-fns'
import { hasPermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function MyRoutePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const role = (session?.user as any)?.role
  const userId = (session.user as any)?.id

  if (!['ADMIN', 'ORDERS_MANAGER', 'KITCHEN', 'DRIVER'].includes(role)) {
    redirect('/dashboard')
  }

  const isAdmin = ['ADMIN', 'ORDERS_MANAGER'].includes(role)

  // Find if this user is linked to a driver
  let myDriver = null
  if (userId) {
    myDriver = await prisma.driver.findFirst({
      where: { userId, isActive: true }
    })
  }

  // Admins can see all drivers; linked drivers see only their own
  const drivers = isAdmin
    ? await prisma.driver.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
      })
    : myDriver
    ? [myDriver]
    : []

  const hasDriverManagement = isAdmin || hasPermission(role, (session.user as any)?.permissions, 'kitchen_driver_assign', 'READ') || hasPermission(role, (session.user as any)?.permissions, 'kitchen_drivers_view', 'READ')

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  return (
    <MyRouteClient
      drivers={drivers}
      myDriverId={myDriver?.id || null}
      isAdmin={isAdmin}
      hasDriverManagement={hasDriverManagement}
      defaultDateStr={todayStr}
    />
  )
}
