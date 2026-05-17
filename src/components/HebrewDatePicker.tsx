'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react'
import { HDate } from '@hebcal/core'

function numToGematria(n: number): string {
  if (n === 15) return 'ט״ו'
  if (n === 16) return 'ט״ז'
  let result = ''
  let rem = n
  const ONES  = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
  const TENS  = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
  const HUNDREDS = { 100: 'ק', 200: 'ר', 300: 'ש', 400: 'ת', 500: 'תק', 600: 'תר', 700: 'תש', 800: 'תת', 900: 'תתק' } as Record<number, string>
  for (const h of [900, 800, 700, 600, 500, 400, 300, 200, 100]) {
    if (rem >= h) { result += HUNDREDS[h]; rem -= h }
  }
  const t = Math.floor(rem / 10)
  const o = rem % 10
  if (t > 0) result += TENS[t]
  if (o > 0) result += ONES[o]
  if (result.length === 1) return result + '׳'
  if (result.length > 1) return result.slice(0, -1) + '״' + result.slice(-1)
  return result
}

const HEBREW_MONTHS: Record<number, string> = {
  1:  'ניסן', 2:  'אייר', 3:  'סיוון', 4:  'תמוז', 5:  'אב', 6:  'אלול',
  7:  'תשרי', 8:  'חשוון', 9:  'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב׳',
}

export function HebrewDatePicker({ 
  selectedDate, 
  onSelect,
  customTriggerLabel
}: { 
  selectedDate?: Date | null, 
  onSelect: (d: Date) => void
  customTriggerLabel?: string
}) {
    const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])
  const [currentMonthDate, setCurrentMonthDate] = useState<HDate>(() => {
    return selectedDate ? new HDate(selectedDate) : new HDate()
  })

  // Calculate grid
  const grid = useMemo(() => {
    const year = currentMonthDate.getFullYear()
    const month = currentMonthDate.getMonth()
    
    const firstDayOfMonth = new HDate(1, month, year)
    const startDayOfWeek = firstDayOfMonth.getDay() // 0=Sunday
    const totalDays = firstDayOfMonth.daysInMonth()
    
    const days = []
    // Fill empty slots before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
       days.push(null)
    }
    // Fill days
    for (let i = 1; i <= totalDays; i++) {
       days.push(new HDate(i, month, year))
    }
    // Fill remaining to complete 6 rows (42 slots max, or typical up to 35) if we want a perfect grid
    // Not strict, just pad to next multiple of 7
    const remaining = (7 - (days.length % 7)) % 7
    for (let i = 0; i < remaining; i++) {
        days.push(null)
    }
    return days
  }, [currentMonthDate])

  const goPrevMonth = () => {
    setCurrentMonthDate(currentMonthDate.prev())
  }
  const goNextMonth = () => {
    setCurrentMonthDate(currentMonthDate.next())
  }

  const selectedHDateStr = selectedDate ? new HDate(selectedDate).toString() : null

  return (
    <div className="relative" ref={wrapperRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={customTriggerLabel ? 'relative bg-transparent text-lg font-black text-gray-900 border-b border-dashed border-gray-300 pb-0.5 inline-block mx-auto hover:bg-gray-50' : `w-full h-14 px-4 rounded-xl border-2 flex items-center justify-between transition-colors ${selectedDate ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'}`}
      >
        {customTriggerLabel ? (
          <span>{customTriggerLabel}</span>
        ) : (
        <div className="flex items-center gap-3">
          <CalendarIcon className={`w-5 h-5 ${selectedDate ? 'text-blue-600' : 'text-gray-400'}`} />
          <span className="font-bold">
            {selectedDate 
              ? `${numToGematria(new HDate(selectedDate).getDate())} ${HEBREW_MONTHS[new HDate(selectedDate).getMonth()]} ${numToGematria(new HDate(selectedDate).getFullYear() % 1000)}` 
              : 'בחר מלוח עברי'}
          </span>
        </div>
        )}
      </button>

      {isOpen && (
        <>
          {/* Transparent Backdrop to absorb clicks and prevent background elements from triggering */}
          <div className="fixed inset-0 z-[55]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          
          <div className={`absolute top-[102%] ${customTriggerLabel ? 'left-1/2 -translate-x-1/2 w-[320px]' : 'left-0 w-full sm:w-80'} bg-white border border-gray-100 shadow-2xl rounded-2xl z-[60] p-4 animate-in fade-in zoom-in-95 duration-200`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={goNextMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="font-black text-lg text-gray-900">
                {HEBREW_MONTHS[currentMonthDate.getMonth()]} {numToGematria(currentMonthDate.getFullYear() % 1000)}
              </div>
              <button type="button" onClick={goPrevMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['א','ב','ג','ד','ה','ו','ש'].map(d => (
                  <div key={d} className="text-center font-bold text-xs text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1">
              {grid.map((hdate, idx) => {
                if (!hdate) return <div key={`empty-${idx}`} className="h-12" />
                
                const isSelected = selectedHDateStr === hdate.toString()
                const isToday = new HDate().toString() === hdate.toString()
                const gregDate = hdate.greg()
                const gregDay = gregDate.getDate()
                
                return (
                  <button 
                    type="button"
                    key={idx}
                    onClick={() => {
                      onSelect(hdate.greg())
                      setIsOpen(false)
                    }}
                    className={`h-12 w-full flex flex-col items-center justify-center rounded-lg font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                        : isToday
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 hover:bg-blue-100'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-sm leading-tight">{numToGematria(hdate.getDate()).replace(/['\"]/g, '')}</span>
                    <span className={`text-[9px] leading-tight font-medium mt-0.5 ${isSelected ? 'text-blue-100' : isToday ? 'text-blue-400' : 'text-gray-400'}`}>
                      {gregDay}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


export default HebrewDatePicker;
