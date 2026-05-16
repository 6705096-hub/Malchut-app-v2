import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as any
    const role = (session?.user as any)?.role
    const email = session?.user?.email

    if (!email) {
      await prisma.systemSetting.upsert({
        where: { key: 'DEBUG_DELETE_FAIL' },
        create: { key: 'DEBUG_DELETE_FAIL', value: `No email in session at ${new Date().toISOString()}` },
        update: { value: `No email in session at ${new Date().toISOString()}` }
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.systemSetting.upsert({
      where: { key: 'DEBUG_DELETE_HIT' },
      create: { key: 'DEBUG_DELETE_HIT', value: `Hit by ${email} for msg ${params.id} at ${new Date().toISOString()}` },
      update: { value: `Hit by ${email} for msg ${params.id} at ${new Date().toISOString()}` }
    })

    const message = await prisma.groupMessage.findUnique({
      where: { id: params.id },
      include: { user: true }
    })

    if (!message) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isOwnMessage = message.user?.email === email
    const isAdmin = role === 'ADMIN'

    if (!isOwnMessage && !isAdmin) {
      await prisma.systemSetting.upsert({
        where: { key: 'DEBUG_DELETE_FAIL' },
        create: { key: 'DEBUG_DELETE_FAIL', value: `Forbidden for ${email} on msg ${message.user?.email} at ${new Date().toISOString()}` },
        update: { value: `Forbidden for ${email} on msg ${message.user?.email} at ${new Date().toISOString()}` }
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (message.isDeleted) {
      // Clear any replies pointing to this message to avoid foreign key constraint error
      await prisma.groupMessage.updateMany({
        where: { replyToId: params.id },
        data: { replyToId: null }
      })
      // Manually delete receipts to avoid constraints if cascade is not set in DB
      await prisma.messageReceipt.deleteMany({
        where: { messageId: params.id }
      })
      // Hard delete if it was already soft-deleted
      await prisma.groupMessage.delete({
        where: { id: params.id }
      })
    } else {
      // Soft delete
      await prisma.groupMessage.update({
        where: { id: params.id },
        data: { isDeleted: true, content: '🚫 הודעה זו נמחקה' } 
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE MESSAGE ERROR:', error)
    await prisma.systemSetting.upsert({
      where: { key: 'DEBUG_DELETE_ERROR' },
      create: { key: 'DEBUG_DELETE_ERROR', value: `${error.message} at ${new Date().toISOString()}` },
      update: { value: `${error.message} at ${new Date().toISOString()}` }
    })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as any
    const email = session?.user?.email

    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content } = await req.json()

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Empty content' }, { status: 400 })
    }

    const message = await prisma.groupMessage.findUnique({
      where: { id: params.id },
      include: { user: true }
    })

    if (!message) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isOwnMessage = message.user.email === email

    // Only the owner can edit their message
    if (!isOwnMessage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.groupMessage.update({
      where: { id: params.id },
      data: { 
        content: content.trim(),
        isEdited: true 
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
