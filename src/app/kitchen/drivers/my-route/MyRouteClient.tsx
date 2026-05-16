'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Truck, MapPin, Package, Phone, Printer, Calendar, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import { format } from 'date-fns'
import { getHebrewDateString } from '@/lib/hebrewDate'
import { HebrewDatePicker } from '@/components/HebrewDatePicker'

type Order = {
  id: string
  assignmentSortOrder: number
  customerName: string
  customerPhone: string
  address: string
  city: string
  notes: string | null
  totalPrice: number
  items: { productId: string; productName: string; quantity: number }[]
}

type CargoItem = { productId: string; productName: string; totalQty: number }

type Driver = { id: string; name: string; city: string; type: string }

export function MyRouteClient({
  drivers,
  myDriverId,
  isAdmin,
  hasDriverManagement,
  defaultDateStr
}: {
  drivers: Driver[]
  myDriverId: string | null
  isAdmin: boolean
  hasDriverManagement: boolean
  defaultDateStr: string
}) {
  const router = useRouter()
  const [dateStr, setDateStr] = useState(defaultDateStr)
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(
    myDriverId || (drivers.length === 1 ? drivers[0].id : null)
  )
  const [orders, setOrders] = useState<Order[]>([])
  const [cargoSummary, setCargoSummary] = useState<CargoItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const selectedDriver = drivers.find(d => d.id === selectedDriverId)

  const loadOrders = useCallback(async () => {
    if (!selectedDriverId) { setOrders([]); setCargoSummary([]); return }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/drivers/${selectedDriverId}/orders?dateStr=${dateStr}`)
      const data = await res.json()
      setOrders(data.orders || [])
      setCargoSummary(data.cargoSummary || [])
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }, [selectedDriverId, dateStr])

  useEffect(() => { loadOrders() }, [loadOrders])

  const moveOrder = async (orderId: string, direction: 'up' | 'down') => {
    const idx = orders.findIndex(o => o.id === orderId)
    if (idx < 0) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === orders.length - 1) return

    const newOrders = [...orders]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newOrders[idx], newOrders[swapIdx]] = [newOrders[swapIdx], newOrders[idx]]
    setOrders(newOrders)

    // Persist sort order
    try {
      await fetch(`/api/drivers/${selectedDriverId}/sort`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sortedItems: newOrders.map((o, i) => ({
            orderId: o.id,
            dateStr,
            sortOrder: i
          }))
        })
      })
    } catch (e) { console.error(e) }
  }

  const hebrewDate = getHebrewDateString(new Date(dateStr + 'T12:00:00'))

  return (
    <div className="flex flex-col gap-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => {
            if (hasDriverManagement) {
              router.push('/kitchen/drivers')
            } else {
              router.push('/dashboard')
            }
          }} 
          className="p-2 hover:bg-gray-100 rounded-xl"
        >
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-900">
            {myDriverId && !isAdmin ? `המסלול שלי` : 'כרטסת נהג'}
          </h1>
          <p className="text-xs text-gray-500">הזמנות מוקצות לתאריך הנבחר</p>
        </div>
      </div>

      {/* Date picker — compact */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="text-xs font-bold text-gray-500 uppercase shrink-0">תאריך:</span>
        <HebrewDatePicker
          selectedDate={new Date(dateStr + 'T12:00:00')}
          onSelect={(d) => setDateStr(format(d, 'yyyy-MM-dd'))}
          customTriggerLabel={hebrewDate}
        />
      </div>

      {/* Driver selector (admin only / multiple drivers) */}
      {drivers.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <label className="text-xs font-bold text-gray-500 uppercase block mb-2">בחר נהג</label>
          <div className="flex flex-wrap gap-2">
            {drivers.map(driver => (
              <button
                key={driver.id}
                onClick={() => setSelectedDriverId(prev => prev === driver.id ? null : driver.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border ${
                  selectedDriverId === driver.id
                    ? 'bg-slate-800 text-white border-slate-800 shadow'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-slate-400'
                }`}
              >
                <Truck className="w-4 h-4" />
                {driver.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {!selectedDriverId ? (
        <div className="text-center py-16 text-gray-400">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">בחר נהג כדי לראות את המסלול</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
        </div>
      ) : (
        <>
          {/* Cargo summary */}
          {cargoSummary.length > 0 && (
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4">
              <h3 className="text-xs font-black text-blue-900 uppercase mb-3 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> מה להכניס לרכב — {hebrewDate}
              </h3>
              <div className="flex flex-wrap gap-2">
                {cargoSummary.map(item => (
                  <div key={item.productId} className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">{item.productName}</span>
                    <span className="font-black text-blue-700 text-lg">×{item.totalQty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders list */}
          {orders.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold">אין הזמנות מוקצות ל{selectedDriver?.name}</p>
              <p className="text-sm">לתאריך {hebrewDate}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Truck className="w-4 h-4" /> {selectedDriver?.name}
                  </h2>
                  <p className="text-xs text-slate-500">{orders.length} הזמנות · {hebrewDate}</p>
                </div>
                <button
                  onClick={() => window.open(`/kitchen/drivers/print/${selectedDriverId}?dateStr=${dateStr}`, '_blank')}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
                >
                  <Printer className="w-3.5 h-3.5" /> הדפס
                </button>
              </div>

              <div className="divide-y divide-gray-50">
                {orders.map((order, idx) => (
                  <div key={order.id} className="p-3 flex items-start gap-3">
                    {/* Number + sort buttons */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <button
                        onClick={() => moveOrder(order.id, 'up')}
                        disabled={idx === 0}
                        className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveOrder(order.id, 'down')}
                        disabled={idx === orders.length - 1}
                        className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Order info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-gray-900">{order.customerName}</div>
                      <a href={`tel:${order.customerPhone}`} className="text-xs text-blue-600 flex items-center gap-1 mt-0.5 hover:underline w-fit">
                        <Phone className="w-3 h-3" /> {order.customerPhone}
                      </a>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {order.address || '—'}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {order.items.map(item => (
                          <span key={item.productId} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                            {item.productName} ×{item.quantity}
                          </span>
                        ))}
                      </div>
                      {order.notes && (
                        <p className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-lg mt-1.5">📝 {order.notes}</p>
                      )}
                    </div>

                    <div className="text-sm font-black text-gray-700 shrink-0">₪{order.totalPrice}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
