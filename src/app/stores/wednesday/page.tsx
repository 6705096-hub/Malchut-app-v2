import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import { WednesdayStoreForm } from './WednesdayStoreForm'
import { BackButton } from '@/components/BackButton'

export const dynamic = 'force-dynamic'

export default async function WednesdayStoresPage({ searchParams }: { searchParams: { city?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })

  // Group products by category to make it nice if needed, but the user asked for one big list without mixing hot/cold. 
  // We'll just pass them all sorted alphabetically.
  
  const initialCity = searchParams.city || 'ירושלים'

  return (
    <div className="h-full flex flex-col pt-4 pb-20 px-2 max-w-2xl mx-auto">
      <div className="mb-6 flex items-start gap-3">
        <div className="mt-1">
          <BackButton />
        </div>
        <div>
          <h1 className="text-2xl font-black text-orange-600 flex items-center gap-2">
            🏪 חנויות - יום רביעי
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            הזרנת הזמנה מהירה לחנויות ({initialCity})
          </p>
        </div>
      </div>

      <WednesdayStoreForm products={products} initialCity={initialCity} />
    </div>
  )
}
