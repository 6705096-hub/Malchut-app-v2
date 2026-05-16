'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState } from 'react'
import { TrendingUp, ShoppingBag, Store, Users, Calendar, BarChart3 } from 'lucide-react'
import { AnalyticsCharts } from '@/components/AnalyticsCharts'

type ReportsClientProps = {
  initialRange: string
  startDateStr: string
  endDateStr: string
  data: {
    totalRevenue: number
    totalOrders: number
    topProducts: { name: string, quantity: number }[]
    topCustomers: { id: string, name: string, totalSpent: number, orderCount: number }[]
  }
}

export function ReportsClient({ initialRange, startDateStr, endDateStr, data }: ReportsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  const [range, setRange] = useState(initialRange)
  const [customStart, setCustomStart] = useState(startDateStr)
  const [customEnd, setCustomEnd] = useState(endDateStr)

  const handleRangeChange = (newRange: string) => {
    setRange(newRange)
    const p = new URLSearchParams(searchParams.toString())
    p.set('range', newRange)
    if (newRange !== 'custom') {
      p.delete('start')
      p.delete('end')
    }
    router.push(`${pathname}?${p.toString()}`)
  }

  const applyCustomRange = () => {
    if (!customStart || !customEnd) return
    const p = new URLSearchParams(searchParams.toString())
    p.set('range', 'custom')
    p.set('start', customStart)
    p.set('end', customEnd)
    router.push(`${pathname}?${p.toString()}`)
  }

  const rangeButtons = [
    { id: 'today', label: 'היום' },
    { id: 'week', label: 'שבוע אחרון' },
    { id: 'month', label: 'חודש אחרון' },
    { id: 'year', label: 'שנה אחרונה' },
    { id: 'custom', label: 'תאריכים...' },
  ]

  return (
    <div className="p-4 flex flex-col gap-6 max-w-4xl mx-auto mt-4">
      
      {/* Date Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex flex-wrap gap-2 justify-center">
        {rangeButtons.map(btn => (
          <button
            key={btn.id}
            onClick={() => handleRangeChange(btn.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              range === btn.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Custom Range Picker */}
      {range === 'custom' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-end animate-in fade-in slide-in-from-top-2">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-bold text-gray-500 mb-1">מתאריך</label>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-bold text-gray-500 mb-1">עד תאריך</label>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
          </div>
          <button onClick={applyCustomRange} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-indigo-700 transition-colors h-[38px]">
            סנן
          </button>
        </div>
      )}

      {/* ===== Analytics Dashboard ===== */}
      <AnalyticsCharts />

      {/* Top Level Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-2xl p-5 text-white shadow-lg border border-blue-500">
          <p className="text-blue-200 text-sm font-medium mb-1 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> הכנסות לתקופה
          </p>
          <p className="text-3xl font-black">₪{data.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-5 text-white shadow-lg border border-emerald-500">
          <p className="text-emerald-100 text-sm font-medium mb-1 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4" /> סך הזמנות
          </p>
          <p className="text-3xl font-black">{data.totalOrders.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Products List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-gray-800">מוצרים נמכרים ({data.topProducts.length})</h2>
          </div>
          <div className="p-2 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar">
            {data.topProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm font-medium">לא נמצאו מוצרים בתקופה זו</div>
            ) : (
              <div className="space-y-1">
                {data.topProducts.map((p, i) => (
                  <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0">
                    <span className="font-bold text-gray-700 text-sm truncate pr-2"><span className="text-gray-400 mr-1 text-xs">{i+1}.</span> {p.name}</span>
                    <span className="font-black bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-sm shrink-0">x{p.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Customers List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            <h2 className="font-bold text-gray-800">הלקוחות שקנו הכי הרבה</h2>
          </div>
          <div className="p-2 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar">
            {data.topCustomers.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm font-medium">לא נמצאו לקוחות בתקופה זו</div>
            ) : (
              <div className="space-y-1">
                {data.topCustomers.map((c, i) => (
                  <div key={c.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-bold text-gray-800 text-sm truncate"><span className="text-gray-400 mr-1 text-xs">{i+1}.</span> {c.name}</span>
                      <span className="text-xs text-gray-500 mr-4">{c.orderCount} הזמנות בתקופה</span>
                    </div>
                    <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-sm shrink-0">₪{c.totalSpent.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
