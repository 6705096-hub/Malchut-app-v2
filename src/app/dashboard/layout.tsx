import { getServerSession } from "next-auth/next"; import { authOptions } from "@/lib/auth"
import { TopBar } from '@/components/TopBar'
import { redirect } from 'next/navigation'
import { KitchenNotifier } from '@/components/KitchenNotifier'
import { GlobalAlerts } from '@/components/GlobalAlerts'
import { WelcomePopup } from '@/components/WelcomePopup'
import { GlobalTeamChatWidget } from '@/components/GlobalTeamChatWidget'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  if ((session.user as any)?.role === 'PENDING') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center flex flex-col items-center gap-4 border border-gray-100">
          <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900">החשבון ממתין לאישור</h1>
          <p className="text-gray-500 font-medium leading-relaxed">
            התחברת בהצלחה למערכת הקייטרינג, אך המשתמש שלך עדיין מוגדר כ<span className="font-bold text-gray-700">ממתין לאישור (PENDING)</span>.
            אנא פנה למנהל המערכת שיאשר את החשבון שלך.
          </p>
          <div className="mt-6 w-full pt-6 border-t border-gray-100">
             <a href="/api/auth/signout" className="inline-block px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">
               התנתק מהמערכת
             </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center print:bg-white print:block">
      <div className="w-full max-w-md print:max-w-none bg-white min-h-screen shadow-2xl print:shadow-none relative pb-6 print:pb-0">
        <div className="print:hidden">
          <ErrorBoundary name="GlobalAlerts">
            <GlobalAlerts />
          </ErrorBoundary>
          <ErrorBoundary name="WelcomePopup">
            <WelcomePopup role={(session.user as any)?.role || 'USER'} />
          </ErrorBoundary>
          <ErrorBoundary name="GlobalTeamChatWidget">
            <GlobalTeamChatWidget />
          </ErrorBoundary>
          <ErrorBoundary name="TopBar">
            <TopBar />
          </ErrorBoundary>
          <ErrorBoundary name="KitchenNotifier">
            <KitchenNotifier />
          </ErrorBoundary>
        </div>
        <main className="px-4 pb-6 pt-3 page-enter print:p-0">
          <ErrorBoundary name="Children">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
