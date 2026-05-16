'use client'

import { AlertTriangle, Trash2, CircleCheck, X } from 'lucide-react'

interface ConflictModalProps {
  conflict: any;
  onClose: () => void;
  onResolved: (id: string, action: 'delete' | 'force_create') => void;
}

export function OfflineConflictsModal({ conflict, onClose, onResolved }: ConflictModalProps) {
  if (!conflict) return null

  const { action, conflictDetails } = conflict
  const isOrder = action.type === 'CREATE_ORDER'

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-orange-500 p-5 text-center text-white">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-90" />
          <h3 className="text-xl font-bold">התראה: כפילות נתונים</h3>
        </div>

        <div className="p-5 text-center space-y-3">
          <p className="text-gray-600 text-sm">
            לאחר שחזרת להיות מחובר לאינטרנט, ניסינו לסנכרן {isOrder ? 'הזמנה' : 'פעולה'} שעשית אבל גילינו שמשהו כמעט זהה כבר קיים במערכת!
          </p>

          <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-right">
            <h4 className="font-bold text-orange-800 text-xs mb-1">פרטי הכפילות שזוהתה:</h4>
            <p className="text-xs text-orange-700">{conflictDetails || 'הזמנה לאותו לקוח, באותו תאריך, עם מוצרים דומים.'}</p>
          </div>

          <p className="text-xs font-semibold text-gray-500 pt-2 border-t border-gray-100">
            מה תרצה לעשות עם הפעולה שיצרת בזמן שהיית מנותק?
          </p>
        </div>

        <div className="px-5 pb-5 space-y-2">
          <button 
            onClick={() => onResolved(action.id, 'force_create')}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl font-bold transition-transform active:scale-95"
          >
            <CircleCheck className="w-5 h-5" />
            לאשר בכוח (דרוס / הוסף חדש)
          </button>
          
          <button 
            onClick={() => onResolved(action.id, 'delete')}
            className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-bold transition-transform active:scale-95 hover:bg-red-100"
          >
            <Trash2 className="w-5 h-5" />
            למחוק את ההזמנה העדכנית
          </button>

          <button 
            onClick={onClose}
            className="w-full py-2 text-gray-400 text-sm font-medium hover:text-gray-600"
          >
            הזכר לי אחר כך
          </button>
        </div>
      </div>
    </div>
  )
}
