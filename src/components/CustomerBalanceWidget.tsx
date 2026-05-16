'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Loader2, History, X, Trash2 } from 'lucide-react'

// date-fns formatting
import { PaymentWidget } from './PaymentWidget'
import { format } from 'date-fns'

// Tiny inline Add Debt widget
function TinyAddDebt({ customerId, onAdded }: { customerId: string, onAdded: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(amount)
    if (!val || val <= 0) return
    setLoading(true)
    try {
      await fetch(`/api/customers/${customerId}/past-debt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: val, notes })
      })
      onAdded()
      setIsOpen(false)
      setAmount('')
      setNotes('')
    } catch {
      alert('Error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="bg-gray-50 border-t border-gray-100 px-3 py-2 flex justify-center">
        <button type="button" onClick={(e) => { e.stopPropagation(); setIsOpen(true) }} className="text-[11px] font-bold text-gray-500 hover:text-red-600 transition-colors underline decoration-dotted flex items-center gap-1">
          <Plus className="w-3 h-3" /> הוסף חוב ישן / חיוב ידני
        </button>
      </div>
    )
  }

  return (
    <div className="bg-red-50/50 border-t border-red-100 p-2" onClick={e => e.stopPropagation()}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <input 
            type="number" 
            placeholder="₪ סכום" 
            value={amount} 
            onChange={e => setAmount(e.target.value)}
            className="w-1/3 text-xs px-2 py-1.5 border border-gray-200 rounded outline-none focus:border-red-400 font-bold"
            required autoFocus
          />
          <input 
            type="text" 
            placeholder="תיאור (אופציונלי)" 
            value={notes} 
            onChange={e => setNotes(e.target.value)}
            className="w-2/3 text-xs px-2 py-1.5 border border-gray-200 rounded outline-none focus:border-red-400"
          />
        </div>
        <div className="flex gap-1.5">
          <button type="submit" disabled={loading} className="flex-1 bg-red-600 text-white text-[11px] font-bold py-1.5 rounded hover:bg-red-700 disabled:opacity-50">
            {loading ? 'שומר...' : 'שמור חיוב'}
          </button>
          <button type="button" onClick={() => setIsOpen(false)} className="px-3 bg-white border border-gray-200 text-gray-500 text-[11px] font-bold py-1.5 rounded hover:bg-gray-50">
            ביטול
          </button>
        </div>
      </form>
    </div>
  )
}


type Payment = {
  id: string
  amount: number
  note?: string
  createdAt: string
}

export function CustomerBalanceWidget({ 
  customerId, 
  debt, 
  newOrderHref,
  canManageDebt = true
}: { 
  customerId: string, 
  debt: number, 
  newOrderHref?: string,
  canManageDebt?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

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

  const fetchHistory = async () => {
    const newState = !isOpen
    setIsOpen(newState)
    if (!newState || payments.length > 0) return 
    
    setLoading(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/payments`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePayment = async (e: React.MouseEvent, paymentId: string) => {
    e.stopPropagation();
    
    setLoading(true)
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        window.location.reload()
      } else {
        alert('שגיאה במחיקת התשלום')
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      alert('שגיאה מרשת')
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* Click Target */}
      <div 
        className={`cursor-pointer group flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all ${
          debt > 0 
            ? 'hover:bg-red-50' 
            : 'hover:bg-emerald-50'
        }`}
        onClick={fetchHistory}
        title={debt > 0 ? `חוב: ₪${debt.toFixed(2)}` : `זכות: ₪${Math.abs(debt).toFixed(2)}`}
      >
        <p className={`text-[17px] leading-tight font-black tracking-tight ${
          debt > 0 ? 'text-red-600' : 'text-emerald-600'
        }`}>
          {debt > 0 ? '' : '+'}{debt > 0 ? '' : ''}₪{Math.abs(debt).toFixed(debt % 1 === 0 ? 0 : 2)}
        </p>
        <History className={`w-3 h-3 opacity-30 group-hover:opacity-60 transition-opacity ${
          debt > 0 ? 'text-red-500' : 'text-emerald-500'
        }`} />
      </div>

      {/* Popover */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsOpen(false) }} />
          <div className="absolute top-full left-0 right-auto mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden flex flex-col text-right origin-top-left">
            
            <div className="border-b border-gray-100 px-3 py-3 relative bg-gray-50/50">
              <X 
                className="absolute top-3 left-3 w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer" 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false) }} 
              />
              <h4 className="text-[13px] font-black text-gray-800 mb-3 ml-6 text-right">ביצוע תשלום מהיר</h4>
              {canManageDebt ? (
                <div onClick={e => e.stopPropagation()}>
                   <PaymentWidget customerId={customerId} currentDebt={debt} />
                </div>
              ) : (
                <div className="text-xs text-gray-500 font-bold bg-gray-100 p-2 rounded text-center">
                  אין הרשאה לביצוע תשלומים
                </div>
              )}
            </div>

            <div className="bg-gray-50 border-b border-gray-100 px-3 py-2 flex justify-between items-center">
              <span className="text-[11px] font-black text-gray-700">היסטוריית תשלומים לחשבון זה</span>
            </div>
            
            <div className="max-h-48 overflow-y-auto p-1.5 bg-white">
              {loading ? (
                <div className="py-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
              ) : payments.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-gray-500 font-medium">לא נמצאו תשלומים קודמים</div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {payments.map(p => (
                    <div key={p.id} className="flex justify-between items-center px-1.5 py-1.5 hover:bg-gray-50 rounded-lg border-b border-dashed border-gray-100 last:border-0 group">
                      <div className="flex items-center gap-2">
                        {canManageDebt && (
                          confirmingPaymentId === p.id ? (
                            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-md">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setConfirmingPaymentId(null) }}
                                className="text-[10px] text-gray-500 hover:text-gray-700 px-1.5 py-0.5 rounded font-bold"
                              >
                                ביטול
                              </button>
                              <button 
                                onClick={(e) => handleDeletePayment(e, p.id)}
                                className="text-[10px] bg-red-500 text-white hover:bg-red-600 px-2 py-0.5 rounded font-bold shadow-sm"
                              >
                                מחק
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setConfirmingPaymentId(p.id) }}
                              className="p-1.5 hover:bg-red-100 text-gray-300 hover:text-red-500 rounded-md transition-colors"
                              title="מחק תיעוד מאזן"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                        <span className={`font-black text-[13px] ${p.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {p.amount < 0 ? '-' : '+'}₪{Math.abs(p.amount).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-gray-400 font-medium tracking-wide font-sans">
                          {format(new Date(p.createdAt), 'dd/MM/yy • HH:mm')}
                        </span>
                        {p.note && (
                          <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded max-w-[150px] break-words whitespace-normal block text-right">
                            {p.note}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {canManageDebt && <TinyAddDebt customerId={customerId} onAdded={() => window.location.reload()} />}

          </div>
        </>
      )}
    </div>
  )
}
