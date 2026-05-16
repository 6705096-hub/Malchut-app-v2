'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Truck, Plus, Package, Check, X, AlertTriangle, Loader2, Edit2, Trash2, MapPin, Printer } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { getHebrewDateString } from '@/lib/hebrewDate'
import { HebrewDatePicker } from '@/components/HebrewDatePicker'

type Area = { id: string; name: string }
type Product = { id: string; name: string }
type CargoEntry = {
  productId: string
  productName: string
  orderedQty: number
  loadedQty: number
  remainingQty: number
}
type Vehicle = {
  id: string
  name: string
  weekDate: string
  areas: { id: string; deliveryAreaId: string; areaName: string }[]
  orderCount: number
  cargoSummary: CargoEntry[]
}

export function VehiclesClient({
  deliveryAreas,
  products,
  defaultWeekDate
}: {
  deliveryAreas: Area[]
  products: Product[]
  defaultWeekDate: string
}) {
  const router = useRouter()
  const [weekDate, setWeekDate] = useState(defaultWeekDate)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set())
  const [predictions, setPredictions] = useState<Record<string, Record<string, { recommendedLoad: number, spare: number }>>>({})

  // Add vehicle form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newVehicleName, setNewVehicleName] = useState('')
  const [newVehicleAreas, setNewVehicleAreas] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  // Edit vehicle state
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null)
  const [editVehicleName, setEditVehicleName] = useState('')
  const [editVehicleAreas, setEditVehicleAreas] = useState<Set<string>>(new Set())

  const loadVehicles = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/drivers/vehicles?weekDate=${weekDate}`)
      const data = await res.json()
      setVehicles(data.vehicles || [])
      // Auto-expand first vehicle
      if (data.vehicles?.length > 0 && !expandedId) {
        setExpandedId(data.vehicles[0].id)
      }
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }, [weekDate])

  const loadPredictions = useCallback(async () => {
    try {
      const res = await fetch(`/api/drivers/vehicles/prediction?weekDate=${weekDate}`)
      const data = await res.json()
      if (data.predictions) {
        setPredictions(data.predictions)
      }
    } catch (e) { console.error('Failed to load predictions', e) }
  }, [weekDate])

  useEffect(() => { 
    loadVehicles()
    loadPredictions()
  }, [loadVehicles, loadPredictions])

  const handleAddVehicle = async () => {
    if (!newVehicleName.trim() || isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/drivers/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVehicleName,
          weekDate,
          areaIds: Array.from(newVehicleAreas)
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewVehicleName('')
      setNewVehicleAreas(new Set())
      setShowAddForm(false)
      loadVehicles()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const startEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id)
    setEditVehicleName(vehicle.name)
    setEditVehicleAreas(new Set(vehicle.areas.map(a => a.deliveryAreaId)))
  }

  const handleSaveEditVehicle = async () => {
    if (!editingVehicleId || !editVehicleName.trim() || isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/drivers/vehicles/${editingVehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editVehicleName,
          areaIds: Array.from(editVehicleAreas)
        })
      })
      if (!res.ok) throw new Error('שגיאה בעדכון רכב')
      setEditingVehicleId(null)
      loadVehicles()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (!confirm(`למחוק את הרכב "${vehicle.name}"?`)) return
    try {
      const res = await fetch(`/api/drivers/vehicles/${vehicle.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('שגיאה במחיקה')
      loadVehicles()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleUpdateLoad = async (vehicleId: string, productId: string, loadedQty: number) => {
    try {
      await fetch(`/api/drivers/vehicles/${vehicleId}/load`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, loadedQty })
      })
      // Optimistic update
      setVehicles(prev => prev.map(v => {
        if (v.id !== vehicleId) return v
        return {
          ...v,
          cargoSummary: v.cargoSummary.map(c =>
            c.productId === productId
              ? { ...c, loadedQty, remainingQty: c.orderedQty - loadedQty }
              : c
          )
        }
      }))
    } catch (e) { console.error(e) }
  }

  const hebrewDate = getHebrewDateString(new Date(weekDate + 'T12:00:00'))

  const totalOrdered = (vehicle: Vehicle) => vehicle.cargoSummary.reduce((s, c) => s + c.orderedQty, 0)
  const totalLoaded = (vehicle: Vehicle) => vehicle.cargoSummary.reduce((s, c) => s + c.loadedQty, 0)
  const totalMissing = (vehicle: Vehicle) => vehicle.cargoSummary.reduce((s, c) => s + Math.max(0, c.orderedQty - c.loadedQty), 0)
  const totalSpare = (vehicle: Vehicle) => vehicle.cargoSummary.reduce((s, c) => s + Math.max(0, c.loadedQty - c.orderedQty), 0)

  const globalSummary = useMemo(() => {
    const summary: Record<string, {
      productName: string
      orderedQty: number
      loadedQty: number
      recommendedLoad: number
      spare: number
    }> = {}

    vehicles.forEach(v => {
      v.cargoSummary.forEach(item => {
        if (!summary[item.productId]) {
          summary[item.productId] = {
            productName: item.productName,
            orderedQty: 0,
            loadedQty: 0,
            recommendedLoad: 0,
            spare: 0
          }
        }
        summary[item.productId].orderedQty += item.orderedQty
        summary[item.productId].loadedQty += item.loadedQty
      })
    })

    Object.keys(predictions).forEach(vehicleId => {
      Object.keys(predictions[vehicleId]).forEach(productId => {
        if (summary[productId]) {
           summary[productId].recommendedLoad += predictions[vehicleId][productId].recommendedLoad
           summary[productId].spare += predictions[vehicleId][productId].spare
        }
      })
    })

    return Object.values(summary).sort((a, b) => a.productName.localeCompare(b.productName, 'he'))
  }, [vehicles, predictions])

  return (
    <>
    <div className="flex flex-col gap-5 pb-24 print:hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/kitchen/drivers')} className="p-2 hover:bg-gray-100 rounded-xl">
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900">רכבי שבת — ניהול טעינה</h1>
            <p className="text-xs text-gray-500">שיוך אזורים לרכבים ומעקב אחר העמסה</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors shrink-0">
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">הדפס דוח</span>
        </button>
      </div>

      {/* Week date selector — compact */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
        <Truck className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="text-xs font-bold text-gray-500 shrink-0">שבת:</span>
        <HebrewDatePicker
          selectedDate={new Date(weekDate + 'T12:00:00')}
          onSelect={(d) => setWeekDate(format(d, 'yyyy-MM-dd'))}
          customTriggerLabel={hebrewDate}
        />
      </div>

      {/* Global Summary */}
      {globalSummary.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="font-black text-gray-900 mb-4 text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" />
            סיכום סחורה כולל
          </h2>
          <div className="space-y-2">
            {globalSummary.filter(s => s.orderedQty > 0 || s.loadedQty > 0).map(item => {
              const diff = item.loadedQty - item.orderedQty;
              return (
                <div key={item.productName} className="flex items-center justify-between p-2 rounded-xl border border-gray-100 bg-gray-50/50 gap-2 overflow-x-auto whitespace-nowrap">
                  <div className="font-bold text-gray-800 text-xs shrink-0 pl-1">{item.productName}</div>
                  <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
                    <span className="text-gray-600 bg-gray-100 font-bold px-1.5 py-0.5 rounded">
                      הוזמן: {item.orderedQty}
                    </span>
                    {item.loadedQty > 0 && (
                      <span className="text-indigo-700 bg-indigo-100 font-bold px-1.5 py-0.5 rounded">
                        הוכנס: {item.loadedQty}
                      </span>
                    )}
                    {diff < 0 && (
                      <span className="text-orange-700 bg-orange-100 font-bold px-1.5 py-0.5 rounded">
                        חסר: {Math.abs(diff)}
                      </span>
                    )}
                    {diff > 0 && (
                      <span className="text-green-700 bg-green-100 font-bold px-1.5 py-0.5 rounded">
                        ספייר: {diff}
                      </span>
                    )}
                    {diff === 0 && item.orderedQty > 0 && (
                      <span className="text-indigo-600 font-bold px-1">
                        הושלם
                      </span>
                    )}
                    
                    {item.recommendedLoad > item.orderedQty && (
                      <span className="text-indigo-700 font-bold flex items-center gap-0.5 bg-indigo-50/70 rounded py-0.5 px-1.5 border border-indigo-100">
                        <span className="leading-none">💡</span>
                        מומלץ: {item.recommendedLoad}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add Vehicle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all font-bold text-sm"
          >
            <Plus className="w-4 h-4" /> הוספת רכב לשבת זו
          </button>
        ) : (
          <div className="space-y-3">
            <h3 className="font-bold text-gray-800 text-sm">רכב חדש — {hebrewDate}</h3>
            <input
              type="text"
              placeholder='שם הרכב, לדוגמה "רכב 1"...'
              value={newVehicleName}
              onChange={e => setNewVehicleName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
              autoFocus
            />
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">אזורים לרכב זה</label>
              <div className="flex flex-wrap gap-2">
                {deliveryAreas.map(area => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => {
                      setNewVehicleAreas(prev => {
                        const next = new Set(prev)
                        if (next.has(area.id)) next.delete(area.id)
                        else next.add(area.id)
                        return next
                      })
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newVehicleAreas.has(area.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                  >
                    {area.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowAddForm(false); setNewVehicleName(''); setNewVehicleAreas(new Set()) }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600">
                ביטול
              </button>
              <button onClick={handleAddVehicle} disabled={!newVehicleName.trim() || isSaving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                {isSaving ? 'שומר...' : `צור רכב (${newVehicleAreas.size} אזורים)`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Vehicles List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">אין רכבים מוגדרים לשבת זו</p>
          <p className="text-sm">הוסף רכב למעלה</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {vehicles.map(vehicle => {
            const isExpanded = expandedId === vehicle.id
            const missing = totalMissing(vehicle)
            const spare = totalSpare(vehicle)
            const loaded = totalLoaded(vehicle)
            const ordered = totalOrdered(vehicle)
            const isFullyLoaded = missing === 0 && ordered > 0
            const hasOrders = ordered > 0

            return (
              <div key={vehicle.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${isFullyLoaded ? 'border-green-200' : hasOrders && missing > 0 ? 'border-orange-200' : 'border-gray-100'}`}>
                {/* Vehicle header */}
                <div className={`w-full px-4 py-3 transition-colors ${isFullyLoaded ? 'bg-green-50' : hasOrders && missing > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                  {editingVehicleId === vehicle.id ? (
                    <div className="space-y-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editVehicleName}
                        onChange={e => setEditVehicleName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
                      />
                      <div className="flex flex-wrap gap-2">
                        {deliveryAreas.map(area => (
                          <button
                            key={area.id}
                            type="button"
                            onClick={() => {
                              setEditVehicleAreas(prev => {
                                const next = new Set(prev)
                                if (next.has(area.id)) next.delete(area.id)
                                else next.add(area.id)
                                return next
                              })
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${editVehicleAreas.has(area.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                          >
                            {area.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => setEditingVehicleId(null)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 bg-white">ביטול</button>
                        <button onClick={handleSaveEditVehicle} disabled={isSaving} className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">שמור שינויים</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <button
                        onClick={() => setExpandedId(prev => prev === vehicle.id ? null : vehicle.id)}
                        className="flex-1 flex items-center justify-between text-right min-w-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isFullyLoaded ? 'bg-green-100' : 'bg-indigo-100'}`}>
                            <Truck className={`w-5 h-5 ${isFullyLoaded ? 'text-green-600' : 'text-indigo-600'}`} />
                          </div>
                          <div className="flex flex-col text-right">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <div className="font-black text-gray-900 text-lg">{vehicle.name}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-1 font-medium">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                {vehicle.areas.length > 0
                                  ? vehicle.areas.map(a => a.areaName).join(' · ')
                                  : 'ללא אזורים'}
                              </div>
                            </div>
                            
                            {/* Compact Products List (Only when closed) */}
                            {!isExpanded && vehicle.cargoSummary.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                {vehicle.cargoSummary.filter(i => i.orderedQty > 0 || i.loadedQty > 0).map(item => {
                                  const diff = item.loadedQty - item.orderedQty;
                                  return (
                                    <span key={item.productId} className="flex items-center bg-white border border-gray-100 rounded px-1.5 py-0.5">
                                      <span className="font-bold text-gray-700 ml-1.5">{item.productName}</span>
                                      <div className="flex items-center gap-1 font-bold">
                                        <span className="text-gray-500 bg-gray-100 px-1 rounded" title="הוזמן">{item.orderedQty}</span>
                                        {item.loadedQty > 0 && <span className="text-indigo-600 bg-indigo-50 px-1 rounded" title="הוכנס">{item.loadedQty}</span>}
                                        {diff > 0 && <span className="text-green-600 bg-green-50 px-1 rounded" title="ספייר">{diff}</span>}
                                      </div>
                                    </span>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pr-4">
                          {/* Status badge */}
                          {isFullyLoaded && (
                            <span className="hidden sm:flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                              <Check className="w-3 h-3" /> הוטען
                            </span>
                          )}
                          <span className="text-gray-400 text-lg font-light mr-1 w-4 text-center">{isExpanded ? '−' : '+'}</span>
                        </div>
                      </button>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-1 shrink-0 pl-2 mr-2 border-r pr-3 border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedForPrint(prev => {
                              const next = new Set(prev)
                              if (next.has(vehicle.id)) next.delete(vehicle.id)
                              else next.add(vehicle.id)
                              return next
                            })
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${selectedForPrint.has(vehicle.id) ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                          title={selectedForPrint.has(vehicle.id) ? "נבחר להדפסה" : "סמן להדפסה"}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); startEditVehicle(vehicle); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="ערוך רכב">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteVehicle(vehicle); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="מחק רכב">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div>
                    {/* Overall stats removed per request */}

                    {/* Per-product cargo table */}
                    {vehicle.cargoSummary.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>אין הזמנות לאזורים אלה עדיין</p>
                      </div>
                    ) : (
                      <div className="p-3 space-y-2">
                        <h4 className="text-xs font-black text-gray-500 uppercase px-1">פירוט מוצרים — הכנס כמה הכנסת לרכב</h4>
                        {vehicle.cargoSummary.map(item => {
                          const diff = item.loadedQty - item.orderedQty;
                          const prediction = predictions[vehicle.id]?.[item.productId]
                          
                          return (
                          <div key={item.productId} className={`rounded-xl border p-3 flex flex-col gap-2 ${diff > 0 ? 'border-green-200 bg-green-50/50' : diff === 0 && item.orderedQty > 0 ? 'border-indigo-200 bg-indigo-50/40' : 'border-orange-100 bg-orange-50/20'}`}>
                            
                            {/* Top Row: Product Name & Counter */}
                            <div className="flex items-center justify-between gap-3 w-full">
                              <div className="font-bold text-gray-900 text-base truncate pr-1">{item.productName}</div>
                              
                              <div className="flex items-center gap-2 shrink-0 pl-1">
                                <button
                                  onClick={() => handleUpdateLoad(vehicle.id, item.productId, Math.max(0, item.loadedQty - 1))}
                                  className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-black text-gray-700 transition-colors text-sm"
                                >−</button>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.loadedQty || ''}
                                  placeholder="0"
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    handleUpdateLoad(vehicle.id, item.productId, Math.max(0, val));
                                  }}
                                  className={`w-12 text-center font-black text-lg bg-transparent border-b-2 outline-none transition-colors ${item.loadedQty > 0 ? (diff >= 0 ? 'text-green-700 border-green-300 focus:border-green-600' : 'text-indigo-700 border-indigo-300 focus:border-indigo-600') : 'text-gray-400 border-gray-200 focus:border-gray-400'}`}
                                />
                                <button
                                  onClick={() => handleUpdateLoad(vehicle.id, item.productId, item.loadedQty + 1)}
                                  className="w-6 h-6 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center font-black text-indigo-700 transition-colors text-sm"
                                >+</button>
                              </div>
                            </div>
                            
                            {/* Bottom Row: Stats */}
                            <div className="flex items-center gap-1.5 w-full pr-1 overflow-x-auto whitespace-nowrap text-[11px] pb-0.5">
                              <span className="text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded">הוזמן: <strong>{item.orderedQty}</strong></span>
                              {item.loadedQty > 0 && <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">הוכנס: <strong>{item.loadedQty}</strong></span>}
                              {diff < 0 && <span className="text-orange-600 bg-orange-50 font-bold px-1.5 py-0.5 rounded">חסר: <strong>{Math.abs(diff)}</strong></span>}
                              {diff > 0 && <span className="text-green-600 bg-green-50 font-bold px-1.5 py-0.5 rounded">ספייר: <strong>{diff}</strong></span>}
                              {diff === 0 && item.orderedQty > 0 && <span className="text-indigo-600 font-bold px-1">הושלם</span>}
                              
                              {/* Smart Prediction Tip Inline */}
                              {prediction && prediction.recommendedLoad > item.orderedQty && (
                                <span className="text-indigo-700 font-bold flex items-center gap-0.5 bg-indigo-50/70 rounded py-0.5 px-1.5 border border-indigo-100 mr-1" title={`כולל ${prediction.spare} ספייר`}>
                                  <span className="leading-none">💡</span> 
                                  מומלץ: {prediction.recommendedLoad}
                                </span>
                              )}
                            </div>

                          </div>
                        )})}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>

    {/* Print View */}
    <div className="hidden print:block w-full bg-white text-black" dir="rtl">
      <div className="mb-6 flex justify-between items-end border-b-2 border-black pb-4">
        <div>
          <h1 className="text-3xl font-black mb-1">דוח טעינת רכבים</h1>
          <h2 className="text-xl text-gray-700">שבת, {hebrewDate}</h2>
        </div>
        <div className="text-left text-sm text-gray-500 font-medium">
          הופק ב: {format(new Date(), 'dd/MM/yyyy HH:mm')}
        </div>
      </div>
      
      {vehicles.filter(v => selectedForPrint.size === 0 || selectedForPrint.has(v.id)).map(vehicle => (
        <div key={`print-${vehicle.id}`} className="mb-10 break-inside-avoid">
          <div className="bg-gray-100 p-3 mb-4 rounded-xl flex justify-between items-center print:bg-gray-100 print:text-black" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <h3 className="text-xl font-bold">{vehicle.name}</h3>
            <span className="text-sm font-bold bg-white px-3 py-1 rounded-full border border-gray-300">{vehicle.areas.map(a => a.areaName).join(' · ')}</span>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-right py-2 px-2">מוצר</th>
                <th className="text-center py-2 px-2 w-24">הוזמן</th>
                <th className="text-center py-2 px-2 w-32">כמות הועמסה</th>
              </tr>
            </thead>
            <tbody>
              {vehicle.cargoSummary.filter(i => i.orderedQty > 0).map(item => (
                <tr key={`print-item-${item.productId}`} className="border-b border-gray-200">
                  <td className="py-2 px-2 font-bold text-base">{item.productName}</td>
                  <td className="py-2 px-2 text-center font-black text-xl">{item.orderedQty}</td>
                  <td className="py-2 px-2 text-center border-l border-r border-gray-300"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {vehicles.filter(v => selectedForPrint.size === 0 || selectedForPrint.has(v.id)).length === 0 && (
        <div className="text-center py-10 font-bold text-gray-500">
          לא נבחרו רכבים להדפסה, או שאין נתונים להדפסה בשבת זו.
        </div>
      )}
    </div>
    </>
  )
}
