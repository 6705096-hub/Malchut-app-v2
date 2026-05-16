'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, ThumbsUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

type MergedNotification = {
  orderIds: string[]
  itemsSummary: Record<string, number>
  recentCustomerName: string
  ordersCount: number
}

export function KitchenNotifier() {
  const [mergedNotif, setMergedNotif] = useState<MergedNotification | null>(null)
  const [isEnabled, setIsEnabled] = useState(true)
  const lastCheckTime = useRef(new Date().toISOString())
  const seenOrderIds = useRef<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem('kitchenNotificationsEnabled')
    if (saved !== null) {
      setIsEnabled(saved === 'true')
    } else {
      localStorage.setItem('kitchenNotificationsEnabled', 'true')
    }
  }, [])

  useEffect(() => {
    if (!isEnabled) return

    const pollRecentOrders = async () => {
      try {
        const res = await fetch(`/api/orders/recent?since=${lastCheckTime.current}`)
        if (!res.ok) return
        
        const data = await res.json()
        if (data.success) {
          // If orders are globally acknowledged by ANYONE, remove them locally
          if (data.acknowledgedOrderIds && data.acknowledgedOrderIds.length > 0) {
             setMergedNotif(prev => {
                if (!prev) return null;
                const remainingOrderIds = prev.orderIds.filter(id => !data.acknowledgedOrderIds.includes(id));
                if (remainingOrderIds.length === 0) return null; // All cleared!
                
                // Note: technically the itemsSummary doesn't subtract the acknowledged items perfectly here, 
                // but since the popup vanishes quickly when handled, it's acceptable UX to just let it clear completely or stay until mostly cleared.
                return { ...prev, orderIds: remainingOrderIds };
             })
          }

          if (data.orders && data.orders.length > 0) {
            let hasNewHot = false
            let newItemsSummary: Record<string, number> = {}
            let newOrderIds: string[] = []
            let lastCustomer = ''

            for (const order of data.orders) {
              if (seenOrderIds.current.has(order.id)) continue
              seenOrderIds.current.add(order.id)
              
              let orderHasHot = false;
              
              for (const item of order.items) {
                if (item.variant !== 'COLD') {
                  orderHasHot = true;
                  const pName = item.product?.name || 'מוצר';
                  newItemsSummary[pName] = (newItemsSummary[pName] || 0) + item.quantity;
                }
              }
              
              if (orderHasHot) {
                hasNewHot = true
                newOrderIds.push(order.id)
                lastCustomer = order.customer?.name || 'לקוח'
              }
            }

            if (hasNewHot) {
              try {
                const audio = new Audio('/bell.mp3')
                audio.play().catch(e => {})
              } catch (e) { }

              setMergedNotif(prev => {
                 if (!prev) {
                    return {
                       orderIds: newOrderIds,
                       itemsSummary: newItemsSummary,
                       recentCustomerName: lastCustomer,
                       ordersCount: newOrderIds.length
                    }
                 }
                 
                 // Merge with existing
                 const combinedOrderIds = Array.from(new Set([...prev.orderIds, ...newOrderIds]))
                 const combinedSummary = { ...prev.itemsSummary }
                 for (const [pName, qty] of Object.entries(newItemsSummary)) {
                    combinedSummary[pName] = (combinedSummary[pName] || 0) + qty;
                 }
                 
                 return {
                    orderIds: combinedOrderIds,
                    itemsSummary: combinedSummary,
                    recentCustomerName: lastCustomer || prev.recentCustomerName,
                    ordersCount: combinedOrderIds.length
                 }
              })
            }
          }
        }
        lastCheckTime.current = new Date().toISOString()
      } catch (err) {
        console.error('Failed to poll new orders:', err)
      }
    }

    // Faster polling for instant dismissal across devices
    const interval = setInterval(pollRecentOrders, 8 * 1000)
    pollRecentOrders()

    return () => clearInterval(interval)
  }, [isEnabled])

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation() 
    if (!mergedNotif) return

    const orderIdsToAck = [...mergedNotif.orderIds]
    setMergedNotif(null) // Instant local visual hide

    try {
      await fetch(`/api/orders/kitchen-ack-bulk`, { 
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ orderIds: orderIdsToAck })
      })
    } catch(err) {}
  }

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setMergedNotif(null)
  }

  if (!isEnabled || !mergedNotif) return null

  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-3 w-80 pointer-events-none">
      <SwipeableNotification 
         notif={mergedNotif} 
         onDismiss={handleDismiss}
         onAcknowledge={handleAcknowledge}
         onClick={() => {
            // If there's only 1 order, go to it. Otherwise go to list.
            if (mergedNotif.orderIds.length === 1) {
               router.push(`/dashboard/orders/new?edit=${mergedNotif.orderIds[0]}`)
            } else {
               router.push(`/dashboard/orders`)
            }
         }}
      />
    </div>
  )
}

function SwipeableNotification({ notif, onDismiss, onAcknowledge, onClick }: { 
  notif: MergedNotification; 
  onDismiss: (e?: React.MouseEvent) => void;
  onAcknowledge: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const [offsetX, setOffsetX] = useState(0)
  const dragStartX = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    dragStartX.current = clientX
  }

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragStartX.current === null) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const diff = clientX - dragStartX.current
    setOffsetX(diff)
  }

  const handleTouchEnd = () => {
    if (dragStartX.current !== null) {
      if (Math.abs(offsetX) > 80) {
         onDismiss()
      } else {
         setOffsetX(0)
      }
      dragStartX.current = null
    }
  }

  const itemString = Object.entries(notif.itemsSummary).map(([name, qty]) => (
    `${name} ${qty}`
  )).join(' • ');

  return (
    <div 
      className="bg-white pointer-events-auto border-2 border-orange-400 rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-top-5 fade-in duration-300 w-full select-none"
      style={{ transform: `translateX(${offsetX}px)`, transition: dragStartX.current !== null ? 'none' : 'transform 0.2s' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onClick={(e) => {
         // Prevent click if we were dragging more than 20 pixels
         if (Math.abs(offsetX) > 20) return;
         onClick();
      }}
    >
      <div className="p-3 flex items-start gap-3 cursor-pointer">
        <div className="bg-orange-100 p-2 rounded-full shrink-0 animate-pulse mt-1">
          <Bell className="w-5 h-5 text-orange-600" />
        </div>
        <div className="flex-1 pointer-events-none">
          <h4 className="font-black text-orange-900 leading-none mb-2 text-[14px]">הזמנה חמה למטבח</h4>
          
          <div className="text-orange-950 font-bold text-[13px] bg-orange-50/50 rounded-lg p-2 mb-1 shadow-inner leading-relaxed">
            {itemString}
          </div>
          
          <p className="text-orange-600/80 font-bold text-[11px] mt-1.5 pr-1">
            מעודכן מלקוח: {notif.recentCustomerName} {notif.ordersCount > 1 ? `(ועוד ${notif.ordersCount - 1} הזמנות)` : ''}
          </p>
        </div>
        <button 
          onClick={(e) => {
             e.stopPropagation();
             onAcknowledge(e);
          }}
          className="bg-orange-50 hover:bg-orange-100 p-2 rounded-full text-orange-600 transition-colors shrink-0"
          title="לייק - אשר הזמנה מכולם"
        >
          <ThumbsUp className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
