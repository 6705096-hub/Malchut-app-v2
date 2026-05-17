'use client'

import { OrderHistoryBadge } from './OrderHistoryBadge'
import { useState, useEffect, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
type CompleteOrder = any;
import { DeliveryArea } from '@prisma/client'
import { ArrowUpDown,  CalendarDays, LayoutList, FileText, Printer, Check, Circle, Undo2, Filter, Trash2, ChevronDown, MapPin, Share2, SquarePen, ChevronUp, Clock, Search, Plus, MessageSquare, SquareCheckBig, Calendar, LayoutGrid, EllipsisVertical, X, CalendarIcon  } from 'lucide-react'
import { OrderStatusDropdown } from '@/components/OrderStatusDropdown'
import { PaymentAmountToggle } from '@/components/PaymentAmountToggle'
import { OrderWizardModal } from '@/components/OrderWizardModal'
import { OrderCard } from '@/components/OrderCard'
import { getShabbatDate, getDeliveryHebrewDate } from '@/lib/hebrewDate'
import { getParashaForDate } from '@/lib/parasha'
import { initiateCustomerCall } from '@/lib/callCustomer'

const BackButton = () => {
  const router = useRouter()
  return (
    <button 
      onClick={() => router.back()}
      className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"
      title="חזור"
    >
      <Undo2 className="w-5 h-5" />
    </button>
  )
}
interface OrdersListViewClientProps {
  pageTitle: string
  orders: CompleteOrder[]
  deliveryAreas: DeliveryArea[]
  isShabbat?: boolean
  isDaily?: boolean
  initialCity?: 'ALL' | 'ירושלים' | 'בית שמש'
  canEdit?: boolean
  isMidweekFlatView?: boolean
  isStoreCompactView?: boolean
}
const STATIC_DAILY_ZONES = [
  { id: 'אזור א׳', name: 'אזור א׳' },
  { id: 'אזור ב׳', name: 'אזור ב׳' },
  { id: 'אזור ג׳', name: 'אזור ג׳' },
  { id: 'אזור ד׳', name: 'אזור ד׳' }
]
export function OrdersListViewClient({ pageTitle, orders, deliveryAreas, isShabbat, isDaily, initialCity = 'ALL', canEdit = true, isMidweekFlatView, isStoreCompactView }: OrdersListViewClientProps) {
  const [viewMode, setViewMode] = useState<'FULL' | 'SUMMARY'>('FULL')
  const [showFilters, setShowFilters] = useState(false)
  const [showSortOption, setShowSortOption] = useState(false)
  const [sortOrder, setSortOrder] = useState<'DEFAULT' | 'DATE' | 'NEWEST'>('DEFAULT')
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlightId')
  const rawCity = searchParams.get('city')
  const cityFilter = rawCity === 'ירושלים' ? 'ירושלים' : rawCity === 'בית שמש' ? 'בית שמש' : 'ALL';
  const rawZone = searchParams.get('zone')
  const zoneFilter = rawZone || 'ALL';
  const [timingFilter, setTimingFilter] = useState<'ALL' | 'MIDWEEK' | 'SHABBAT'>('ALL')
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL')
  const [deliveryFilter, setDeliveryFilter] = useState<'ALL' | 'EXECUTED' | 'PLANNED'>((searchParams.get('status') as any) || 'ALL')
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [selectedPrintZones, setSelectedPrintZones] = useState<string[]>([])
  const [wizardTarget, setWizardTarget] = useState<{ isFixed: boolean, orderId?: string, templateId?: string, orderData?: any } | null>(null)
  const effectiveAreas = isDaily ? STATIC_DAILY_ZONES : deliveryAreas
  const isGenericView = (!isShabbat && !isDaily) || isMidweekFlatView

  useEffect(() => {
    const editId = searchParams.get('editId')
    if (editId) {
       setWizardTarget({ isFixed: false, orderId: editId })
       // Clean the URL without triggering a page reload
       const newUrl = new URL(window.location.href)
       newUrl.searchParams.delete('editId')
       window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams])
  const getOrderCity = (o: CompleteOrder) => {
    if (o.city) return o.city;
    const areaName = o.deliveryArea?.name || '';
    if (areaName.includes('בית שמש') || areaName.includes('רמה ') || areaName.includes('קריה')) return 'בית שמש';
    if (areaName.includes('ירושלים') || areaName.includes('רמות') || areaName.includes('גאולה') || areaName.includes('רוממה') || areaName.includes('הר נוף')) return 'ירושלים';
    if (o.address && o.address.includes('בית שמש')) return 'בית שמש';
    if (o.address && o.address.includes('ירושלים')) return 'ירושלים';
    return null;
  }

  useEffect(() => {
    if (highlightId) {
      setTimeout(() => {
        const el = document.getElementById(`order-${highlightId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-4', 'ring-emerald-500', 'ring-offset-2', 'duration-500')
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-emerald-500', 'ring-offset-2')
          }, 3000)
        }
      }, 500)
    }
  }, [highlightId, orders.length])

  const filteredOrders = orders.filter((o: CompleteOrder) => {
    if (highlightId && o.id === highlightId) return true; // Always show highlighted order regardless of filters

    const orderCity = getOrderCity(o);
    if (cityFilter !== 'ALL' && orderCity !== cityFilter) return false;
    
    if (zoneFilter !== 'ALL') {
      const zoneName = isDaily 
        ? (o.customZone || 'כתובת כללית / ללא אזור') 
        : (o.deliveryArea?.name || 'כתובת כללית / ללא אזור')
      if (zoneName !== zoneFilter) return false;
    }

    if (timingFilter === 'MIDWEEK' && (o.deliveryDay === 'Shabbat' || o.deliveryDay === 'Wednesday_Stores')) return false;
    if (timingFilter === 'SHABBAT' && o.deliveryDay !== 'Shabbat') return false;
    if (paymentFilter === 'PAID' && o.status !== 'PAID') return false;
    if (paymentFilter === 'UNPAID' && o.status === 'PAID') return false;
    if (deliveryFilter !== 'ALL') {
      if (deliveryFilter === 'EXECUTED' && o.status !== 'EXECUTED' && o.status !== 'PAID') return false;
      if (deliveryFilter === 'PLANNED' && (o.status === 'EXECUTED' || o.status === 'PAID')) return false;
    }
    return true;
  })
  const handleMarkAllExecuted = async () => {
    const targetOrders = filteredOrders.filter(o => o.status === 'PLANNED')
    if (targetOrders.length === 0) {
      alert('אין הזמנות פתוחות לאישור.')
      return
    }
    if (!confirm(`האם אתה בטוח שברצונך לסמן ${targetOrders.length} הזמנות כ"בוצע"?`)) return
    setIsBulkUpdating(true)
    try {
      const res = await fetch('/api/orders/bulk-execute', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: targetOrders.map(o => o.id) })
      })
      if (!res.ok) throw new Error('שגיאה בעדכון הזמנות')
      router.refresh()
    } catch(e) {
      console.error(e)
      alert('אירעה שגיאה בסימון ההזמנות כבוצע')
    } finally {
      setIsBulkUpdating(false)
    }
  }
  const getDeliveryTimestamp = (order: CompleteOrder) => {
    let baseDate = new Date();
    if (order.deliveryWeek === 'THIS_WEEK') {
      baseDate.setDate(baseDate.getDate() - baseDate.getDay());
    } else if (order.deliveryWeek === 'NEXT_WEEK') {
      baseDate.setDate(baseDate.getDate() - baseDate.getDay() + 7);
    } else {
      const parsed = new Date(order.deliveryWeek);
      if (!isNaN(parsed.getTime())) {
        baseDate = parsed;
      }
    }
    baseDate.setHours(0,0,0,0);
    
    const dayMap: Record<string, number> = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Shabbat': 6
    };
    
    let daysToAdd = dayMap[order.deliveryDay] || 0;
    const finalDate = new Date(baseDate);
    finalDate.setDate(baseDate.getDate() + daysToAdd);
    return finalDate.getTime();
  };

  const sortedFilteredOrders = [...filteredOrders].sort((a, b) => {
    if (sortOrder === 'DATE' || sortOrder === 'DEFAULT') {
      const tA = getDeliveryTimestamp(a);
      const tB = getDeliveryTimestamp(b);
      if (tA !== tB) return tB - tA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortOrder === 'NEWEST') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });
  const zoneGroups: Record<string, CompleteOrder[]> = {}
  if (isGenericView || sortOrder !== 'DEFAULT') {
    zoneGroups['ALL'] = sortedFilteredOrders
  } else {
    sortedFilteredOrders.forEach(order => {
      const zoneName = isDaily 
        ? (order.customZone || 'כתובת כללית / ללא אזור') 
        : (order.deliveryArea?.name || 'כתובת כללית / ללא אזור')
      if (!zoneGroups[zoneName]) zoneGroups[zoneName] = []
      zoneGroups[zoneName].push(order)
    })
  }
  const sortedZones = Object.keys(zoneGroups).sort((a, b) => {
    if (a.includes('כתובת כללית')) return 1
    if (b.includes('כתובת כללית')) return -1
    return a.localeCompare(b)
  })
  return (
    <>
    <div className="h-full flex flex-col pt-1 pb-20 print:hidden">
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate tracking-tight">{pageTitle}</h1>
        </div>
        <div className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 print:hidden relative">

            {/* SORT BUTTON */}
            <div className="relative">
              <button 
                onClick={() => { setShowSortOption(!showSortOption); setShowFilters(false); }}
                className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all shadow-sm border active:scale-95 ${
                  showSortOption 
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-500/20' 
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
                title="מיון"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
              {showSortOption && (
                <>
                  <div className="fixed inset-0 z-[50]" onClick={() => setShowSortOption(false)} />
                  <div className="absolute top-full right-0 mt-3 z-[60] bg-white border border-gray-100 shadow-2xl rounded-2xl w-48 p-2 flex flex-col animate-in slide-in-from-top-2 fade-in">
                    <button 
                      onClick={() => { setSortOrder('DEFAULT'); setShowSortOption(false); }}
                      className={`flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors text-right ${sortOrder === 'DEFAULT' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700'}`}
                    >
                      רגיל (לפי אזורים)
                    </button>
                    <button 
                      onClick={() => { setSortOrder('DATE'); setShowSortOption(false); }}
                      className={`flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors text-right ${sortOrder === 'DATE' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700'}`}
                    >
                      לפי תאריך (ברצף)
                    </button>
                    <button 
                      onClick={() => { setSortOrder('NEWEST'); setShowSortOption(false); }}
                      className={`flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors text-right ${sortOrder === 'NEWEST' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700'}`}
                    >
                      מהחדש לישן (ברצף)
                    </button>
                  </div>
                </>
              )}
            </div>
    
            <button 
              onClick={() => { setShowFilters(!showFilters); setShowSortOption(false); }}
              title="סינונים"
              className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all shadow-sm border active:scale-95 ${
                showFilters 
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-500/20' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              {((cityFilter !== 'ALL' ? 1 : 0) + (timingFilter !== 'ALL' ? 1 : 0) + (paymentFilter !== 'ALL' ? 1 : 0) + (deliveryFilter !== 'ALL' ? 1 : 0) + (zoneFilter !== 'ALL' ? 1 : 0)) > 0 && (
                <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
              )}
              
            </button>
            {showFilters && (
              <>
              <div className="fixed inset-0 z-[50]" onClick={(e) => { e.stopPropagation(); setShowFilters(false); }} />
              <div className="absolute top-full right-0 mt-3 z-[60] bg-white border border-gray-100 shadow-2xl rounded-2xl w-64 p-3 flex flex-col animate-in slide-in-from-top-2 fade-in">
                <div className="flex flex-col gap-1">
                  {/* Option: ALL */}
                  <div 
                    onClick={() => {
                        setTimingFilter('ALL'); setPaymentFilter('ALL'); setDeliveryFilter('ALL');
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete('city');
                        router.push('/dashboard/orders?' + params.toString());
                    }} 
                    className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                     <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${(cityFilter === 'ALL' && timingFilter === 'ALL' && paymentFilter === 'ALL' && deliveryFilter === 'ALL') ? 'border-indigo-600' : 'border-gray-300'}`}>
                        {(cityFilter === 'ALL' && timingFilter === 'ALL' && paymentFilter === 'ALL' && deliveryFilter === 'ALL') && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                     </div>
                     <span className={`text-[15px] ${(cityFilter === 'ALL' && timingFilter === 'ALL' && paymentFilter === 'ALL' && deliveryFilter === 'ALL') ? 'font-bold text-gray-900' : 'text-gray-600 font-medium'}`}>הצג הכל (ללא סינון)</span>
                  </div>
                  <hr className="my-1 border-gray-100" />
                  {/* Cities */}
                  {['ירושלים', 'בית שמש'].map(opt => (
                    <div 
                      key={opt}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        if (cityFilter === opt) params.delete('city'); else params.set('city', opt);
                        params.delete('zone'); // reset zone when city changes
                        router.push('/dashboard/orders?' + params.toString());
                      }} 
                      className="flex items-center gap-3 py-1.5 px-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                       <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${cityFilter === opt ? 'border-sky-600' : 'border-gray-300'}`}>
                          {cityFilter === opt && <div className="w-2 h-2 bg-sky-600 rounded-full" />}
                       </div>
                       <span className={`text-[15px] ${cityFilter === opt ? 'font-bold text-gray-900' : 'text-gray-600 font-medium'}`}>{opt}</span>
                    </div>
                  ))}
                  <hr className="my-1 border-gray-100" />
                  
                  {/* Zones for Beit Shemesh */}
                  {cityFilter === 'בית שמש' && (
                    <>
                      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar">
                         <div 
                           onClick={() => {
                             const params = new URLSearchParams(searchParams.toString());
                             params.delete('zone');
                             router.push('/dashboard/orders?' + params.toString());
                           }} 
                           className="flex items-center gap-3 py-1.5 px-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                         >
                           <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${zoneFilter === 'ALL' ? 'border-indigo-600' : 'border-gray-300'}`}>
                              {zoneFilter === 'ALL' && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                           </div>
                           <span className={`text-[15px] ${zoneFilter === 'ALL' ? 'font-bold text-gray-900' : 'text-gray-600 font-medium'}`}>כל האזורים</span>
                         </div>
                        {effectiveAreas.map(area => (
                          <div 
                            key={area.id}
                            onClick={() => {
                              const params = new URLSearchParams(searchParams.toString());
                              if (zoneFilter === area.name) params.delete('zone'); else params.set('zone', area.name);
                              router.push('/dashboard/orders?' + params.toString());
                            }} 
                            className="flex items-center gap-3 py-1.5 px-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                             <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${zoneFilter === area.name ? 'border-sky-600' : 'border-gray-300'}`}>
                                {zoneFilter === area.name && <div className="w-2 h-2 bg-sky-600 rounded-full" />}
                             </div>
                             <span className={`text-[15px] ${zoneFilter === area.name ? 'font-bold text-gray-900' : 'text-gray-600 font-medium'}`}>{area.name}</span>
                          </div>
                        ))}
                      </div>
                      <hr className="my-1 border-gray-100" />
                    </>
                  )}
                  {/* Timing */}
                  {[{id:'MIDWEEK', label:'אמצע השבוע'}, {id:'SHABBAT', label:'שבת'}].map(opt => (
                    <div 
                      key={opt.id}
                      onClick={() => setTimingFilter(timingFilter === opt.id ? 'ALL' : opt.id as any)} 
                      className="flex items-center gap-3 py-1.5 px-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                       <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${timingFilter === opt.id ? 'border-purple-600' : 'border-gray-300'}`}>
                          {timingFilter === opt.id && <div className="w-2 h-2 bg-purple-600 rounded-full" />}
                       </div>
                       <span className={`text-[15px] ${timingFilter === opt.id ? 'font-bold text-gray-900' : 'text-gray-600 font-medium'}`}>{opt.label}</span>
                    </div>
                  ))}
                  <hr className="my-1 border-gray-100" />
                  {/* Payment */}
                  {[{id:'PAID', label:'שולם'}, {id:'UNPAID', label:'לא שולם'}].map(opt => (
                    <div 
                      key={opt.id}
                      onClick={() => setPaymentFilter(paymentFilter === opt.id ? 'ALL' : opt.id as any)} 
                      className="flex items-center gap-3 py-1.5 px-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                       <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentFilter === opt.id ? 'border-green-600' : 'border-gray-300'}`}>
                          {paymentFilter === opt.id && <div className="w-2 h-2 bg-green-600 rounded-full" />}
                       </div>
                       <span className={`text-[15px] ${paymentFilter === opt.id ? 'font-bold text-gray-900' : 'text-gray-600 font-medium'}`}>{opt.label}</span>
                    </div>
                  ))}
                  <hr className="my-1 border-gray-100" />
                  {/* Delivery */}
                  {[{id:'PLANNED', label:'לא סופק (בהמתנה)'}, {id:'EXECUTED', label:'סופק/טופל'}].map(opt => (
                    <div 
                      key={opt.id}
                      onClick={() => setDeliveryFilter(deliveryFilter === opt.id ? 'ALL' : opt.id as any)} 
                      className="flex items-center gap-3 py-1.5 px-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                       <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${deliveryFilter === opt.id ? 'border-amber-600' : 'border-gray-300'}`}>
                          {deliveryFilter === opt.id && <div className="w-2 h-2 bg-amber-600 rounded-full" />}
                       </div>
                       <span className={`text-[15px] ${deliveryFilter === opt.id ? 'font-bold text-gray-900' : 'text-gray-600 font-medium'}`}>{opt.label}</span>
                    </div>
                  ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 print:hidden relative">
            <button 
              onClick={() => {
                if (sortedZones.length === 0) {
                  window.print()
                  return
                }
                setIsPrintModalOpen(true)
                setSelectedPrintZones([]) // reset to print-all state implicitly
              }}
              className="flex items-center justify-center w-10 h-10 bg-gray-800 hover:bg-gray-900 active:scale-95 text-white rounded-2xl font-bold transition-all shadow-sm" title="הדפסה"
            >
              <Printer className="w-4 h-4" />
            </button>
            {/* PRINT MODAL */}
            {isPrintModalOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsPrintModalOpen(false)} />
                <div className="absolute top-12 left-0 w-72 bg-white rounded-xl shadow-2xl z-50 p-4 border border-gray-100 flex flex-col gap-3 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                  <h3 className="font-bold text-gray-800 text-base">אזורים להדפסה</h3>
                  <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1">
                    <button
                      onClick={() => setSelectedPrintZones([])}
                      className={`text-right w-full px-2 py-1.5 rounded-lg text-sm font-bold flex items-center justify-between ${selectedPrintZones.length === 0 ? 'bg-blue-50 text-blue-700 font-black' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      הכל (הדפס הכל)
                      {selectedPrintZones.length === 0 && <Check className="w-4 h-4" />}
                    </button>
                    {sortedZones.map((zone, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedPrintZones(prev => 
                            prev.includes(zone) 
                              ? prev.filter(z => z !== zone) 
                              : [...prev, zone]
                          )
                        }}
                        className={`text-right w-full px-2 py-1.5 rounded-lg text-sm font-bold flex items-center justify-between transition-colors ${selectedPrintZones.includes(zone) ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}`}
                      >
                        <span className="truncate">{zone} <span className="font-normal text-xs text-gray-400">({zoneGroups[zone].length})</span></span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedPrintZones.includes(zone) ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
                           {selectedPrintZones.includes(zone) && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => {
                      setIsPrintModalOpen(false)
                      setTimeout(() => window.print(), 200)
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-sm transition-colors mt-2"
                  >
                    המשך להדפסה בדפים נפרדים
                  </button>
                </div>
              </>
            )}
            {!isGenericView && (
              <button 
                onClick={handleMarkAllExecuted}
                disabled={isBulkUpdating}
                className="flex items-center justify-center w-10 h-10 shrink-0 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:scale-95 text-white rounded-2xl font-bold transition-all shadow-sm shadow-green-500/25 disabled:opacity-50"
                title="סמן הכל כבוצע"
              >
                {isBulkUpdating ? <Circle className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white border border-gray-100 rounded-2xl shadow-sm">
          אין הזמנות לעיר הזו.
        </div>
      ) : (
        <div className="space-y-10">
          {sortedZones.map(zone => {
            const zoneOrders = zoneGroups[zone]
            const aggregates: Record<string, { hot: number; cold: number; unknown: number }> = {}
            if (viewMode === 'SUMMARY') {
              zoneOrders.forEach(order => {
                order.items.forEach((item: any) => {
                  const pName = item.product.name
                  if (!aggregates[pName]) aggregates[pName] = { hot: 0, cold: 0, unknown: 0 }
                  const isSbb = order.deliveryDay === 'Shabbat';
                  const isOther = item.product?.category === 'OTHER';
                  const isItemHot = !isSbb && !isOther && (item.variant === 'HOT' || (!item.variant && (item.product.category === 'HOT' || order.type === 'HOT')))
                  const isItemCold = !isSbb && !isOther && (item.variant === 'COLD' || (!item.variant && (item.product.category === 'COLD' || order.type === 'COLD')))
                  if (isItemHot) aggregates[pName].hot += item.quantity
                  else if (isItemCold) aggregates[pName].cold += item.quantity
                  else aggregates[pName].unknown += item.quantity
                })
              })
            }
            return (
              <div key={zone} className="space-y-4">
                {!isGenericView && (
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-blue-800 bg-blue-50 px-4 py-2 rounded-xl inline-block border border-blue-100">
                      📍 {zone}
                    </h2>
                    <span className="text-sm font-bold text-gray-400">{zoneOrders.length} הזמנות</span>
                  </div>
                )}
                {viewMode === 'SUMMARY' ? (
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
                    {Object.keys(aggregates).length === 0 ? (
                      <p className="text-gray-500 text-sm">אין מוצרים באזור זה.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {Object.entries(aggregates).map(([pName, counts]) => (
                          <div key={pName} className="flex justify-between items-center p-3 sm:p-4 bg-gray-50 hover:bg-white transition-colors rounded-xl border border-gray-100/50 shadow-sm">
                            <span className="font-bold text-gray-800 text-base sm:text-lg whitespace-normal break-words mr-3">{pName}</span>
                            <div className="flex gap-2 shrink-0 font-mono text-sm sm:text-base">
                              {counts.hot > 0 && <span className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg inline-block text-center min-w-[3.5rem] shadow-sm">🔥 {counts.hot}</span>}
                              {counts.cold > 0 && <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg inline-block text-center min-w-[3.5rem] shadow-sm">❄️ {counts.cold}</span>}
                              {counts.unknown > 0 && (
                                <span className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg inline-block text-center font-bold min-w-[3.5rem] shadow-sm">
                                  סה״כ {counts.unknown}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-4">
                    {([...zoneOrders].sort((a, b) => {
                      const aDone = a.status === 'EXECUTED' || a.status === 'PAID';
                      const bDone = b.status === 'EXECUTED' || b.status === 'PAID';
                      if (!aDone && bDone) return -1;
                      if (aDone && !bDone) return 1;
                      if (a.type === 'HOT' && b.type !== 'HOT') return -1;
                      if (a.type !== 'HOT' && b.type === 'HOT') return 1;
                      if (a.type === 'COLD' && b.type !== 'COLD') return -1;
                      if (a.type !== 'COLD' && b.type === 'COLD') return 1;
                      return 0;
                    })).map(order => {
                      if (isStoreCompactView) {
                        return (
                          <div 
                            key={order.id}
                            id={`order-${order.id}`}
                            className="bg-white border-b border-gray-100 hover:bg-gray-50 transition flex flex-col p-3 gap-2 scroll-mt-24"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2" onClick={() => router.push(`/dashboard/customers/${order.customer.id}`)}>
                                <span className="font-bold text-[15px] text-gray-900 cursor-pointer hover:text-blue-600">{order.customer.name}</span>
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    initiateCustomerCall(order.customer.phone);
                                  }} 
                                  className="hover:text-blue-600 hover:underline hover:font-bold text-[13px] text-gray-500 font-mono tracking-wider transition-all" 
                                  dir="ltr"
                                >
                                  {order.customer.phone}
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] hidden sm:inline-block bg-purple-50 text-purple-700 font-black px-2 py-1 rounded border border-purple-100">
                                   רביעי {getParashaForDate(getShabbatDate(order.deliveryWeek, new Date(order.createdAt)))}
                                </span>
                                <button onClick={async (e) => { 
                                  e.stopPropagation();
                                  if (confirm('האם אתה בטוח שברצונך למחוק הזמנה זו? צעד זה לא ניתן לביטול.')) {
                                    await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
                                    window.location.reload();
                                  }
                                }} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-gray-100 bg-white" title="מחק הזמנה">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <OrderStatusDropdown orderId={order.id} initialStatus={order.status} hidePaid={true} />
                              </div>
                            </div>
                            <div className="text-[14px] font-medium text-gray-800 bg-gray-50/80 px-3 py-2 rounded-lg min-h-[40px] flex items-center mb-1 flex-wrap gap-2">
                              {(() => {
                                const ordAgg: Record<string, { hot: number; cold: number; unknown: number }> = {}
                                order.items.forEach((item: any) => {
                                  const pName = item.product.name
                                  if (!ordAgg[pName]) ordAgg[pName] = { hot: 0, cold: 0, unknown: 0 }
                                  const isSbb = order.deliveryDay === 'Shabbat';
                                  const isHot = !isSbb && (item.variant === 'HOT' || (!item.variant && (item.product.category === 'HOT' || order.type === 'HOT')))
                                  const isCold = !isSbb && (item.variant === 'COLD' || (!item.variant && (item.product.category === 'COLD' || order.type === 'COLD')))
                                  if (isHot) ordAgg[pName].hot += item.quantity
                                  else if (isCold) ordAgg[pName].cold += item.quantity
                                  else ordAgg[pName].unknown += item.quantity
                                })
                                return Object.entries(ordAgg).map(([pName, counts]) => (
                                  <span key={pName} className="flex items-center gap-1">
                                    {pName}
                                    {counts.hot > 0 && <span className="bg-orange-100 border border-orange-200 text-orange-800 font-bold text-xs px-1.5 py-[1px] rounded flex items-center gap-0.5"><span className="text-[10px]">🔥</span>{counts.hot}</span>}
                                    {counts.cold > 0 && <span className="bg-blue-100 border border-blue-200 text-blue-800 font-bold text-xs px-1.5 py-[1px] rounded flex items-center gap-0.5"><span className="text-[10px]">❄️</span>{counts.cold}</span>}
                                    {counts.unknown > 0 && <span className="text-gray-600 font-bold text-xs px-1 py-[1px]">x{counts.unknown}</span>}
                                  </span>
                                ))
                              })()}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-bold text-gray-800">
                                סך הכל: ₪{order.totalPrice?.toFixed(2) || '0.00'}
                              </span>
                              {order.customer?.balance > 0 && (
                                <span className="text-[11px] font-bold text-red-600">
                                  כולל חוב קודם ({order.customer.balance}₪): ₪{(order.totalPrice + order.customer.balance).toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setWizardTarget({ isFixed: false, orderId: order.id }); }}
                                className="text-[11px] font-bold text-blue-600 bg-blue-50/80 px-2 py-1.5 rounded hover:bg-blue-100 transition-colors"
                              >
                                ערוך שבוע זה
                              </button>
                              <button 
                                onClick={async (e) => { 
                                  e.stopPropagation(); 
                                  if (confirm('האם אתה בטוח שברצונך לבטל את ההזמנה רק לשבוע זה?')) {
                                     await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
                                     window.location.reload();
                                  }
                                }}
                                className="text-[11px] font-bold text-gray-500 bg-gray-100/80 px-2 py-1.5 rounded hover:bg-gray-200 transition-colors"
                              >
                                ביטול שבוע זה
                              </button>
                              {order.orderTemplateId && (
                                <button 
                                  onClick={async (e) => { 
                                    e.stopPropagation(); 
                                    if (confirm('אזהרה: פעולה זו תבטל את ההזמנה הקבועה הזו לתמיד. האם אתה בטוח?')) {
                                       await fetch(`/api/order-templates/${order.orderTemplateId}`, { method: 'DELETE' });
                                       window.location.reload();
                                    }
                                  }}
                                  className="text-[11px] font-bold text-red-600 bg-red-50/80 px-2 py-1.5 rounded hover:bg-red-100 transition-colors"
                                >
                                  ביטול קבוע
                                </button>
                              )}
                            </div>
                            <OrderHistoryBadge order={order} />
                          </div>
                        )
                      }                    
                      return <OrderCard key={order.id} order={order} onEdit={(o) => setWizardTarget({ isFixed: false, orderId: o.id, orderData: o })} />
                    })}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
    {/* PRINT ONLY LAYOUT */}
    <div className="hidden print:block w-full text-black bg-white" dir="rtl">
      {sortedZones.filter(z => selectedPrintZones.length === 0 || selectedPrintZones.includes(z)).map((zone, idx) => {
        const zoneOrders = zoneGroups[zone];
        if (!zoneOrders || zoneOrders.length === 0) return null;
        const zoneProductAggregates: Record<string, { hot: number; cold: number; unknown: number }> = {}
        zoneOrders.forEach(order => {
          order.items.forEach((item: any) => {
            const pName = item.product.name;
            if (!zoneProductAggregates[pName]) zoneProductAggregates[pName] = { hot: 0, cold: 0, unknown: 0 }
            const variant = item.variant;
            const cat = item.product.category;
            const isSbb = order.deliveryDay === 'Shabbat';
            const isHot = !isSbb && (variant === 'HOT' || (!variant && cat === 'HOT') || order.type === 'HOT');
            const isCold = !isSbb && (variant === 'COLD' || (!variant && cat === 'COLD') || order.type === 'COLD');
            if (isHot) zoneProductAggregates[pName].hot += item.quantity;
            else if (isCold) zoneProductAggregates[pName].cold += item.quantity;
            else zoneProductAggregates[pName].unknown += item.quantity;
          });
        });
        const firstOrderCity = zoneOrders[0].city || (zone.includes('בית שמש') || zone.includes('רמה ') || zone.includes('קריה') ? 'בית שמש' : (zone.includes('ירושלים') || zone.includes('רמות') || zone.includes('רוממה') || zone.includes('הר נוף') || zone.includes('גאולה') ? 'ירושלים' : ''));
        const displayCity = initialCity !== 'ALL' ? initialCity : firstOrderCity;
        return (
          <div key={zone} style={{ pageBreakBefore: idx > 0 ? 'always' : 'auto' }} className="w-full">
            {/* Header */}
            <div className="text-center mb-6 pt-4 border-b-2 border-black pb-2 flex flex-col gap-1 items-center justify-center">
              <h1 className="text-2xl font-black">{pageTitle}</h1>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>📍 {zone}</span>
                {displayCity && <span>| {displayCity}</span>}
              </h2>
            </div>
            {/* Table */}
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-black">
                   <th className="py-2 px-1 w-[15%] font-black text-gray-800">שם משפחה</th>
                   <th className="py-2 px-1 w-[20%] font-black text-gray-800">כתובת ונייד</th>
                   <th className="py-2 px-1 w-[50%] font-black text-gray-800">פירוט מוצרים</th>
                   <th className="py-2 px-1 w-[15%] font-black text-gray-800">הערות / מידע נוסף</th>
                </tr>
              </thead>
              <tbody>
                {zoneOrders.map((order, orderIdx) => {
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
                   const displayAddress = order.address?.replace('ישראל', '').replace('ירושלים', '').replace('בית שמש', '').trim() || '';
                   return (
                     <tr key={order.id} className="border-b border-gray-300 text-black align-top break-inside-avoid">
                       <td className="py-2 px-1 font-bold text-[14px]">
                          {order.customer.name}
                       </td>
                       <td className="py-2 px-1 font-medium whitespace-pre-wrap leading-tight text-[13px]">
                           <button 
                             onClick={(e) => { e.stopPropagation(); initiateCustomerCall(order.customer.phone); }} 
                             className="font-bold hover:text-blue-600 hover:underline" 
                             dir="ltr"
                           >
                             {order.customer.phone}
                           </button>
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
      <span className="text-[11px] text-gray-600 font-bold bg-gray-100 px-1 rounded mr-1">
        יתרה: ₪{Math.max(0, (order.customer.debt || 0) - (((order.status === 'PAID') || (order.totalPrice > 0 && order.paidAmount >= order.totalPrice)) ? 0 : Math.max(0, order.totalPrice - (order.paidAmount || 0))))}
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
            <div className="mt-4 text-right text-sm font-bold text-gray-500 w-full mb-1">
              סה״כ: {zoneOrders.length} הזמנות באזור
            </div>
            <div className="mt-2 border-t border-gray-400 pt-3 mb-8">
              <h3 className="font-black text-[15px] mb-2 underline print:break-inside-avoid">סיכום מוצרים מוזמנים לאזור ({zone}):</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-2 print:break-inside-avoid">
                {Object.entries(zoneProductAggregates).map(([pName, counts]) => {
                  const arr = []
                  if (counts.hot > 0) arr.push(`🔥 ${counts.hot}`)
                  if (counts.cold > 0) arr.push(`❄️ ${counts.cold}`)
                  if (counts.unknown > 0) arr.push(`${counts.unknown}`)
                  if (arr.length === 0) return null;
                  return (
                    <div key={pName} className="font-bold text-[14px] bg-gray-100 px-2 py-1 rounded">
                       <span className="text-black">{pName}</span>: {arr.join(' | ')}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
      <OrderWizardModal
        isOpen={!!wizardTarget}
        onClose={() => { setWizardTarget(null); router.refresh(); }}
        initialOrderId={wizardTarget?.orderId}
        initialTemplateId={wizardTarget?.templateId}
        isFixedInitial={wizardTarget?.isFixed}
        initialOrderData={wizardTarget?.orderData}
      />
    </>
  )
}
