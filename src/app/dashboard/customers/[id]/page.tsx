import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import Link from 'next/link'
import { ArrowLeft, Phone, MapPin, Plus } from 'lucide-react'
import { getDeliveryHebrewDate } from '@/lib/hebrewDate'
import { getParashaForDate } from '@/lib/parasha'
import { startOfWeek, addDays } from 'date-fns'
import { CustomerDeleteButton } from '@/components/CustomerDeleteButton'
import { CustomerEditModal } from '@/components/CustomerEditModal'
import { CustomerPricesModal } from '@/components/CustomerPricesModal'
import { BackButton } from '@/components/BackButton'
import { hasPermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'
import { CustomerBalanceWidget } from '@/components/CustomerBalanceWidget'
import { PaymentWidget } from '@/components/PaymentWidget'
import { PaymentAmountToggle } from '@/components/PaymentAmountToggle'
import { OrderStatusDropdown } from '@/components/OrderStatusDropdown'
import { PastDebtRow } from '@/components/PastDebtRow'
import { OrderCard } from '@/components/OrderCard'
import { CustomerOrdersList } from '@/components/CustomerOrdersList'
import { ClickToCallLink } from '@/components/ClickToCallLink'

export default async function CustomerDetailsPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || (session.user as any)?.role === 'VIEWER') {
    return <div className="p-8 text-center text-gray-500">אין הרשאה</div>
  }

  const role = (session.user as any)?.role || 'VIEWER'
  const permissions = (session.user as any)?.permissions || {}
  
  if (!hasPermission(role, permissions, 'customers_manage', 'READ')) {
    return <div className="p-8 text-center text-gray-500">אין הרשאת צפייה בלקוחות</div>
  }

  const canEditCustomer = hasPermission(role, permissions, 'customers_edit', 'FULL') || hasPermission(role, permissions, 'customers_manage', 'FULL')
  const canDeleteCustomer = hasPermission(role, permissions, 'customers_delete', 'FULL') || hasPermission(role, permissions, 'customers_manage', 'FULL')
  const canManageDebt = hasPermission(role, permissions, 'customers_financial', 'FULL') || hasPermission(role, permissions, 'customers_manage', 'FULL')
  const canCreateOrder = hasPermission(role, permissions, 'orders_create', 'READ')

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      type: true,
      orders: {
        where: { deletedAt: null },
        include: { 
          items: { include: { product: true } }, 
          deliveryArea: true,
          specialDate: true
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  const customerTypes = await prisma.customerType.findMany({
    select: { id: true, name: true }
  })

  const areas = await prisma.deliveryArea.findMany({
    select: { id: true, name: true },
    orderBy: { sortOrder: 'asc' }
  })

  if (!customer) {
    return <div className="p-8 text-center text-gray-500">הלקוח לא נמצא.</div>
  }

  return (
    <div className="h-full flex flex-col pt-1 pb-20">
      
      {/* Top Action Bar (Back, Add Order, Edit, Delete) */}
      <div className="flex items-center justify-end w-full gap-2 mb-2 pt-1 pb-1">
        {canDeleteCustomer && (
          <CustomerDeleteButton customerId={customer.id} />
        )}
        {canEditCustomer && (
          <CustomerEditModal customer={customer as any} customerTypes={customerTypes} areas={areas} />
        )}
        {canCreateOrder && (
          <Link 
            href={`/dashboard/orders/new?customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}&customerPhone=${customer.phone}&customerAddress=${encodeURIComponent(customer.address || '')}`}
            className="flex items-center justify-center w-7 h-7 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors"
            title="הזמנה חדשה"
          >
             <Plus className="w-4 h-4" />
          </Link>
        )}

        <BackButton />
      </div>

      <div className="flex items-start justify-between mb-3 gap-4">
        {/* Right Side: Identity */}
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-start">
            <div className="mb-1">
              {customer.type ? (
                <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">{customer.type.name}</span>
              ) : (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">רגיל</span>
              )}
            </div>
            
            {canEditCustomer ? (
              <CustomerEditModal customer={customer as any} customerTypes={customerTypes} areas={areas} triggerType="custom">
                <h1 className="text-3xl font-black text-gray-900 leading-none mb-1 group-hover:text-blue-600 transition-colors inline-block cursor-pointer" title="ערוך לקוח">{customer.name}</h1>
              </CustomerEditModal>
            ) : (
              <h1 className="text-3xl font-black text-gray-900 leading-none mb-1 inline-block">{customer.name}</h1>
            )}
            
            <div className="flex flex-col gap-0.5 text-sm text-gray-600 font-medium">
              <ClickToCallLink phone={customer.phone} className="hover:text-blue-600 hover:underline w-fit" />
              {customer.address && (
                <span>{customer.address}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Left Side: Balance & Controls */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <CustomerBalanceWidget 
            customerId={customer.id} 
            debt={customer.debt} 
            newOrderHref={canCreateOrder ? `/dashboard/orders/new?customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}&customerPhone=${customer.phone}&customerAddress=${encodeURIComponent(customer.address || '')}${customer.customerTypeId ? `&customerTypeId=${customer.customerTypeId}` : ''}` : undefined}
          />
        </div>
      </div>

      <CustomerOrdersList orders={customer.orders} customerDebt={customer.debt || 0} canEdit={canEditCustomer} />
    </div>
  )
}
