import { DatesCalendarManager } from '@/components/DatesCalendarManager'
import { getSession } from '@/lib/session'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BackButton } from '@/components/BackButton'

export const dynamic = 'force-dynamic'

export default async function DatesSettingsPage() {
  const session = await getSession()
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const specialDates = await prisma.specialDate.findMany({ orderBy: { date: 'asc' } })
  const blockedDates = await prisma.blockedDate.findMany({ orderBy: { date: 'asc' } })

  return (
    <div className="h-full flex flex-col pt-4 pb-20">
      <div className="flex justify-between items-center mb-6 mt-[-10px] w-full">
        <h1 className="text-2xl font-black text-gray-900 pr-2 pt-2">לוח שנה ותאריכים מיוחדים</h1>
        <div className="flex items-center gap-3">
          <BackButton />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <DatesCalendarManager initialSpecialDates={specialDates} initialBlockedDates={blockedDates} />
      </div>
    </div>
  )
}
