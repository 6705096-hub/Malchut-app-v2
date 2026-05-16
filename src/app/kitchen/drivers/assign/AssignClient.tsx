'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, Truck, User, MapPin, Package, Check, X, Loader2, Printer, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { getHebrewDateString } from '@/lib/hebrewDate'
import { HebrewDatePicker } from '@/components/HebrewDatePicker'

type Order = {
  id: string
  customerName: string
  customerPhone: string
  address: string
  city: string
  deliveryArea: string | null
  notes: string | null
  totalPrice: number
  items: { productId: string; productName: string; quantity: number }[]
}

type CargoItem = { productId: string; productName: string; totalQty: number }

type Driver = { id: string; name: string; city: string; type: string }

const CITY_OPTIONS = [
  { value: 'JERUSALEM', label: 'ירושלים' },
  { value: 'BEIT_SHEMESH', label: 'בית שמש' },
  { value: 'BOTH', label: 'הכל' }
]

export function AssignClient({ initialDrivers }: { initialDrivers: Driver[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(searchParams.get('driverId'))
  const [filterCity, setFilterCity] = useState<string>('BEIT_SHEMESH')

  const [unassignedOrders, setUnassignedOrders] = useState<Order[]>([])
  const [driverOrders, setDriverOrders] = useState<Order[]>([])
  const [cargoSummary, setCargoSummary] = useState<CargoItem[]>([])
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const selectedDriver = initialDrivers.find(d => d.id === selectedDriverId)

  const loadUnassigned = useCallback(async () => {
    setIsLoading(true)
    try {
      const city = filterCity === 'BOTH' ? '' : `&city=${filterCity}`
      const res = await fetch(`/api/drivers/unassigned-orders?dateStr=${dateStr}${city}`)
      const data = await res.json()
      setUnassignedOrders(data.orders || [])
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }, [dateStr, filterCity])

  const loadDriverOrders = useCallback(async () => {
    if (!selectedDriverId) { setDriverOrders([]); setCargoSummary([]); return }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/drivers/${selectedDriverId}/orders?dateStr=${dateStr}`)
      const data = await res.json()
      setDriverOrders(data.orders || [])
      setCargoSummary(data.cargoSummary || [])
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }, [selectedDriverId, dateStr])

  useEffect(() => {
    loadUnassigned()
    loadDriverOrders()
  }, [loadUnassigned, loadDriverOrders])

  const handleAssign = async () => {
    if (!selectedDriverId || selectedOrderIds.size === 0 || isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/drivers/${selectedDriverId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: Array.from(selectedOrderIds), dateStr })
      })
      if (!res.ok) throw new Error('שגיאה בשיוך')
      setSelectedOrderIds(new Set())
      await loadUnassigned()
      await loadDriverOrders()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUnassign = async (orderId: string) => {
    if (!selectedDriverId) return
    try {
      await fetch(`/api/drivers/${selectedDriverId}/orders`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [orderId], dateStr })
      })
      await loadUnassigned()
      await loadDriverOrders()
    } catch (e) { console.error(e) }
  }

  const toggleSelect = (id: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedOrderIds.size === unassignedOrders.length) {
      setSelectedOrderIds(new Set())
    } else {
      setSelectedOrderIds(new Set(unassignedOrders.map(o => o.id)))
    }
  }

  const dateObj = new Date(dateStr + 'T12:00:00')
  const hebrewDate = getHebrewDateString(dateObj)

  return (
    <div className="flex flex-col gap-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/kitchen/drivers')} className="p-2 hover:bg-gray-100 rounded-xl">
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-900">שיוך הזמנות לנהגים</h1>
          <p className="text-xs text-gray-500">בחר תאריך, נהג, וסמן הזמנות</p>
        </div>
      </div>

      {/* Date + City Filter — two separate rows */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        {/* Row 1: Date */}
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="text-xs font-bold text-gray-500 uppercase shrink-0">תאריך:</span>
          <HebrewDatePicker
            selectedDate={new Date(dateStr + 'T12:00:00')}
            onSelect={(d) => setDateStr(format(d, 'yyyy-MM-dd'))}
            customTriggerLabel={hebrewDate}
          />
        </div>

        <div className="border-t border-gray-50" />

        {/* Row 2: City filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase shrink-0">עיר:</span>
          <div className="flex gap-1.5 flex-1">
            {CITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterCity(opt.value)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${filterCity === opt.value ? 'bg-slate-800 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Driver Selection */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">בחר נהג</label>
        <div className="flex flex-wrap gap-2">
          {initialDrivers.map(driver => (
            <button
              key={driver.id}
              onClick={() => setSelectedDriverId(prev => prev === driver.id ? null : driver.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border ${selectedDriverId === driver.id
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

      {/* Main two-panel layout */}
      <div className="grid grid-cols-1 gap-4">

        {/* Unassigned orders pool */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
            <div>
              <h2 className="font-black text-amber-900 text-sm">הזמנות לשיוך</h2>
              <p className="text-xs text-amber-700">{unassignedOrders.length} הזמנות ממתינות</p>
            </div>
            {selectedDriverId && unassignedOrders.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-lg"
                >
                  {selectedOrderIds.size === unassignedOrders.length ? 'בטל הכל' : 'סמן הכל'}
                </button>
                {selectedOrderIds.size > 0 && (
                  <button
                    onClick={handleAssign}
                    disabled={isSaving}
                    className="text-xs font-bold text-white bg-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    שייך ({selectedOrderIds.size})
                  </button>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
            </div>
          ) : unassignedOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Check className="w-10 h-10 mx-auto mb-2 text-green-400" />
              <p className="font-bold text-green-700">כל ההזמנות שויכו!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {unassignedOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => selectedDriverId && toggleSelect(order.id)}
                  className={`p-3 flex items-start gap-3 transition-colors ${selectedDriverId ? 'cursor-pointer' : 'cursor-default'} ${selectedOrderIds.has(order.id) ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                >
                  {selectedDriverId && (
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.has(order.id)}
                      onChange={() => toggleSelect(order.id)}
                      className="mt-1 w-4 h-4 accent-slate-700 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-900 text-sm">{order.customerName}</span>
                      {order.city && <span className="text-xs text-gray-400">{order.city}</span>}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {order.address || '—'}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {order.items.map(item => (
                        <span key={item.productId} className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-medium">
                          {item.productName} ×{item.quantity}
                        </span>
                      ))}
                    </div>
                    {order.notes && <p className="text-xs text-orange-600 mt-1">📝 {order.notes}</p>}
                  </div>
                  <span className="text-sm font-bold text-gray-700 shrink-0">₪{order.totalPrice}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Driver's current orders + cargo summary */}
        {selectedDriver && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4" /> {selectedDriver.name}
                </h2>
                <p className="text-xs text-slate-600">{driverOrders.length} הזמנות מוקצות</p>
              </div>
              {driverOrders.length > 0 && (
                <button
                  onClick={() => window.open(`/kitchen/drivers/print/${selectedDriver.id}?dateStr=${dateStr}`, '_blank')}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
                >
                  <Printer className="w-3.5 h-3.5" /> הדפסה
                </button>
              )}
            </div>

            {/* Cargo Summary */}
            {cargoSummary.length > 0 && (
              <div className="p-3 bg-blue-50/50 border-b border-blue-100">
                <h3 className="text-xs font-black text-blue-900 uppercase mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> סיכום מה להכניס לרכב
                </h3>
                <div className="flex flex-wrap gap-2">
                  {cargoSummary.map(item => (
                    <div key={item.productId} className="bg-white border border-blue-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{item.productName}</span>
                      <span className="text-sm font-black text-blue-700">×{item.totalQty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Driver's orders list */}
            {driverOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">אין הזמנות עדיין לנהג זה</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {driverOrders.map((order, idx) => (
                  <div key={order.id} className="p-3 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-gray-900 text-sm">{order.customerName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {order.address || '—'}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {order.items.map(item => (
                          <span key={item.productId} className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                            {item.productName} ×{item.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnassign(order.id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="הסר שיוך"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
