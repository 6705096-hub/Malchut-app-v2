'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export function CustomerDeleteButton({ customerId }: { customerId: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק לקוח זה? הפעולה תמחק גם את כל ההזמנות שלו ולא ניתן לבטלה.')) return
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('שגיאה במחיקת הלקוח')
      
      router.push('/dashboard/customers')
      router.refresh()
    } catch (e) {
      console.error(e)
      alert('שגיאה במחיקת הלקוח')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={isLoading}
      className="flex items-center justify-center w-7 h-7 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
      title="מחק לקוח"
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  )
}
