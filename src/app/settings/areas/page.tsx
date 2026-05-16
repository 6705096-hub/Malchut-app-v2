import prisma from '@/lib/prisma'
import { AreaManager } from '@/components/AreaManager'
import { RouteManager } from '@/components/RouteManager'
import Link from 'next/link'
import { BackButton } from '@/components/BackButton'

export const dynamic = 'force-dynamic'

export default async function DeliveryAreasSettingsPage() {
  const areas = await prisma.deliveryArea.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { route: true }
  })
  
  const routes = await prisma.route.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { areas: true } } }
  })

  return (
    <div className="h-full flex flex-col pt-4 pb-20">
      <div className="flex justify-between items-center mb-6 mt-[-10px] w-full">
        <h1 className="text-2xl font-black text-gray-900 pr-2 pt-2">אזורי חלוקה</h1>
        <div className="flex items-center gap-3">
          <BackButton />
        </div>
      </div>
      <RouteManager initialRoutes={routes} />
      <hr className="my-10 border-gray-200" />
      <AreaManager initialAreas={areas} routes={routes} />
    </div>
  )
}
