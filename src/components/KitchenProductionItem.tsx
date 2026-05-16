'use client'

import { useState } from 'react'
import { Plus, Minus, CircleCheck, Clock } from 'lucide-react'

type Props = {
  productId: string
  productName: string
  totalQuantity: number
  targetDateString: string
  initialProduced: number
  areaBreakdown: Record<string, number>
  theme: 'HOT' | 'COLD'
  canEdit?: boolean
}

export function KitchenProductionItem({ productId, productName, totalQuantity, targetDateString, initialProduced, areaBreakdown, theme, canEdit = true }: Props) {
  const [produced, setProduced] = useState(initialProduced)
  const [isUpdating, setIsUpdating] = useState(false)

  const themeColors = {
    HOT: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-100',
      progress: 'bg-red-500',
      buttonHover: 'hover:bg-red-100'
    },
    COLD: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100',
      progress: 'bg-blue-500',
      buttonHover: 'hover:bg-blue-100'
    }
  }

  const colors = themeColors[theme]

  const updateQuantity = async (newQty: number) => {
    if (newQty < 0) newQty = 0
    if (newQty === produced) return

    setIsUpdating(true)
    setProduced(newQty) // Optimistic update

    try {
      const res = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          targetDateString,
          producedQuantity: newQty
        })
      })
      if (!res.ok) throw new Error('Failed to update')
    } catch (e) {
      console.error(e)
      setProduced(produced) // Revert on error
      alert('שגיאה בעדכון כמות הייצור')
    } finally {
      setIsUpdating(false)
    }
  }

  const percentage = Math.min(Math.round((produced / totalQuantity) * 100), 100)
  const isComplete = produced >= totalQuantity

  return (
    <div className="py-4 border-b border-gray-50 last:border-0 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
        <div className="flex-1">
          <span className="font-bold text-gray-800 text-lg sm:text-xl flex items-center gap-2">
            {productName}
            {isComplete && <CircleCheck className="w-5 h-5 text-emerald-500" />}
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-gray-50 p-1.5 rounded-2xl border border-gray-200">
          <button 
            disabled={isUpdating || !canEdit}
            onClick={() => updateQuantity(produced - 1)}
            className={`w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50`}
          >
            <Minus className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center justify-center min-w-[5rem] px-2 relative">
            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest absolute -top-4 whitespace-nowrap">סופק / סה״כ</span>
            <div className="font-black text-xl flex items-baseline gap-1">
               <span className={isComplete ? 'text-emerald-600' : colors.text}>{produced}</span>
               <span className="text-gray-400 text-sm font-medium">/{totalQuantity}</span>
            </div>
          </div>

          <button 
            disabled={isUpdating || !canEdit}
            onClick={() => updateQuantity(produced + 1)}
            className={`w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50`}
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Quick complete button */}
          <button
            title="סמן כהושלם"
            disabled={isComplete || isUpdating || !canEdit}
            onClick={() => updateQuantity(totalQuantity)}
            className={`w-10 h-10 flex items-center justify-center transition-colors rounded-xl font-bold ml-1 border ${isComplete ? 'bg-emerald-50 text-emerald-500 border-transparent' : 'bg-white text-emerald-600 border-emerald-100 shadow-sm hover:bg-emerald-50 disabled:opacity-30'}`}
          >
            <CircleCheck className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-3">
        <div 
          className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : colors.progress}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Breakdown */}
      <div className={`pl-3 border-l-2 ${colors.border} space-y-1`}>
        {Object.entries(areaBreakdown)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([area, qty]) => (
            <div key={area} className="flex justify-between items-center text-sm py-1 mt-1 first:border-0 last:pb-0 pr-1">
              <span className="text-gray-500 font-medium">{area}</span>
              <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md text-xs">{qty}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
