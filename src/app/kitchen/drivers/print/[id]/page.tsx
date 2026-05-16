import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { format } from 'date-fns'
import { getHebrewDateString } from '@/lib/hebrewDate'

export const dynamic = 'force-dynamic'

export default async function PrintDriverPage({
  params,
  searchParams
}: {
  params: { id: string }
  searchParams: { dateStr?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const dateStr = searchParams.dateStr || format(new Date(), 'yyyy-MM-dd')

  const driver = await prisma.driver.findUnique({ where: { id: params.id } })
  if (!driver) return <div>נהג לא נמצא</div>

  // Get assignments
  const assignments = await prisma.driverOrderAssignment.findMany({
    where: { driverId: params.id, dateStr },
    orderBy: { sortOrder: 'asc' }
  })

  const orderIds = assignments.map(a => a.orderId)
  const orders = orderIds.length > 0 ? await prisma.order.findMany({
    where: { id: { in: orderIds }, deletedAt: null },
    include: {
      customer: { select: { name: true, phone: true, address: true } },
      items: { include: { product: { select: { id: true, name: true } } } }
    }
  }) : []

  // Re-sort
  const sortMap = Object.fromEntries(assignments.map(a => [a.orderId, a.sortOrder]))
  const sorted = orders.sort((a, b) => (sortMap[a.id] || 0) - (sortMap[b.id] || 0))

  // Cargo summary per product
  const productTotals: Record<string, { name: string; qty: number }> = {}
  for (const o of sorted) {
    for (const item of o.items) {
      if (!productTotals[item.productId]) productTotals[item.productId] = { name: item.product.name, qty: 0 }
      productTotals[item.productId].qty += item.quantity
    }
  }
  const cargoSummary = Object.values(productTotals).sort((a, b) => a.name.localeCompare(b.name, 'he'))

  const dateObj = new Date(dateStr + 'T12:00:00')
  const hebrewDate = getHebrewDateString(dateObj)

  return (
    <html lang="he" dir="rtl">
      <head>
        <title>{`מסלול ${driver.name} - ${hebrewDate}`}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; font-size: 13px; direction: rtl; color: #1a1a1a; background: #fff; }
          .header { border-bottom: 3px solid #1e293b; padding: 16px; margin-bottom: 16px; }
          .header h1 { font-size: 22px; font-weight: 900; }
          .header p { font-size: 12px; color: #666; margin-top: 4px; }
          .cargo { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
          .cargo h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 900; margin-bottom: 8px; }
          .cargo-grid { display: flex; flex-wrap: wrap; gap: 8px; }
          .cargo-item { background: white; border: 1.5px solid #1e293b; border-radius: 6px; padding: 6px 12px; font-weight: 900; font-size: 14px; }
          .orders-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 900; margin-bottom: 8px; }
          .order { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; page-break-inside: avoid; }
          .order-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
          .order-num { width: 24px; height: 24px; background: #1e293b; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; flex-shrink: 0; }
          .order-name { font-size: 16px; font-weight: 900; }
          .order-phone { font-size: 12px; color: #3b82f6; font-family: monospace; direction: ltr; }
          .order-address { font-size: 12px; color: #64748b; margin-bottom: 4px; margin-right: 32px; }
          .order-items { display: flex; flex-wrap: wrap; gap: 4px; margin-right: 32px; }
          .order-item { background: #f1f5f9; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 700; }
          .order-notes { margin-right: 32px; margin-top: 4px; font-size: 11px; color: #d97706; }
          .order-price { font-size: 13px; font-weight: 900; color: #1d4ed8; }
          .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; font-size: 11px; color: #94a3b8; }
          .sig-line { margin-top: 40px; border-top: 1px solid #64748b; width: 200px; padding-top: 6px; font-size: 11px; color: #64748b; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .no-print { display: none; }
          }
        `}</style>
      </head>
      <body>
        <button
          className="no-print"
          onClick={() => window.print()}
          style={{ position: 'fixed', top: 16, left: 16, background: '#1e293b', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 900, cursor: 'pointer', fontSize: 14 }}
        >הדפס</button>

        <div style={{ maxWidth: 700, margin: '0 auto', padding: 16 }}>
          <div className="header">
            <h1>מסלול חלוקה: {driver.name}</h1>
            <p>{hebrewDate} | {sorted.length} הזמנות</p>
          </div>

          {cargoSummary.length > 0 && (
            <div className="cargo">
              <h2>סיכום מה להכניס לרכב</h2>
              <div className="cargo-grid">
                {cargoSummary.map(item => (
                  <div key={item.name} className="cargo-item">
                    {item.name}: <strong>{item.qty}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="orders-title">רשימת הזמנות לפי סדר מסלול</div>

          {sorted.map((order, idx) => (
            <div key={order.id} className="order">
              <div className="order-header">
                <div className="order-num">{idx + 1}</div>
                <div>
                  <div className="order-name">{order.customer.name}</div>
                  <div className="order-phone">{order.customer.phone}</div>
                </div>
                <div style={{ marginRight: 'auto' }} className="order-price">₪{order.totalPrice}</div>
              </div>
              <div className="order-address">{order.address || order.customer.address || '—'}</div>
              <div className="order-items">
                {order.items.map(item => (
                  <span key={item.productId} className="order-item">
                    {item.product.name} ×{item.quantity}
                  </span>
                ))}
              </div>
              {order.notes && <div className="order-notes">📝 {order.notes}</div>}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 40, marginTop: 32 }}>
            <div className="sig-line">חתימת נהג</div>
            <div className="sig-line">חתימת מחלק</div>
          </div>

          <div className="footer">
            הודפס בתאריך {format(new Date(), 'dd/MM/yyyy HH:mm')}
          </div>
        </div>
      </body>
    </html>
  )
}
