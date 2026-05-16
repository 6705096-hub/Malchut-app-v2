import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"; import { authOptions } from "@/lib/auth"
import { clearAndOverwriteSheet } from '@/lib/googleSheets'
import { applyOrderDataScope } from '@/lib/data-access'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role || 'VIEWER'
    if (!session || userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
      where: applyOrderDataScope(session, {}),
      include: {
        customer: true,
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const headers = [
      'מזהה הזמנה',
      'תאריך יצירה השמירה',
      'שם לקוח',
      'טלפון',
      'סוג הזמנה',
      'עיר',
      'כתובת',
      'סך הכל חויב (₪)',
      'הסכום ששולם בפועל (₪)',
      'תאריך משלוח',
      'סטטוס ביצוע',
      'הערות משלוח',
      'פירוט מוצרים'
    ]

    const data = orders.map(o => {
      let itemsString = ''
      if (o.items && Array.isArray(o.items)) {
        itemsString = o.items.map((i: any) => `${i.product?.name || 'מוצר'} (x${i.quantity})`).join(', ')
      }

      return [
        o.id,
        new Date(o.createdAt).toLocaleString('he-IL'),
        o.customer?.name || 'לא ידוע',
        o.customer?.phone || '',
        o.type || '',
        o.city || '',
        o.address || '',
        o.totalPrice || 0,
        o.paidAmount || 0,
        o.deliveryWeek || '',
        o.status || 'PLANNED',
        o.notes || '',
        itemsString
      ]
    })

    await clearAndOverwriteSheet('הזמנות גיבוי מלא', headers, data)

    return NextResponse.json({ success: true, count: orders.length })

  } catch (error: any) {
    if (error.message === 'GOOGLE_API_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'חסרות הגדרות חיבור למערכת Google Sheets של העסק.' }, { status: 400 })
    }
    console.error('Failed to sync orders to Google Sheets:', error)
    return NextResponse.json({ error: 'שגיאה בסנכרון ההזמנות לענן' }, { status: 500 })
  }
}
