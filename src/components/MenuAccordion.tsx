'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, ChevronDown, Store, CalendarDays, 
  Home, Users, ChefHat, ClipboardList, TrendingUp, Settings, 
  Calendar, UtensilsCrossed, Truck, Repeat, Map, PieChart, History,
  ShoppingBag, MessageCircle, Bot
} from 'lucide-react'
import { hasPermission } from '@/lib/permissions'

type MenuAccordionProps = {
  role: string
  permissions: any
  onClose?: () => void
}

export function MenuAccordion({ role, permissions, onClose }: MenuAccordionProps) {
  const [openJerusalem, setOpenJerusalem] = useState(false)
  const [openBeitShemesh, setOpenBeitShemesh] = useState(false)
  const [openOrders, setOpenOrders] = useState(false)

  const hasCustomers = hasPermission(role, permissions, 'customers_manage', 'READ')

  // Kitchen
  const hasKitchenEvents = hasPermission(role, permissions, 'kitchen_events', 'READ')
  const hasKitchenProduction = hasPermission(role, permissions, 'kitchen_production', 'READ')
  const hasKitchenRoutes = hasPermission(role, permissions, 'kitchen_routes', 'READ')
  const hasKitchenDriverAssign = hasPermission(role, permissions, 'kitchen_driver_assign', 'READ')
  const hasKitchenDriversView = hasPermission(role, permissions, 'kitchen_drivers_view', 'READ')
  const hasKitchenMyRoute = hasPermission(role, permissions, 'kitchen_my_route', 'READ')
  
  // Either generic assign OR specific view
  const showDriversMenu = hasKitchenDriverAssign || hasKitchenDriversView
  
  const showKitchenAccordion = hasKitchenEvents || hasKitchenProduction || hasKitchenRoutes || showDriversMenu || hasKitchenMyRoute
  
  // Orders
  const hasOrdersFixed = hasPermission(role, permissions, 'orders_fixed', 'READ')
  
  const hasOrdersBsMidweek = hasPermission(role, permissions, 'orders_bs_midweek', 'READ')
  const hasOrdersBsShabbat = hasPermission(role, permissions, 'orders_bs_shabbat', 'READ')
  const hasOrdersBsWednesday = hasPermission(role, permissions, 'orders_bs_wednesday', 'READ')
  const showBeitShemesh = hasOrdersBsMidweek || hasOrdersBsShabbat || hasOrdersBsWednesday

  const hasOrdersJlmMidweek = hasPermission(role, permissions, 'orders_jlm_midweek', 'READ')
  const hasOrdersJlmShabbat = hasPermission(role, permissions, 'orders_jlm_shabbat', 'READ')
  const hasOrdersJlmWednesday = hasPermission(role, permissions, 'orders_jlm_wednesday', 'READ')
  const showJerusalem = hasOrdersJlmMidweek || hasOrdersJlmShabbat || hasOrdersJlmWednesday

  // Dynamic area permissions checking would go here... for now we just show Orders if any order access exists
  const showOrdersAccordion = hasOrdersFixed || showBeitShemesh || showJerusalem
  
  const [openKitchen, setOpenKitchen] = useState(false)
  const [openReports, setOpenReports] = useState(false)
  
  // Limited access logic
  const mainModuleChecks = [
    hasPermission(role, permissions, 'dashboard', 'READ') || hasPermission(role, permissions, 'dash_midweek', 'READ') || hasPermission(role, permissions, 'dash_shabbat', 'READ') || hasPermission(role, permissions, 'dash_stats', 'READ'),
    hasPermission(role, permissions, 'customers', 'READ') || hasPermission(role, permissions, 'customers_manage', 'READ'),
    hasPermission(role, permissions, 'orders', 'READ') || hasPermission(role, permissions, 'orders_create', 'READ') || hasPermission(role, permissions, 'orders_fixed', 'READ') || hasPermission(role, permissions, 'orders_bs', 'READ') || hasPermission(role, permissions, 'orders_jlm', 'READ'),
    hasPermission(role, permissions, 'kitchen_events', 'READ') || hasPermission(role, permissions, 'kitchen_production', 'READ') || hasPermission(role, permissions, 'kitchen_routes', 'READ'),
    hasPermission(role, permissions, 'kitchen_driver_assign', 'READ') || hasPermission(role, permissions, 'kitchen_drivers_view', 'READ'),
  ]
  const mainModuleCount = mainModuleChecks.filter(Boolean).length
  const isLimited = role !== 'ADMIN' && mainModuleCount < 3

  const hasChat = hasPermission(role, permissions, 'chat', 'READ')
  const hasAIChat = hasPermission(role, permissions, 'ai_chat', 'READ')

  if (isLimited) {
    return null
  }

  return (
    <div className="flex flex-col space-y-0.5">
      
      {/* Home Section */}
      <Link href="/dashboard" onClick={onClose} className="flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-gray-50 transition-all active:scale-[0.98] group">
        <div className="flex items-center gap-3">
          <Home className="w-5 h-5 text-gray-500" />
          <span className="font-bold text-gray-900 text-xl">דף הבית</span>
        </div>
        <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
      </Link>

      {/* Customers Section */}
      {hasCustomers ? (
        <Link href="/dashboard/customers" onClick={onClose} className="flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-gray-50 transition-all active:scale-[0.98] group">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-gray-900 text-xl">לקוחות</span>
          </div>
          <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
        </Link>
      ) : (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl opacity-50 cursor-not-allowed">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <span className="font-bold text-gray-400 text-xl">לקוחות</span>
          </div>
        </div>
      )}

      {/* Kitchen Section */}
      {showKitchenAccordion && (
        <div className="mb-1">
          <button 
            onClick={() => setOpenKitchen(!openKitchen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-gray-50 transition-all active:scale-[0.98] group"
          >
            <div className="flex items-center gap-3">
              <ChefHat className="w-5 h-5 text-teal-600" />
              <span className="font-bold text-gray-900 text-xl">מטבח ונהגים</span>
            </div>
            {openKitchen ? (
              <ChevronDown className="w-5 h-5 text-red-500" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            )}
          </button>
          
          {openKitchen && (
            <div className="bg-gray-50/80 rounded-2xl p-2 mb-4 space-y-1 mx-2 shadow-inner border border-gray-100">
              {hasKitchenEvents && (
                <Link href="/kitchen" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors text-gray-700 font-semibold">
                  <Calendar className="w-5 h-5 text-red-500" /> כל האירועים
                </Link>
              )}
              {hasKitchenProduction && (
                <Link href="/kitchen/production" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors text-gray-700 font-semibold mt-2 border-t border-gray-200/60 pt-4">
                  <UtensilsCrossed className="w-5 h-5 text-blue-500" /> ייצור
                </Link>
              )}
              {hasKitchenRoutes && (
                <Link href="/kitchen/routes" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors text-gray-700 font-semibold">
                  <Truck className="w-5 h-5 text-green-500" /> ניהול רכבים ומסלולים
                </Link>
              )}
              {showDriversMenu && (
                <Link href="/kitchen/drivers" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors text-slate-800 font-bold bg-slate-50 border border-slate-100">
                  <Truck className="w-5 h-5 text-slate-600" /> נהגים וחלוקה (ניהול)
                </Link>
              )}
              {hasKitchenMyRoute && (
                <Link href="/kitchen/drivers/my-route" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors text-emerald-800 font-bold bg-emerald-50 border border-emerald-100">
                  <Map className="w-5 h-5 text-emerald-600" /> המסלול שלי (נהג)
                </Link>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Orders Section (Combined) */}
      {showOrdersAccordion && (
        <div className="mb-1">
          <button 
            onClick={() => setOpenOrders(!openOrders)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-gray-50 transition-all active:scale-[0.98] group"
          >
            <div className="flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-purple-500" />
              <span className="font-bold text-gray-900 text-xl">הזמנות</span>
            </div>
            {openOrders ? (
              <ChevronDown className="w-5 h-5 text-purple-500" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            )}
          </button>
          
          {openOrders && (
            <div className="bg-gray-50/80 rounded-2xl p-2 mb-4 space-y-1 mx-2 shadow-inner border border-gray-100">
              {hasOrdersFixed && (
                <Link 
                  href="/dashboard/fixed-orders" 
                  onClick={onClose} 
                  className="w-full flex items-center gap-2 p-3 rounded-xl hover:bg-white transition-colors text-purple-700 font-bold bg-purple-50 border border-purple-100 mb-2"
                >
                  <Repeat className="w-5 h-5 text-purple-500" />
                  <span>הזמנות קבועות</span>
                </Link>
              )}

              {/* Beit Shemesh Link */}
              {showBeitShemesh && (
                <Link href="/dashboard/orders?city=בית שמש" onClick={onClose} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white transition-colors text-gray-700 font-bold mb-2">
                  <div className="flex items-center gap-2">
                    <Map className="w-4 h-4 text-emerald-500" />
                    <span>בית שמש</span>
                  </div>
                </Link>
              )}

              {/* Jerusalem Link */}
              {showJerusalem && (
                <Link href="/dashboard/orders?city=ירושלים" onClick={onClose} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white transition-colors text-gray-700 font-bold mb-2">
                  <div className="flex items-center gap-2">
                    <Map className="w-4 h-4 text-blue-500" />
                    <span>ירושלים</span>
                  </div>
                </Link>
              )}

              {/* Wednesday Stores Link */}
              {(hasOrdersBsWednesday || hasOrdersJlmWednesday) && (
                <Link href="/dashboard/orders?filter=stores" onClick={onClose} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white transition-colors text-gray-700 font-bold mb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-orange-500" />
                    <span>חנויות יום רביעי</span>
                  </div>
                </Link>
              )}
              
            </div>
          )}
        </div>
      )}

      {/* Reports Section */}
      {(role === 'ADMIN' || hasPermission(role, permissions, 'kitchen_production', 'FULL')) && (
        <div className="mb-1">
          <button 
            onClick={() => setOpenReports(!openReports)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-gray-50 transition-all active:scale-[0.98] group"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              <span className="font-bold text-gray-900 text-xl">דוחות ומעקב</span>
            </div>
            {openReports ? (
              <ChevronDown className="w-5 h-5 text-indigo-500" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            )}
          </button>
          
          {openReports && (
            <div className="bg-gray-50/80 rounded-2xl p-2 mb-4 space-y-1 mx-2 shadow-inner border border-gray-100">
              <Link 
                href="/dashboard/reports" 
                onClick={onClose} 
                className="w-full flex items-center gap-2 p-3 rounded-xl hover:bg-white transition-colors text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 mb-2"
              >
                <PieChart className="w-5 h-5 text-indigo-500" />
                <span>סיכום וסטטיסטיקות</span>
              </Link>
              <Link 
                href="/dashboard/production-history" 
                onClick={onClose} 
                className="w-full flex items-center gap-2 p-3 rounded-xl hover:bg-white transition-colors text-indigo-700 font-bold hover:bg-indigo-50/50 mb-1"
              >
                <History className="w-5 h-5 text-indigo-500" />
                <span>היסטוריית ייצור מקובצת</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Settings Section - Only for users who have ANY management permission */}
      {(role === 'ADMIN' || hasPermission(role, permissions, 'management', 'FULL')) && (
        <div className="mb-1">
          <Link 
            href="/settings"
            onClick={onClose}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-gray-50 transition-all active:scale-[0.98] group"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-gray-500" />
              <span className="font-bold text-gray-900 text-xl">הגדרות</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </Link>
        </div>
      )}

    </div>
  )
}
