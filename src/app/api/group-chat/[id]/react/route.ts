import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as any
    const email = session?.user?.email
    const currentUserId = session?.user?.id

    if (!email || !currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { emoji } = await req.json()

    if (!emoji) {
      return NextResponse.json({ error: 'Missing emoji' }, { status: 400 })
    }

    const message = await prisma.groupMessage.findUnique({
      where: { id: params.id }
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Parse existing reactions
    let reactions: any[] = []
    if (message.reactions && typeof message.reactions === 'string') {
        try { reactions = JSON.parse(message.reactions as string) } catch(e){}
    } else if (Array.isArray(message.reactions)) {
        reactions = message.reactions
    }

    // Check if user already reacted with THIS emoji
    const existingIndex = reactions.findIndex(r => r.userId === currentUserId)
    
    if (existingIndex !== -1) {
        if (reactions[existingIndex].emoji === emoji) {
           // Toggle off if clicking the same emoji
           reactions.splice(existingIndex, 1)
        } else {
           // Change emoji
           reactions[existingIndex].emoji = emoji
        }
    } else {
        // Add new reaction
        reactions.push({ userId: currentUserId, emoji, userName: session.user.name })
    }

    await prisma.groupMessage.update({
      where: { id: params.id },
      data: { reactions }
    })

    return NextResponse.json({ success: true, reactions })
  } catch (error: any) {
    console.error('Failed to react', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
