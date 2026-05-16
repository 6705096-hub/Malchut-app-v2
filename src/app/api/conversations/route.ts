import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// ──────────────────────────────────────────
// GET /api/conversations
// List all conversations the current user is a participant in
// Returns: conversations with last message, unread count, participants
// ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all conversations where the user is a participant
    const participations = await prisma.conversationParticipant.findMany({
      where: { userId: currentUser.id },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: { id: true, name: true, image: true, role: true, lastSeenAt: true }
                }
              }
            },
            group: {
              select: { id: true, description: true }
            },
            // Get last message for preview
            messages: {
              where: { isDeleted: false },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        }
      }
    })

    // Build response with unread counts
    const conversations = await Promise.all(
      participations.map(async (p) => {
        const conv = p.conversation

        // Count unread messages (messages created after lastReadAt, not sent by current user)
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            isDeleted: false,
            senderId: { not: currentUser.id },
            ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {})
          }
        })

        const lastMessage = conv.messages[0] || null

        return {
          id: conv.id,
          name: conv.name,
          image: conv.image,
          isGroup: conv.isGroup,
          group: conv.group,
          participants: conv.participants.map(pp => ({
            userId: pp.user.id,
            name: pp.user.name,
            image: pp.user.image,
            role: pp.role,
            lastSeenAt: pp.user.lastSeenAt
          })),
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            text: lastMessage.text,
            senderName: lastMessage.sender.name,
            senderId: lastMessage.sender.id,
            attachmentType: lastMessage.attachmentType,
            createdAt: lastMessage.createdAt
          } : null,
          unreadCount,
          isMuted: p.isMuted,
          myRole: p.role,
          updatedAt: conv.updatedAt
        }
      })
    )

    // Sort by last activity (updatedAt descending)
    conversations.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    return NextResponse.json({ conversations })
  } catch (error: any) {
    console.error('GET /api/conversations error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// ──────────────────────────────────────────
// POST /api/conversations
// Create a new conversation (group or DM)
// Body for Group: { name, isGroup: true, participantIds: string[], description? }
// Body for DM:    { isGroup: false, participantIds: [otherUserId] }
// ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { name, isGroup, participantIds, description } = body

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: 'participantIds required' }, { status: 400 })
    }

    // For DM: check if a DM conversation already exists between these two users
    if (!isGroup && participantIds.length === 1) {
      const otherUserId = participantIds[0]

      const existingDM = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId: currentUser.id } } },
            { participants: { some: { userId: otherUserId } } }
          ]
        }
      })

      if (existingDM) {
        return NextResponse.json({ id: existingDM.id, alreadyExists: true })
      }
    }

    // For group: name is required
    if (isGroup && !name?.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
    }

    // Create conversation + participants in a transaction
    const conversation = await prisma.$transaction(async (tx) => {
      // 1. Create the conversation
      const conv = await tx.conversation.create({
        data: {
          name: isGroup ? name.trim() : null,
          isGroup: !!isGroup,
          createdBy: currentUser.id,
        }
      })

      // 2. If group, create Group metadata
      if (isGroup) {
        await tx.group.create({
          data: {
            conversationId: conv.id,
            description: description?.trim() || null,
            createdBy: currentUser.id
          }
        })
      }

      // 3. Add creator as ADMIN participant
      await tx.conversationParticipant.create({
        data: {
          conversationId: conv.id,
          userId: currentUser.id,
          role: 'ADMIN',
          lastReadAt: new Date()
        }
      })

      // 4. Add other participants as MEMBER
      for (const userId of participantIds) {
        if (userId === currentUser.id) continue // skip if creator included themselves
        await tx.conversationParticipant.create({
          data: {
            conversationId: conv.id,
            userId,
            role: 'MEMBER'
          }
        })
      }

      return conv
    })

    return NextResponse.json({
      id: conversation.id,
      name: conversation.name,
      isGroup: conversation.isGroup,
      createdAt: conversation.createdAt
    }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/conversations error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
