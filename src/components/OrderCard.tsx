'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Share2, Trash2, Edit } from 'lucide-react'
import { OrderStatusDropdown } from '@/components/OrderStatusDropdown'
import { PaymentAmountToggle } from '@/components/PaymentAmountToggle'
import { OrderHistoryBadge } from '@/app/dashboard/orders/OrderHistoryBadge'
import { getDeliveryHebrewDate, getShabbatDate } from '@/lib/hebrewDate'
import { getParashaForDate } from '@/lib/parasha'
import { initiateCustomerCall } from '@/lib/callCustomer'


export function OrderCard({ 
  order, 
  debtOverride, 
  hideCustomerName = false,
  onDelete,
  onEdit
}: { 
  order: any;
  debtOverride?: number;
  hideCustomerName?: boolean;
  onDelete?: () => void;
  onEdit?: (order: any) => void;
}) {
  const router = useRouter()

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingShare, setConfirmingShare] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    
    try {
      await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
      if (onDelete) onDelete();
      else window.location.reload();
    } catch {
      alert('שגיאה במחיקה')
    }
  }

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!confirmingShare) {
      setConfirmingShare(true);
      return;
    }
    
    setConfirmingShare(false);
    
    const customerName = order.customer?.name || 'לקוח'
    const itemsText = order.items.map((i:any) => `- ${i.product.name} (x${i.quantity})`).join('\n')
    const details = `📋 *הזמנה עבור ${customerName}*\n📍 ${order.city || order.deliveryArea?.name || ''}\n${itemsText}${order.notes ? `\n📝 הערות: ${order.notes}` : ''}`;
    const orderContext = { id: order.id, customerName, details, totalPrice: order.totalPrice };
    const event = new CustomEvent('openTeamChat', { detail: { orderContext } });
    window.dispatchEvent(event);
  }


  return (
    <div 
      id={`order-${order.id}`}
      className={`border border-gray-100 ${
        (order.status === 'EXECUTED' || order.status === 'PAID') 
          ? ((order.totalPrice || 0) - (order.paidAmount || 0) <= 0)
            ? 'bg-gray-50 opacity-70 grayscale-[0.3] status-bar-paid' // Both Executed and Paid
            : 'bg-white status-bar-executed' // Executed but not fully paid
          : 'bg-white status-bar-planned' // Not Executed
      } rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all relative group flex flex-row items-stretch gap-3 print:shadow-none print:border-2 print:border-gray-800 print:rounded-none print:break-inside-avoid print:mb-4 scroll-mt-24 w-full`}
    >
      {/* Info Column (Right side) */}
      <div className="flex flex-row gap-2 w-full justify-between items-stretch py-1 h-full">
        {/* Main Info Column */}
        <div className="flex flex-col min-w-0 flex-1 justify-start">
          {/* Line 1: Date & Parasha & Notes */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {!order.specialDate && (
              <span className="text-purple-600 font-bold text-[10px] whitespace-nowrap bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                {getDeliveryHebrewDate(order.createdAt, order.deliveryDay, order.deliveryWeek, order.specialDate?.name)} • {getParashaForDate(getShabbatDate(order.deliveryWeek, new Date(order.createdAt)))}
              </span>
            )}
            {order.specialDate && (
              <span className="bg-fuchsia-100 text-fuchsia-700 font-black text-[10px] whitespace-nowrap px-1.5 py-0.5 rounded border border-fuchsia-200">
                {order.specialDate.name}
              </span>
            )}
            {order.notes && (
              <span className="bg-red-50 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-100 truncate max-w-[150px]" title={order.notes}>
                📝 {order.notes}
              </span>
            )}
          </div>

          {/* Line 2: Name & Phone (Single Line) */}
          {!hideCustomerName && (
            <div className="flex flex-row items-center gap-2 mb-1 w-full overflow-hidden">
              <h3 
                className="font-black text-gray-900 text-[16px] leading-none shrink-0 truncate hover:text-blue-600 hover:underline cursor-pointer"
                onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/customers/${order.customer?.id}`); }}
                title="מעבר לתיק לקוח"
              >
                {order.customer?.name}
              </h3>
              {order.customer?.phone && (
                <>
                  <span className="text-gray-300 shrink-0">|</span>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      initiateCustomerCall(order.customer.phone);
                    }} 
                    className="text-gray-600 text-[13px] hover:text-blue-600 hover:underline transition-all truncate" 
                    dir="ltr"
                  >
                    {order.customer.phone}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Line 3: Address (Single Line) */}
          {order.address && (
            <div className="flex items-center gap-1 text-gray-600 text-[12px] font-medium leading-tight mb-1 overflow-hidden w-full">
              <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span className="truncate">
                {order.city || 'עיר חסרה'} | 🏠 {order.address.replace('ישראל', '').replace('ירושלים', '').replace('בית שמש', '').trim()}
                {order.pickupLocation && ` (איסוף מ${order.pickupLocation})`}
              </span>
              <a 
                href={`https://waze.com/ul?q=${encodeURIComponent(`${order.address}${order.city ? `, ${order.city}` : ''}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full w-4 h-4 mr-1 shrink-0 transition-all"
                title="נווט עם Waze"
                onClick={(e) => e.stopPropagation()}
              >
                <MapPin className="w-2 h-2" />
              </a>
            </div>
          )}

          {/* Line 4: Products */}
          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[13px] text-gray-800 font-bold leading-tight mt-1">
            {(() => {
              const orderAggregates: Record<string, { hot: number; cold: number; unknown: number }> = {}
              order.items.forEach((item: any) => {
                const pName = item.product.name
                if (!orderAggregates[pName]) orderAggregates[pName] = { hot: 0, cold: 0, unknown: 0 }
                const isSbb = order.deliveryDay === 'Shabbat';
                const isOther = item.product?.category === 'OTHER';
                const isHot = !isSbb && !isOther && (item.variant === 'HOT' || (!item.variant && item.product.category === 'HOT') || order.type === 'HOT')
                const isCold = !isSbb && !isOther && (item.variant === 'COLD' || (!item.variant && item.product.category === 'COLD') || order.type === 'COLD')
                if (isHot) orderAggregates[pName].hot += item.quantity
                else if (isCold) orderAggregates[pName].cold += item.quantity
                else orderAggregates[pName].unknown += item.quantity
              })
              const elements: JSX.Element[] = []
              Object.entries(orderAggregates).forEach(([pName, counts]) => {
                if (counts.hot > 0) elements.push(<span key={`${pName}-hot`} className="inline-flex items-center whitespace-nowrap">{pName} {counts.hot} <span className="text-[10px] mr-0.5">🔥</span></span>)
                if (counts.cold > 0) elements.push(<span key={`${pName}-cold`} className="inline-flex items-center whitespace-nowrap">{pName} {counts.cold} <span className="text-[10px] mr-0.5">❄️</span></span>)
                if (counts.unknown > 0) elements.push(<span key={`${pName}-unk`} className="inline-flex items-center whitespace-nowrap">{pName} {counts.unknown}</span>)
              })
              return elements.map((el, i) => (
                <Fragment key={i}>
                  {el}
                  {i < elements.length - 1 && <span className="mx-0.5 text-gray-400 font-black">•</span>}
                </Fragment>
              ))
            })()}
          </div>

          {/* History Badge */}
          <div className="mt-auto origin-right opacity-70 hover:opacity-100 transition-opacity max-w-[80%] leading-none -mb-1">
            <OrderHistoryBadge order={order} />
          </div>
        </div>

        {/* Action Buttons & Payment (Left Side) */}
        <div className="shrink-0 flex flex-col items-end gap-2 print:hidden pl-1">
          {/* 2x2 Grid of Actions */}
          <div className="grid grid-cols-2 gap-1.5">
            <OrderStatusDropdown orderId={order.id} initialStatus={order.status} compact={true} />
            
            <button 
              onClick={(e) => {
                e.stopPropagation(); 
                if (onEdit) onEdit(order);
                else router.push(`/dashboard/orders/new?edit=${order.id}`);
              }}
              className="flex items-center justify-center text-blue-500 hover:bg-blue-50 hover:text-blue-700 w-7 h-7 rounded-full transition-colors"
              title="ערוך"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>

            {confirmingShare ? (
              <div className="col-span-1 flex items-center justify-between bg-emerald-50 rounded-lg pr-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); setConfirmingShare(false) }}
                  className="text-[10px] text-gray-500 hover:text-gray-700 px-1 py-1 font-bold"
                >ביטול</button>
                <button 
                  onClick={handleShare}
                  className="text-[10px] bg-[#008069] text-white hover:bg-[#005c4b] px-2 py-1 rounded font-bold"
                >שתף?</button>
              </div>
            ) : (
              <button 
                onClick={handleShare}
                className="flex items-center justify-center text-[#008069] hover:bg-[#d9fdd3] hover:text-[#005c4b] w-7 h-7 rounded-full transition-colors"
                title="שתף לצוות"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}
    
            {confirmingDelete ? (
              <div className="col-span-1 flex items-center justify-between bg-red-50 rounded-lg pr-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); setConfirmingDelete(false) }}
                  className="text-[10px] text-gray-500 hover:text-gray-700 px-1 py-1 font-bold"
                >ביטול</button>
                <button 
                  onClick={handleDelete}
                  className="text-[10px] bg-red-500 text-white hover:bg-red-600 px-2 py-1 rounded font-bold"
                >מחק?</button>
              </div>
            ) : (
              <button 
                onClick={handleDelete}
                className="flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 w-7 h-7 rounded-full transition-colors"
                title="מחיקה"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

          </div>

          {/* Payment */}
          <div className="mt-auto pt-1" onClick={e => e.stopPropagation()}>
             <PaymentAmountToggle 
               orderId={order.id} 
               customerId={order.customer?.id || order.customerId}
               initialStatus={order.status} 
               totalPrice={order.totalPrice || 0} 
               debt={debtOverride !== undefined ? debtOverride : (order.customer?.debt || 0)} 
               paidAmount={order.paidAmount || 0}
             />
          </div>
        </div>
      </div>
    </div>
  )
}
