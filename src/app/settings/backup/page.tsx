import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import prisma from '@/lib/prisma'
import { SettingsDataCard } from '@/components/SettingsDataCard'
import { BackupSettingsClient } from './BackupSettingsClient'
import { getActiveSpreadsheetId } from '@/lib/googleSheets'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  const userRole = (session?.user as any)?.role || 'VIEWER'
  if (!session || userRole !== 'ADMIN') {
    return <div className="p-8 text-center text-gray-500">אין הרשאות מנהל לעמוד זה.</div>
  }

  // Get high level stats for the UI
  const totalCustomers = await prisma.customer.count()
  const totalOrders = await prisma.order.count()
  const initialSpreadsheetId = await getActiveSpreadsheetId()

  return (
    <div className="h-full flex flex-col pt-4 pb-20">
      <div className="px-4 sm:px-6 md:px-8 mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          הגדרות וגיבוי נתונים
        </h1>
        <p className="text-sm text-gray-500 mt-1">נהל את מסד הנתונים, הפק דוחות אקסל וגבה את המערכת.</p>
      </div>

      <div className="px-4 sm:px-6 md:px-8 flex-1">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <SettingsDataCard 
            totalCustomers={totalCustomers}
            totalOrders={totalOrders}
          />
          


          <BackupSettingsClient 
            initialSpreadsheetId={initialSpreadsheetId || ''} 
            userEmail={session.user?.email || ''}
          />

        </div>
      </div>
    </div>
  )
}
