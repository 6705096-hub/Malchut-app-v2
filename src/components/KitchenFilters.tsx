'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter } from 'lucide-react'

type Area = { id: string; name: string }

export function KitchenFilters({ areas }: { areas: Area[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentType = searchParams.get('type') || ''
  const currentArea = searchParams.get('area') || ''
  const currentDay = searchParams.get('day') || ''
  const currentWeek = searchParams.get('week') || 'THIS_WEEK'

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
        params.set(key, value)
    } else {
        params.delete(key)
    }
    router.push(`?${params.toString()}`)
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat']

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-800 font-bold">
          <Filter className="w-5 h-5" />
          תוכנית ייצור
        </div>
        <div className="flex gap-1">
          {['THIS_WEEK', 'NEXT_WEEK'].map(w => (
            <button
              key={w}
              onClick={() => setFilter('week', w)}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${
                currentWeek === w 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {w === 'THIS_WEEK' ? 'שבוע נוכחי' : 'שבוע הבא'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setFilter('day', '')}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              !currentDay ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            כל הימים
          </button>
          
          <button
            onClick={() => {
              const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
              setFilter('day', todayName)
            }}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-green-50 text-green-600 hover:bg-green-100 border border-green-200`}
          >
            היום
          </button>
          
          <button
            onClick={() => {
              const tmr = new Date()
              tmr.setDate(tmr.getDate() + 1)
              const tmrName = tmr.toLocaleDateString('en-US', { weekday: 'long' })
              setFilter('day', tmrName)
            }}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200`}
          >
            מחר
          </button>
          {days.map(day => {
            const hebrewDays: Record<string, string> = {
              Sunday: 'ראשון', Monday: 'שני', Tuesday: 'שלישי', 
              Wednesday: 'רביעי', Thursday: 'חמישי', Friday: 'שישי', Shabbat: 'שבת'
            }
            return (
              <button
                key={day}
                onClick={() => setFilter('day', day)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  currentDay === day ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {hebrewDays[day]}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 pl-1">קטגוריה</label>
            <select 
              value={currentType} 
              onChange={(e) => setFilter('type', e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-700 shadow-sm"
            >
              <option value="">כל הקטגוריות</option>
              <option value="HOT">חם</option>
              <option value="COLD">קר</option>
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 pl-1">אזור חלוקה שבת</label>
            <select 
              value={currentArea} 
              onChange={(e) => setFilter('area', e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-700 shadow-sm"
            >
              <option value="">כל האזורים</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
