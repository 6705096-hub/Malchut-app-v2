import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { phone, userPhone } = await req.json()
    if (!phone) return NextResponse.json({ error: 'Missing customer phone' }, { status: 400 })
    
    // Find the current user in DB
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let finalUserPhone = user.phone

    // If a new phone is provided (first time setup), save it!
    if (userPhone && userPhone !== finalUserPhone) {
      await prisma.user.update({
        where: { email: user.email ?? undefined },
        data: { phone: userPhone }
      })
      finalUserPhone = userPhone
    }

    if (!finalUserPhone) {
      return NextResponse.json({ error: 'MISSING_USER_PHONE' }, { status: 400 })
    }

    const token = process.env.YEMOT_TOKEN
    
    if (!token) {
      return NextResponse.json({ error: 'חסר טוקן של ימות המשיח במערכת. אנא הגדר YEMOT_TOKEN בקובץ .env' }, { status: 400 })
    }

    // Clean phone numbers (remove hyphens, spaces, etc.)
    const cleanUserPhone = finalUserPhone.replace(/\D/g, '')
    const cleanCustomerPhone = phone.replace(/\D/g, '')

    // CreateBridgeCall bridging the User and the Customer.
    // NOTE: We cannot use callerId=phone because Yemot blocks spoofing on this account ("callerId Not Allow In customer").
    const url = `https://www.call2all.co.il/ym/api/CreateBridgeCall?token=${token}&Phones=${cleanUserPhone}&BridgePhones=${cleanCustomerPhone}`
    
    console.log('Sending to Yemot:', url)
    const yemotRes = await fetch(url)
    const textRes = await yemotRes.text()
    
    let yemotData;
    try {
      yemotData = JSON.parse(textRes)
      console.log('Yemot Res JSON:', yemotData)
      if (yemotData.responseStatus === 'Exception') {
         return NextResponse.json({ error: 'שגיאה מימות המשיח: ' + yemotData.message }, { status: 400 })
      }
    } catch (e) {
      console.log('Yemot Res Text (Not JSON):', textRes)
      throw new Error('Yemot returned invalid JSON: ' + textRes)
    }
    
    return NextResponse.json({ success: true, message: `השיחה יוצאת אליך למספר ${cleanUserPhone}, ענה כדי לחייג ללקוח!` })
  } catch (error: any) {
    console.error('API Call Failed:', error)
    return NextResponse.json({ error: 'Call failed', details: error.message || String(error) }, { status: 500 })
  }
}
