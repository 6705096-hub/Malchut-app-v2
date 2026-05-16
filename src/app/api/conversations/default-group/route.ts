import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateDefaultGroup } from '@/lib/defaultGroup'

export const dynamic = 'force-dynamic'

// ──────────────────────────────────────────
// GET /api/conversations/default-group
// Returns the default group conversationId (creates it if needed)
// ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversationId = await getOrCreateDefaultGroup()

    return NextResponse.json({ conversationId })
  } catch (error: any) {
    console.error('GET /api/conversations/default-group error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
