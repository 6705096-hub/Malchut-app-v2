'use client'

import React, { useState, useEffect } from 'react'
import useSWR from 'swr'
import { MessageCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { parsePermissions } from '@/lib/permissions'
import { TeamChatModal } from './TeamChatModal'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function GlobalTeamChatWidget() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  // Check if user is banned from chat
  const rawPerms = parsePermissions((session?.user as any)?.permissions) as any
  const isChatBanned = !!rawPerms?._chat?.isBanned

  // Restore open state across navigation
  useEffect(() => {
    const saved = sessionStorage.getItem('teamChatIsOpen')
    if (saved === 'true') setIsOpen(true)
  }, [])

  const handleSetIsOpen = (open: boolean) => {
    setIsOpen(open)
    sessionStorage.setItem('teamChatIsOpen', open ? 'true' : 'false')
  }

  // Poll total unread count from the new chat module
  const { data } = useSWR<{ conversations: { unreadCount: number }[] }>(
    '/api/conversations',
    fetcher,
    { refreshInterval: 10000, dedupingInterval: 10000 }
  )

  const unreadCount = (data?.conversations ?? []).reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0
  )

  const [initialInputText, setInitialInputText] = useState('')
  const [initialOrderContext, setInitialOrderContext] = useState<any>(null)

  // Global listener — other components can dispatch openTeamChat to open the modal
  useEffect(() => {
    const handleOpenChat = (e: any) => {
      handleSetIsOpen(true)
      if (e.detail?.text) setInitialInputText(e.detail.text)
      if (e.detail?.orderContext) setInitialOrderContext(e.detail.orderContext)
    }
    window.addEventListener('openTeamChat', handleOpenChat)
    return () => window.removeEventListener('openTeamChat', handleOpenChat)
  }, [])

  if (isChatBanned) return null

  return (
    <>
      {/* Floating Button — only visible when there are unread messages */}
      {!isOpen && unreadCount > 0 && (
        <div className="fixed bottom-6 right-4 z-[90] flex flex-col items-end">
          <button
            onClick={() => handleSetIsOpen(true)}
            className="relative w-14 h-14 bg-teal-500 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-teal-600 active:scale-95 transition-all duration-200 shadow-teal-500/40"
            aria-label="פתח צ׳אט צוות"
          >
            <MessageCircle className="w-7 h-7" />

            {/* Unread badge */}
            <div className="absolute -top-1 -left-1 bg-red-500 text-white text-[11px] font-bold min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full border-2 border-[#0B1120] shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          </button>
        </div>
      )}

      {/* The Team Chat Modal */}
      <TeamChatModal
        isOpen={isOpen}
        onClose={() => handleSetIsOpen(false)}
        initialInputText={initialInputText}
        onClearInitialInput={() => setInitialInputText('')}
        initialOrderContext={initialOrderContext}
        onClearInitialOrderContext={() => setInitialOrderContext(null)}
      />
    </>
  )
}
