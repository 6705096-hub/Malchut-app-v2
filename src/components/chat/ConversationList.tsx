'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Users, MessageSquarePlus, ArrowRight, Search, Loader2, BellOff, Bell } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { isUserOnline, formatLastSeen } from '@/lib/onlineStatus'

interface ConversationPreview {
  id: string
  name: string | null
  image: string | null
  isGroup: boolean
  isMuted: boolean   // current user's mute status for this conversation
  participants: {
    userId: string
    name: string
    image: string | null
    role: string
    lastSeenAt: string | null
  }[]
  lastMessage: {
    id: string
    text: string | null
    senderName: string
    senderId: string
    attachmentType: string | null
    createdAt: string
  } | null
  unreadCount: number
  updatedAt: string
}

interface ConversationListProps {
  activeConversationId: string | null
  onSelectConversation: (id: string, name: string, image: string | null, isGroup: boolean) => void
  onStartNewDM: () => void
  theme?: 'light' | 'dark'
}

export function ConversationList({
  activeConversationId,
  onSelectConversation,
  onStartNewDM,
  theme = 'dark',
}: ConversationListProps) {
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id

  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [allowUserMute, setAllowUserMute] = useState(false)
  const currentUserRole = (session?.user as any)?.role

  // Fetch allowUserMute setting
  useEffect(() => {
    fetch('/api/settings/chat')
      .then(r => r.json())
      .then(d => setAllowUserMute(d.allowUserMute ?? false))
      .catch(() => {})
  }, [])

  // Fetch conversations
  useEffect(() => {
    let mounted = true
    const fetchConversations = async () => {
      try {
        const res = await fetch('/api/conversations')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (mounted) setConversations(data.conversations || [])
      } catch (e) {
        console.error('Error loading conversations:', e)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    fetchConversations()
    // Poll every 5 seconds for updates
    const interval = setInterval(fetchConversations, 5000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  // Get display name for DM conversations
  const getDisplayName = (conv: ConversationPreview) => {
    if (conv.isGroup) return conv.name || 'קבוצה'
    const otherParticipant = conv.participants.find(p => p.userId !== currentUserId)
    return otherParticipant?.name || 'שיחה פרטית'
  }

  const getDisplayImage = (conv: ConversationPreview) => {
    if (conv.isGroup) return conv.image
    const otherParticipant = conv.participants.find(p => p.userId !== currentUserId)
    return otherParticipant?.image || null
  }

  const getInitial = (name: string) => {
    return name?.charAt(0)?.toUpperCase() || '?'
  }

  const formatLastMessageTime = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    }
    if (diffDays === 1) return 'אתמול'
    if (diffDays < 7) {
      return date.toLocaleDateString('he-IL', { weekday: 'short' })
    }
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
  }

  const getLastMessagePreview = (conv: ConversationPreview) => {
    if (!conv.lastMessage) return 'אין הודעות עדיין'
    const prefix = conv.isGroup && conv.lastMessage.senderId !== currentUserId
      ? `${conv.lastMessage.senderName}: `
      : ''

    if (conv.lastMessage.attachmentType) {
      if (conv.lastMessage.attachmentType.startsWith('image')) return `${prefix}🖼️ תמונה`
      if (conv.lastMessage.attachmentType.startsWith('audio')) return `${prefix}🎤 הודעה קולית`
      if (conv.lastMessage.attachmentType === 'application/pdf') return `${prefix}📄 מסמך`
      return `${prefix}📎 קובץ`
    }

    return `${prefix}${conv.lastMessage.text || ''}`
  }

  // Filter by search
  const filtered = conversations.filter(conv => {
    if (!searchQuery.trim()) return true
    const name = getDisplayName(conv).toLowerCase()
    return name.includes(searchQuery.toLowerCase())
  })



  return (
    <div className={`flex flex-col h-full transition-colors ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-slate-50'}`}>
      {/* Search */}
      <div className={`p-3 shrink-0 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
        <div className={`flex items-center rounded-lg px-3 py-2 gap-2 focus-within:ring-1 focus-within:ring-teal-500/50 transition-all ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-200/50'}`}>
          <Search className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש שיחה..."
            className={`bg-transparent text-sm outline-none flex-1 ${theme === 'dark' ? 'text-slate-100 placeholder-slate-400' : 'text-slate-900 placeholder-slate-500'}`}
            dir="auto"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-12">
            {searchQuery ? 'לא נמצאו תוצאות' : 'אין שיחות עדיין'}
          </div>
        ) : (
          filtered.map((conv) => {
            const displayName = getDisplayName(conv)
            const displayImage = getDisplayImage(conv)
            const isActive = conv.id === activeConversationId

            return (
              <div
                key={conv.id}
                className={`flex items-center gap-3 px-3 py-3 transition-colors ${
                  isActive 
                    ? (theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200/60') 
                    : (theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100')
                } ${conv.isMuted ? 'opacity-70' : ''}`}
              >
                {/* Clickable area */}
                <button
                  onClick={() => onSelectConversation(conv.id, getDisplayName(conv), getDisplayImage(conv), conv.isGroup)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-right outline-none"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold overflow-hidden shadow-sm ${
                      conv.isGroup 
                        ? (theme === 'dark' ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-600') 
                        : (theme === 'dark' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700')
                    }`}>
                      {displayImage ? (
                        <img src={displayImage} alt="" className="w-full h-full object-cover" />
                      ) : conv.isGroup ? (
                        <Users className="w-6 h-6" />
                      ) : (
                        getInitial(displayName)
                      )}
                    </div>
                    {/* Online dot for DM */}
                    {!conv.isGroup && (() => {
                      const other = conv.participants.find(p => p.userId !== currentUserId)
                      return other && isUserOnline(other.lastSeenAt) ? (
                        <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 ${theme === 'dark' ? 'border-[#0B1120]' : 'border-white'}`} />
                      ) : null
                    })()}
                    {/* Muted indicator dot */}
                    {conv.isMuted && (
                      <span className={`absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full flex items-center justify-center border ${theme === 'dark' ? 'bg-slate-800 border-[#0B1120]' : 'bg-slate-200 border-white'}`}>
                        <BellOff className="w-2.5 h-2.5 text-slate-400" />
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className={`flex-1 min-w-0 border-b pb-3 pt-1 ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} group-last:border-0`}>
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className={`font-semibold text-sm truncate ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} ${conv.unreadCount > 0 ? (theme === 'dark' ? 'text-white font-bold' : 'text-black font-bold') : ''}`}>
                        {displayName}
                      </span>
                      {conv.lastMessage && (
                        <span className={`text-[10px] flex-shrink-0 mr-2 ${
                          conv.unreadCount > 0 ? 'text-teal-500 font-semibold' : (theme === 'dark' ? 'text-slate-400' : 'text-slate-500')
                        }`}>
                          {formatLastMessageTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className={`text-xs truncate max-w-[160px] ${conv.unreadCount > 0 ? (theme === 'dark' ? 'text-slate-200 font-medium' : 'text-slate-800 font-medium') : (theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}`}>
                        {conv.isMuted ? '🔇 מושתק' : getLastMessagePreview(conv)}
                      </span>
                      {conv.unreadCount > 0 && !conv.isMuted && (
                        <span className={`flex-shrink-0 mr-2 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${theme === 'dark' ? 'bg-teal-500 text-slate-900' : 'bg-teal-500 text-white'}`}>
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// New DM Selector — pick a user to start a private chat
// ──────────────────────────────────────────

interface NewDMSelectorProps {
  onSelectUser: (userId: string) => void
  onCancel: () => void
}

export function NewDMSelector({ onSelectUser, onCancel }: NewDMSelectorProps) {
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id

  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Reuse the team members data from conversations API or a users endpoint
        const res = await fetch('/api/conversations')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()

        // Collect unique users from all conversation participants
        const usersMap = new Map<string, any>()
        for (const conv of (data.conversations || [])) {
          for (const p of conv.participants) {
            if (p.userId !== currentUserId) {
              usersMap.set(p.userId, p)
            }
          }
        }

        // If no participants found, try fetching active users directly
        if (usersMap.size === 0) {
          const usersRes = await fetch('/api/users/pending')  // reuse existing endpoint
          if (usersRes.ok) {
            // This endpoint might not return what we need, so we handle gracefully
          }
        }

        setUsers(Array.from(usersMap.values()))
      } catch (e) {
        console.error('Error loading users:', e)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [currentUserId])

  const filtered = users.filter(u => {
    if (!searchQuery.trim()) return true
    return u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="flex flex-col h-full bg-[#111b21]">
      {/* Header */}
      <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-1.5 text-[#aebac1] hover:text-white transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <span className="text-white font-semibold text-base">שיחה חדשה</span>
      </div>

      {/* Search */}
      <div className="p-2">
        <div className="flex items-center bg-[#202c33] rounded-lg px-3 py-2 gap-2">
          <Search className="w-4 h-4 text-[#8696a0]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם..."
            className="bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] outline-none flex-1"
            dir="auto"
          />
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#00a884] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[#8696a0] text-sm py-12">
            {searchQuery ? 'לא נמצאו משתמשים' : 'אין משתמשים זמינים'}
          </div>
        ) : (
          filtered.map((user) => (
            <button
              key={user.userId}
              onClick={() => onSelectUser(user.userId)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#202c33] transition-colors"
            >
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-full bg-[#6a7175] flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                  {user.image ? (
                    <img src={user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user.name?.charAt(0)?.toUpperCase() || '?'
                  )}
                </div>
                {isUserOnline(user.lastSeenAt) && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full border-2 border-[#111b21]" />
                )}
              </div>
              <div className="flex-1 text-right">
                <div className="text-[#e9edef] font-medium text-sm">{user.name}</div>
                <div className={`text-xs mt-0.5 ${
                  isUserOnline(user.lastSeenAt) ? 'text-[#00a884]' : 'text-[#8696a0]'
                }`}>
                  {formatLastSeen(user.lastSeenAt)}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
