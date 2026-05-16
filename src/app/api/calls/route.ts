import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Store calls in memory (for simplicity; in production use Redis or DB)
const callsStore = new Map<string, any>()

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions) as any
  const email = session?.user?.email
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Return any incoming call for this user
  const incomingCall = callsStore.get(`incoming-${user.id}`)
  if (incomingCall && Date.now() - incomingCall.timestamp < 30000) {
    return NextResponse.json({ incomingCall })
  }
  
  // Return call state if there is one
  const callState = callsStore.get(`state-${user.id}`)
  return NextResponse.json({ incomingCall: null, callState: callState || null })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions) as any
  const email = session?.user?.email
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const caller = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, image: true } })
  if (!caller) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { action, targetUserId, type, sdp, candidate, callId } = await req.json()

  if (action === 'initiate') {
    const id = `call-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const callData = {
      id,
      callerId: caller.id,
      callerName: caller.name,
      callerImage: caller.image,
      targetUserId,
      type, // 'audio' | 'video'
      timestamp: Date.now(),
      status: 'ringing'
    }
    callsStore.set(`incoming-${targetUserId}`, callData)
    callsStore.set(`call-${id}`, callData)
    return NextResponse.json({ success: true, callId: id })
  }

  if (action === 'answer') {
    const call = callsStore.get(`call-${callId}`)
    if (call) {
      call.status = 'answered'
      call.sdpAnswer = sdp
      callsStore.set(`call-${callId}`, call)
      callsStore.set(`state-${call.callerId}`, { ...call, sdpAnswer: sdp })
      callsStore.delete(`incoming-${call.targetUserId}`)
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'decline' || action === 'hangup') {
    const call = callsStore.get(`call-${callId}`)
    if (call) {
      callsStore.delete(`incoming-${call.targetUserId}`)
      callsStore.delete(`incoming-${call.callerId}`)
      callsStore.delete(`call-${callId}`)
      callsStore.delete(`state-${call.callerId}`)
      callsStore.delete(`state-${call.targetUserId}`)
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'offer') {
    const call = callsStore.get(`call-${callId}`)
    if (call) {
      call.sdpOffer = sdp
      callsStore.set(`call-${callId}`, call)
      callsStore.set(`offer-${call.targetUserId}`, { callId, sdp })
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'get-offer') {
    const offer = callsStore.get(`offer-${caller.id}`)
    return NextResponse.json({ offer: offer || null })
  }

  if (action === 'ice-candidate') {
    const call = callsStore.get(`call-${callId}`)
    if (call) {
      const otherId = call.callerId === caller.id ? call.targetUserId : call.callerId
      const existing = callsStore.get(`ice-${otherId}`) || []
      existing.push(candidate)
      callsStore.set(`ice-${otherId}`, existing)
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'get-ice') {
    const candidates = callsStore.get(`ice-${caller.id}`) || []
    callsStore.delete(`ice-${caller.id}`)
    return NextResponse.json({ candidates })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
