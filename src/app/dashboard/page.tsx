import DashboardClient from './DashboardClient'
import { LimitedHome } from '@/components/LimitedHome'
import prisma from '@/lib/prisma'
import { startOfDay, endOfDay, parseISO, isValid, startOfWeek, endOfWeek, subDays, addDays, format } from 'date-fns'
import { getHebrewDateString } from '@/lib/hebrewDate'
import { getParasha } from '@/lib/parasha'
import { Suspense } from 'react'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function Dashboard({ searchParams }: { searchParams: { date?: string, shabbatWeek?: string, specialDateId?: string, dailyStatus?: string, shabbatStatus?: string, specialStatus?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const role = (session.user as any)?.role || 'VIEWER'
  const permissions = (session.user as any)?.permissions
  const userName = (session.user as any)?.name || ''

  // --- SMART ROUTING LOGIC ---
  // Count how many "main" modules this user has access to
  const mainModuleChecks = [
    hasPermission(role, permissions, 'dashboard', 'READ') || hasPermission(role, permissions, 'dash_midweek', 'READ') || hasPermission(role, permissions, 'dash_shabbat', 'READ') || hasPermission(role, permissions, 'dash_stats', 'READ'),
    hasPermission(role, permissions, 'customers', 'READ') || hasPermission(role, permissions, 'customers_manage', 'READ'),
    hasPermission(role, permissions, 'orders', 'READ') || hasPermission(role, permissions, 'orders_create', 'READ') || hasPermission(role, permissions, 'orders_fixed', 'READ') || hasPermission(role, permissions, 'orders_bs', 'READ') || hasPermission(role, permissions, 'orders_jlm', 'READ'),
    hasPermission(role, permissions, 'kitchen_events', 'READ') || hasPermission(role, permissions, 'kitchen_production', 'READ') || hasPermission(role, permissions, 'kitchen_routes', 'READ'),
    hasPermission(role, permissions, 'kitchen_driver_assign', 'READ') || hasPermission(role, permissions, 'kitchen_drivers_view', 'READ'),
  ]
  const mainModuleCount = mainModuleChecks.filter(Boolean).length

  // Limited access modules
  const hasMyRoute = hasPermission(role, permissions, 'kitchen_my_route', 'READ')
  const hasChatPerm = hasPermission(role, permissions, 'chat', 'READ')
  const hasAIChatPerm = hasPermission(role, permissions, 'ai_chat', 'READ')

  // If fewer than 3 main modules: show limited home or redirect directly
  if (role !== 'ADMIN' && mainModuleCount < 3) {
    // Count limited access options
    const limitedOptions = [hasMyRoute, hasChatPerm, hasAIChatPerm].filter(Boolean).length

    // Only ONE thing to show → redirect directly
    if (limitedOptions <= 1 && hasMyRoute) {
      redirect('/kitchen/drivers/my-route')
    }

    // Multiple limited options → show clean home
    return (
      <LimitedHome
        userName={userName}
        hasMyRoute={hasMyRoute}
        hasChat={hasChatPerm}
        hasAIChat={hasAIChatPerm}
      />
    )
  }
  // --- END SMART ROUTING ---

  const hasDashStats = hasPermission(role, permissions, 'dash_stats', 'READ')
  
  // They just need some dashboard view
  if (!hasDashStats && !hasPermission(role, permissions, 'dash_midweek', 'READ') && !hasPermission(role, permissions, 'dash_shabbat', 'READ') && !hasPermission(role, permissions, 'dash_purim', 'READ')) {
    redirect('/menu')
  }

  const hasMidweek = hasPermission(role, permissions, 'dash_midweek', 'READ')
  const hasShabbat = hasPermission(role, permissions, 'dash_shabbat', 'READ')
  const hasPurim = hasPermission(role, permissions, 'dash_purim', 'READ')

  
  const dailyStatus = searchParams?.dailyStatus || 'PLANNED'
  const shabbatStatus = searchParams?.shabbatStatus || 'PLANNED'
  const specialStatus = searchParams?.specialStatus || 'PLANNED'

  // Determine current day exactly in Israel Timezone to avoid UTC offset issues at night
  const israelTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })
  const nowInIsrael = new Date(israelTimeStr)



  

  // Parse target date for Daily Summary
  let targetDate = new Date(nowInIsrael.getTime())
  if (searchParams?.date) {
    const parsed = parseISO(searchParams.date)
    if (isValid(parsed)) targetDate = parsed
  } else {
    // If today is Friday or Saturday, default to Sunday
    const todayDay = targetDate.getDay()
    if (todayDay === 5) targetDate = addDays(targetDate, 2)
    else if (todayDay === 6) targetDate = addDays(targetDate, 1)
  }

  // Parse target date for Shabbat Summary (defaults to today's week)
  let targetShabbatDate = new Date(nowInIsrael.getTime())
  if (searchParams?.shabbatWeek) {
    const parsedStr = `${searchParams.shabbatWeek}T12:00:00`
    const parsed = new Date(parsedStr)
    if (isValid(parsed)) targetShabbatDate = parsed
  } else {
    // If today is Saturday, show next week's Shabbat by default
    if (targetShabbatDate.getDay() === 6) {
      targetShabbatDate = addDays(targetShabbatDate, 7)
    }
  }

  // Calculate week boundaries for Daily Orders
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat']
  const targetDayName = dayNames[targetDate.getDay()]
  
  const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 0 })
  const targetWeekEnd = endOfWeek(targetDate, { weekStartsOn: 0 })
  const prevWeekStart = subDays(targetWeekStart, 7)
  const prevWeekEnd = subDays(targetWeekEnd, 7)

  // 1. Fetch ALL Orders scheduled for delivery on targetDate
  const dailyOrdersRaw = await prisma.order.findMany({
    where: {
      deletedAt: null,
      deliveryDay: targetDayName,
      OR: [
        { deliveryWeek: 'THIS_WEEK', createdAt: { gte: targetWeekStart, lte: targetWeekEnd } },
        { deliveryWeek: 'NEXT_WEEK', createdAt: { gte: prevWeekStart, lte: prevWeekEnd } },
        { deliveryWeek: isValid(targetDate) ? format(targetDate, 'yyyy-MM-dd') : 'NEVER_MATCH' },
        { deliveryWeek: isValid(targetWeekStart) ? format(targetWeekStart, 'yyyy-MM-dd') : 'NEVER_MATCH' },
        { deliveryWeek: targetWeekStart.toISOString() }
      ]
    },
    include: { items: { include: { product: true } } }
  })

  const shabbatWeekStart = startOfWeek(targetShabbatDate, { weekStartsOn: 0 })
  const shabbatWeekEnd = endOfWeek(targetShabbatDate, { weekStartsOn: 0 })
  const shabbatPrevWeekStart = subDays(shabbatWeekStart, 7)
  const shabbatPrevWeekEnd = subDays(shabbatWeekEnd, 7)

  const shabbatWeekDaysStr = []
  for (let i = 0; i <= 6; i++) {
    shabbatWeekDaysStr.push(format(addDays(shabbatWeekStart, i), 'yyyy-MM-dd'))
  }

  // 2. Fetch ALL Shabbat Orders for targetShabbatDate's week
  const shabbatOrdersRaw = await prisma.order.findMany({
    where: {
      deletedAt: null,
      deliveryDay: { in: ['Friday', 'Shabbat'] },
      OR: [
        { deliveryWeek: 'THIS_WEEK', createdAt: { gte: shabbatWeekStart, lte: shabbatWeekEnd } },
        { deliveryWeek: 'NEXT_WEEK', createdAt: { gte: shabbatPrevWeekStart, lte: shabbatPrevWeekEnd } },
        { deliveryWeek: { in: shabbatWeekDaysStr } },
        { deliveryWeek: shabbatWeekStart.toISOString() }
      ]
    },
    include: { items: { include: { product: true } } }
  })

  // 3. Status Filtering & Split Arrays
  const filterByDailyStatus = (orders: any[]) => {
    if (dailyStatus === 'ALL') return orders;
    return orders.filter(o => dailyStatus === 'EXECUTED' ? ['EXECUTED', 'PAID'].includes(o.status) : !['EXECUTED', 'PAID'].includes(o.status));
  }
  const filterByShabbatStatus = (orders: any[]) => {
    if (shabbatStatus === 'ALL') return orders;
    return orders.filter(o => shabbatStatus === 'EXECUTED' ? ['EXECUTED', 'PAID'].includes(o.status) : !['EXECUTED', 'PAID'].includes(o.status));
  }
  const filterBySpecialStatus = (orders: any[]) => {
    if (specialStatus === 'ALL') return orders;
    return orders.filter(o => specialStatus === 'EXECUTED' ? ['EXECUTED', 'PAID'].includes(o.status) : !['EXECUTED', 'PAID'].includes(o.status));
  }
  
  const getExecutedQty = (ordersRaw: any[]) => {
    const executed = ordersRaw.filter(o => ['EXECUTED', 'PAID'].includes(o.status));
    const counts: Record<string, number> = {};
    executed.forEach(o => {
      o.items.forEach((item: any) => {
        if (!item.product || item.product.deletedAt) return;
        counts[item.product.id] = (counts[item.product.id] || 0) + item.quantity;
      });
    });
    return counts;
  }

  const dailyOrders = filterByDailyStatus(dailyOrdersRaw);
  const shabbatOrders = filterByShabbatStatus(shabbatOrdersRaw);
  const specialOrdersRaw = searchParams?.specialDateId ? await prisma.order.findMany({ where: { specialDateId: searchParams.specialDateId, deletedAt: null }, include: { items: { include: { product: true } } } }) : [];
  const specialOrders = filterBySpecialStatus(specialOrdersRaw);
  
  const dailyExecutedCounts = getExecutedQty(dailyOrdersRaw);
  const shabbatExecutedCounts = getExecutedQty(shabbatOrdersRaw);
  const specialExecutedCounts = getExecutedQty(specialOrdersRaw);

  // 4. Aggregate Daily Products
  const dailyAggregates: Record<string, { id: string, name: string, hot: number, cold: number }> = {}
  dailyOrders.forEach((order: any) => {
    order.items.forEach((item: any) => {
      if (!item.product || item.product.deletedAt) return;
      const id = item.product.id;
      const name = item.product.name;
      const isSbb = order.deliveryDay === 'Shabbat';
      const isOther = item.product.category === 'OTHER';
      const isHot = !isSbb && !isOther && (item.variant === 'HOT' || (!item.variant && (item.product.category === 'HOT' || order.type === 'HOT')));
      const isCold = !isSbb && !isOther && (item.variant === 'COLD' || (!item.variant && (item.product.category === 'COLD' || order.type === 'COLD')));
      
      if (!dailyAggregates[name]) dailyAggregates[name] = { id, name, hot: 0, cold: 0, unknown: 0 } as any;
      if (isHot) dailyAggregates[name].hot += item.quantity;
      else if (isCold) dailyAggregates[name].cold += item.quantity;
      else (dailyAggregates[name] as any).unknown += item.quantity;
    });
  });

  // 5. Aggregate Shabbat Products (Globally and By Route)
  const shabbatAggregates: Record<string, { id: string, name: string, quantity: number }> = {}
  const shabbatRouteAggregates: Record<string, Record<string, number>> = {}

  shabbatOrders.forEach((order: any) => {
    const routeName = order.route?.name || order.deliveryArea?.route?.name || 'ללא רכב מסומן';
    if (!shabbatRouteAggregates[routeName]) shabbatRouteAggregates[routeName] = {};

    order.items.forEach((item: any) => {
      if (!item.product || item.product.deletedAt) return;
      const id = item.product.id;
      const name = item.product.name;
      
      if (!shabbatAggregates[name]) shabbatAggregates[name] = { id, name, quantity: 0 };
      shabbatAggregates[name].quantity += item.quantity;
      
      if (!shabbatRouteAggregates[routeName][name]) shabbatRouteAggregates[routeName][name] = 0;
      shabbatRouteAggregates[routeName][name] += item.quantity;
    });
  });

  // 6. Fetch Special Dates & Aggregate
  const specialDates = await prisma.specialDate.findMany({ orderBy: { date: 'asc' } })
  const specialAggregates: Record<string, { id: string, name: string, quantity: number }> = {}
  let specialOrderCount = 0

  if (searchParams?.specialDateId) {
    specialOrderCount = specialOrders.length;
    specialOrders.forEach((order: any) => {
      order.items.forEach((item: any) => {
        if (!item.product || item.product.deletedAt) return;
        if (!specialAggregates[item.product.name]) specialAggregates[item.product.name] = { id: item.product.id, name: item.product.name, quantity: 0 };
        specialAggregates[item.product.name].quantity += item.quantity;
      });
    });
  }

  // 7. Fetch Production Batches (Oven Tracking)
  const dailyDateStr = isValid(targetDate) ? format(targetDate, 'yyyy-MM-dd') : ''
  const shabbatDateStr = isValid(shabbatWeekEnd) ? format(shabbatWeekEnd, 'yyyy-MM-dd') : ''
  const specialDateStr = searchParams?.specialDateId || ''

  const [dailyBatches, shabbatBatches, specialBatches] = await Promise.all([
    dailyDateStr ? prisma.productionBatch.findMany({ where: { targetDateString: dailyDateStr } }) : Promise.resolve([]),
    shabbatDateStr ? prisma.productionBatch.findMany({ where: { targetDateString: shabbatDateStr } }) : Promise.resolve([]),
    specialDateStr ? prisma.productionBatch.findMany({ where: { targetDateString: specialDateStr } }) : Promise.resolve([])
  ]);

  // Apply Mathematical Deduction rule: Delivered items drop from both "Orders Required" (already handled by filtering dailyOrders above) AND "Produced Batches".
  const mapBatches = (batches: any[]) => batches.reduce((acc, b) => ({ ...acc, [b.productId]: b.producedQuantity }), {});
  const dailyProduced = mapBatches(dailyBatches);
  const shabbatProduced = mapBatches(shabbatBatches);
  const specialProduced = mapBatches(specialBatches);

  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">טוען...</div>}>
      <DashboardClient 
        targetDateISO={dailyDateStr}
        targetDateLabel={isValid(targetDate) ? getHebrewDateString(targetDate) : ''}
        todayLabel={getHebrewDateString(nowInIsrael)}
        dailyOrderCount={dailyOrders.length}
        dailyAggregates={dailyAggregates}
        dailyProduced={dailyProduced as any}
        dailyDeductions={dailyExecutedCounts as any}
        
        targetShabbatISO={shabbatDateStr}
        shabbatOrderCount={shabbatOrders.length}
        shabbatAggregates={shabbatAggregates}
        shabbatProduced={shabbatProduced as any}
        shabbatDeductions={shabbatExecutedCounts as any}
        shabbatRouteAggregates={shabbatRouteAggregates}
        thisWeekParashaName={getParasha('THIS_WEEK')}
        
        specialDates={specialDates}
        specialOrderCount={specialOrderCount}
        specialAggregates={specialAggregates}
        specialProduced={specialProduced as any}
        specialDeductions={specialExecutedCounts as any}
        selectedSpecialDateId={searchParams?.specialDateId || null}
        
        hasMidweek={hasMidweek}
        hasShabbat={hasShabbat}
        hasPurim={hasPurim}
        dailyStatus={dailyStatus}
        shabbatStatus={shabbatStatus}
        specialStatus={specialStatus}
      />
    </Suspense>
  )
}
