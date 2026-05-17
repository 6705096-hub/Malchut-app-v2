'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { format, addDays, subDays, isValid, startOfDay, differenceInDays } from 'date-fns'
import { getHebrewDateString } from '@/lib/hebrewDate'
import { ChevronLeft, ChevronRight, Search, CheckCircle2 } from 'lucide-react'

type ProductData = {
  id: string
  name: string
  produced: number
  inStock: number
  totalOrderedEver: number
  totalProducedEver: number
}

type Props = {
  targetDateISO: string
  allLogs: { dateString: string; productId: string; quantityProduced: number }[]
  productsData: ProductData[]
  canEdit: boolean
}

export function ProductionClient({ targetDateISO, allLogs, productsData, canEdit }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [optimisticDate, setOptimisticDate] = useState<string | null>(null)
  
  // Local state for all fields
  const [localProducts, setLocalProducts] = useState(productsData)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Sync when date changes
  useEffect(() => {
    setOptimisticDate(null)
    setLocalProducts(productsData)
    setSaveSuccess(false)
  }, [searchParams.get('date'), productsData])

  const currentDateStr = optimisticDate || searchParams.get('date') || targetDateISO

  const targetDate = useMemo(() => {
    const d = new Date(`${currentDateStr}T12:00:00`)
    return isValid(d) ? d : new Date()
  }, [currentDateStr])

  const displayedDateLabel = useMemo(() => getHebrewDateString(targetDate), [targetDate])
  
  const isTooOld = differenceInDays(startOfDay(new Date()), startOfDay(targetDate)) >= 7;

  const navigate = (params: URLSearchParams) =>
    router.push(`${pathname}?${params.toString()}`, { scroll: false })

  const handlePrevDay = () => {
    if (isTooOld) {
       alert("לא ניתן לחזור ולערוך נתונים מעל לשבוע ימים (7 ימים) אחורה ביחס להיום.");
       return;
    }
    let newDate = subDays(targetDate, 1)
    const newVal = format(newDate, 'yyyy-MM-dd')
    setOptimisticDate(newVal)
    const p = new URLSearchParams(searchParams.toString())
    p.set('date', newVal)
    navigate(p)
  }

  const handleNextDay = () => {
    let newDate = addDays(targetDate, 1)
    const newVal = format(newDate, 'yyyy-MM-dd')
    setOptimisticDate(newVal)
    const p = new URLSearchParams(searchParams.toString())
    p.set('date', newVal)
    navigate(p)
  }

  const handleToday = () => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`
    setOptimisticDate(todayStr)
    const p = new URLSearchParams(searchParams.toString())
    p.set('date', todayStr)
    navigate(p)
  }

  function handleDatePick(val: string) {
    const parsed = new Date(val);
    if (differenceInDays(startOfDay(new Date()), startOfDay(parsed)) >= 7) {
       alert("לא ניתן לבחור תאריך הגדול מ-7 ימים אחורה, אלא אם אתה במצב מנהל היסטוריה.");
       return;
    }
    setOptimisticDate(val)
    const p = new URLSearchParams(searchParams.toString())
    p.set('date', val)
    navigate(p)
  }

  const updateQuantity = (id: string, newQty: number) => {
    setLocalProducts(prev => prev.map(p => p.id === id ? { ...p, produced: newQty } : p))
    setSaveSuccess(false)
  }

  const updateInStock = (id: string, newQty: number) => {
    setLocalProducts(prev => prev.map(p => p.id === id ? { ...p, inStock: newQty } : p))
    setSaveSuccess(false)
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const payload = localProducts.map(p => ({
        productId: p.id,
        quantityProduced: p.produced,
        inStock: p.inStock
      }))

      const res = await fetch('/api/production-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateString: currentDateStr,
          logs: payload
        })
      })

      if (!res.ok) throw new Error('Failed to save')
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      
      router.refresh()
    } catch (err) {
      console.error(err)
      alert("שגיאה בשמירה, אנא נסה שוב.")
    } finally {
      setIsSaving(false)
    }
  }

  const filteredProducts = localProducts.filter(p => p.name.includes(searchTerm))
  filteredProducts.sort((a,b) => a.name.localeCompare(b.name, 'he'))

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Date Navigation */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-3">
        <label className="text-center text-sm font-bold text-gray-500 uppercase tracking-wide">
          מתעד / מציג ייצור עבור תאריך:
        </label>
        <div className="flex flex-col gap-3 max-w-sm mx-auto w-full">
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-1.5 border border-gray-100">
            <button onClick={handlePrevDay} className={`p-3 rounded-lg transition-colors shadow-sm bg-white ${isTooOld ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`} title="יום קודם" disabled={isTooOld}>
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
            
            <div className="relative flex-1 flex flex-col items-center justify-center">
              <button
                onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
                className="font-black text-blue-700 text-base sm:text-lg hover:text-blue-800 transition-colors"
              >
                📅 {displayedDateLabel}
              </button>
              <div className="text-xs font-bold text-gray-400 mt-0.5">{currentDateStr}</div>
              <input
                ref={dateInputRef}
                type="date"
                min={format(subDays(new Date(), 6), 'yyyy-MM-dd')}
                max={format(addDays(new Date(), 30), 'yyyy-MM-dd')}
                className="absolute opacity-0 w-0 h-0 pointer-events-none"
                value={currentDateStr}
                onChange={e => e.target.value && handleDatePick(e.target.value)}
              />
            </div>

            <button onClick={handleNextDay} className="p-3 hover:bg-white rounded-lg transition-colors shadow-sm bg-white" title="יום הבא">
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          
          <button onClick={handleToday} className="w-full py-2.5 bg-blue-50/50 text-blue-700 text-sm font-bold rounded-xl hover:bg-blue-100 transition-colors border border-blue-100/50">
            קפוץ להיום והזן חדש
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between sticky top-[60px] z-20 bg-[#fafafa] py-2">
        <div className="relative w-full sm:max-w-xs border-r pr-2 shadow-inner bg-white rounded-2xl">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="חפש מוצר להזנה..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm text-sm font-medium"
          />
        </div>
        
        {canEdit && (
          <button 
            onClick={handleSaveAll}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 text-sm"
          >
            {isSaving ? "שומר..." : saveSuccess ? "נשמר בהצלחה!" : "שמור / עדכן טבלה"}
            {saveSuccess && <CheckCircle2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Compact Tiny Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold text-xs uppercase">
              <tr>
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">מוצר</th>
                <th className="p-3 text-center">מלאי בסיס</th>
                <th className="p-3 text-center">צפי נדרש</th>
                <th className="p-3 text-center bg-indigo-50/50">הכנתי היום</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map((p, idx) => {
                 const expected = p.inStock + p.totalProducedEver + p.produced - p.totalOrderedEver;
                 return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3 text-center text-gray-300 text-xs font-medium">{idx + 1}</td>
                    <td className="p-3 font-semibold text-gray-800">{p.name}</td>
                    <td className="p-3 text-center w-24">
                       <input
                        type="number"
                        min="0"
                        disabled={!canEdit}
                        value={p.inStock === 0 ? '' : p.inStock}
                        placeholder="0"
                        onChange={(e) => updateInStock(p.id, parseInt(e.target.value) || 0)}
                        className={`w-full text-center font-bold bg-transparent border border-transparent hover:border-gray-200 rounded p-1 focus:border-blue-300 focus:bg-white outline-none transition-all ${canEdit ? 'text-gray-600' : 'text-gray-400'}`}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-black tracking-wide ${expected < 0 ? 'text-red-500 bg-red-50 px-2 py-0.5 rounded' : 'text-gray-500'}`}>
                        {expected}
                      </span>
                    </td>
                    <td className="p-2 text-center w-28 bg-indigo-50/30">
                       <input
                        type="number"
                        min="0"
                        disabled={!canEdit}
                        value={p.produced === 0 ? '' : p.produced}
                        placeholder="0"
                        onChange={(e) => updateQuantity(p.id, parseInt(e.target.value) || 0)}
                        className={`w-full h-8 text-center font-black bg-indigo-50 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none transition-all ${canEdit ? 'text-indigo-800 shadow-inner hover:bg-white' : 'text-gray-400'}`}
                      />
                    </td>
                  </tr>
                 )
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">לא נמצאו מוצרים תואמים לחיפוש.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
