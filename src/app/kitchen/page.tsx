import prisma from '@/lib/prisma'
import { KitchenFilters } from '@/components/KitchenFilters'
import { KitchenProductionItem } from '@/components/KitchenProductionItem'
import { BackButton } from '@/components/BackButton'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function KitchenReports({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const role = (session.user as any)?.role || 'VIEWER'
  const permissions = (session.user as any)?.permissions
  if (!hasPermission(role, permissions, 'kitchen_events', 'READ')) redirect('/menu')
  
  const canEdit = hasPermission(role, permissions, 'kitchen_events', 'FULL')

  const kFilter = typeof searchParams.kitchenFilter === 'string' ? searchParams.kitchenFilter : undefined

  const typeFilter = typeof searchParams.type === 'string' ? searchParams.type : undefined
  const areaFilter = typeof searchParams.area === 'string' ? searchParams.area : undefined
  const dayFilter = typeof searchParams.day === 'string' ? searchParams.day : undefined
  const weekFilter = (typeof searchParams.week === 'string' ? searchParams.week : 'THIS_WEEK') as 'THIS_WEEK' | 'NEXT_WEEK'

  // Fetch areas for the filter dropdown
  const deliveryAreas = await prisma.deliveryArea.findMany({ 
    where: { isActive: true },
    orderBy: { name: 'asc' } 
  })

  // Fetch active orders that are not EXECUTED
  const orderWhereParams: any = { 
    status: { not: 'EXECUTED' },
    deliveryWeek: weekFilter
  }
  
  if (typeFilter) orderWhereParams.type = typeFilter
  if (areaFilter) orderWhereParams.deliveryAreaId = areaFilter
  if (dayFilter) orderWhereParams.deliveryDay = dayFilter

  if (kFilter === 'jerusalem') orderWhereParams.city = 'ירושלים'
  if (kFilter === 'beitshemesh') orderWhereParams.city = 'בית שמש'
  if (kFilter === 'shabbat') orderWhereParams.deliveryDay = 'Shabbat'
  if (kFilter === 'midweek') orderWhereParams.deliveryDay = { notIn: ['Shabbat', 'Wednesday_Stores'] }
  if (kFilter === 'stores') orderWhereParams.deliveryDay = 'Wednesday_Stores'

  const orders = await prisma.order.findMany({
    where: orderWhereParams,
    include: {
      items: {
        include: { product: true }
      },
      deliveryArea: true
    }
  })

  // Aggregate products for Kitchen
  type ProductGroup = {
    product: any;
    type: string;
    totalQuantity: number;
    areaBreakdown: Record<string, number>;
  };

  const productionMap = new Map<string, ProductGroup>();

  orders.forEach(order => {
    const areaName = order.deliveryArea?.name || 'ללא אזור';

    order.items.forEach(item => {
      // Use the order type if available, otherwise fallback to product category if needed
      const itemType = order.type || 'COLD'
      const key = `${item.productId}-${itemType}`
      
      if (!productionMap.has(key)) {
        productionMap.set(key, { 
          product: item.product, 
          type: itemType,
          totalQuantity: 0,
          areaBreakdown: {}
        })
      }
      const pGroup = productionMap.get(key)!
      pGroup.totalQuantity += item.quantity
      pGroup.areaBreakdown[areaName] = (pGroup.areaBreakdown[areaName] || 0) + item.quantity
    })
  })

  const productionItems = Array.from(productionMap.values())
    .filter(i => i.product.isManufactured) // Only show products that require manufacturing tracking
    .sort((a, b) => a.product.name.localeCompare(b.product.name))

  const hotItems = productionItems.filter(i => i.type === 'HOT')
  const coldItems = productionItems.filter(i => i.type === 'COLD')

  // Fetch production batches to get currently produced quantities
  const targetDateString = `${weekFilter}_${dayFilter || 'ALL'}`
  const batches = await prisma.productionBatch.findMany({
    where: { targetDateString }
  })
  
  const producedMap = new Map<string, number>()
  batches.forEach(b => {
    producedMap.set(b.productId, b.producedQuantity)
  })

  const renderAreaBreakdown = (breakdown: Record<string, number>) => {
    return Object.entries(breakdown)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([area, qty]) => (
        <div key={area} className="flex justify-between items-center text-sm py-1 border-t border-gray-50 mt-1 first:mt-2 first:border-0 last:pb-0 pr-1">
          <span className="text-gray-500 font-medium">{area}</span>
          <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md text-xs">{qty}</span>
        </div>
      ))
  }

  return (
    <div className="h-full flex flex-col pt-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-2xl font-black text-gray-900">סיכום מטבח</h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{weekFilter.replace('_', ' ')}</p>
          <p className="font-black text-blue-600">{dayFilter || 'כל הימים'}</p>
        </div>
      </div>

      <KitchenFilters areas={deliveryAreas} />

      <div className="space-y-8">
        {/* HOT ITEMS SECTION */}
        {(typeFilter === undefined || typeFilter === 'HOT') && (
          <section>
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
              <h2 className="text-lg font-black text-gray-900">מוצרים חמים</h2>
              <span className="mr-auto bg-red-50 text-red-600 text-xs font-black px-2 py-1 rounded-lg">
                סה״כ {hotItems.reduce((acc, i) => acc + i.totalQuantity, 0)}
              </span>
            </div>
            
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden px-4 py-2">
              {hotItems.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm font-medium">אין מוצרים חמים בהתאם לסינון</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {hotItems.map((item, idx) => (
                    <KitchenProductionItem 
                      key={item.product.id}
                      productId={item.product.id}
                      productName={item.product.name}
                      totalQuantity={item.totalQuantity}
                      targetDateString={targetDateString}
                      initialProduced={producedMap.get(item.product.id) || 0}
                      areaBreakdown={item.areaBreakdown}
                      theme="HOT"
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* COLD ITEMS SECTION */}
        {(typeFilter === undefined || typeFilter === 'COLD') && (
          <section>
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <h2 className="text-lg font-black text-gray-900">מוצרים קרים</h2>
              <span className="mr-auto bg-blue-50 text-blue-600 text-xs font-black px-2 py-1 rounded-lg">
                סה״כ {coldItems.reduce((acc, i) => acc + i.totalQuantity, 0)}
              </span>
            </div>
            
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden px-4 py-2">
              {coldItems.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm font-medium">אין מוצרים קרים בהתאם לסינון</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {coldItems.map((item, idx) => (
                    <KitchenProductionItem 
                      key={item.product.id}
                      productId={item.product.id}
                      productName={item.product.name}
                      totalQuantity={item.totalQuantity}
                      targetDateString={targetDateString}
                      initialProduced={producedMap.get(item.product.id) || 0}
                      areaBreakdown={item.areaBreakdown}
                      theme="COLD"
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
