import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function GET(req: NextRequest) {
  try {
    const keys = {
      pub: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      priv: !!process.env.VAPID_PRIVATE_KEY
    }

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      include: { pushSubscriptions: true }
    })

    const payload = JSON.stringify({
      title: 'בדיקת מערכת! 🛠️',
      body: 'אם אתה רואה את זה השרת תקין 100%',
      url: '/'
    })

    const results = []

    for (const admin of admins) {
      if (admin.pushSubscriptions.length === 0) continue

      for (const sub of admin.pushSubscriptions) {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { auth: sub.auth, p256dh: sub.p256dh }
          }, payload)
          results.push({ user: admin.name, endpoint: sub.endpoint, status: 'SUCCESS' })
        } catch (e: any) {
          results.push({ user: admin.name, endpoint: sub.endpoint, status: 'FAILED', error: e?.body || e?.message || String(e) })
        }
      }
    }

    const lastRealPushAttempt = await prisma.systemSetting.findUnique({ where: { key: 'DEBUG_PUSH' } })

    return NextResponse.json({
      configuredKeys: keys,
      totalAdmins: admins.length,
      adminsWithSubs: admins.filter(a => a.pushSubscriptions.length > 0).length,
      lastRealPushAttempt: lastRealPushAttempt?.value || 'No data yet',
      results
    })
  } catch (error: any) {
    return NextResponse.json({ error: String(error), stack: error?.stack }, { status: 500 })
  }
}
