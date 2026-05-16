'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, Undo2 } from 'lucide-react'

type OrderStatus = 'PLANNED' | 'PAID' | 'EXECUTED' | string

export function OrderStatusDropdown({ orderId, initialStatus, inZoneMode, hidePaid, compact }: { orderId: string, initialStatus: string, inZoneMode?: boolean, hidePaid?: boolean, compact?: boolean }) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus as OrderStatus)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const isDelivered = status === 'EXECUTED' || status === 'PAID'

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (isLoading) return

    const newStatus = isDelivered ? 'PLANNED' : 'EXECUTED'

    setIsLoading(true)
    
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error('שגיאה בעדכון הסטטוס')
      
      setStatus(newStatus)
      window.location.reload()
    } catch (e) {
      console.error(e)
      alert('שגיאה בעדכון סטטוס ההזמנה')
    } finally {
      setIsLoading(false)
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
          isDelivered 
            ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 bg-gray-50' 
            : 'text-green-600 hover:bg-green-100 hover:text-green-700 bg-green-50'
        }`}
        title={isDelivered ? 'סומן כסופק (לחץ לביטול)' : 'סמן כסופק'}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isDelivered ? (
          <Undo2 className="w-3.5 h-3.5" />
        ) : (
          <Check className="w-4 h-4" strokeWidth={3} />
        )}
      </button>
    )
  }

  return (
    <div 
      className="flex items-center gap-2"
      onClick={e => { e.stopPropagation(); e.preventDefault(); }}
    >
      <span className={`text-xs font-bold transition-colors ${isDelivered ? 'text-purple-700' : 'text-gray-400'}`}>סופק</span>
      
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${isDelivered ? 'bg-purple-600' : 'bg-gray-200'}`}
      >
        <span className="sr-only">שנה מצב סופק</span>
        
        {isLoading ? (
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${isDelivered ? 'translate-x-0' : '-translate-x-5'}`}>
             <Loader2 className="w-3 h-3 text-purple-600 animate-spin" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isDelivered ? 'translate-x-0' : '-translate-x-5'}`}
          />
        )}
      </button>

      <span className={`text-xs font-bold transition-colors ${!isDelivered ? 'text-orange-600' : 'text-gray-400'}`}>ממתין</span>
    </div>
  )
}
