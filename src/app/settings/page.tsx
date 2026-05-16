import Link from 'next/link'
import { ChevronRight, Users, Utensils, MapPin, ShieldAlert, Calendar, Bell, Database, Trash2 } from 'lucide-react'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/LogoutButton'
import { BackButton } from '@/components/BackButton'

import { hasPermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function SettingsMenu() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userRole = (session.user as any)?.role || 'VIEWER'
  const permissions = (session.user as any)?.permissions || {}
  const isAdmin = userRole === 'ADMIN'

  const hasProducts = hasPermission(userRole, permissions, 'settings_products', 'READ')
  const hasAreas = hasPermission(userRole, permissions, 'settings_areas', 'READ')
  const hasCustomerTypes = hasPermission(userRole, permissions, 'settings_customer_types', 'READ')
  const hasDates = hasPermission(userRole, permissions, 'settings_dates', 'READ')
  const hasUsers = hasPermission(userRole, permissions, 'settings_users', 'READ')
  const hasNotifications = hasPermission(userRole, permissions, 'settings_notifications', 'READ')

  return (
    <div className="h-full flex flex-col pt-4 pb-20">
      <div className="flex justify-between items-center mb-8 w-full mt-[-10px]">
        <h1 className="text-2xl font-black text-gray-900 pr-2 pt-2">הגדרות</h1>
        <div className="flex items-center gap-3">
          <BackButton />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
        
        {/* Notifications */}
        {hasNotifications && (
          <Link href="/settings/notifications" className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors active:bg-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">התראות</p>
                <p className="text-sm text-gray-500 font-medium">הגדרות התראות והודעות</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        )}
        
        {hasProducts && (
          <Link href="/settings/products" className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors active:bg-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">תפריט ומוצרים</p>
                <p className="text-sm text-gray-500 font-medium">הוספה, עריכת מחירים, וזמינות</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        )}
        
        {hasAreas && (
          <Link href="/settings/areas" className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors active:bg-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">אזורי חלוקה</p>
                <p className="text-sm text-gray-500 font-medium">ניהול אזורי חלוקה</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        )}

        {hasCustomerTypes && (
          <Link href="/settings/customer-types" className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors active:bg-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">סוגי לקוחות (מחירונים)</p>
                <p className="text-sm text-gray-500 font-medium">יצירת מחירונים וכללי שמירת כתובות</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        )}

        {hasDates && (
          <Link href="/settings/dates" className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors active:bg-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-fuchsia-100 flex items-center justify-center text-fuchsia-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">לוח שנה ותאריכים מיוחדים</p>
                <p className="text-sm text-gray-500 font-medium">ימי חסימה ומועדים מיוחדים</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        )}

        {hasUsers && (
          <Link href="/settings/users" className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors active:bg-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">צוות משתמשים</p>
                <p className="text-sm text-gray-500 font-medium">ניהול צוות והרשאות</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        )}
      </div>

      {isAdmin && (
        <div className="border-t border-gray-100 bg-slate-50">
          <Link href="/settings/backup" className="flex items-center justify-between p-5 hover:bg-slate-100 transition-colors active:bg-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">גיבוי וייצוא נתונים</p>
                <p className="text-sm text-gray-500 font-medium">ייצוא הזמנות וייבוא לקוחות מאקסל</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="/settings/recycle-bin" className="flex items-center justify-between p-5 hover:bg-red-50 transition-colors active:bg-red-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">סל מיחזור</p>
                <p className="text-sm text-gray-500 font-medium">שחזור לקוחות והזמנות שנמחקו</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      )}

      {isAdmin && (
        <div className="mt-8 p-5 bg-red-50 rounded-3xl border border-red-100 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">הרשאות מנהל</p>
            <p className="text-xs text-red-600 mt-1">הגדרות מתקדמות חשופות רק למנהלי מערכת. ודא שהצוות פועל בזהירות.</p>
          </div>
        </div>
      )}

      {/* Logout Button (Visible to Everyone) */}
      <LogoutButton />
    </div>
  )
}
