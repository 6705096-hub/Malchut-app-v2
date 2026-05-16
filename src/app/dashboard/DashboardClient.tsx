'use client'

import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useRef, useEffect, useMemo } from 'react'
import { CirclePlus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, subDays, isValid } from 'date-fns'
import { getParashaForDate, getParashaEntry, PARASHAS } from '@/lib/parasha'
import { getHebrewDateString } from '@/lib/hebrewDate'
import { ProductionBatchInput } from './ProductionBatchInput'
import { ErrorBoundary } from '@/components/ErrorBoundary'

type DashboardClientProps = {
  targetDateISO: string
  targetDateLabel: string
  todayLabel: string
  dailyOrderCount: number
  dailyAggregates: Record<string, { id: string; name: string; hot: number; cold: number }>
  dailyProduced: Record<string, number>
  dailyDeductions?: Record<string, number>
  targetShabbatISO: string
  shabbatOrderCount: number
  shabbatAggregates: Record<string, { id: string; name: string; quantity: number }>
  shabbatProduced: Record<string, number>
  shabbatDeductions?: Record<string, number>
  shabbatRouteAggregates: Record<string, Record<string, number>>
  thisWeekParashaName: string
  
  specialDates: { id: string; name: string; date: Date }[]
  specialOrderCount: number
  specialAggregates: Record<string, { id: string; name: string; quantity: number }>
  specialProduced: Record<string, number>
  specialDeductions?: Record<string, number>
  selectedSpecialDateId: string | null
  
  hasMidweek: boolean
  hasShabbat: boolean
  hasPurim: boolean
  dailyStatus: string
  shabbatStatus: string
  specialStatus: string
}

