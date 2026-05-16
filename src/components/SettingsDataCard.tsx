'use client'

import { useState } from 'react'
import { DownloadCloud, UploadCloud, Users, ShoppingBag, Loader2, CircleAlert, Database } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function SettingsDataCard({ totalCustomers, totalOrders }: { totalCustomers: number, totalOrders: number }) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSync = async (url: string, method: string, successText: (count: number) => string) => {
    if (isProcessing) return
    setIsProcessing(true)
    setErrorDetails(null)
    setSuccessMessage(null)

    try {
      const res = await fetch(url, { method })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'שגיאה כללית בפעולה')

      setSuccessMessage(successText(data.count))
      router.refresh()
    } catch (error: any) {
      console.error(error)
      setErrorDetails(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const exportCustomers = () => handleSync('/api/export/customers', 'GET', (c) => `עודכנו בהצלחה ${c} לקוחות לגוגל שיטס!`)
  const exportOrders = () => handleSync('/api/export/orders', 'GET', (c) => `עודכנו בהצלחה ${c} הזמנות לגוגל שיטס!`)
  
  const restoreCustomers = () => {
    if (confirm('האם אתה בטוח שברצונך למשוך לקוחות מגוגל שיטס אל המערכת? פעולה זו תיצור או תעדכן לקוחות.')) {
      handleSync('/api/import/customers', 'POST', (c) => `שוחזרו בהצלחה ${c} רשומות לקוחות!`)
    }
  }

  const restoreOrders = () => {
    if (confirm('האם אתה בטוח שברצונך לשחזר הזמנות מגוגל שיטס אל המערכת? פעולה זו תיצור הזמנות היסטוריות חדשות למאגר הנתונים במערכת.')) {
      handleSync('/api/import/orders', 'POST', (c) => `שוחזרו בהצלחה ${c} הזמנות!`)
    }
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
        <div className="bg-emerald-100 p-2.5 rounded-2xl">
          <Database className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">סנכרון נתונים מקוון (Google Sheets)</h2>
      </div>

      {errorDetails && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold flex gap-3 items-center border border-red-100">
          <CircleAlert className="w-5 h-5 shrink-0" />
          <div className="leading-relaxed">{errorDetails}</div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-bold flex gap-3 items-center border border-emerald-100">
          <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>{successMessage}</div>
        </div>
      )}

      {isProcessing && (
        <div className="mb-6 bg-blue-50 text-blue-700 p-4 rounded-xl text-sm font-bold flex gap-3 items-center border border-blue-100">
          <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
          <div>המסד מסתנכרן עם הענן, אנא המתן מעט...</div>
        </div>
      )}

      {/* ----------- EXPORT DUMPS ----------- */}
      <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
        <UploadCloud className="w-5 h-5 text-blue-500" /> 
        גיבוי מלא לגוגל
      </h3>
      <p className="text-sm text-gray-500 mb-4 leading-relaxed">
        פעולות אלו ישלחו את הנתונים הנוכחיים מהמערכת לתוך עמודי <b>"לקוחות/הזמנות גיבוי מלא"</b> ב-Google Sheets שלך.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <h4 className="font-bold text-gray-700">ייצוא לקוחות (לדרוס בענן)</h4>
            </div>
          </div>
          <button 
            disabled={isProcessing}
            onClick={exportCustomers}
            className="w-full mt-4 bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {totalCustomers} רשומות לגבוי
          </button>
        </div>

        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-gray-400" />
              <h4 className="font-bold text-gray-700">ייצוא הזמנות (לדרוס בענן)</h4>
            </div>
          </div>
          <button 
            disabled={isProcessing}
            onClick={exportOrders}
            className="w-full mt-4 bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {totalOrders} רשומות לגבוי
          </button>
        </div>
      </div>

      {/* ----------- IMPORT RESTORES ----------- */}
      <div className="pt-6 border-t border-gray-100">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
          <DownloadCloud className="w-5 h-5 text-purple-500" /> 
          שחזור מהענן למערכת
        </h3>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          פעולות אלו יקראו את המידע מעמודי <b>"לקוחות/הזמנות גיבוי מלא"</b> בגוגל שיטס, ויחוללו/יעדכנו מחדש הכל למערכת האתר. השתמש בזהירות!
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <button 
            disabled={isProcessing}
            onClick={restoreCustomers}
            className="w-full bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 font-bold py-4 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 text-center"
          >
            שחזור לקוחות אל המערכת
          </button>
          
          <button 
            disabled={isProcessing}
            onClick={restoreOrders}
            className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold py-4 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 text-center"
          >
            שחזור הזמנות אל המערכת
          </button>
        </div>
      </div>

    </div>
  )
}
