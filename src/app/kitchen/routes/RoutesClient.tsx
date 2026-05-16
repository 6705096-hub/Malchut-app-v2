'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, RotateCcw, Truck, Map, User, Printer, Edit2, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { getHebrewDateString } from '@/lib/hebrewDate'

type Props = {
  initialAreas: any[]
  initialRoutes: any[]
}

export function RoutesClient({ initialAreas, initialRoutes }: Props) {
  const [routes, setRoutes] = useState(initialRoutes)
  const [areas, setAreas] = useState(initialAreas)
  
  const [newRouteName, setNewRouteName] = useState('')
  const [newRouteType, setNewRouteType] = useState<'MIDWEEK' | 'SHABBAT'>('SHABBAT')
  const [isAddingRoute, setIsAddingRoute] = useState(false)
  
  const [summaryData, setSummaryData] = useState<any[]>([])
  const [midweekOrders, setMidweekOrders] = useState<{id: string, customerName: string, address: string, routeId: string|null}[]>([])
  const [specialAreas, setSpecialAreas] = useState<{id: string, name: string, routeId: string|null}[]>([])
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null)
  const [editRouteName, setEditRouteName] = useState('')
  
  const [expandedRoutes, setExpandedRoutes] = useState<string[]>([])

  const [assigningRoute, setAssigningRoute] = useState<any>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [isSavingAssignment, setIsSavingAssignment] = useState(false)

  const [isPrintHubOpen, setIsPrintHubOpen] = useState(false)
  const [printHubSelected, setPrintHubSelected] = useState<Set<string>>(new Set())

  // Date selection (default to today)
  const [targetDateStr, setTargetDateStr] = useState(format(new Date(), 'yyyy-MM-dd'))
  const targetDateObj = new Date(targetDateStr)
  const isShabbatContext = targetDateObj.getDay() === 5 || targetDateObj.getDay() === 6
  
  const [activeTab, setActiveTab] = useState<'SHABBAT' | 'MIDWEEK' | 'SPECIAL'>(isShabbatContext ? 'SHABBAT' : 'MIDWEEK')

  useEffect(() => {
    fetchSummary()
    fetchMidweekOrders()
    fetchSpecialAreas()
    // Auto switch tabs on date change heuristics
    if (targetDateObj.getDay() === 5 || targetDateObj.getDay() === 6) {
      setActiveTab('SHABBAT')
    } else {
      setActiveTab('MIDWEEK')
    }
  }, [targetDateStr])

  const fetchSummary = async () => {
    setIsLoadingSummary(true)
    try {
      const res = await fetch(`/api/routes/summary?date=${targetDateStr}`)
      const data = await res.json()
      if (data.success) {
        setSummaryData(data.summary)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingSummary(false)
    }
  }

  const fetchMidweekOrders = async () => {
    try {
      const res = await fetch(`/api/routes/midweek-orders?date=${targetDateStr}`)
      const data = await res.json()
      if (data.success) {
        setMidweekOrders(data.orders)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSpecialAreas = async () => {
    try {
      const res = await fetch(`/api/routes/special-date-areas?date=${targetDateStr}`)
      const data = await res.json()
      if (data.success) {
        setSpecialAreas(data.areas)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddRoute = async () => {
    if (!newRouteName.trim() || isAddingRoute) return
    setIsAddingRoute(true)
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRouteName, type: newRouteType })
      })
      const data = await res.json()
      if (data.success) {
        setRoutes(prev => [...prev, data.route].sort((a,b) => a.name.localeCompare(b.name)))
        setNewRouteName('')
      } else {
        alert(data.error)
      }
    } catch (e) {
      alert('Error creating route')
    } finally {
      setIsAddingRoute(false)
    }
  }

  const handleEditRoute = (route: any) => {
    setEditingRouteId(route.id)
    setEditRouteName(route.name)
  }

  const handleSaveRoute = async (id: string) => {
    if (!editRouteName.trim() || editRouteName === routes.find(r => r.id === id)?.name) {
      setEditingRouteId(null)
      return
    }
    try {
      const res = await fetch(`/api/routes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editRouteName })
      })
      const data = await res.json()
      if (data.success) {
        setRoutes(prev => prev.map(r => r.id === id ? data.route : r))
        setEditingRouteId(null)
        fetchSummary()
      } else alert(data.error)
    } catch (e) {
      alert('Error updating route')
    }
  }

  const handleDeleteRoute = async (id: string, name: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הרכב/נהג "${name}"? השיוך שלו ימחק מהזמנות ואזורים קיימים.`)) return
    try {
      const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setRoutes(prev => prev.filter(r => r.id !== id))
        fetchSummary()
      } else alert(data.error)
    } catch (e) {
      alert('Error deleting route')
    }
  }

  const handlePrintSelected = () => {
    if (printHubSelected.size === 0) return;
    const url = `/kitchen/routes/batch-print?routeIds=${Array.from(printHubSelected).join(',')}&date=${targetDateStr}`
    window.open(url, '_blank')
    setIsPrintHubOpen(false)
  }



  const openAssignmentModal = (route: any) => {
    setAssigningRoute(route)
    const initialSelected = new Set<string>()
    if (activeTab === 'SHABBAT') {
      areas.forEach(a => { if (a.routeId === route.id) initialSelected.add(a.id) })
    } else if (activeTab === 'SPECIAL') {
      specialAreas.forEach(a => { if (a.routeId === route.id) initialSelected.add(a.id) })
    } else {
      midweekOrders.forEach(o => { if (o.routeId === route.id) initialSelected.add(o.id) })
    }
    setSelectedItemIds(initialSelected)
  }

  const toggleSelectItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSaveAssignment = async () => {
    if (!assigningRoute) return
    setIsSavingAssignment(true)
    try {
      if (activeTab === 'MIDWEEK') {
        const res = await fetch(`/api/routes/${assigningRoute.id}/bulk-assign-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: Array.from(selectedItemIds), dateStr: targetDateStr })
        })
      } else {
        const res = await fetch(`/api/routes/${assigningRoute.id}/bulk-assign-areas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ areaIds: Array.from(selectedItemIds), context: activeTab, dateStr: targetDateStr })
        })
      }
      
      // Update local state optimistic
      if (activeTab === 'SHABBAT') {
        setAreas(prev => prev.map(a => selectedItemIds.has(a.id) ? {...a, routeId: assigningRoute.id} : (a.routeId === assigningRoute.id ? {...a, routeId: null} : a)))
      } else if (activeTab === 'SPECIAL') {
        setSpecialAreas(prev => prev.map(a => selectedItemIds.has(a.id) ? {...a, routeId: assigningRoute.id} : (a.routeId === assigningRoute.id ? {...a, routeId: null} : a)))
      } else {
        setMidweekOrders(prev => prev.map(o => selectedItemIds.has(o.id) ? {...o, routeId: assigningRoute.id} : (o.routeId === assigningRoute.id ? {...o, routeId: null} : o)))
      }

      fetchSummary()
      setAssigningRoute(null)
    } catch (err) {
      alert('שגיאה בשמירת שיוכים')
    } finally {
      setIsSavingAssignment(false)
    }
  }

  const getValidItems = () => {
    if (activeTab === 'SHABBAT') {
      return areas.filter(a => a.routeId === assigningRoute?.id || !a.routeId)
    } else if (activeTab === 'SPECIAL') {
      return specialAreas.filter(a => a.routeId === assigningRoute?.id || !a.routeId)
    } else {
      return midweekOrders.filter(o => o.routeId === assigningRoute?.id || !o.routeId)
    }
  }

  const toggleSelectAll = (validItems: any[]) => {
    if (selectedItemIds.size === validItems.length) {
      setSelectedItemIds(new Set())
    } else {
      setSelectedItemIds(new Set(validItems.map((i: any) => i.id)))
    }
  }

  const handleReset = async () => {
    if (!confirm('האם אתה בטוח שברצונך לאפס ולמחוק את שיוכי הנהגים לתאריך הנבחר? השיוך בלשונית הפעילה יימחק!')) return
    
    try {
      const res = await fetch('/api/routes/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: activeTab, targetDateISO: targetDateStr })
      })
      const data = await res.json()
      if (data.success) {
        if (activeTab === 'SHABBAT') {
          setAreas(prev => prev.map(a => ({...a, routeId: null})))
        } else if (activeTab === 'MIDWEEK') {
          setMidweekOrders(prev => prev.map(o => ({...o, routeId: null})))
        } else if (activeTab === 'SPECIAL') {
          setSpecialAreas(prev => prev.map(a => ({...a, routeId: null})))
        }
        fetchSummary()
        alert('השיוכים אופסו בהצלחה.')
      }
    } catch (e) {
      alert('שגיאה באיפוס')
    }
  }

  const toggleExpand = (routeId: string) => {
    setExpandedRoutes(prev => 
      prev.includes(routeId) ? prev.filter(id => id !== routeId) : [...prev, routeId]
    )
  }

  const handlePrint = (routeId: string) => {
    const printUrl = `/kitchen/routes/print/${routeId}?date=${targetDateStr}`
    window.open(printUrl, '_blank')
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Date Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
        <label className="text-sm font-bold text-gray-700">תאריך חלוקה / ייצור (בית שמש):</label>
        <div className="flex justify-between items-center bg-gray-50 rounded-lg py-2 px-3 border border-gray-200">
          <input 
            type="date"
            className="bg-transparent border-none text-gray-800 font-bold focus:ring-0 p-0"
            value={targetDateStr}
            onChange={(e) => setTargetDateStr(e.target.value)}
          />
          <span className="text-gray-500 text-sm font-medium">{getHebrewDateString(targetDateObj)}</span>
        </div>
      </div>

      {/* Top Section - Manage Vehicles */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-gray-500" /> צי רכבים קבוע
          </h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input 
            type="text"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors min-w-0"
            placeholder="שם נהג / רכב חדש..."
            value={newRouteName}
            onChange={e => setNewRouteName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRoute()}
            disabled={isAddingRoute}
          />
          <select
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full sm:w-40"
            value={newRouteType}
            onChange={e => setNewRouteType(e.target.value as 'MIDWEEK' | 'SHABBAT')}
            disabled={isAddingRoute}
          >
            <option value="SHABBAT">רכב שבת/חג</option>
            <option value="MIDWEEK">נהג חול</option>
          </select>
          <button 
            onClick={handleAddRoute}
            disabled={isAddingRoute || !newRouteName.trim()}
            className="bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {routes.length === 0 ? (
          <span className="text-xs text-gray-400">לא הוגדרו רכבים במערכת.</span>
        ) : (
          <div className="flex flex-col gap-5">
            {['SHABBAT', 'MIDWEEK'].map(typeGroup => {
              const groupRoutes = routes.filter(r => r.type === typeGroup)
              if (groupRoutes.length === 0) return null
              return (
                <div key={typeGroup}>
                  <h3 className="text-xs text-gray-500 font-bold mb-2 uppercase tracking-wider">
                    {typeGroup === 'SHABBAT' ? 'רכבי שבת ואירועים' : 'נהגי אמצע שבוע'}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {groupRoutes.map(route => (
                      <div key={route.id} className="bg-gray-100 text-gray-800 text-sm font-semibold pl-1 pr-3 py-1.5 rounded-lg flex items-center gap-3 border border-gray-200">
                        {editingRouteId === route.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              className="bg-white border border-gray-300 rounded px-2 py-0.5 w-28 text-sm focus:outline-none focus:border-blue-500"
                              value={editRouteName}
                              onChange={e => setEditRouteName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSaveRoute(route.id)}
                              autoFocus
                            />
                            <button onClick={() => handleSaveRoute(route.id)} className="text-green-600 hover:bg-green-100 p-1 rounded-md"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingRouteId(null)} className="text-gray-400 hover:bg-gray-200 p-1 rounded-md"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <>
                            <span>{route.name}</span>
                            <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                              <button onClick={() => handleEditRoute(route)} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded-md transition-colors" title="ערוך שם">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteRoute(route.id, route.name)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-md transition-colors" title="מחק נהג">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* TABS FOR ASSIGNMENTS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="flex border-b border-gray-100">
          <button 
            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'MIDWEEK' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
            onClick={() => setActiveTab('MIDWEEK')}
          >
            שיוך הזמנות (אמצע השבוע)
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'SHABBAT' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
            onClick={() => setActiveTab('SHABBAT')}
          >
            שיוך אזורים (שבת)
          </button>
          {specialAreas.length > 0 && (
            <button 
              className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'SPECIAL' ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-500' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
              onClick={() => setActiveTab('SPECIAL')}
            >
              שיוך אזורים (אירוע מיוחד)
            </button>
          )}
        </div>

                <div className="p-4 bg-gray-50/50 flex justify-between items-center border-b border-gray-100">
             <span className="text-xs text-gray-500 font-medium">
                {activeTab === 'SHABBAT' ? 'בחר נהג/רכב כדי לשייך לו אזורי שבת. השינוי נשמר אוטומטית כקבוע לכל שבת.' : 
                 activeTab === 'SPECIAL' ? 'בחר נהג/רכב כדי לשייך לו אזורים לאירוע המיוחד המשפיע על תאריך זה.' : 'בחר נהג/רכב כדי לשייך לו מסלולים והזמנות לאמצע השבוע לתאריך הנבחר.'}
             </span>
             <button 
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors shrink-0"
             >
                <RotateCcw className="w-3.5 h-3.5" /> איפוס לאזור הפעיל
             </button>
        </div>

        <div className="p-5 bg-gray-50/30">
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {routes.filter(r => (activeTab === 'MIDWEEK' ? r.type === 'MIDWEEK' : r.type === 'SHABBAT')).length === 0 ? (
                 <div className="col-span-full py-8 text-center text-sm font-medium text-gray-400">לא הוגדרו נהגים לשיוך זה. הוסף רכבים באזור "צי רכבים קבוע".</div>
              ) : (
                routes.filter(r => (activeTab === 'MIDWEEK' ? r.type === 'MIDWEEK' : r.type === 'SHABBAT')).map(route => (
                   <button 
                      key={route.id}
                      onClick={() => openAssignmentModal(route)}
                      className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 transition-all rounded-2xl p-6 text-center shadow-sm hover:shadow"
                   >
                      <div className="bg-gray-100 p-3 rounded-full transition-colors group-hover:bg-blue-100">
                         <Truck className="w-6 h-6 text-gray-500" />
                      </div>
                      <div>
                         <span className="block font-bold text-gray-900 text-lg">{route.name}</span>
                         <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md mt-1 inline-block">הקצה מסלולים</span>
                      </div>
                   </button>
                ))
              )}
           </div>
        </div>
      </div>

      {assigningRoute && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setAssigningRoute(null)}>
             <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
               <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                       <Truck className="w-5 h-5 text-gray-500" /> 
                       הקצאת תעסוקה לנהג: {assigningRoute.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                       {activeTab === 'MIDWEEK' ? 'סמן את ההזמנות שתרצה להעמיס על רכב זה' : 'סמן אזורי חלוקה להעמסה על רכב זה'}
                    </p>
                  </div>
                  <button onClick={() => setAssigningRoute(null)} className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-600 outline-none rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-4 bg-gray-100/50 custom-scrollbar">
                  {getValidItems().length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-gray-500 font-bold text-lg">לא נמצאו מוקדים זמינים לשיבוץ לנהג זה.</p>
                      <p className="text-gray-400 text-sm mt-1">שימו לב: מוקדים שמשויכים לנהג אחר לא מופיעים כאן כדי למנוע כפילויות.</p>
                    </div>
                  ) : (
                    <>
                      <div className="px-5 py-3.5 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-10 border border-gray-200 rounded-2xl mb-4 shadow-sm">
                         <label className="flex items-center gap-3 cursor-pointer font-bold text-gray-800 text-sm hover:text-blue-600 transition-colors">
                            <input type="checkbox" checked={selectedItemIds.size > 0 && selectedItemIds.size === getValidItems().length} onChange={() => toggleSelectAll(getValidItems())} className="rounded text-blue-600 focus:ring-blue-500 w-5 h-5" />
                            בחר הכל ({getValidItems().length})
                         </label>
                         <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg">{selectedItemIds.size} מסומנים לשיבוץ</span>
                      </div>

                      <div className="flex flex-col gap-2.5">
                         {getValidItems().map(item => (
                            <label key={item.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all shadow-sm ${selectedItemIds.has(item.id) ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-100' : 'bg-white border-transparent shadow hover:border-gray-200'}`}>
                               <input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => toggleSelectItem(item.id)} className="rounded text-blue-600 focus:ring-blue-500 w-5 h-5" />
                               <div className="flex flex-col flex-1 truncate">
                                  {activeTab === 'MIDWEEK' ? (
                                    <>
                                      <span className="text-[15px] font-black text-gray-900 flex items-center gap-1.5"><User className="w-4 h-4 text-gray-400"/> {item.customerName}</span>
                                      <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mt-1 truncate"><Map className="w-3.5 h-3.5 text-gray-400"/> {item.address}</span>
                                    </>
                                  ) : (
                                    <span className="text-[15px] font-bold text-gray-900 pr-2">{item.name}</span>
                                  )}
                               </div>
                            </label>
                         ))}
                      </div>
                    </>
                  )}
               </div>

               <div className="border-t border-gray-100 p-5 bg-white flex justify-end gap-3 shrink-0 rounded-b-3xl">
                  <button onClick={() => setAssigningRoute(null)} disabled={isSavingAssignment} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors shadow-sm">
                     ביטול
                  </button>
                  <button onClick={handleSaveAssignment} disabled={isSavingAssignment} className="px-8 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg transition-all flex items-center gap-2 transform hover:-translate-y-0.5">
                     {isSavingAssignment ? 'שומר שינויים...' : 'שמור שיבוץ לנהג'}
                     {!isSavingAssignment && <Check className="w-5 h-5" />}
                  </button>
               </div>
             </div>
          </div>
      )}

      {/* Cargo & Run Sheet Summaries */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-bold text-gray-900">תכולת רכבים מיועדת וסידור עבודה</h2>
          <button 
             onClick={() => {
                const activeDrivers = summaryData
                  .filter(r => r.id !== 'UNASSIGNED' && r.itemsList.length > 0 && (activeTab === 'MIDWEEK' ? routes.find(ro => ro.id === r.id)?.type === 'MIDWEEK' : routes.find(ro => ro.id === r.id)?.type === 'SHABBAT'))
                  .map(r => r.id);
                setPrintHubSelected(new Set(activeDrivers));
                setIsPrintHubOpen(true);
             }}
             className="bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-700 via-indigo-600 to-blue-600 text-white hover:shadow-lg px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2.5 transition-all outline-none"
          >
             <Printer className="w-4 h-4" /> הדפסת מיקומי חלוקה
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4 font-medium">לחיצה על רכב תציג את הפירוט המלא של ההזמנות המשויכות אליו בתאריך הנבחר, ואפשרות לניהולם.</p>

        {isLoadingSummary ? (
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-100 rounded-xl"></div>
            <div className="h-20 bg-gray-100 rounded-xl"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {summaryData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">לא נמצאו הזמנות משויכות.</p>
            ) : (
              summaryData.filter(routeData => {
                if (routeData.id === 'UNASSIGNED') return true;
                const r = routes.find(r => r.id === routeData.id);
                if (!r) return false;
                if (activeTab === 'MIDWEEK' && r.type !== 'MIDWEEK') return false;
                if (activeTab !== 'MIDWEEK' && r.type !== 'SHABBAT') return false;
                return true;
              }).map(routeData => {
                const isUnassigned = routeData.id === 'UNASSIGNED'
                const hasCargo = routeData.itemsList.length > 0
                const isExpanded = expandedRoutes.includes(routeData.id)
                // Skip rendering empty custom routes unless it's unassigned AND has cargo
                if (!hasCargo && isUnassigned) return null;

                return (
                  <div key={routeData.id} className={`border rounded-xl overflow-hidden shadow-sm transition-all ${isUnassigned ? 'border-red-200 bg-red-50/10' : 'border-gray-200'} ${isExpanded && !isUnassigned ? 'border-blue-200 ring-1 ring-blue-100' : ''}`}>
                    <div 
                      className={`px-4 py-3 flex justify-between items-center cursor-pointer transition-colors ${isUnassigned ? 'bg-red-50 text-red-900 border-b border-red-100' : (isExpanded ? 'bg-blue-50 text-blue-900 border-b border-blue-100' : 'bg-gray-50 hover:bg-gray-100 text-gray-900 border-b border-gray-100')}`}
                      onClick={() => toggleExpand(routeData.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Truck className={isUnassigned ? "w-5 h-5 text-red-400" : "w-5 h-5 text-blue-500"} />
                        <h3 className="font-bold text-lg">{routeData.name} <span className="text-sm font-medium mr-1 opacity-70">({routeData.ordersList?.length || 0} מוקדים | {routeData.itemsList.length} סוגי סחורה)</span></h3>
                        {isUnassigned && hasCargo && <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded font-bold mr-2">לא שובצו נהגים!</span>}
                      </div>

                      <div className="flex items-center gap-3">
                        {isExpanded && !isUnassigned && hasCargo && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handlePrint(routeData.id); }}
                            className="bg-white border border-gray-200 shadow-sm text-gray-700 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" /> הדפס מסלול
                          </button>
                        )}
                        <span className="text-gray-400 text-xl font-light">
                          {isExpanded ? '−' : '+'}
                        </span>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="bg-white">
                        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col gap-1">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">סיכום סחורה להעמסה לרכב</h4>
                          {!hasCargo ? (
                            <p className="text-xs text-gray-400">אין סחורה לרכב זה</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {routeData.itemsList.map((item: any) => {
                                const unknownCount = item.total - (item.hot || 0) - (item.cold || 0);
                                return (
                                  <div key={item.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between shadow-sm">
                                    <span className="font-bold text-sm text-gray-800 ml-4">{item.name}</span>
                                    <div className="flex gap-4 text-sm font-bold text-gray-700 whitespace-nowrap">
                                      {item.hot > 0 && <span>{item.hot} חם</span>}
                                      {item.cold > 0 && <span>{item.cold} קר</span>}
                                      {unknownCount > 0 && <span>{unknownCount} רגיל</span>}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                           <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">פירוט יעדי פריקה (הזמנות)</h4>
                           <div className="space-y-3">
                              {routeData.ordersList?.length === 0 ? (
                                <p className="text-sm text-gray-400">אין מוקדים לרכב זה.</p>
                              ) : (
                                routeData.ordersList?.map((order: any, idx: number) => (
                                  <div key={order.id} className="flex flex-col sm:flex-row gap-4 border border-gray-100 rounded-xl p-3 hover:bg-blue-50/30 transition-colors">
                                    <div className="flex flex-col gap-1 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-black text-gray-900 bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full text-xs">{idx + 1}</span>
                                        <span className="font-bold text-gray-900">{order.customerName}</span>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono dir-ltr">{order.customerPhone}</span>
                                      </div>
                                      <div className="text-sm font-medium text-gray-600 mr-8 flex items-center gap-1.5"><Map className="w-3.5 h-3.5 text-gray-400" /> {order.address}</div>
                                      {order.notes && <div className="text-xs mr-8 mt-1 text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">הערה: {order.notes}</div>}
                                    </div>

                                    <div className="flex-1 bg-gray-50 rounded-lg p-2 border border-gray-100">
                                      <ul className="text-xs space-y-1">
                                        {order.items.map((i: any, k: number) => (
                                          <li key={k} className="flex justify-between border-b border-gray-200/50 pb-0.5 last:border-0 last:pb-0 font-medium text-gray-700">
                                            <span>{i.name}</span>
                                            <span className="font-bold text-gray-900">x{i.quantity}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    <div className="flex flex-col items-end justify-center w-full sm:w-28 bg-gray-50 p-2 rounded-lg border border-gray-100 shrink-0">
                                        <div className="text-xs text-gray-500">תשלום הזמנה</div>
                                        <div className="font-black text-blue-700 text-lg">₪{order.totalPrice}</div>
                                        {order.customerDebt > 0 && (
                                          <div className="text-xs text-red-600 font-bold bg-red-50 border border-red-100 px-2 py-0.5 flex flex-col items-center mt-1 w-full text-center rounded">
                                            <span>חוב קודם</span>
                                            <span>₪{order.customerDebt}</span>
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                ))
                              )}
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
      {/* Print Hub Modal */}
      {isPrintHubOpen && (
         <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div className="flex items-center gap-3">
                     <div className="bg-blue-100 p-2.5 rounded-xl text-blue-700 font-bold">
                        <Printer className="w-6 h-6" />
                     </div>
                     <div>
                        <h2 className="text-xl font-black text-gray-900 leading-tight">מרכז הדפסות מסלולים</h2>
                        <p className="text-sm text-gray-500 font-medium">בחר איזה מסלולים להדפיס ברצף</p>
                     </div>
                  </div>
                  <button onClick={() => setIsPrintHubOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-900">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="overflow-y-auto p-4 flex-1">
                  <div className="flex items-center justify-between mb-4 px-2">
                     <span className="font-bold text-gray-700 text-sm">סימן {printHubSelected.size} רכבים מתוך {
                        summaryData.filter(r => r.id !== 'UNASSIGNED' && r.itemsList.length > 0 && (activeTab === 'MIDWEEK' ? routes.find(ro => ro.id === r.id)?.type === 'MIDWEEK' : routes.find(ro => ro.id === r.id)?.type === 'SHABBAT')).length
                     } פעילים היום</span>
                     <button 
                        onClick={() => {
                           const activeDrivers = summaryData.filter(r => r.id !== 'UNASSIGNED' && r.itemsList.length > 0 && (activeTab === 'MIDWEEK' ? routes.find(ro => ro.id === r.id)?.type === 'MIDWEEK' : routes.find(ro => ro.id === r.id)?.type === 'SHABBAT')).map(r => r.id);
                           if (printHubSelected.size === activeDrivers.length) setPrintHubSelected(new Set());
                           else setPrintHubSelected(new Set(activeDrivers));
                        }}
                        className="text-sm font-bold text-blue-600 hover:underline"
                     >
                        בחר הכל / נקה הכל
                     </button>
                  </div>

                  <div className="flex flex-col gap-2">
                     {summaryData
                       .filter(r => r.id !== 'UNASSIGNED' && r.itemsList.length > 0 && (activeTab === 'MIDWEEK' ? routes.find(ro => ro.id === r.id)?.type === 'MIDWEEK' : routes.find(ro => ro.id === r.id)?.type === 'SHABBAT'))
                       .map(route => {
                         const rInfo = routes.find(ro => ro.id === route.id)
                         const isSelected = printHubSelected.has(route.id)
                         return (
                            <label key={route.id} className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                               <input 
                                  type="checkbox"
                                  className="w-5 h-5 accent-blue-600 rounded bg-gray-100 border-gray-300"
                                  checked={isSelected}
                                  onChange={(e) => {
                                     const newSet = new Set(printHubSelected);
                                     if (e.target.checked) newSet.add(route.id); else newSet.delete(route.id);
                                     setPrintHubSelected(newSet);
                                  }}
                               />
                               <div className="flex flex-col">
                                  <span className="font-bold text-gray-900 text-lg">{rInfo?.name || 'רכב לא ידוע'}</span>
                                  <span className="text-sm text-gray-500 font-medium">{route.ordersList?.length || 0} מוקדים מזומנים לפריקה</span>
                               </div>
                            </label>
                         )
                     })}
                     {summaryData.filter(r => r.id !== 'UNASSIGNED' && r.itemsList.length > 0 && (activeTab === 'MIDWEEK' ? routes.find(ro => ro.id === r.id)?.type === 'MIDWEEK' : routes.find(ro => ro.id === r.id)?.type === 'SHABBAT')).length === 0 && (
                        <p className="text-center text-gray-400 py-8 font-medium">אין רכבים פעילים עם סחורה היום.</p>
                     )}
                  </div>
               </div>

               <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 mt-auto">
                  <button onClick={() => setIsPrintHubOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
                     סגור חלון
                  </button>
                  <button 
                     onClick={handlePrintSelected}
                     disabled={printHubSelected.size === 0}
                     className="px-8 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                     <Printer className="w-5 h-5" />
                     הדפס {printHubSelected.size} רכבים נבחרים
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  )
}
