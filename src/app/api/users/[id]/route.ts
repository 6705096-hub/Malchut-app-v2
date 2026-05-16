import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import webpush from 'web-push'

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin only' }, { status: 401 })
    }

    // Note: getSession in App Router doesn't always have session info when called like this easily unless we pass req? 
    // Wait, the existing code works, so we leave it.
    const reqBody = await req.json()
    const { role, isActive, permissions } = reqBody
    
    const thisUser = await prisma.user.findUnique({ 
      where: { id: params.id },
      include: { pushSubscriptions: true }
    })
    if (!thisUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Prevent removing the last admin (basic safety check)
    if (role !== 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1 && thisUser.role === 'ADMIN') {
        return NextResponse.json({ error: 'Cannot downgrade the last admin' }, { status: 400 })
      }
    }

    const updateData: any = {}
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive
    if (permissions !== undefined) {
      updateData.permissions = permissions
      updateData.isChatBanned = !!permissions?._chat?.isBanned
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData
    })
    
    // If the user was just approved from PENDING, send them a push notification
    if (thisUser.role === 'PENDING' && role && role !== 'PENDING' && thisUser.pushSubscriptions.length > 0) {
      try {
        const pushPayload = JSON.stringify({
          title: 'החשבון שלך אושר! 🎉',
          body: 'מנהל המערכת אישר את החשבון שלך. היכנס עכשיו כדי להתחיל לעבוד.',
          url: '/dashboard'
        })
        const pushPromises = thisUser.pushSubscriptions.map((sub: any) => 
          webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { auth: sub.auth, p256dh: sub.p256dh }
          }, pushPayload).catch((err: any) => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              return prisma.pushSubscription.delete({ where: { id: sub.id } })
            }
          })
        )
        await Promise.all(pushPromises)
      } catch (e) {
        console.error('Push error on user approval:', e)
      }
    }
    
    return NextResponse.json({ user }, { status: 200 })
  } catch (error) {
    console.error('Failed to update user role:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin only' }, { status: 401 })
    }

    const thisUser = await prisma.user.findUnique({ where: { id: params.id } })
    if (!thisUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (thisUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Cannot delete the last admin' }, { status: 400 })
      }
      if (thisUser.email === '6705096@gmail.com') {
        return NextResponse.json({ error: 'Cannot delete the root system administrator' }, { status: 400 })
      }
    }

    await prisma.user.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        name: thisUser.name ? `${thisUser.name} (נמחק)` : 'משתמש (נמחק)',
        role: 'PENDING'
      }
    })
    
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Failed to soft-delete user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
