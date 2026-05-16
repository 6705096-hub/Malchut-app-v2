import prisma from '@/lib/prisma'
import { UserManager } from '@/components/UserManager'
import { startOfMonth } from 'date-fns'
import Link from 'next/link'
import { BackButton } from '@/components/BackButton'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      isActive: true,
      lastSeenAt: true,
      lastPath: true,
      activityLogs: {
        where: {
          date: { gte: startOfMonth(new Date()) }
        }
      }
    }
  })

  const deliveryAreas = await prisma.deliveryArea.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true }
  })

  return (
    <div className="h-full flex flex-col pt-4 pb-20">
      <div className="flex justify-between items-center mb-6 mt-[-10px] w-full">
        <h1 className="text-2xl font-black text-gray-900 pr-2 pt-2">צוות משתמשים</h1>
        <div className="flex items-center gap-3">
          <BackButton />
        </div>
      </div>
      <UserManager initialUsers={users} deliveryAreas={deliveryAreas} />
    </div>
  )
}
