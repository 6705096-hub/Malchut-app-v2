/**
 * chatAuth — shared authentication + authorization helpers for chat API routes.
 * 
 * DRYs up the repeated session/user/participant checks across all chat routes.
 */

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string | null
  role: string
  isChatBanned: boolean
}

/**
 * Authenticate the current session and return the user.
 * Returns { user } on success, { error } on failure.
 */
export async function authenticateChatUser(): Promise<
  { user: AuthenticatedUser; error?: never } | { user?: never; error: NextResponse }
> {
  const session = await getServerSession(authOptions) as any
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true, role: true, isChatBanned: true, isActive: true }
  })

  if (!user) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
  }

  if (!user.isActive) {
    return { error: NextResponse.json({ error: 'Account is deactivated' }, { status: 403 }) }
  }

  if (user.isChatBanned) {
    return { error: NextResponse.json({ error: 'You are banned from chat' }, { status: 403 }) }
  }

  return { user: { id: user.id, email: user.email!, name: user.name, role: user.role, isChatBanned: user.isChatBanned } }
}

/**
 * Verify that a user is a participant of a conversation.
 * Returns { participant } on success, { error } on failure.
 */
export async function verifyParticipant(
  conversationId: string,
  userId: string
): Promise<
  { participant: { role: string; isMuted: boolean }; error?: never } |
  { participant?: never; error: NextResponse }
> {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId }
    },
    select: { role: true, isMuted: true }
  })

  if (!participant) {
    return {
      error: NextResponse.json(
        { error: 'Not a participant of this conversation' },
        { status: 403 }
      )
    }
  }

  return { participant }
}

/**
 * Sanitize message text — strip dangerous characters, limit length.
 */
const MAX_TEXT_LENGTH = 5000

export function sanitizeMessageText(text: string | null | undefined): string | null {
  if (!text) return null
  // Trim and limit length
  let clean = text.trim().slice(0, MAX_TEXT_LENGTH)
  // Remove null bytes
  clean = clean.replace(/\0/g, '')
  return clean || null
}

/**
 * Simple in-memory rate limiter for chat routes.
 * Limits per userId to prevent spam.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_WINDOW_MS = 10_000  // 10 seconds
const RATE_LIMIT_MAX_REQUESTS = 30   // max 30 requests per 10s per user

export function checkRateLimit(userId: string): NextResponse | null {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return null // allowed
  }

  entry.count++
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait.' },
      { status: 429 }
    )
  }

  return null // allowed
}

// Cleanup old entries periodically (every 60s)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) rateLimitMap.delete(key)
    }
  }, 60_000)
}
