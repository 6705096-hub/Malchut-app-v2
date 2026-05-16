import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { DriversClient } from './DriversClient'
import { hasPermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function DriversPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!session || !['ADMIN', 'ORDERS_MANAGER', 'KITCHEN', 'DRIVER'].includes(role)) {
    redirect('/dashboard')
  }

  const permissions = (session.user as any)?.permissions || {}
  const canEditDrivers = hasPermission(role, permissions, 'kitchen_drivers_edit', 'FULL')
  const canLinkDrivers = hasPermission(role, permissions, 'kitchen_drivers_link', 'FULL')
  const canAssignAreas = hasPermission(role, permissions, 'kitchen_drivers_areas', 'FULL')
  
  const userId = (session.user as any)?.id

  // Fetch all drivers
  const drivers = await prisma.driver.findMany({
    where: { isActive: true },
    include: { assignedAreas: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
  })

  // Fetch all delivery areas for Shabbat assignment
  const deliveryAreas = await prisma.deliveryArea.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  })

  // Fetch all system users to allow linking
  const systemUsers = await prisma.user.findMany({
    select: { id: true, name: true, phone: true },
    orderBy: { name: 'asc' }
  })

  // Find if this user is a linked driver
  const myDriver = drivers.find(d => d.userId === userId) || null

  return (
    <DriversClient
      initialDrivers={drivers}
      deliveryAreas={deliveryAreas}
      systemUsers={systemUsers}
      canEditDrivers={canEditDrivers}
      canLinkDrivers={canLinkDrivers}
      canAssignAreas={canAssignAreas}
      myDriverId={myDriver?.id || null}
      currentUserId={userId}
    />
  )
}
