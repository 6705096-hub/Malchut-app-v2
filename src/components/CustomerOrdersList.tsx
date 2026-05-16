'use client'

import { useState, useMemo } from 'react'
import { OrderCard } from './OrderCard'
import { PastDebtRow } from './PastDebtRow'

export function CustomerOrdersList({ 
  orders, 
  customerDebt, 
  canEdit 
}: { 
  orders: any[], 
  customerDebt: number, 
  canEdit: boolean 
}) {
  const [sortMode, setSortMode] = useState<'date' | 'unpaid'>('date')

  const sortedOrders = useMemo(() => {
    if (sortMode === 'date') return orders;

    return [...orders].sort((a, b) => {
      // Past debt rows should probably stay at the top or follow logic? 
      // A past debt row is essentially "unpaid" if not paid off, but let's treat it generically
      const aPaid = a.deliveryWeek === 'PAST_DEBT' ? a.status === 'PAID' : (a.totalPrice || 0) - (a.paidAmount || 0) <= 0;
      const bPaid = b.deliveryWeek === 'PAST_DEBT' ? b.status === 'PAID' : (b.totalPrice || 0) - (b.paidAmount || 0) <= 0;
      
      if (aPaid === bPaid) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Newest first
      }
      return aPaid ? 1 : -1; // Unpaid (false) before Paid (true)
    })
  }, [orders, sortMode])

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100 mt-4">
        לא נמצאו הזמנות ללקוח זה.
      </div>
    )
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">היסטוריית הזמנות</h2>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setSortMode('date')}
            className={`px-3 py-1 text-sm font-bold rounded-md transition-all ${sortMode === 'date' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            לפי תאריך
          </button>
          <button 
            onClick={() => setSortMode('unpaid')}
            className={`px-3 py-1 text-sm font-bold rounded-md transition-all ${sortMode === 'unpaid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            לא שולם
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {sortedOrders.map((order: any) => {
          if (order.deliveryWeek === 'PAST_DEBT') {
            return (
              <PastDebtRow
                key={order.id}
                orderId={order.id}
                notes={order.notes}
                createdAt={order.createdAt}
                totalPrice={order.totalPrice || 0}
                status={order.status}
                canEdit={canEdit}
              />
            )
          }
          
          return <OrderCard key={order.id} order={order} debtOverride={customerDebt} hideCustomerName={true} />
        })}
      </div>
    </div>
  )
}
