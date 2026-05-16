'use client'

import { useState, useEffect } from 'react'
import { PushToggle } from '@/components/PushToggle'
import { useSession } from 'next-auth/react'

export function NotificationsClient() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const [kitchenEnabled, setKitchenEnabled] = useState(true)
  const [notifyOrder, setNotifyOrder] = useState(true)
  const [notifyUser, setNotifyUser] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    // Load local kitchen preference
    const saved = localStorage.getItem('kitchenNotificationsEnabled')
    if (saved !== null) {
      setKitchenEnabled(saved === 'true')
    }
  }, [])

  useEffect(() => {
    // Load push preferences from API
    fetch('/api/users/me/preferences')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setNotifyOrder(data.notifyOnNewOrder ?? true)
          setNotifyUser(data.notifyOnNewUser ?? true)
        }
        setIsLoaded(true)
      })
      .catch(() => setIsLoaded(true))
  }, [])

  const handleKitchenToggle = (checked: boolean) => {
    setKitchenEnabled(checked)
    localStorage.setItem('kitchenNotificationsEnabled', String(checked))
  }

  const updatePreference = async (key: 'notifyOnNewOrder' | 'notifyOnNewUser', val: boolean) => {
    if (key === 'notifyOnNewOrder') setNotifyOrder(val)
    if (key === 'notifyOnNewUser') setNotifyUser(val)
    setSavingPrefs(true)
    try {
      await fetch('/api/users/me/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: val })
      })
    } catch(e) {
      console.error('Failed to update preference')
    }
    setSavingPrefs(false)
  }

  if (!isLoaded) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl"></div>

  return (
    <div className="space-y-6">
      {/* 1. Global Device Toggle */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-indigo-900 text-lg">קבלת התראות למכשיר זה</h3>
            <p className="text-sm text-indigo-700/80 mt-1 max-w-sm">
              כדי לקבל התראות פוש לטלפון / למחשב גם כשהאפליקציה סגורה, יש להפעיל את הרשאות הדפדפן כאן (יש לאשר את הודעת המערכת קופצת).
            </p>
          </div>
          <PushToggle />
        </div>
      </div>

      {/* 2. Personal Preferences */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-3">אילו התראות פוש אקבל?</h3>
        
        {/* Smart Kitchen Alert */}
        <div className="flex items-center justify-between p-2">
          <div>
            <h4 className="font-bold text-gray-900">התראות מטבח חכמות (רק אחרי תחילת עבודה)</h4>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              קבל התראה ברגע שנוספה או השתנתה הזמנה שכוללת מוצר **שכבר עדכנת שהכנסת לתנור היום**. לא תקבל התראות על מוצרים שעוד לא התחלת לעבוד עליהם.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer mr-4 shrink-0">
            <input type="checkbox" className="sr-only peer" checked={notifyOrder} disabled={savingPrefs} onChange={(e) => updatePreference('notifyOnNewOrder', e.target.checked)} />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500 disabled:opacity-50"></div>
          </label>
        </div>

        {/* Users Toggle (Admins Only) */}
        {role === 'ADMIN' && (
          <div className="flex items-center justify-between p-2 mt-4 border-t border-gray-100 pt-6">
            <div>
              <h4 className="font-bold text-gray-800">אישור משתמשים וצוות</h4>
              <p className="text-sm text-gray-500 mt-1">קבל התראת פוש כשמשתמש חדש נרשם לאפליקציה וממתין שתאשר לו הרשאות.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer mr-4 shrink-0">
              <input type="checkbox" className="sr-only peer" checked={notifyUser} disabled={savingPrefs} onChange={(e) => updatePreference('notifyOnNewUser', e.target.checked)} />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
