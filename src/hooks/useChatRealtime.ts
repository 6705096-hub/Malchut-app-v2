'use client'

/**
 * useChatRealtime — React hook for Pusher real-time chat subscriptions
 *
 * Usage:
 *   const { isConnected } = useChatRealtime({
 *     conversationId: 'abc123',
 *     onNewMessage: (msg) => setMessages(prev => [...prev, msg]),
 *     onStatusUpdated: (update) => updateMessageStatus(update),
 *   })
 *
 * Gracefully degrades to polling if NEXT_PUBLIC_PUSHER_KEY is not set.
 */

import { useEffect, useRef, useState } from 'react'

// Lazy-load Pusher client to avoid SSR issues
let PusherClient: any = null

interface ChatRealtimeOptions {
  conversationId: string | null
  onNewMessage?: (message: any) => void
  onStatusUpdated?: (update: {
    conversationId: string
    readByUserId: string
    readByName: string
    status: string
    updatedCount: number
    at: string
  }) => void
  onTyping?: (typingUsers: string[]) => void
  onMessageDeleted?: (data: { messageId: string; conversationId: string }) => void
  enabled?: boolean
}

interface UseChatRealtimeReturn {
  isConnected: boolean
  isPusherEnabled: boolean
}

export function useChatRealtime({
  conversationId,
  onNewMessage,
  onStatusUpdated,
  onTyping,
  onMessageDeleted,
  enabled = true,
}: ChatRealtimeOptions): UseChatRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<any>(null)
  const pusherRef  = useRef<any>(null)

  const pusherKey     = process.env.NEXT_PUBLIC_PUSHER_KEY
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu'
  const isPusherEnabled = Boolean(pusherKey)

  useEffect(() => {
    if (!enabled || !conversationId || !isPusherEnabled) return

    let mounted = true

    const init = async () => {
      // Lazy-load pusher-js only on client
      if (!PusherClient) {
        const mod = await import('pusher-js')
        PusherClient = mod.default
      }

      if (!mounted) return

      // Create Pusher instance (reuse if same key)
      if (!pusherRef.current) {
        pusherRef.current = new PusherClient(pusherKey, {
          cluster: pusherCluster,
          // Force TLS
          forceTLS: true,
        })

        pusherRef.current.connection.bind('connected', () => {
          if (mounted) setIsConnected(true)
        })
        pusherRef.current.connection.bind('disconnected', () => {
          if (mounted) setIsConnected(false)
        })
        pusherRef.current.connection.bind('error', (err: any) => {
          console.warn('Pusher connection error:', err)
        })
      }

      // Subscribe to conversation channel
      const channelName = `chat-conv-${conversationId}`
      channelRef.current = pusherRef.current.subscribe(channelName)

      // Bind events
      if (onNewMessage) {
        channelRef.current.bind('new-message', (data: any) => {
          if (mounted) onNewMessage(data)
        })
      }

      if (onStatusUpdated) {
        channelRef.current.bind('status-updated', (data: any) => {
          if (mounted) onStatusUpdated(data)
        })
      }

      if (onTyping) {
        channelRef.current.bind('typing', (data: any) => {
          if (mounted) onTyping(data.users || [])
        })
      }

      if (onMessageDeleted) {
        channelRef.current.bind('message-deleted', (data: any) => {
          if (mounted) onMessageDeleted(data)
        })
      }
    }

    init()

    return () => {
      mounted = false
      // Unsubscribe from channel when conversationId changes or component unmounts
      if (channelRef.current && pusherRef.current) {
        channelRef.current.unbind_all()
        pusherRef.current.unsubscribe(`chat-conv-${conversationId}`)
        channelRef.current = null
      }
    }
  }, [conversationId, enabled, isPusherEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup Pusher connection on unmount
  useEffect(() => {
    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect()
        pusherRef.current = null
      }
    }
  }, [])

  return { isConnected, isPusherEnabled }
}
