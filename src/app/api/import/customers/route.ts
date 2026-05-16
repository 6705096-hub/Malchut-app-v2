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

    const rawData = await readSheet('לקוחות גיבוי מלא')
    
    if (!rawData || rawData.length <= 1) {
      return NextResponse.json({ error: 'הגיליון "לקוחות גיבוי מלא" ריק או לא קיים בגוגל שיטס' }, { status: 400 })
    }

    const headers = rawData[0]
    const nameIndex = headers.findIndex(h => h === 'שם הלקוח' || h === 'שםלקוח' || h === 'שם')
    const phoneIndex = headers.findIndex(h => h === 'טלפון' || h === 'מספר טלפון')
    const cityIndex = headers.findIndex(h => h === 'עיר')
    const addressIndex = headers.findIndex(h => h === 'כתובת')

    if (nameIndex === -1) {
      return NextResponse.json({ error: 'לא נמצאה עמודה בשם "שם הלקוח" בגיליון המקושר.' }, { status: 400 })
    }

    let importedCount = 0

    // Skip row 0 (headers)
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i]
      const name = row[nameIndex]
      let phone = phoneIndex !== -1 ? row[phoneIndex] : null
      const city = cityIndex !== -1 ? row[cityIndex] : null
      const address = addressIndex !== -1 ? row[addressIndex] : null

      if (!name) continue // Must have a name

      if (phone) {
        phone = phone.toString().replace(/[^0-9+]/g, '')
      }

      if (phone) {
        // Upsert by phone number if available
        await prisma.customer.upsert({
          where: { phone },
          update: {
            name: name,
            ...(address ? { address } : {}),
            ...(city ? { city } : {})
          },
          create: {
            name: name,
            phone: phone,
            address: address,
            city: city
          }
        })
        importedCount++
      } else {
        // If no phone, create a unique record anyway
        await prisma.customer.create({
          data: {
            name: name,
            phone: `NO_PHONE_${Math.floor(Math.random() * 100000)}`,
            address: address,
            city: city
          }
        })
        importedCount++
      }
    }

    return NextResponse.json({ success: true, count: importedCount })

  } catch (error: any) {
    if (error.message === 'GOOGLE_API_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'חסרות הגדרות חיבור למערכת Google Sheets.' }, { status: 400 })
    }
    console.error('Failed to import customers from Google Sheets:', error)
    return NextResponse.json({ error: 'שגיאה בקריאת הנתונים מהענן', details: error.message }, { status: 500 })
  }
}
