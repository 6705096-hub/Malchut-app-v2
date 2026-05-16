import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"; import { authOptions } from "@/lib/auth"
import { OrdersListViewClient } from './OrdersListViewClient'
import { startOfWeek, endOfWeek, subDays, parseISO, isValid, format, addDays } from 'date-fns'
import { getHebrewDateString } from '@/lib/hebrewDate'
import { getParashaForDate } from '@/lib/parasha'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/permissions'
import { applyOrderDataScope } from '@/lib/data-access'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function OrdersPage({ searchParams }: { searchParams: { date?: string, shabbatWeek?: string, city?: string, filter?: string, specialDateId?: string, editId?: string, highlightId?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  
  const role = (session.user as any)?.role || 'VIEWER'
  const permissions = (session.user as any)?.permissions
  
  let permissionKey = 'orders' // default fallback, will be overwritten
  if (searchParams.filter === 'shabbat') permissionKey = 'orders_shabbat'
  else if (searchParams.filter === 'midweek') permissionKey = 'orders_midweek'
  else if (searchParams.filter === 'stores') permissionKey = 'orders_stores'
  else if (searchParams.filter === 'areas') permissionKey = 'orders_areas'
  else if (searchParams.filter === 'orders_jerusalem') permissionKey = 'orders_jerusalem'
  else if (searchParams.filter === 'orders_beitshemesh') permissionKey = 'orders_beitshemesh'
  else if (searchParams.date) permissionKey = 'orders_midweek'
  else if (searchParams.shabbatWeek) permissionKey = 'orders_shabbat'
  else if (searchParams.specialDateId) permissionKey = 'orders_midweek' // Use midweek logic/permissions for special dates
  else if (searchParams.city === 'ירושלים') permissionKey = 'orders_jerusalem'
  else if (searchParams.city === 'בית שמש') permissionKey = 'orders_beitshemesh'
  else if (searchParams.highlightId) permissionKey = 'orders' // Bypass redirect to show all orders
  else {
    // If no specific filter is requested, check if they have ANY order permissions and default to that view.
    const extra = searchParams.editId ? `&editId=${searchParams.editId}` : ''
    const hasAnyJlm = hasPermission(role, permissions, 'orders_jerusalem', 'READ')
    if (hasAnyJlm) redirect(`/dashboard/orders?city=${encodeURIComponent('ירושלים')}&filter=orders_jerusalem${extra}`)
    const hasAnyBs = hasPermission(role, permissions, 'orders_beitshemesh', 'READ')
    if (hasAnyBs) redirect(`/dashboard/orders?city=${encodeURIComponent('בית שמש')}&filter=orders_beitshemesh${extra}`)
    const hasMidweek = hasPermission(role, permissions, 'orders_midweek', 'READ')
    if (hasMidweek) redirect(`/dashboard/orders?city=${encodeURIComponent('ירושלים')}&filter=midweek${extra}`)
    
    redirect('/menu') // No access to any orders
  }

  if (!hasPermission(role, permissions, permissionKey, 'READ')) redirect('/menu')
  const canEdit = hasPermission(role, permissions, permissionKey, 'FULL')
  
  let pageTitle = 'כל ההזמנות (50 אחרונות)'

  // Determine filtering
  let whereClause: any = {}
  
  if (searchParams.date) {
    const targetDate = parseISO(searchParams.date)
    if (isValid(targetDate)) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat']
      const targetDayName = dayNames[targetDate.getDay()]
      const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 0 })
      const targetWeekEnd = endOfWeek(targetDate, { weekStartsOn: 0 })
      const prevWeekStart = subDays(targetWeekStart, 7)
      const prevWeekEnd = subDays(targetWeekEnd, 7)

      whereClause = {
        deliveryDay: targetDayName,
        OR: [
          { deliveryWeek: 'THIS_WEEK', createdAt: { gte: targetWeekStart, lte: targetWeekEnd } },
          { deliveryWeek: 'NEXT_WEEK', createdAt: { gte: prevWeekStart, lte: prevWeekEnd } },
          { deliveryWeek: isValid(targetDate) ? format(targetDate, 'yyyy-MM-dd') : 'NEVER_MATCH' },
          { deliveryWeek: isValid(targetWeekStart) ? format(targetWeekStart, 'yyyy-MM-dd') : 'NEVER_MATCH' },
          { deliveryWeek: targetWeekStart.toISOString() }
        ]
      }
      pageTitle = `הזמנות ל${getHebrewDateString(targetDate)}`
    }
  } else if (searchParams.shabbatWeek) {
    const targetShabbatDate = parseISO(searchParams.shabbatWeek)
    if (isValid(targetShabbatDate)) {
      const shabbatWeekStart = startOfWeek(targetShabbatDate, { weekStartsOn: 0 })
      const shabbatWeekEnd = endOfWeek(targetShabbatDate, { weekStartsOn: 0 })
      const shabbatPrevWeekStart = subDays(shabbatWeekStart, 7)
      const shabbatPrevWeekEnd = subDays(shabbatWeekEnd, 7)

      const shabbatWeekDaysStr = []
      for (let i = 0; i <= 6; i++) {
        shabbatWeekDaysStr.push(format(addDays(shabbatWeekStart, i), 'yyyy-MM-dd'))
      }

      whereClause = {
        deliveryDay: { in: ['Friday', 'Shabbat'] },
        OR: [
          { deliveryWeek: 'THIS_WEEK', createdAt: { gte: shabbatWeekStart, lte: shabbatWeekEnd } },
          { deliveryWeek: 'NEXT_WEEK', createdAt: { gte: shabbatPrevWeekStart, lte: shabbatPrevWeekEnd } },
          { deliveryWeek: { in: shabbatWeekDaysStr } },
          { deliveryWeek: shabbatWeekStart.toISOString() }
        ]
      }
      // Use the same getDeliveryHebrewDate that works for individual orders
      // Pass the Sunday (start) of the viewed week + Shabbat + THIS_WEEK
      // → same calculation as createdAt=Sunday, deliveryDay=Shabbat, deliveryWeek=THIS_WEEK
      const { getDeliveryHebrewDate } = await import('@/lib/hebrewDate')
      const sundayOfViewedWeek = shabbatWeekStart // already computed above
      const hebrewFull = getDeliveryHebrewDate(sundayOfViewedWeek, 'Shabbat', 'THIS_WEEK')
      const hebrewDayMonth = hebrewFull.split(', ').slice(1).join(', ')
      // Parasha: use the actual Shabbat (Sunday + 6 days)
      const actualShabbat = addDays(sundayOfViewedWeek, 6)
      pageTitle = `הזמנות שבת ${getParashaForDate(actualShabbat)} ${hebrewDayMonth}`
    }
  } else if (searchParams.specialDateId) {
    whereClause = { specialDateId: searchParams.specialDateId }
    const sd = await prisma.specialDate.findUnique({ where: { id: searchParams.specialDateId }})
    pageTitle = sd ? `הזמנות ל${sd.name}` : `הזמנות לחג`
  } else {
    // Handle global filters from the new nested menu
    if (searchParams.filter === 'midweek') {
      whereClause.deliveryDay = { notIn: ['Shabbat', 'Wednesday_Stores'] }
      pageTitle = searchParams.city ? `הזמנות אמצע השבוע - ${searchParams.city}` : 'הזמנות אמצע השבוע'
    } else if (searchParams.filter === 'shabbat') {
      whereClause.deliveryDay = { in: ['Friday', 'Shabbat'] }
      pageTitle = searchParams.city ? `הזמנות שבת - ${searchParams.city}` : 'הזמנות שבת'
    } else if (searchParams.filter === 'stores') {
      whereClause.deliveryDay = 'Wednesday_Stores'
      pageTitle = searchParams.city ? `הזמנות חנויות רביעי - ${searchParams.city}` : 'הזמנות חנויות רביעי'
    }

    if (searchParams.city) {
      whereClause.city = searchParams.city
      if (!searchParams.filter) {
        pageTitle = `כל ההזמנות - ${searchParams.city}`
      }
    }

    if (searchParams.filter === 'areas' && role !== 'ADMIN') {
      const allowedAreaIds: string[] = []
      const perms = permissions || {}
      for (const key in perms) {
        if (key.startsWith('area_') && (perms[key] === 'READ' || perms[key] === 'FULL')) {
          allowedAreaIds.push(key.replace('area_', ''))
        }
      }
      whereClause.deliveryAreaId = { in: allowedAreaIds }
    }
  }

  // Always filter out soft-deleted orders
  whereClause.deletedAt = null

  // Global Row Level Security boundaries
  whereClause = applyOrderDataScope(session, whereClause)

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: { 
      customer: true, 
      deliveryArea: true,
      route: true,
      specialDate: true,

      createdBy: true,
      histories: { include: { user: true }, orderBy: { createdAt: 'desc' } },
      items: {
        include: { product: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: Object.keys(whereClause).length > 0 ? undefined : 50 // Limit only when no filter applied
  })

  const deliveryAreas = await prisma.deliveryArea.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })

  // When coming from the menu accordions, we want to render the corresponding layout natively.
  // We treat ?filter=shabbat the same as the Shabbat Wizard view, and ?filter=midweek as Daily.
  const isShabbat = !!searchParams.shabbatWeek || searchParams.filter === 'shabbat'
  const isDaily = !!searchParams.date || searchParams.filter === 'midweek'

  return (
    <>
      {canEdit && searchParams.filter === 'stores' && (
        <div className="flex justify-end mb-4 px-2 print:hidden">
          <Link 
            href={`/stores/wednesday?city=${searchParams.city || 'ירושלים'}`}
            className="flex items-center gap-1 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-orange-600 transition"
          >
            <Plus className="w-4 h-4" /> הזמנת חנות חדשה
          </Link>
        </div>
      )}
      <OrdersListViewClient 
        pageTitle={pageTitle} 
        orders={orders as any} 
        deliveryAreas={deliveryAreas} 
        isShabbat={isShabbat}
        isDaily={isDaily}
        isMidweekFlatView={searchParams.filter === 'midweek' || !!searchParams.date || !!searchParams.specialDateId}
        isStoreCompactView={searchParams.filter === 'stores'}
        initialCity={(searchParams.city as 'ALL' | 'ירושלים' | 'בית שמש') || 'ALL'}
        canEdit={canEdit}
      />
    </>
  )
}
