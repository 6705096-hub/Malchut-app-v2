import { NotificationsClient } from './NotificationsClient'

export const dynamic = 'force-dynamic'

export default function NotificationsSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <h1 className="relative z-10 text-2xl font-black mb-1">התראות מערכת</h1>
        <p className="relative z-10 text-orange-100 text-sm font-medium">ניהול הגדרות התראה וקופצים (Popups) למטבח</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <NotificationsClient />
      </div>
    </div>
  )
}
