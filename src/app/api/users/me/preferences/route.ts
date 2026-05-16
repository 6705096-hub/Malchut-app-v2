import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { notifyOnNewOrder, notifyOnNewUser } = await req.json()

    // Validate inputs
    if (typeof notifyOnNewOrder !== 'boolean' && typeof notifyOnNewUser !== 'boolean') {
      return NextResponse.json({ error: 'Missing preferences' }, { status: 400 })
    }

    const updateData: any = {}
    if (typeof notifyOnNewOrder === 'boolean') updateData.notifyOnNewOrder = notifyOnNewOrder
    if (typeof notifyOnNewUser === 'boolean') updateData.notifyOnNewUser = notifyOnNewUser

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    return NextResponse.json({ 
      success: true, 
      preferences: {
        notifyOnNewOrder: updatedUser.notifyOnNewOrder,
        notifyOnNewUser: updatedUser.notifyOnNewUser
      }
    })
  } catch (error) {
    console.error('Failed to update preferences:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { notifyOnNewOrder: true, notifyOnNewUser: true }
    })

    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
