'use client'

import { useState, useMemo } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns'
import { Filter, BarChart3, Calendar, Search } from 'lucide-react'

type Props = {
  products: { id: string; name: string; category: string }[]
  logs: { productId: string; dateString: string; quantityProduced: number }[]
}

export function HistoryClient({ products, logs }: Props) {
  const [filterPeriod, setFilterPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM_DATE' | 'CUSTOM_MONTH' | 'ALL'>('WEEK')
  
  const [customDate, setCustomDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [customMonth, setCustomMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [searchTerm, setSearchTerm] = useState('')

  const { startDate, endDate } = useMemo(() => {
    const today = new Date()
    switch(filterPeriod) {
      case 'TODAY': return { startDate: startOfDay(today), endDate: endOfDay(today) }
      case 'WEEK': return { startDate: startOfWeek(today, {weekStartsOn: 0}), endDate: endOfWeek(today, {weekStartsOn: 0}) }
      case 'MONTH': return { startDate: startOfMonth(today), endDate: endOfMonth(today) }
      case 'YEAR': return { startDate: startOfYear(today), endDate: endOfYear(today) }
      case 'CUSTOM_DATE': {
        const d = parseISO(customDate)
        return { startDate: startOfDay(d), endDate: endOfDay(d) }
      }
      case 'CUSTOM_MONTH': {
        const d = new Date(`${customMonth}-01T00:00:00`)
        return { startDate: startOfMonth(d), endDate: endOfMonth(d) }
      }
      default: return { startDate: new Date(2020,0,1), endDate: new Date(2050,11,31) }
    }
  }, [filterPeriod, customDate, customMonth])

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logDate = parseISO(log.dateString)
      return isWithinInterval(logDate, { start: startDate, end: endDate })
    })
  }, [logs, startDate, endDate])

  const productTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    filteredLogs.forEach(log => {
      totals[log.productId] = (totals[log.productId] || 0) + log.quantityProduced
    })
    
    let res = products.map(p => ({
      ...p,
      total: totals[p.id] || 0
    })).filter(p => p.total > 0).sort((a,b) => b.total - a.total)

    if (searchTerm) {
      res = res.filter(r => r.name.includes(searchTerm))
    }
    return res;
  }, [filteredLogs, products, searchTerm])

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-5 h-5 text-indigo-500 mr-2" />
          <span className="font-bold text-gray-700 ml-4">סינון מהיר:</span>
          {(['TODAY', 'WEEK', 'MONTH', 'YEAR', 'ALL'] as const).map(period => (
            <button
              key={period}
              onClick={() => setFilterPeriod(period)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterPeriod === period ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            >
              {period === 'TODAY' && 'היום'}
              {period === 'WEEK' && 'השבוע'}
              {period === 'MONTH' && 'החודש'}
              {period === 'YEAR' && 'השנה'}
              {period === 'ALL' && 'הכל'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-600">בחר יום ספציפי:</span>
             <input 
              type="date" 
              value={customDate}
              onChange={(e) => { setCustomDate(e.target.value); setFilterPeriod('CUSTOM_DATE') }}
              className={`p-2 border rounded-lg text-sm font-bold outline-none transition-all ${filterPeriod === 'CUSTOM_DATE' ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200'}`}
            />
          </div>
          <div className="flex items-center gap-2 mx-4">
            <span className="text-sm font-bold text-gray-600">בחר חודש ספציפי:</span>
             <input 
              type="month" 
              value={customMonth}
              onChange={(e) => { setCustomMonth(e.target.value); setFilterPeriod('CUSTOM_MONTH') }}
              className={`p-2 border rounded-lg text-sm font-bold outline-none transition-all ${filterPeriod === 'CUSTOM_MONTH' ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200'}`}
            />
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <h2 className="font-black text-indigo-900 text-lg">סיכום ייצור ({format(startDate, 'dd/MM/yyyy')} - {format(endDate, 'dd/MM/yyyy')})</h2>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="חפש מוצר ספציפי..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all text-sm font-medium"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase border-b border-gray-100">
              <tr>
                <th className="p-4 w-16 text-center">#</th>
                <th className="p-4">שם המוצר</th>
                <th className="p-4 text-center">כמות שיוצרה סה"כ באזור הזמן שנבחר</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {productTotals.map((pt, idx) => (
                <tr key={pt.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 text-center text-gray-400 font-medium">{idx + 1}</td>
                  <td className="p-4 font-bold text-gray-800 text-base">{pt.name}</td>
                  <td className="p-4 text-center">
                    <span className="font-black text-xl text-indigo-700 bg-indigo-50 px-4 py-1.5 rounded-xl shadow-sm border border-indigo-100/50">
                      {pt.total}
                    </span>
                  </td>
                </tr>
              ))}
              {productTotals.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-12 text-center">
                    <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">לא נמצאו רישומי ייצור בתקופה זו או לפי החיפוש.</p>
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
