import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"; import { authOptions } from "@/lib/auth"
import { readSheet } from '@/lib/googleSheets'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role || 'VIEWER'
    if (!session || userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawData = await readSheet('הזמנות גיבוי מלא')
    
    if (!rawData || rawData.length <= 1) {
      return NextResponse.json({ error: 'הגיליון "הזמנות גיבוי מלא" ריק או לא קיים בגוגל שיטס' }, { status: 400 })
    }

    const headers = rawData[0]
    
    // Find column indices dynamically
    const idIndex = headers.indexOf('מזהה הזמנה')
    const customerNameIndex = headers.indexOf('שם לקוח')
    const phoneIndex = headers.indexOf('טלפון')
    const typeIndex = headers.indexOf('סוג הזמנה')
    const cityIndex = headers.indexOf('עיר')
    const addressIndex = headers.indexOf('כתובת')
    const totalIndex = headers.indexOf('סך הכל חויב (₪)')
    const deliveryWeekIndex = headers.indexOf('תאריך משלוח')
    const statusIndex = headers.indexOf('סטטוס ביצוע')
    const notesIndex = headers.indexOf('הערות משלוח')
    const itemsIndex = headers.indexOf('פירוט מוצרים')

    let importedCount = 0

    // Begin looping rows
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i]
      if (!row || row.length === 0) continue

      const orderId = idIndex !== -1 ? row[idIndex] : undefined
      const customerName = customerNameIndex !== -1 ? row[customerNameIndex] : null
      let phone = phoneIndex !== -1 ? row[phoneIndex] : null
      const type = typeIndex !== -1 ? row[typeIndex] : 'DELIVERY'
      const city = cityIndex !== -1 ? row[cityIndex] : null
      const address = addressIndex !== -1 ? row[addressIndex] : null
      const totalPrice = totalIndex !== -1 ? parseFloat(row[totalIndex]) : 0
      const deliveryWeek = deliveryWeekIndex !== -1 ? row[deliveryWeekIndex] : ''
      const status = statusIndex !== -1 ? row[statusIndex] : 'PLANNED'
      const originalNotes = notesIndex !== -1 ? row[notesIndex] : ''
      const rawItemsText = itemsIndex !== -1 ? row[itemsIndex] : ''

      if (!customerName) continue // Skip if incredibly corrupted

      if (phone) {
        phone = phone.toString().replace(/[^0-9+]/g, '')
      }

      // Phase 1: Ensure Customer Exists
      let customerId = ''
      if (phone) {
        let existingCust = await prisma.customer.findUnique({ where: { phone } })
        if (!existingCust) {
          existingCust = await prisma.customer.create({
            data: { name: customerName, phone, city, address }
          })
        }
        customerId = existingCust.id
      } else {
        // Fallback create dummy customer
        const fallbackCust = await prisma.customer.create({
          data: { name: customerName, phone: `NO_PHONE_${Math.floor(Math.random() * 100000)}`, city, address }
        })
        customerId = fallbackCust.id
      }

      // Phase 2: Upsert Order
      // Since we can't reliably map raw text back to variant objects, we enforce preserving the exact items text into Notes!
      const combinedNotes = `[שוחזר מגיבוי]: מוצרים -> ${rawItemsText}\n${originalNotes}`.trim()
      
      const payloadData = {
        customerId,
        type: type || 'DELIVERY',
        city,
        address,
        totalPrice: isNaN(totalPrice) ? 0 : totalPrice,
        deliveryWeek: deliveryWeek || null,
        status: status === 'EXECUTED' ? 'EXECUTED' : 'PLANNED',
        notes: combinedNotes,
        createdById: (session.user as any).id
      }

      if (orderId && typeof orderId === 'string' && orderId.length > 5) {
        const existingOrder = await prisma.order.findUnique({ where: { id: orderId } })
        if (existingOrder) {
          await prisma.order.update({
            where: { id: orderId },
            data: payloadData as any
          })
          importedCount++
          continue
        }
      }

      // Default Create
      await prisma.order.create({
        data: { ...payloadData, deliveryDay: 'Unknown' } as any
      })
      importedCount++
    }

    return NextResponse.json({ success: true, count: importedCount })

  } catch (error: any) {
    if (error.message === 'GOOGLE_API_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'חסרות הגדרות חיבור למערכת Google Sheets.' }, { status: 400 })
    }
    console.error('Failed to import orders from Google Sheets:', error)
    return NextResponse.json({ error: 'שגיאה בייבוא נתונים', details: error.message }, { status: 500 })
  }
}
