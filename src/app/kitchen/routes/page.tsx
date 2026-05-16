import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import { RoutesClient } from './RoutesClient'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function RoutesManagementPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  
  // Basic sanity check - Kitchen and upper roles
  if (!session || !['ADMIN', 'ORDERS_MANAGER', 'KITCHEN'].includes(role)) {
    redirect('/dashboard')
  }

  // Pre-fetch all available Delivery Areas for Shabbat mappings
  const deliveryAreas = await prisma.deliveryArea.findMany({
    orderBy: { name: 'asc' }
  })

  // Pre-fetch all available Vehicles / Routes
  const routes = await prisma.route.findMany({
    orderBy: { name: 'asc' }
  })

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 -mt-4 -ml-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <h1 className="relative z-10 text-2xl font-black mb-1">ניהול רכבים ומסלולים</h1>
        <p className="relative z-10 text-green-50 text-sm font-medium">שיוך אזורי חלוקה לרכבים וסיכום סחורה כולל.</p>
      </div>

      <RoutesClient initialAreas={deliveryAreas} initialRoutes={routes} />
    </div>
  )
}
