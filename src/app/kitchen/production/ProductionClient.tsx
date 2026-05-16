'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { format, addDays, subDays, isValid, startOfDay, differenceInDays } from 'date-fns'
import { getHebrewDateString } from '@/lib/hebrewDate'
import { ChevronLeft, ChevronRight, Search, CircleCheck } from 'lucide-react'
import { PageHeader } from '@/components/BackButton'

type ProductData = {
  id: string
  name: string
  produced: number
  inStock: number
}

type Props = {
  targetDateISO: string
  productsData: ProductData[]
  canEdit: boolean
}

export function ProductionClient({ targetDateISO, productsData, canEdit }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [optimisticDate, setOptimisticDate] = useState<string | null>(null)
  const [localProducts, setLocalProducts] = useState(productsData)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

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
  const isTooOld = differenceInDays(startOfDay(new Date()), startOfDay(targetDate)) >= 7

  const navigate = (params: URLSearchParams) =>
    router.push(`${pathname}?${params.toString()}`, { scroll: false })

  const goToDate = (newDate: Date) => {
    const newVal = format(newDate, 'yyyy-MM-dd')
    setOptimisticDate(newVal)
    const p = new URLSearchParams(searchParams.toString())
    p.set('date', newVal)
    navigate(p)
  }

  const handlePrevDay = () => {
    if (isTooOld) return
    goToDate(subDays(targetDate, 1))
  }

  const handleNextDay = () => goToDate(addDays(targetDate, 1))

  function handleDatePick(val: string) {
    const parsed = new Date(val)
    if (differenceInDays(startOfDay(new Date()), startOfDay(parsed)) >= 7) return
    goToDate(parsed)
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
        body: JSON.stringify({ dateString: currentDateStr, logs: payload })
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('׳©׳’׳™׳׳” ׳‘׳©׳׳™׳¨׳”, ׳׳ ׳ ׳ ׳¡׳” ׳©׳•׳‘.')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredProducts = localProducts
    .filter(p => p.name.includes(searchTerm))
    .sort((a, b) => a.name.localeCompare(b.name, 'he'))

  const isToday = currentDateStr === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">

      {/* Page header */}
      <PageHeader title="׳”׳–׳ ׳× ׳™׳™׳¦׳•׳¨ ׳™׳•׳׳™" />

      {/* Date Switcher */}
      <div className="flex items-center bg-white border border-gray-100 shadow-sm rounded-2xl px-2 py-1.5 gap-1">
        <button
          onClick={handlePrevDay}
          disabled={isTooOld}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>

        <button
          onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
          className="flex-1 flex flex-col items-center py-0.5 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <span className="font-black text-gray-900 text-base leading-tight">{displayedDateLabel}</span>
          <span className={`text-[11px] font-semibold mt-0.5 ${isToday ? 'text-indigo-500' : 'text-gray-400'}`}>
            {isToday ? '׳”׳™׳•׳' : currentDateStr}
          </span>
        </button>

        <input
          ref={dateInputRef}
          type="date"
          min={format(subDays(new Date(), 6), 'yyyy-MM-dd')}
          max={format(addDays(new Date(), 30), 'yyyy-MM-dd')}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          value={currentDateStr}
          onChange={e => e.target.value && handleDatePick(e.target.value)}
        />

        <button
          onClick={handleNextDay}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Search + Save toolbar */}
      <div className="flex gap-2 items-center sticky top-[60px] z-20 bg-[#fafafa] py-1">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="׳—׳₪׳© ׳׳•׳¦׳¨..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm"
          />
        </div>

        {canEdit && (
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className={`px-5 py-2.5 font-bold rounded-xl shadow transition-all active:scale-95 flex items-center gap-1.5 text-sm whitespace-nowrap disabled:opacity-60 ${
              saveSuccess
                ? 'bg-emerald-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {saveSuccess ? (
              <><CircleCheck className="w-4 h-4" /> ׳ ׳©׳׳¨!</>
            ) : isSaving ? '׳©׳•׳׳¨...' : '׳©׳׳•׳¨'}
          </button>
        )}
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="bg-gradient-to-l from-indigo-50 to-slate-50 border-b border-gray-100 text-gray-500 text-[11px] font-black uppercase tracking-wide">
                <th className="px-3 py-3 text-center w-8">#</th>
                <th className="px-4 py-3">׳׳•׳¦׳¨</th>
                <th className="px-3 py-3 text-center w-24">׳׳׳׳™ ׳‘׳¡׳™׳¡</th>
                <th className="px-3 py-3 text-center w-28 bg-indigo-50/60">׳”׳›׳ ׳×׳™ ׳”׳™׳•׳</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map((p, idx) => (
                <tr key={p.id} className="hover:bg-indigo-50/20 transition-colors">
                  <td className="px-3 py-3 text-center text-gray-300 text-xs font-bold">{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800 leading-tight">{p.name}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      min="0"
                      disabled={!canEdit}
                      value={p.inStock === 0 ? '' : p.inStock}
                      placeholder="0"
                      onChange={e => updateInStock(p.id, parseInt(e.target.value) || 0)}
                      className={`w-full text-center font-bold bg-transparent border border-transparent rounded-lg p-1.5 outline-none transition-all text-sm
                        ${canEdit
                          ? 'hover:border-gray-200 focus:border-blue-300 focus:bg-white text-gray-700'
                          : 'text-gray-400 cursor-not-allowed'
                        }`}
                    />
                  </td>
                  <td className="px-2 py-2 text-center bg-indigo-50/30">
                    <input
                      type="number"
                      min="0"
                      disabled={!canEdit}
                      value={p.produced === 0 ? '' : p.produced}
                      placeholder="0"
                      onChange={e => updateQuantity(p.id, parseInt(e.target.value) || 0)}
                      className={`w-full h-9 text-center font-black text-base rounded-xl border outline-none transition-all
                        ${canEdit
                          ? 'bg-white border-indigo-200 text-indigo-700 focus:ring-2 focus:ring-indigo-300 shadow-sm hover:bg-indigo-50'
                          : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    />
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400 text-sm">
                    {searchTerm ? `׳׳ ׳ ׳׳¦׳׳• ׳׳•׳¦׳¨׳™׳ ׳¢׳ "${searchTerm}"` : '׳׳™׳ ׳׳•׳¦׳¨׳™׳ ׳׳•׳’׳“׳¨׳™׳ ׳׳׳¢׳§׳‘ ׳™׳™׳¦׳•׳¨'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

