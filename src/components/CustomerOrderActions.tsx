'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Edit, Loader2, Trash2 } from 'lucide-react'

export function CustomerOrderActions({ 
  orderId, 
  customerId, 
  initialStatus, 
  totalPrice,
  canEdit = true
}: { 
  orderId: string, 
  customerId: string, 
  initialStatus: string,
  totalPrice: number,
  canEdit?: boolean
}) {
  const [status, setStatus] = useState(initialStatus)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleMarkPaid = async () => {
    if (!confirm('האם אתה בטוח שברצונך לסמן הזמנה זו כשולמה? הדבר יקטין את חוב הלקוח.')) return
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', customerId, totalPrice })
      })

      if (!res.ok) throw new Error('שגיאה בעדכון הסטטוס')
      
      setStatus('PAID')
      router.refresh()
    } catch (e) {
      console.error(e)
      alert('שגיאה בעדכון סטטוס ההזמנה')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnmarkPaid = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את סימון התשלום? הדבר יגדיל בחזרה את חוב הלקוח.')) return
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'EXECUTED', customerId, totalPrice, isRevertingPaid: true })
      })

      if (!res.ok) throw new Error('שגיאה בעדכון הסטטוס')
      
      setStatus('EXECUTED')
      router.refresh()
    } catch (e) {
      console.error(e)
      alert('שגיאה בעדכון סטטוס ההזמנה')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק הזמנה זו? לא ניתן לבטל פעולה זו.')) return
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('שגיאה במחיקת ההזמנה')
      
      router.refresh()
    } catch (e) {
      console.error(e)
      alert('שגיאה במחיקת ההזמנה')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    // Navigate to order wizard with the order ID to edit
    router.push(`/dashboard/orders/new?edit=${orderId}`)
  }

  if (!canEdit) return null;

  return (
    <div className="flex gap-2">
      {status === 'PAID' ? (
        <button 
          onClick={handleUnmarkPaid}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 font-bold py-2 rounded-xl text-sm transition-colors border border-yellow-200"
          title="בטל תשלום (החזר חוב)"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '⏳'}
          סמן כלא-שולם
        </button>
      ) : (
        <button 
          onClick={handleMarkPaid}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold py-2 rounded-xl text-sm transition-colors border border-green-200"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          סמן כשולם
        </button>
      )}

      <button 
        onClick={handleEdit}
        className="flex mb-auto items-center justify-center w-10 h-10 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition-colors border border-gray-200 shrink-0"
        title="ערוך הזמנה"
      >
        <Edit className="w-4 h-4" />
      </button>

      <button 
        onClick={handleDelete}
        disabled={isLoading}
        className="flex mb-auto items-center justify-center w-10 h-10 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors shrink-0"
        title="מחק הזמנה"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
