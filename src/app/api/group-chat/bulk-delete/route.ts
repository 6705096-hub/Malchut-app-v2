import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { hasPermission } from '@/lib/permissions'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isAdmin = currentUser.role === 'ADMIN'
    const { messageIds } = await req.json()

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Process each message
    for (const msgId of messageIds) {
      const msg = await prisma.groupMessage.findUnique({ where: { id: msgId } })
      if (!msg) continue

      const amIOwner = msg.userId === currentUser.id

      // If it's already deleted (by someone), we just hide it locally for this user
      if (msg.isDeleted) {
        if (!msg.hiddenFor.includes(currentUser.id)) {
          await prisma.groupMessage.update({
            where: { id: msgId },
            data: {
              hiddenFor: { push: currentUser.id }
            }
          })
        }
      } 
      // If it's not deleted, user can soft delete if owner or admin (deletes for everyone)
      else if (amIOwner || isAdmin) {
        // Soft delete (Delete for everyone)
        await prisma.groupMessage.update({
          where: { id: msgId },
          data: {
            content: 'הודעה זו נמחקה',
            isDeleted: true,
            attachmentData: null,
            attachmentType: null
          }
        })
      }
      // If they don't own it and aren't admin, they can only "Delete for me" (hide it)
      else {
        if (!msg.hiddenFor.includes(currentUser.id)) {
          await prisma.groupMessage.update({
            where: { id: msgId },
            data: {
              hiddenFor: { push: currentUser.id }
            }
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error bulk deleting messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
