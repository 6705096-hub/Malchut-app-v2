'use client'

import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '@/lib/offlineQueue'
import { CloudOff, CloudUpload, CheckCircle2, FileText, Package } from 'lucide-react'

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)
  const pendingActions = useLiveQuery(() => db.actions.where('status').equals('PENDING').toArray(), [])
  
  const pendingCount = pendingActions?.length || 0

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    // Set initial state
    setIsOffline(!navigator.onLine)

    // Listeners
    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!isOffline && pendingCount === 0) return null

  const newOrdersCount = pendingActions?.filter(a => a.type === 'CREATE_ORDER').length || 0
  const deliveryCount = pendingActions?.filter(a => (a.type as string) === 'MARK_DELIVERED').length || 0

  return (
    <>
      <div className={`fixed top-0 left-0 right-0 z-[9999] text-white text-center text-xs font-bold py-1 px-4 shadow-md animate-in slide-in-from-top flex items-center justify-center gap-2 ${isOffline ? 'bg-red-600' : 'bg-blue-600'}`}>
        {isOffline ? (
          <>
            <CloudOff className="w-4 h-4" />
            מצב אופליין / אין אינטרנט
            {pendingCount > 0 && <span className="mr-2 text-[10px] bg-red-700 px-2 py-0.5 rounded-full">{pendingCount} ממתינים לסנכרון</span>}
          </>
        ) : (
          <>
            <CloudUpload className="w-4 h-4 animate-bounce" />
            מסתנכרן מול השרת... ({pendingCount} נותרו)
          </>
        )}
      </div>

      {isOffline && pendingCount > 0 && (
        <div className="fixed bottom-4 left-4 z-[9999] bg-white text-gray-800 rounded-xl shadow-2xl border-2 border-red-100 p-4 max-w-[200px] animate-in slide-in-from-bottom">
          <h3 className="font-bold text-sm border-b pb-2 mb-2 flex items-center gap-2">
            <CloudOff className="w-4 h-4 text-red-500" />
            ממתין לסנכרון
          </h3>
          <div className="flex flex-col gap-2 text-xs font-medium">
            {newOrdersCount > 0 && (
              <div className="flex justify-between items-center bg-gray-50 px-2 py-1.5 rounded-lg">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-blue-500"/> הזמנות חדשות</span>
                <span className="bg-blue-100 text-blue-800 px-1.5 rounded">{newOrdersCount}</span>
              </div>
            )}
            {deliveryCount > 0 && (
              <div className="flex justify-between items-center bg-gray-50 px-2 py-1.5 rounded-lg">
                <span className="flex items-center gap-1"><Package className="w-3 h-3 text-orange-500"/> עדכוני משלוח</span>
                <span className="bg-orange-100 text-orange-800 px-1.5 rounded">{deliveryCount}</span>
              </div>
            )}
          </div>
          <p className="text-[9px] text-gray-400 mt-3 leading-tight">
            הנתונים שמורים באופן בטוח במכשיר ויישלחו לשרת מיד כשהאינטרנט יחזור.
          </p>
        </div>
      )}
    </>
  )
}
