import { clearAndOverwriteSheet } from './googleSheets'
import prisma from '@/lib/prisma'
import { startOfWeek, addDays, format } from 'date-fns'

const dayNameToIndex: Record<string, number> = {
  'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Shabbat': 6
}

function getExactDeliveryDate(createdAt: Date, deliveryDay: string, deliveryWeek: string): Date {
  if (!deliveryWeek) return new Date(createdAt)
  if (deliveryWeek.includes('-')) {
    return new Date(`${deliveryWeek}T12:00:00`)
  }
  const sundayOfCreationWeek = startOfWeek(new Date(createdAt), { weekStartsOn: 0 })
  const weekOffset = deliveryWeek === 'NEXT_WEEK' ? 7 : 0
  const dayOffset = dayNameToIndex[deliveryDay] ?? 0
  return addDays(sundayOfCreationWeek, weekOffset + dayOffset)
}

export async function syncActiveOrdersToExcel() {
  try {
    // Fetch ALL orders
    const allOrders = await prisma.order.findMany({
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
      'יתרת חוב כללית ללקוח (₪)',
      'תאריך משלוח',
      'הערות משלוח',
      'פירוט מוצרים'
    ]

    const data = allOrders.map(o => {
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
        o.customer?.debt || 0,
        o.deliveryWeek ? format(getExactDeliveryDate(o.createdAt, o.deliveryDay, o.deliveryWeek), 'dd/MM/yyyy') : '',
        o.notes || '',
        itemsString
      ]
    })

    // Overwrite the Google Sheet
    await clearAndOverwriteSheet('גיבוי הזמנות אוטומטי', headers, data)
    console.log(`[BACKUP] Successfully live-synced ${allOrders.length} orders to Google Sheets.`)

  } catch (err: any) {
    if (err.message === 'GOOGLE_API_NOT_CONFIGURED') {
      console.warn('[BACKUP SKIPPED] Google Sheets API not configured yet.')
    } else {
      console.error('[BACKUP ERROR] Failed to sync to Google Sheets:', err.message)
    }
  }
}
