/**
 * Default Group Chat — "צוות מלכות קוגל"
 * 
 * Ensures a single default group conversation exists and all active
 * (non-PENDING) users are participants. Called lazily on first access.
 */
import prisma from '@/lib/prisma'

const DEFAULT_GROUP_NAME = 'צוות מלכות קוגל'
const DEFAULT_GROUP_DESCRIPTION = 'הקבוצה הראשית של צוות מלכות קייטרינג'

/**
 * Get or create the default group conversation.
 * Also syncs participants — adds any active users who aren't members yet.
 * Returns the conversationId.
 */
export async function getOrCreateDefaultGroup(): Promise<string> {
  // 1. Try to find existing default group
  let conversation = await prisma.conversation.findFirst({
    where: {
      isGroup: true,
      name: DEFAULT_GROUP_NAME,
    },
    select: { id: true, createdBy: true },
  })

  if (!conversation) {
    // 2. Find an ADMIN user to be the creator (fallback to first active user)
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    })

    const creatorId = adminUser?.id || (await prisma.user.findFirst({
      where: { isActive: true, role: { not: 'PENDING' } },
      select: { id: true },
    }))?.id

    if (!creatorId) {
      throw new Error('No active users found to create default group')
    }

    // 3. Create conversation + group in a transaction
    conversation = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          name: DEFAULT_GROUP_NAME,
          isGroup: true,
          createdBy: creatorId,
        },
      })

      await tx.group.create({
        data: {
          conversationId: conv.id,
          description: DEFAULT_GROUP_DESCRIPTION,
          createdBy: creatorId,
        },
      })

      return conv
    })
  }

  // 4. Sync participants — add any active non-PENDING users who aren't members yet
  const activeUsers = await prisma.user.findMany({
    where: { isActive: true, role: { not: 'PENDING' } },
    select: { id: true, role: true },
  })

  const existingParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId: conversation.id },
    select: { userId: true },
  })

  const existingIds = new Set(existingParticipants.map((p) => p.userId))

  const newMembers = activeUsers.filter((u) => !existingIds.has(u.id))

  if (newMembers.length > 0) {
    await prisma.conversationParticipant.createMany({
      data: newMembers.map((u) => ({
        conversationId: conversation!.id,
        userId: u.id,
        role: u.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
      })),
      skipDuplicates: true,
    })
  }

  return conversation.id
}
