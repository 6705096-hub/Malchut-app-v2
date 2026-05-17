'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader, Check, X } from 'lucide-react'
import { addActionToQueue } from '@/lib/offlineQueue'

export function PaymentAmountToggle({ 
  orderId, 
  customerId,
  initialStatus, 
  totalPrice, 
  debt = 0,
  paidAmount = 0
}: { 
  orderId: string, 
  customerId?: string,
  initialStatus: string, 
  totalPrice: number, 
  debt?: number,
  paidAmount?: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [amountInput, setAmountInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const currentCustomerDebt = debt
  
  // Using explicit DB-calculated paidAmount from the backend FIFO allocator
  const unpaidForThisOrder = Math.max(0, totalPrice - paidAmount)
  
  // They are fully paid if the unpaid part of this order mathematically dropped to zero
  const isPaid = unpaidForThisOrder === 0
  
  // Show the final price if paid, otherwise show exactly what's left unpaid for this specific chunk
  const displayPrice = isPaid ? totalPrice : unpaidForThisOrder

  const hasPreviousDebt = currentCustomerDebt - unpaidForThisOrder > 0.01

  const handleSubmitPayment = async (amount: number) => {
    if (!amount || isNaN(amount)) return
    if (!customerId) {
      alert('שגיאה: להזמנה זו אין לקוח מקושר (חסר מזהה לקוח), ולכן לא ניתן לרשום עליה תשלום.')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const res = await fetch(`/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerId,
          amount 
        })
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'שגיאה בקבלת התשלום')
      }
      
      setIsOpen(false)
      setAmountInput('')
      window.location.reload()
    } catch (e: any) {
      if (!navigator.onLine || e.message === 'Failed to fetch') {
         alert('אין חיבור לאינטרנט! התשלום נשמר במכשיר ויסונכרן אוטומטית כשהחיבור יחזור.')
         try {
           await addActionToQueue('ADD_PAYMENT', { customerId, amount })
           setIsOpen(false)
           setAmountInput('')
         } catch(queueErr) {
           console.error(queueErr)
           alert('שגיאה בשמירת התשלום במצב אופליין')
         }
        console.error(e)
        alert('שגיאה במישור התשלום: ' + e.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div 
      className="relative flex justify-end w-full sm:w-auto mt-2 sm:mt-0 items-end" 
      ref={popoverRef}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
    >
      <button 
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setIsOpen(!isOpen)
        }}
        className={`flex flex-col items-end sm:items-end shrink-0 gap-0.5 transition-transform self-end hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 min-w-[70px] ${isPaid ? 'opacity-80' : ''}`}
      >
        <div className={`flex items-center gap-1.5 ${isPaid ? 'text-emerald-500' : 'text-rose-600'}`}>
          {isSubmitting && (
            <Loader className="w-4 h-4 animate-spin" />
          )}
          
          <span className="text-[17px] font-black tracking-tight font-sans">
            ₪{displayPrice.toFixed(2).replace(/\.00$/, '')}
          </span>
        </div>

        {hasPreviousDebt && (
          <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-sm text-rose-700 bg-rose-50" title="יתרת חוב כוללת ללקוח זה במערכת">
            חוב: ₪{(currentCustomerDebt).toFixed(2).replace(/\.00$/, '')}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-transparent"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setIsOpen(false)
            }}
          />
          <div className="absolute bottom-0 left-0 p-3 sm:p-4 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 min-w-[240px] flex flex-col gap-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black text-gray-800">קופת לקוח - תשלום</span>
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(false); }}
                className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full p-1.5 transition-colors"
              >
                <X size={14} strokeWidth={3} />
              </button>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₪</span>
                <input 
                  type="number" 
                  step="any"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="הזן סכום..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>
              <button 
                type="button"
                onClick={(e) => { 
                  e.preventDefault(); e.stopPropagation(); 
                  if (!amountInput) return;
                  if (confirm(`לרשום תשלום של ₪${amountInput}?`)) handleSubmitPayment(Number(amountInput));
                }}
                disabled={isSubmitting || !amountInput}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                שמור
              </button>
            </div>

            <div className="w-full pt-1 border-t border-gray-50">
              {isPaid ? (
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.preventDefault(); e.stopPropagation();
                    const amountToWithdraw = Number(amountInput) || totalPrice;
                    if (confirm(`האם לבטל את התשלום של ₪${amountToWithdraw}? (זה יחזיר את הסכום לחוב הלקוח)`)) {
                      handleSubmitPayment(-Math.abs(amountToWithdraw));
                    }
                  }}
                  disabled={isSubmitting}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 disabled:opacity-50 w-full rounded-xl py-2.5 text-xs font-black transition-all flex justify-center items-center gap-1"
                  title="ביטול תשלום"
                >
                  בטל הפקדה חזרה
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.preventDefault(); e.stopPropagation();
                    if (confirm(`לסמן ששולם כל סכום ההזמנה (₪${totalPrice})?`)) { 
                      handleSubmitPayment(totalPrice); 
                    } 
                  }}
                  disabled={isSubmitting}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 disabled:opacity-50 w-full rounded-xl py-2.5 text-xs font-black transition-all flex justify-center items-center gap-1 shadow-sm"
                  title="שולם כל הסכום של ההזמנה"
                >
                  <Check size={16} /> כל הסכום (₪{totalPrice.toFixed(2).replace(/\.00$/, '')})
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