export default function DashboardClient({ 
  targetDateISO, 
  targetDateLabel,
  todayLabel,
  dailyOrderCount, 
  dailyAggregates, 
  dailyProduced,
  dailyDeductions,
  targetShabbatISO,
  shabbatOrderCount, 
  shabbatAggregates,
  shabbatProduced,
  shabbatDeductions,
  thisWeekParashaName,
  specialDates,
  specialOrderCount,
  specialAggregates,
  specialProduced,
  specialDeductions,
  selectedSpecialDateId,
  hasMidweek,
  hasShabbat,
  hasPurim,
  dailyStatus,
  shabbatStatus,
  specialStatus
}: DashboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [showParashaList, setShowParashaList] = useState(false)
  const [showRouteGrouping, setShowRouteGrouping] = useState(false)
  const parashaListRef = useRef<HTMLDivElement>(null)
  const currentParashaRef = useRef<HTMLButtonElement>(null)
  
  const [showSpecialDatesList, setShowSpecialDatesList] = useState(false)
  const specialListRef = useRef<HTMLDivElement>(null)

  // ===== CLIENT-SIDE COMPUTED VALUES (with optimistic UI) =====
  const [optimisticDate, setOptimisticDate] = useState<string | null>(null)
  const [optimisticShabbat, setOptimisticShabbat] = useState<string | null>(null)
  
  const [optDailyStatus, setOptDailyStatus] = useState<string | null>(null)
  const [optShabbatStatus, setOptShabbatStatus] = useState<string | null>(null)
  useEffect(() => { setOptDailyStatus(null) }, [searchParams.get('dailyStatus')])
  useEffect(() => { setOptShabbatStatus(null) }, [searchParams.get('shabbatStatus')])
  const currentDailyStatus = optDailyStatus || dailyStatus || 'PLANNED'
  const currentShabbatStatus = optShabbatStatus || shabbatStatus || 'PLANNED'

  // Clear optimistic state when the URL param actually updates
  useEffect(() => {
    setOptimisticDate(null)
  }, [searchParams.get('date')])

  useEffect(() => {
    setOptimisticShabbat(null)
  }, [searchParams.get('shabbatWeek')])

  // Read from optimistic state first, then URL, then default props
  const currentDateStr = optimisticDate || searchParams.get('date') || targetDateISO
  const currentShabbatStr = optimisticShabbat || searchParams.get('shabbatWeek') || targetShabbatISO

  // Auto-refresh the server component every 15 seconds to sync incoming orders across devices
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 15000)
    return () => clearInterval(interval)
  }, [router])

  // Parse ISOs at noon (12:00:00) to avoid timezone/DST shifting them to the previous day
  const targetDate = useMemo(() => {
    const d = new Date(`${currentDateStr}T12:00:00`);
    return isValid(d) ? d : new Date();
  }, [currentDateStr])
  
  const targetShabbatDate = useMemo(() => {
    const d = new Date(`${currentShabbatStr}T12:00:00`);
    return isValid(d) ? d : new Date();
  }, [currentShabbatStr])
  
  // Compute labels on the client so they update instantly
  const displayedDateLabel = useMemo(() => getHebrewDateString(targetDate), [targetDate])
  const currentParasha = useMemo(() => getParashaForDate(targetShabbatDate), [targetShabbatDate])
  
  // Get the exact Shabbat date for the current parasha to show its Hebrew date
  const currentParashaEntry = useMemo(() => getParashaEntry(targetShabbatDate), [targetShabbatDate])
  const currentShabbatHebrewDate = useMemo(() => {
    const d = new Date(`${currentParashaEntry.date}T12:00:00`)
    return getHebrewDateString(d).split(', ')[1] // e.g. "כ״ה אדר תשפ״ו"
  }, [currentParashaEntry])

  // Auto-scroll parasha list to current parasha when opened
  useEffect(() => {
    if (showParashaList && currentParashaRef.current && parashaListRef.current) {
      currentParashaRef.current.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [showParashaList])

  const navigate = (params: URLSearchParams) =>
    router.push(`${pathname}?${params.toString()}`, { scroll: false })

  const handlePrevDay = () => {
    let newDate = subDays(targetDate, 1)
    if (newDate.getDay() === 6) newDate = subDays(newDate, 2) // Skip from Sunday (0) past Sat (6) & Fri (5) => Thursday (4)
    if (newDate.getDay() === 5) newDate = subDays(newDate, 1) // Also safety check if somehow landed on Fri
    
    const newVal = format(newDate, 'yyyy-MM-dd')
    setOptimisticDate(newVal)
    const p = new URLSearchParams(searchParams.toString())
    p.set('date', newVal)
    navigate(p)
  }
  const handleNextDay = () => {
    let newDate = addDays(targetDate, 1)
    if (newDate.getDay() === 5) newDate = addDays(newDate, 2) // Skip from Thursday (4) past Fri (5) & Sat (6) => Sunday (0)
    if (newDate.getDay() === 6) newDate = addDays(newDate, 1) // Safety check

    const newVal = format(newDate, 'yyyy-MM-dd')
    setOptimisticDate(newVal)
    const p = new URLSearchParams(searchParams.toString())
    p.set('date', newVal)
    navigate(p)
  }
  const handleToday = () => {
    let now = new Date()
    if (now.getDay() === 5) now = addDays(now, 2)
    else if (now.getDay() === 6) now = addDays(now, 1)
    
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`
    setOptimisticDate(todayStr)
    const p = new URLSearchParams(searchParams.toString())
    p.delete('date')
    navigate(p)
  }
  const handleDatePick = (dateStr: string) => {
    setOptimisticDate(dateStr)
    const p = new URLSearchParams(searchParams.toString())
    p.set('date', dateStr)
    navigate(p)
  }

  const handlePrevWeek = () => {
    const newVal = format(subDays(targetShabbatDate, 7), 'yyyy-MM-dd')
    setOptimisticShabbat(newVal)
    const p = new URLSearchParams(searchParams.toString())
    p.set('shabbatWeek', newVal)
    navigate(p)
  }
  const handleNextWeek = () => {
    const newVal = format(addDays(targetShabbatDate, 7), 'yyyy-MM-dd')
    setOptimisticShabbat(newVal)
    const p = new URLSearchParams(searchParams.toString())
    p.set('shabbatWeek', newVal)
    navigate(p)
  }
  const handleThisWeek = () => {
    // Rely on the true "This Week's Shabbat" calculated by the server and passed as todayLabel 
    // or we can calculate it dynamically here for safety.
    const today = new Date()
    const daysToSat = today.getDay() === 6 ? 0 : 6 - today.getDay()
    const thisSat = addDays(today, daysToSat)
    const thisSatStr = format(thisSat, 'yyyy-MM-dd')

    setOptimisticShabbat(thisSatStr)
    const p = new URLSearchParams(searchParams.toString())
    p.delete('shabbatWeek')
    navigate(p)
  }
  const handleParashaPick = (date: string) => {
    setOptimisticShabbat(date)
    const p = new URLSearchParams(searchParams.toString())
    p.set('shabbatWeek', date)
    navigate(p)
    setShowParashaList(false)
  }

  const handleSpecialDatePick = (id: string | null) => {
    const p = new URLSearchParams(searchParams.toString())
    if (!id) p.delete('specialDateId')
    else p.set('specialDateId', id)
    navigate(p)
    setShowSpecialDatesList(false)
  }

  const activeSpecialDate = specialDates.find(d => d.id === selectedSpecialDateId)

  return (
    <ErrorBoundary name="DashboardClientInternal">
      <div className="flex flex-col gap-8 pb-20">

        <div className="flex flex-col gap-5 mt-4">
        {/* ===== Daily Orders Card ===== */}
        {hasMidweek && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4">
          <div className="flex flex-col gap-2 w-full mb-3">
            <div className="flex items-center justify-between bg-blue-50 rounded-xl p-1.5">
              <button 
                onClick={handlePrevDay} 
                className="p-1.5 hover:bg-white rounded-lg transition-all active:scale-95"
                title="יום קודם"
              >
                <ChevronRight className="w-5 h-5 text-blue-500" />
              </button>
              
              {/* Date label — computed on client, updates instantly */}
              <div className="relative flex-1 flex justify-center">
                <button
                  onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
                  className="font-bold text-blue-700 text-sm hover:text-blue-900 transition-colors cursor-pointer"
                  title="לחץ לבחירת תאריך"
                >
                  📅 <span>{displayedDateLabel}</span>
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  className="absolute opacity-0 w-0 h-0 pointer-events-none"
                  value={currentDateStr}
                  onChange={e => e.target.value && handleDatePick(e.target.value)}
                />
              </div>

              <button 
                onClick={handleNextDay} 
                className="p-1.5 hover:bg-white rounded-lg transition-all active:scale-95"
                title="יום הבא"
              >
                <ChevronLeft className="w-5 h-5 text-blue-500" />
              </button>
            </div>
          </div>

          <Link href={`/dashboard/orders?date=${currentDateStr}`} className="block w-full hover:bg-blue-50/30 rounded-xl p-2 transition-colors mt-1">
            <div className="w-full space-y-1.5 border-t border-gray-100 pt-3 px-1">
              {Object.keys(dailyAggregates).length === 0 ? (
                <p className="text-xs text-gray-400 text-center font-medium py-2">אין מוצרים מוזמנים.</p>
              ) : (
                Object.values(dailyAggregates).map((counts) => (
                  <div key={counts.id} className="flex justify-between items-center gap-1 text-sm pb-1.5 border-b border-gray-50 last:border-0 overflow-hidden">
                    <span className="font-semibold text-gray-800 truncate flex-1 min-w-0" title={counts.name}>{counts.name}</span>
                    <div className="flex gap-1 shrink-0 font-mono items-center">
                      {counts.hot > 0 && (
                        <div onClick={e => e.preventDefault()}>
                          <ProductionBatchInput
                              productId={counts.id}
                              productName={counts.name}
                              targetDateString={currentDateStr}
                              requiredQuantity={counts.hot}
                              initialProduced={dailyProduced[counts.id] || 0}
                              deduction={dailyDeductions?.[counts.id] || 0}
                              viewStatus={currentDailyStatus}
                            />
                        </div>
                      )}
                      <div className="shrink-0 text-center flex items-center">
                        {counts.hot > 0 ? <span className="inline-flex items-center justify-center whitespace-nowrap bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-lg text-[11px] leading-none font-bold tracking-tight min-w-[30px]">🔥 {counts.hot}</span> : (counts.cold === 0 && !(counts as any).unknown ? <span className="inline-block text-transparent px-1 min-w-[28px]">-</span> : null)}
                      </div>
                      <div className="shrink-0 text-center flex items-center">
                        {counts.cold > 0 && <span className="inline-flex items-center justify-center whitespace-nowrap bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-lg text-[11px] leading-none font-bold tracking-tight min-w-[30px]">❄️ {counts.cold}</span>}
                      </div>
                      <div className="shrink-0 text-center flex items-center">
                        {(counts as any).unknown > 0 && <span className="inline-flex items-center justify-center whitespace-nowrap bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded-lg text-[11px] leading-none font-bold tracking-tight min-w-[30px] ml-1">{`סה״כ `}{(counts as any).unknown}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-3 flex justify-between items-center w-full px-1">
              <span className="text-xs text-blue-500 font-bold">סה״כ {dailyOrderCount} הזמנות</span>
              <div className="text-blue-600 flex items-center gap-1 text-xs font-bold">
                <span>לכל ההזמנות</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>
          </div>
        </div>
        )}

        {/* ===== Shabbat Orders Card ===== */}
        {hasShabbat && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4">
          <div className="flex flex-col gap-2 w-full mb-3 relative">
            <div className="flex items-center justify-between bg-purple-50 rounded-xl p-1.5">
              <button 
                onClick={handlePrevWeek} 
                className="p-1.5 hover:bg-white rounded-lg transition-all active:scale-95"
                title="שבוע קודם"
              >
                <ChevronRight className="w-5 h-5 text-purple-400" />
              </button>
              
              {/* Parasha label — computed on client, updates instantly */}
              <button
                onClick={() => setShowParashaList(v => !v)}
                className="font-bold text-purple-700 text-sm hover:text-purple-900 transition-colors cursor-pointer flex-1 text-center"
                title="לחץ לבחירת פרשה"
              >
                <span>{currentParasha}</span>
                <span className="block text-xs text-purple-400 font-normal">{currentShabbatHebrewDate}</span>
                <span className="text-purple-300"> ▾</span>
              </button>

              <button 
                onClick={handleNextWeek} 
                className="p-1.5 hover:bg-white rounded-lg transition-all active:scale-95"
                title="שבוע הבא"
              >
                <ChevronLeft className="w-5 h-5 text-purple-400" />
              </button>
            </div>

            {/* Parasha dropdown list */}
            {showParashaList && (
              <div ref={parashaListRef} className="absolute top-full left-0 right-0 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-50">
                {PARASHAS.map(p => (
                  <button
                    key={p.date}
                    ref={p.name === currentParasha ? currentParashaRef : null}
                    onClick={() => handleParashaPick(p.date)}
                    className={`w-full text-right px-4 py-2.5 text-sm font-bold border-b border-gray-50 last:border-0 hover:bg-purple-50 hover:text-purple-700 transition-colors ${p.name === currentParasha ? 'bg-purple-100 text-purple-700' : 'text-gray-700'}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link href={`/dashboard/orders?shabbatWeek=${currentShabbatStr}`} className="block w-full hover:bg-purple-50/30 rounded-xl p-2 transition-colors mt-1">
            <div className="w-full space-y-1.5 border-t border-gray-100 pt-3 px-1">
              {Object.keys(shabbatAggregates).length === 0 ? (
                <p className="text-xs text-gray-400 text-center font-medium py-2">אין מוצרים מוזמנים.</p>
              ) : (
                Object.entries(shabbatAggregates).map(([productName, item]) => (
                  <div key={productName} className="flex justify-between items-center text-sm pb-1.5 border-b border-gray-50 last:border-0">
                    <span className="font-semibold text-gray-800">{productName}</span>
                    <span className="bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-lg text-xs font-bold">×{item.quantity}</span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 flex justify-between items-center w-full px-1">
              <span className="text-xs text-purple-600 font-bold">סה״כ {shabbatOrderCount} הזמנות</span>
              <div className="text-purple-600 flex items-center gap-1 text-xs font-bold">
                <span>לכל ההזמנות</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>
          </div>
        </div>
        )}
        
        {/* ===== Special Dates Orders Card ===== */}
        {hasPurim && specialDates.length > 0 && (
          <div className="bg-white p-5 rounded-2xl shadow border border-gray-100 flex flex-col items-center">
            
            <div className="flex flex-col gap-2 w-full mb-3 relative">
              <div className="flex items-center justify-between bg-fuchsia-50 rounded-lg p-2 relative">
                <button
                  onClick={() => setShowSpecialDatesList(v => !v)}
                  className="font-bold text-gray-700 text-sm hover:text-fuchsia-600 transition-colors w-full text-center flex flex-col items-center gap-1"
                >
                  <span className="text-fuchsia-600 font-black">
                    {activeSpecialDate ? activeSpecialDate.name : 'בחירת תאריך מיוחד'}
                  </span>
                  {activeSpecialDate ? (
                    <span className="text-xs text-fuchsia-400">{getHebrewDateString(new Date(activeSpecialDate.date)).split(', ')[1] || format(new Date(activeSpecialDate.date), 'dd/MM/yyyy')}</span>
                  ) : (
                    <span className="text-xs text-fuchsia-400">חגים ומועדים</span>
                  )}
                  <span className="text-gray-400 absolute left-4 top-1/2 -translate-y-1/2">▾</span>
                </button>
              </div>

              {/* Special Dates list */}
              {showSpecialDatesList && (
                <div ref={specialListRef} className="absolute top-full left-0 right-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                  <button
                    onClick={() => handleSpecialDatePick(null)}
                    className={`w-full text-right px-4 py-3 text-sm font-bold border-b border-gray-50 hover:bg-fuchsia-50 hover:text-fuchsia-700 transition-colors ${!selectedSpecialDateId ? 'bg-fuchsia-100 text-fuchsia-700' : 'text-gray-400 italic'}`}
                  >
                    -- נקה בחירה (ללא תאריך מיוחד) --
                  </button>
                  {specialDates.map(sd => (
                    <button
                      key={sd.id}
                      onClick={() => handleSpecialDatePick(sd.id)}
                      className={`w-full text-right px-4 py-2.5 text-sm font-bold border-b border-gray-50 last:border-0 hover:bg-fuchsia-50 hover:text-fuchsia-700 transition-colors flex justify-between items-center ${sd.id === selectedSpecialDateId ? 'bg-fuchsia-100 text-fuchsia-700' : 'text-gray-700'}`}
                    >
                      <span>{sd.name}</span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{format(new Date(sd.date), 'dd/MM')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedSpecialDateId && (
              <Link href={`/dashboard/orders?specialDateId=${selectedSpecialDateId}`} className="block w-full hover:bg-gray-50 rounded-2xl p-2 transition-colors mt-2">
                <div className="w-full space-y-2 border-t border-gray-100 pt-4 px-2">
                  {Object.keys(specialAggregates).length === 0 ? (
                    <p className="text-xs text-gray-400 text-center font-medium">אין מוצרים מוזמנים.</p>
                  ) : (
                    Object.entries(specialAggregates).map(([productName, item]) => (
                      <div key={productName} className="flex justify-between items-center text-sm border-b border-gray-50 pb-1 last:border-0 last:pb-0">
                        <span className="font-semibold text-gray-700 truncate ml-2">{productName}</span>
                        <span className="bg-fuchsia-100 text-fuchsia-700 px-2 py-0.5 rounded text-xs font-bold">x{item.quantity}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex justify-between items-center w-full px-2">
                  <span className="text-xs text-fuchsia-600 font-bold">סה״כ {specialOrderCount} הזמנות</span>
                  <div className="text-fuchsia-600 flex items-center gap-1 text-sm font-bold opacity-0 hover:opacity-100 transition-opacity">
                    <span>לכל ההזמנות</span>
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            )}
            
            {!selectedSpecialDateId && (
              <div className="text-center py-6 text-fuchsia-300 text-xs font-bold">
                בחר תאריך מיוחד כדי לצפות בסיכום
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  )
}
