'use client'

import React, { useState, useEffect } from 'react'
import { X, Users, ArrowRight, Loader, User, Search, Phone, Video, MessageSquarePlus, Settings } from 'lucide-react'
import { ChatView } from './chat/ChatView'
import { ConversationList, NewDMSelector } from './chat/ConversationList'

import { ChatSettings } from './chat/ChatSettings'
import { useSession } from 'next-auth/react'

type TeamChatModalProps = {
  isOpen: boolean
  onClose: () => void
  initialInputText?: string
  onClearInitialInput?: () => void
  initialOrderContext?: any
  onClearInitialOrderContext?: () => void
}

type View = 'conversations' | 'chat' | 'new-dm' | 'settings'

export function TeamChatModal({
  isOpen,
  onClose,
  initialInputText,
  onClearInitialInput,
  initialOrderContext,
  onClearInitialOrderContext,
}: TeamChatModalProps) {
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id

  const [view, setView] = useState<View>(() => {
    if (typeof window !== 'undefined') {
      return (sessionStorage.getItem('teamChatView') as View) || 'conversations'
    }
    return 'conversations'
  })
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('teamChatActiveId') || null
    return null
  })
  const [activeConversationName, setActiveConversationName] = useState<string>(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('teamChatActiveName') || ''
    return ''
  })
  const [activeConversationImage, setActiveConversationImage] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('teamChatActiveImage') || null
    return null
  })
  const [activeIsGroup, setActiveIsGroup] = useState(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('teamChatActiveIsGroup') === 'true'
    return false
  })
  const [defaultGroupId, setDefaultGroupId] = useState<string | null>(null)
  const [isLoadingGroup, setIsLoadingGroup] = useState(false)
  const [isCreatingDM, setIsCreatingDM] = useState(false)
  const [theme, setTheme] = useState<'light'|'dark'>('dark')

  // Sync state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('teamChatView', view)
    if (activeConversationId) sessionStorage.setItem('teamChatActiveId', activeConversationId)
    else sessionStorage.removeItem('teamChatActiveId')
    
    sessionStorage.setItem('teamChatActiveName', activeConversationName)
    if (activeConversationImage) sessionStorage.setItem('teamChatActiveImage', activeConversationImage)
    else sessionStorage.removeItem('teamChatActiveImage')
    
    sessionStorage.setItem('teamChatActiveIsGroup', activeIsGroup ? 'true' : 'false')
  }, [view, activeConversationId, activeConversationName, activeConversationImage, activeIsGroup])

  useEffect(() => {
    const savedTheme = localStorage.getItem('chatTheme') as 'light' | 'dark' | null
    if (savedTheme) setTheme(savedTheme)
    
    const handleThemeUpdate = () => {
      setTheme((localStorage.getItem('chatTheme') as 'light' | 'dark') || 'dark')
    }
    window.addEventListener('chatThemeUpdated', handleThemeUpdate)
    return () => window.removeEventListener('chatThemeUpdated', handleThemeUpdate)
  }, [])

  // Fetch default group on mount
  useEffect(() => {
    if (!isOpen) return
    if (defaultGroupId) return

    let mounted = true
    const fetchDefaultGroup = async () => {
      setIsLoadingGroup(true)
      try {
        const res = await fetch('/api/conversations/default-group')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (mounted) {
          setDefaultGroupId(data.conversationId)
        }
      } catch (e) {
        console.error('Error fetching default group:', e)
      } finally {
        if (mounted) setIsLoadingGroup(false)
      }
    }

    fetchDefaultGroup()
    return () => { mounted = false }
  }, [isOpen, defaultGroupId])

  // Clear initial props
  useEffect(() => {
    if (isOpen && initialInputText) onClearInitialInput?.()
    if (isOpen && initialOrderContext) onClearInitialOrderContext?.()
  }, [isOpen, initialInputText, initialOrderContext, onClearInitialInput, onClearInitialOrderContext])

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = 'auto' }
  }, [isOpen])

  const handleSelectConversation = (id: string, name?: string, image?: string | null, isGroup?: boolean) => {
    setActiveConversationId(id)
    setActiveConversationName(name || '')
    setActiveConversationImage(image || null)
    setActiveIsGroup(isGroup ?? false)
    setView('chat')
  }

  const handleStartDM = async (targetUserId: string) => {
    setIsCreatingDM(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isGroup: false,
          participantIds: [targetUserId],
        }),
      })

      if (!res.ok) throw new Error('Failed to create conversation')
      const data = await res.json()

      setActiveConversationId(data.id)
      setView('chat')
    } catch (e) {
      console.error('Error creating DM:', e)
    } finally {
      setIsCreatingDM(false)
    }
  }

  const handleBackToList = () => {
    setView('conversations')
    setActiveConversationId(null)
  }

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 sm:left-auto sm:right-0 sm:w-[500px] sm:h-[100dvh] sm:border-l z-[120] flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl overflow-hidden transition-colors ${theme === 'dark' ? 'bg-[#0B1120] border-white/10' : 'bg-slate-50 border-slate-200'}`}>

      {/* ── HEADER ── */}
      <div className={`backdrop-blur-md px-4 py-3 flex items-center justify-between border-b shrink-0 z-10 transition-colors ${theme === 'dark' ? 'bg-[#0F172A]/80 border-white/10' : 'bg-white/90 border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-3">
          {/* Back arrow when not in conversations list */}
          {view !== 'conversations' && (
            <button
              onClick={handleBackToList}
              className={`p-2 -ml-2 rounded-full transition-colors active:scale-95 ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          {/* Avatar: real image or initials/icon */}
          <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 overflow-hidden">
            {view === 'chat' && activeConversationImage ? (
              <img src={activeConversationImage} alt="" className="w-full h-full object-cover" />
            ) : view === 'chat' && !activeIsGroup && activeConversationName ? (
              <span className="text-teal-300 font-bold text-base">{activeConversationName.charAt(0)}</span>
            ) : view === 'chat' && activeIsGroup ? (
              <Users className="w-5 h-5 text-teal-400" />
            ) : (
              <Users className="w-5 h-5 text-teal-400" />
            )}
          </div>

          <div className="flex flex-col justify-center">
            <h2 className={`font-semibold text-base leading-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
              {view === 'conversations' && 'צ׳אטים'}
              {view === 'new-dm' && 'שיחה חדשה'}
              {view === 'settings' && 'הגדרות'}
              {view === 'chat' && (activeConversationName || 'שיחה')}
            </h2>
            {view === 'conversations' && (
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>צוות מלכות קוגל</span>
            )}
            {view === 'chat' && (
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`}>
                {activeIsGroup ? `קבוצה` : 'נראה לאחרונה היום ב-10:42'}
              </span>
            )}
          </div>
        </div>

          {/* Right side: action icons */}
          <div className="flex items-center gap-1">
            {view === 'conversations' && (
              <button
                onClick={() => setView('settings')}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/10 active:scale-95"
                aria-label="הגדרות"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            {view === 'chat' && (
              <>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('chatToggleSearch'))}
                  className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/10 active:scale-95"
                  aria-label="חיפוש הודעות"
                >
                  <Search className="w-5 h-5" />
                </button>
                <button
                  className="p-2 text-slate-400 hover:text-teal-400 transition-colors rounded-full hover:bg-white/10 active:scale-95"
                  aria-label="שיחה קולית"
                  onClick={async () => {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                      alert('מיקרופון פעיל — שיחה קולית בפיתוח')
                      stream.getTracks().forEach(t => t.stop())
                    } catch { alert('אין גישה למיקרופון') }
                  }}
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  className="p-2 text-slate-400 hover:text-teal-400 transition-colors rounded-full hover:bg-white/10 active:scale-95"
                  aria-label="שיחת וידאו"
                  onClick={async () => {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
                      alert('מצלמה ומיקרופון פעילים — שיחת וידאו בפיתוח')
                      stream.getTracks().forEach(t => t.stop())
                    } catch { alert('אין גישה למצלמה') }
                  }}
                >
                  <Video className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/10 active:scale-95"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isLoadingGroup ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader className="w-8 h-8 text-teal-500 animate-spin" />
            <span className="text-slate-400 text-sm">טוען...</span>
          </div>
        ) : isCreatingDM ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader className="w-8 h-8 text-teal-500 animate-spin" />
            <span className="text-slate-400 text-sm">יוצר שיחה פרטית...</span>
          </div>
        ) : view === 'conversations' ? (
          <div className="flex-1 flex flex-col overflow-hidden relative">

            <ConversationList
              theme={theme}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              onStartNewDM={() => setView('new-dm')}
            />
            {/* Floating New DM button */}
            <button
              onClick={() => setView('new-dm')}
              className="absolute bottom-4 left-4 w-12 h-12 bg-teal-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-teal-600 active:scale-95 transition-all shadow-teal-500/30 z-10"
              aria-label="שיחה חדשה"
            >
              <MessageSquarePlus className="w-5 h-5" />
            </button>
          </div>
        ) : view === 'new-dm' ? (
          <NewDMSelector
            onSelectUser={handleStartDM}
            onCancel={() => setView('conversations')}
          />
        ) : view === 'chat' && activeConversationId ? (
          <ChatView conversationId={activeConversationId} theme={theme} />
        ) : view === 'settings' ? (
          <ChatSettings onClose={() => setView('conversations')} />
        ) : null}
      </div>
    </div>
  )
}
