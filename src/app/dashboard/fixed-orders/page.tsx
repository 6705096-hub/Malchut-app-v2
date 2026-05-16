import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import FixedOrdersClient from "./FixedOrdersClient"

export const dynamic = 'force-dynamic'

export default async function FixedOrdersPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  // Allow standard access so long as it's not a generic VIEWER unless they have order permissions
  // Real permission check happens in the layout / APIs, but enforcing general auth here.
  
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span className="text-2xl">📌</span>
            הזמנות קבועות
          </h1>
          <p className="text-gray-500 mt-1">ניהול הזמנות החוזרות על עצמן מדי שבוע</p>
        </div>
      </div>
      
      <FixedOrdersClient session={session} />
    </div>
  )
}
