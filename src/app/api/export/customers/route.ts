import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"; import { authOptions } from "@/lib/auth"
import { clearAndOverwriteSheet } from '@/lib/googleSheets'
import { applyCustomerDataScope } from '@/lib/data-access'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role || 'VIEWER'
    if (!session || userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customers = await prisma.customer.findMany({
      where: applyCustomerDataScope(session, {}),
      include: {
        type: true
      },
      orderBy: { name: 'asc' }
    })

    const headers = [
      'מזהה מערכת',
      'שם הלקוח',
      'טלפון',
      'עיר',
      'כתובת',
      'סוג לקוח',
      'חוב מצטבר (₪)',
      'תאריך הצטרפות'
    ]

    const data = customers.map(c => [
      c.id,
      c.name,
      c.phone,
      c.city || '',
      c.address || '',
      c.type?.name || 'רגיל',
      c.debt || 0,
      new Date(c.createdAt).toLocaleDateString('he-IL')
    ])

    await clearAndOverwriteSheet('לקוחות גיבוי מלא', headers, data)

    return NextResponse.json({ success: true, count: customers.length })

  } catch (error: any) {
    if (error.message === 'GOOGLE_API_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'חסרות הגדרות חיבור למערכת Google Sheets של העסק.' }, { status: 400 })
    }
    console.error('Failed to sync customers to Google Sheets:', error)
    return NextResponse.json({ error: 'שגיאה בסנכרון הלקוחות לענן' }, { status: 500 })
  }
}
