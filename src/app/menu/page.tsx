import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import { MenuAccordion } from '@/components/MenuAccordion'
import { BackButton } from '@/components/BackButton'

export const dynamic = 'force-dynamic'

export default async function MenuPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userRole = (session.user as any)?.role || 'VIEWER'
  const userPermissions = (session.user as any)?.permissions

  return (
    <div className="h-full flex flex-col pt-4 pb-20 px-2">
      <div className="flex items-center gap-2 mb-8">
        <BackButton />
        <h1 className="text-2xl font-black text-gray-900">תפריט</h1>
      </div>

      <MenuAccordion role={userRole} permissions={userPermissions} />

    </div>
  )
}

