import prisma from '@/lib/prisma'
import { getHebrewDateString } from '@/lib/hebrewDate'
import { notFound } from 'next/navigation'
import { Printer } from 'lucide-react'

// Add standard caching bypass
export const dynamic = 'force-dynamic'

export default async function PrintRoutePage({ params, searchParams }: any) {
  const routeId = params.routeId
  const dateStr = searchParams.date

  if (!dateStr || !routeId) return notFound()

  const targetDate = new Date(dateStr)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat']
  const targetDayName = dayNames[targetDate.getDay()]

  const routeName = routeId === 'UNASSIGNED' ? 'הזמנות ללא שיוך' : ((await prisma.route.findUnique({ where: { id: routeId } }))?.name || 'רכב לא ידוע')

  const rawOrders = await prisma.order.findMany({
    where: {
      city: 'בית שמש',
      OR: [
        { deliveryWeek: dateStr },
        { deliveryWeek: 'THIS_WEEK', deliveryDay: targetDayName }
      ]
    },
    include: {
      customer: true,
      deliveryArea: true,
      items: {
        include: { product: true }
      }
    },
    orderBy: {
      customer: { name: 'asc' }
    }
  })

  // Filter out orders that don't belong to this active route
  const assignedOrders = rawOrders.filter(order => {
    let activeRouteId = 'UNASSIGNED'
    if (order.routeId) activeRouteId = order.routeId;
    else if (order.deliveryArea?.routeId) activeRouteId = order.deliveryArea.routeId;
    return activeRouteId === routeId
  })

  return (
    <div className="bg-white min-h-screen text-black" dir="rtl">
      <style dangerouslySetInnerHTML={{__html: `
        /* Override the parent mobile layout in screen view */
        @media screen {
          #kitchen-layout-wrapper { max-width: 100% !important; box-shadow: none !important; }
          #kitchen-layout-topbar { display: none !important; }
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}} />
      <script dangerouslySetInnerHTML={{__html: `setTimeout(function() { window.print(); }, 500);`}} />
      
      <div className="w-full print:p-0 p-8">
        <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
          <div>
            <h1 className="text-3xl font-black mb-1">סידור עבודה - {routeName}</h1>
            <h2 className="text-lg font-bold text-gray-700">תאריך הוצאה: {getHebrewDateString(targetDate)}</h2>
          </div>
          <a 
            href="javascript:window.print()" 
            className="no-print bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
          >
            <Printer className="w-5 h-5" /> הדפס מסלול עכשיו
          </a>
        </div>

        <div className="mb-6">
          {assignedOrders.length === 0 ? (
            <p className="text-center text-xl text-gray-400 py-10 font-medium">אין הזמנות משויכות לרכב זה בתאריך הנבחר.</p>
          ) : (
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-black">
                   <th className="py-2 px-1 w-[15%] font-black text-gray-800">שם משפחה</th>
                   <th className="py-2 px-1 w-[20%] font-black text-gray-800">כתובת ונייד</th>
                   <th className="py-2 px-1 w-[50%] font-black text-gray-800">פירוט מוצרים</th>
                   <th className="py-2 px-1 w-[15%] font-black text-gray-800">הערות ותשלום</th>
                </tr>
              </thead>
              <tbody>
                {assignedOrders.map((order: any, index: number) => {
                   const hotItems: string[] = []
                   const coldItems: string[] = []
                   const otherItems: string[] = []
                   
                   order.items.forEach((item: any) => {
                     const pName = item.product.name;
                     const qty = item.quantity;
                     const variant = item.variant;
                     const cat = item.product.category;
                     const isSbb = order.deliveryDay === 'Shabbat';
                     const isOther = cat === 'OTHER';
                     const isHot = !isSbb && !isOther && (variant === 'HOT' || (!variant && cat === 'HOT') || order.type === 'HOT');
                     const isCold = !isSbb && !isOther && (variant === 'COLD' || (!variant && cat === 'COLD') || order.type === 'COLD');
                     
                     if (isHot) hotItems.push(`🔥${pName} ${qty}`)
                     else if (isCold) coldItems.push(`❄️${pName} ${qty}`)
                     else otherItems.push(`${pName} ${qty}`)
                   });
                   
                   const displayAddress = order.address?.replace('ישראל', '').replace('ירושלים', '').replace('בית שמש', '').trim() || order.customZone || order.deliveryArea?.name || '';
                   
                   return (
                     <tr key={order.id} className="border-b border-gray-300 text-black align-top break-inside-avoid">
                       <td className="py-2 px-1 font-bold text-[14px]">
                          <span className="font-black mr-2 opacity-50 bg-gray-100 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs">{index + 1}</span>
                          {order.customer.name}
                       </td>
                       <td className="py-2 px-1 font-medium whitespace-pre-wrap leading-tight text-[13px]">
                          <span className="font-bold">{order.customer.phone}</span>
                          {displayAddress && (
                            <>
                              <br/>
                              {displayAddress}
                            </>
                          )}
                       </td>
                       <td className="py-2 px-1 leading-snug font-medium text-[14px]">
                          {hotItems.length > 0 && <div className="mb-0.5">{hotItems.join(' • ')}</div>}
                          {coldItems.length > 0 && <div className="mb-0.5">{coldItems.join(' • ')}</div>}
                          {otherItems.length > 0 && <div className="mb-0.5">{otherItems.join(' • ')}</div>}
                       </td>
                       <td className="py-2 px-1 text-[13px] text-red-600 flex flex-col gap-0 items-start leading-tight">
                           <div className="text-black font-black text-sm flex flex-wrap items-center justify-start gap-1">
                              ₪{order.totalPrice}
                              {((order.status === 'PAID') || (order.totalPrice > 0 && order.paidAmount >= order.totalPrice)) ? (
                                 <span className="text-green-600 text-[11px] mr-1 drop-shadow-sm">✔</span>
                              ) : (
                                 <span className="text-red-600 text-[11px] font-bold mr-1 drop-shadow-sm">❌</span>
                              )}
                              {(Math.max(0, (order.customer.debt || 0) - (((order.status === 'PAID') || (order.totalPrice > 0 && order.paidAmount >= order.totalPrice)) ? 0 : Math.max(0, order.totalPrice - (order.paidAmount || 0))))) > 0 && (
                                <span className="text-[11px] text-gray-600 font-bold bg-gray-100 px-1 rounded mr-1 leading-none self-center flex items-center h-4">
                                  יתרה ₪{Math.max(0, (order.customer.debt || 0) - (((order.status === 'PAID') || (order.totalPrice > 0 && order.paidAmount >= order.totalPrice)) ? 0 : Math.max(0, order.totalPrice - (order.paidAmount || 0))))}
                                </span>
                              )}
                           </div>
                       
                           {order.notes && <div>{order.notes}</div>}
                        </td>
                     </tr>
                   )
                })}
              </tbody>
            </table>
          )}
        </div>
        
        {assignedOrders.length > 0 && (
           <div className="mt-8 text-center text-gray-500 font-medium no-print">סוף מסלול. נסיעה טובה!</div>
        )}

      </div>
    </div>
  )
}
