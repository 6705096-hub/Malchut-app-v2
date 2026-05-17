'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, X } from 'lucide-react'
import { addActionToQueue } from '@/lib/offlineQueue'

type Props = {
  customerId: string
  currentDebt: number
}

export function PaymentWidget({ customerId, currentDebt }: Props) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [success, setSuccess] = useState(false)
  const [confirmFullDebt, setConfirmFullDebt] = useState(false)

  const parsed = parseFloat(amount)
  const isValid = !isNaN(parsed) && parsed !== 0

  const submitAmount = async (val: number) => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, amount: val, note })
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'שגיאה')
      }
      setSuccess(true)
      setTimeout(() => window.location.reload(), 900)
    } catch (err: any) {
      if (!navigator.onLine || err.message === 'Failed to fetch') {
         alert('אין חיבור לאינטרנט! התשלום נשמר ויסונכרן כשהקליטה תחזור.')
         try {
           await addActionToQueue('ADD_PAYMENT', { customerId, amount: val, note })
           setSuccess(true)
         } catch(qE) {}
      } else {
         setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    await submitAmount(parsed)
  }

  if (success) {
    return (
      <div className="bg-green-50 rounded-lg p-2 flex items-center justify-center gap-1.5 w-full">
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        <p className="font-bold text-green-800 text-xs">נרשם!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-2 w-full pt-1">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-end justify-end gap-2 text-sm w-full">
        {currentDebt > 0 && (
          !confirmFullDebt ? (
            <button 
              type="button" 
              onClick={(e) => { e.preventDefault(); setConfirmFullDebt(true); }}
              className="px-3 py-1.5 h-[34px] font-black bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg shadow-sm transition-colors active:scale-95 whitespace-nowrap text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="לחץ לתשלום מהיר של כל החוב"
            >
               ₪{currentDebt.toFixed(0)}
            </button>
          ) : (
             <div className="flex bg-orange-100 border border-orange-200 rounded-lg overflow-hidden shadow-sm h-[34px] w-full sm:w-auto">
               <button 
                 type="button" 
                 onClick={() => submitAmount(currentDebt)}
                 className="px-4 py-1.5 font-bold text-orange-800 hover:bg-orange-200 transition-colors flex-1 flex items-center justify-center gap-1 leading-none text-sm whitespace-nowrap"
               >
                 אישור איפוס חוב?
               </button>
               <button 
                 type="button" 
                 onClick={() => setConfirmFullDebt(false)}
                 className="px-2 py-1.5 bg-gray-100/50 hover:bg-gray-200 text-gray-500 transition-colors flex items-center justify-center shrink-0 border-l border-orange-200/50"
               >
                 <X className="w-4 h-4" />
               </button>
             </div>
          )
        )}
        
        {(!currentDebt || !confirmFullDebt) && (
          <div className="flex flex-col sm:flex-row gap-1 w-full sm:w-auto items-end">
            <input
              type="text"
              placeholder="הערה (אופציונלי)"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full sm:w-32 px-2 py-1.5 h-[34px] border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-1 w-full sm:w-auto">
              <input
                type="number"
                step="any"
                placeholder="סכום אחר"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError('') }}
                className="w-full sm:w-24 px-2 py-1.5 h-[34px] border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700"
                style={{ WebkitAppearance: 'none', margin: 0 }}
              />
              <button
                type="submit"
                disabled={!isValid || loading}
                className="px-2 py-1.5 h-[34px] bg-emerald-600 text-white font-bold rounded-lg disabled:opacity-40 hover:bg-emerald-700 transition-all flex items-center justify-center min-w-[34px]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </form>
      {error && <p className="text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded w-full text-right">{error}</p>}
    </div>
  )
}
