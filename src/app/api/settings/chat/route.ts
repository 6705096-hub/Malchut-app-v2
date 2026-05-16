import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const SETTING_KEY = 'chat.allowUserMute'

// ──────────────────────────────────────────
// GET /api/settings/chat
// Returns global chat settings (readable by all authenticated users)
// ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY }
    })

    return NextResponse.json({
      allowUserMute: setting?.value === 'true'
    })
  } catch (error: any) {
    console.error('GET /api/settings/chat error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// ──────────────────────────────────────────
// PUT /api/settings/chat
// Update allowUserMute — ADMIN only
// Body: { allowUserMute: boolean }
// ──────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can change this setting
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    })
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can change this setting' }, { status: 403 })
    }

    const { allowUserMute } = await req.json()
    if (typeof allowUserMute !== 'boolean') {
      return NextResponse.json({ error: 'allowUserMute must be a boolean' }, { status: 400 })
    }

    // Upsert the setting
    await prisma.systemSetting.upsert({
      where:  { key: SETTING_KEY },
      update: { value: allowUserMute ? 'true' : 'false' },
      create: { key: SETTING_KEY, value: allowUserMute ? 'true' : 'false' }
    })

    return NextResponse.json({ allowUserMute })
  } catch (error: any) {
    console.error('PUT /api/settings/chat error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
