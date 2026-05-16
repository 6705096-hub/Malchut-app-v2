"use client"

import React, { useState, useRef, useEffect } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { useSession } from 'next-auth/react'
import { 
  Search, MoreVertical, Paperclip, Smile, Mic, Send, 
  Check, CheckCheck, ArrowLeft, Image as ImageIcon,
  Reply, CornerDownLeft, Phone, Video, Info, X, Play, Pause,
  Download, Star, Trash2, Copy, Forward, Camera, BarChart2, FileText, Pin
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

type MessageReceipt = {
  id: string
  userId: string
  user: { name: string }
  readAt: string | null
  playedAt: string | null
}

type MessageNode = {
  id: string
  content: string
  attachmentData?: string
  attachmentType?: string
  createdAt: string
  isDeleted: boolean
  isEdited: boolean
  userId?: string
  targetUserId?: string
  user: { id: string, name: string, role: string, image: string | null }
  replyTo?: { id: string | null, content: string, user: { name: string } }
  receipts?: MessageReceipt[]
  reactions?: any
  isPinned?: boolean
  mentionedUsers?: any
}

type Reaction = { emoji: string; count: number; userReacted: boolean }

interface Chat {
  id: string
  name: string
  avatar: string
  isGroup: boolean
  isOnline: boolean
  lastSeen?: string
  unreadCount: number
  isTyping?: boolean
  messages: MessageNode[]
}

export default function RealWhatsAppCloneUI() {
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id || 'me'
  const currentEmail = session?.user?.email
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  // --- Real Data Fetching ---
  const { data = { messages: [], totalActiveUsers: 0, teamMembers: [], typingUsers: [] }, mutate } = useSWR<{messages: MessageNode[], totalActiveUsers: number, teamMembers: any[], typingUsers: string[]}>(
    '/api/group-chat', 
    fetcher, 
    { refreshInterval: 5000 }
  )
  const messages = data.messages || []
  const totalActiveUsers = data.totalActiveUsers || 0
  const teamMembers = data.teamMembers || []
  const typingUsers = data.typingUsers || []

  const [searchQuery, setSearchQuery] = useState('')
  const [inputText, setInputText] = useState('')
  const [replyingTo, setReplyingTo] = useState<MessageNode | null>(null)
  const [contextMenu, setContextMenu] = useState<{msg: MessageNode, x: number, y: number} | null>(null)
  const [showRightPanel, setShowRightPanel] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Map real data to "Chat" format for the left pane
  // In the real system, we only have one group chat right now: "צוות מלכות קוגל"
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  
  // Create chats list
  const chats: Chat[] = [
    {
      id: 'group_main',
      name: 'צוות מלכות קוגל',
      avatar: '👑',
      isGroup: true,
      isOnline: true, // Always online
      unreadCount: messages.filter(m => !m.targetUserId && m.user.id !== currentUserId && !m.receipts?.find(r => r.userId === currentUserId)).length,
      isTyping: typingUsers.length > 0,
      messages: messages.filter(m => !m.targetUserId)
    },
    ...teamMembers.filter(u => u.id !== currentUserId).map(u => {
      const userMsgs = messages.filter(m => m.targetUserId === u.id || (m.userId === u.id && m.targetUserId === currentUserId));
      return {
        id: u.id,
        name: u.name,
        avatar: u.image || u.name[0],
        isGroup: false,
        isOnline: true,
        unreadCount: userMsgs.filter(m => m.user.id !== currentUserId && !m.receipts?.find(r => r.userId === currentUserId)).length,
        messages: userMsgs
      };
    })
  ]

  const [showNewChat, setShowNewChat] = useState(false)

  // Sort chats so the ones with the most recent messages are at the top
  chats.sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]
    const bLast = b.messages[b.messages.length - 1]
    if (!aLast && !bLast) return 0
    if (!aLast) return 1
    if (!bLast) return -1
    return new Date(bLast.createdAt).getTime() - new Date(aLast.createdAt).getTime()
  })

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0]
  
  // Only show chats that have messages, are the group, or are currently active
  const activeChats = chats.filter(c => c.messages.length > 0 || c.isGroup || c.id === activeChatId)
  const filteredChats = activeChats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Mark as read when active
  useEffect(() => {
    if (activeChatId && activeChat && activeChat.messages.length > 0) {
      const unreadIds = activeChat.messages
        .filter(m => m.user.id !== currentUserId && !m.receipts?.find(r => r.userId === currentUserId))
        .map(m => m.id)
        
      if (unreadIds.length > 0) {
        fetch('/api/group-chat/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageIds: unreadIds })
        }).then(() => mutate())
      }
    }
  }, [activeChat, currentUserId, mutate, activeChatId])

  // Click outside context menu to close
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value)
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      fetch('/api/group-chat/typing', { method: 'POST' }).catch(() => {})
    }, 500);
  }

  const sendPayload = async (payload: any, optimisticMsg: any) => {
    const finalPayload = { ...payload }
    if (!activeChat.isGroup) {
      finalPayload.targetUserId = activeChat.id
    }

    mutate({ messages: [...messages, optimisticMsg] as any, totalActiveUsers, teamMembers, typingUsers }, false)
    setInputText('')
    setReplyingTo(null)

    await fetch('/api/group-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalPayload)
    })
    mutate()
  }

  const handleSendMessage = () => {
    if (!inputText.trim()) return

    const optimisticMsg = {
      id: 'temp-' + Date.now(),
      content: inputText,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      isEdited: false,
      user: { id: currentUserId, name: session?.user?.name || 'אני', email: currentEmail },
      targetUserId: !activeChat.isGroup ? activeChat.id : null,
      replyTo: replyingTo ? { content: replyingTo.content, user: { name: replyingTo.user?.name || 'מישהו' } } : null,
      receipts: []
    }

    sendPayload({ content: inputText, replyToId: replyingTo?.id }, optimisticMsg)
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    // Optimistic update
    fetch(`/api/group-chat/${messageId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji })
    }).then(() => mutate())
  }

  const handleDelete = async (messageId: string) => {
    try {
      await fetch('/api/group-chat/bulk-delete', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: [messageId] })
      })
      mutate()
    } catch(e: any) {}
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
        const base64 = ev.target?.result as string
        const optimisticMsg = {
          id: 'temp-' + Date.now(),
          content: 'תמונה מצורפת',
          attachmentData: base64,
          attachmentType: 'image/jpeg',
          createdAt: new Date().toISOString(),
          isDeleted: false,
          isEdited: false,
          user: { id: currentUserId, name: session?.user?.name || 'אני' },
          receipts: []
        }
        sendPayload({ attachmentData: base64, attachmentType: 'image/jpeg', content: '' }, optimisticMsg)
        setShowAttachmentMenu(false)
    }
    reader.readAsDataURL(file)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob); 
          reader.onloadend = () => {
            const base64 = reader.result as string;
            const optimisticMsg = {
              id: 'temp-' + Date.now(),
              content: '',
              attachmentData: base64,
              attachmentType: 'audio/webm',
              createdAt: new Date().toISOString(),
              isDeleted: false,
              isEdited: false,
              user: { id: currentUserId, name: session?.user?.name || 'אני' },
              receipts: []
            }
            sendPayload({ attachmentData: base64, attachmentType: 'audio/webm' }, optimisticMsg)
          }
        }
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch(err) {
      alert("נא לאשר גישה למיקרופון")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const formatChatTime = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'אתמול'
    }
    return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const renderMessageStatus = (msg: MessageNode, isGroup: boolean) => {
    if (msg.id.startsWith('temp-')) return <Check size={14} className="text-[#8696a0]" />
    
    const readReceipts = msg.receipts?.filter(r => r.userId !== msg.user.id) || []
    const readCount = readReceipts.filter(r => r.readAt !== null && r.readAt !== undefined).length
    const isAllRead = isGroup 
      ? (totalActiveUsers > 1 && readCount >= (totalActiveUsers - 1))
      : (readCount > 0)
    
    if (isAllRead) return <CheckCheck size={14} className="text-[#53bdeb]" />
    // If it's delivered but not read, show 2 grey ticks.
    return <CheckCheck size={14} className="text-[#8696a0]" />
  }

  const getMessageById = (id?: string | null) => {
    if (!id) return null
    return messages.find(m => m.id === id)
  }

  const handleContextMenu = (e: React.MouseEvent, msg: MessageNode) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ msg, x: e.clientX, y: e.clientY })
  }

  // --- Touch Handlers for Mobile (Swipe to Reply & Long Press) ---
  const touchStartX = useRef<number | null>(null)
  const touchCurrentX = useRef<number | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const [swipedMsgId, setSwipedMsgId] = useState<string | null>(null)

  const onMsgTouchStart = (e: React.TouchEvent, msg: MessageNode) => {
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
    
    longPressTimer.current = setTimeout(() => {
      // Trigger context menu on long press
      const touch = e.touches[0]
      setContextMenu({ msg, x: touch.clientX, y: touch.clientY })
      if (navigator.vibrate) navigator.vibrate(50)
      touchStartX.current = null // cancel swipe if long pressed
    }, 500)
  }

  const onMsgTouchMove = (e: React.TouchEvent, msg: MessageNode) => {
    if (touchStartX.current === null) return
    touchCurrentX.current = e.touches[0].clientX
    
    const diffX = touchCurrentX.current - touchStartX.current
    
    // If moved more than 10px, it's a swipe, so cancel long press
    if (Math.abs(diffX) > 10 && longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    // Swiped left (in RTL, swiping right means diffX > 0, but let's just trigger on diffX > 40)
    if (diffX > 50) {
      setSwipedMsgId(msg.id)
    } else {
      setSwipedMsgId(null)
    }
  }

  const onMsgTouchEnd = (e: React.TouchEvent, msg: MessageNode) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    
    if (swipedMsgId === msg.id) {
      setReplyingTo(msg)
      if (navigator.vibrate) navigator.vibrate(50)
    }
    
    setSwipedMsgId(null)
    touchStartX.current = null
    touchCurrentX.current = null
  }

  return (
    <div className="flex h-[100dvh] w-full bg-[#111b21] text-[#e9edef] overflow-hidden" dir="rtl">
      
      {/* --- LEFT PANE: CHATS LIST --- */}
      <div className={`flex flex-col border-l border-[#222d34] transition-all duration-300 w-full md:w-[350px] lg:w-[400px] shrink-0 z-20 relative overflow-hidden ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* --- New Chat Sliding Panel --- */}
        <div className={`absolute inset-0 bg-[#111b21] z-30 flex flex-col transition-transform duration-300 ${showNewChat ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-end px-5 pb-4 h-[108px] bg-[#202c33] shrink-0 shadow-sm text-[#e9edef]">
            <div className="flex items-center gap-6">
              <button onClick={() => setShowNewChat(false)} className="hover:bg-[#374248] p-2 rounded-full transition-colors active:scale-95"><ArrowLeft size={24} /></button>
              <span className="text-[19px] font-medium">שיחה חדשה</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="py-2">
              {teamMembers.filter(u => u.id !== currentUserId).map(u => (
                <div 
                  key={u.id}
                  onClick={() => { setActiveChatId(u.id); setShowNewChat(false) }}
                  className="flex items-center px-4 py-3 hover:bg-[#202c33] cursor-pointer transition-colors"
                >
                  <div className="w-[48px] h-[48px] rounded-full bg-[#6a7175] flex items-center justify-center text-xl shrink-0 overflow-hidden">
                    {u.image ? <img src={u.image} alt="avatar" className="w-full h-full object-cover" /> : u.name[0]}
                  </div>
                  <div className="flex-1 ml-4 border-b border-[#222d34] pb-3 pt-1">
                    <span className="font-normal text-[17px] text-[#e9edef]">{u.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 h-[60px] bg-[#202c33] shrink-0 border-b border-[#222d34]">
          <div className="w-10 h-10 rounded-full bg-[#6a7175] flex items-center justify-center text-xl overflow-hidden shadow-sm border border-[#2a3942]">
            {(session?.user?.name || 'א')[0]}
          </div>
          <div className="flex items-center gap-2 text-[#aebac1]">
            <button className="hover:bg-[#374248] p-2 rounded-full transition-colors active:scale-95" onClick={() => setShowNewChat(true)}>
              <svg viewBox="0 0 24 24" width="24" height="24" className="fill-current"><path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z"></path></svg>
            </button>
            <button className="hover:bg-[#374248] p-2 rounded-full transition-colors active:scale-95"><MoreVertical size={20} /></button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 bg-[#111b21]">
          <div className="flex items-center bg-[#202c33] rounded-lg px-3 py-1.5 focus-within:bg-[#111b21] focus-within:border-[#00a884] border-b-2 border-transparent transition-all shadow-inner">
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="text-[#00a884] ml-3 shrink-0 rotate-180 hover:bg-[#202c33] rounded-full p-1"><ArrowLeft size={18} /></button>
            ) : (
              <Search size={18} className="text-[#8696a0] ml-3 shrink-0" />
            )}
            <input 
              type="text" 
              placeholder="חיפוש או התחלת שיחה חדשה"
              className="bg-transparent w-full outline-none text-[15px] placeholder-[#8696a0] py-1"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto bg-[#111b21] custom-scrollbar">
          {filteredChats.map((chat) => {
            const lastMsg = chat.messages[chat.messages.length - 1]
            const isSelected = activeChatId === chat.id
            const timeStr = lastMsg?.createdAt ? formatChatTime(lastMsg.createdAt) : ''
            return (
              <div 
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`flex items-center px-3 py-3 cursor-pointer transition-colors group relative ${isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}
              >
                <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center text-2xl shrink-0 bg-[#6a7175] shadow-sm relative overflow-hidden">
                  {chat.avatar.length > 2 ? <img src={chat.avatar} alt="avatar" className="w-full h-full object-cover" /> : chat.avatar}
                  {chat.isOnline && !chat.isGroup && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] border-2 border-[#111b21] rounded-full z-10" />
                  )}
                </div>
                <div className="flex-1 ml-4 border-b border-[#222d34] pb-3 pt-1 w-full min-w-0 pr-4 group-last:border-b-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-normal text-[17px] truncate text-[#e9edef]">{chat.name}</span>
                    <span className={`text-xs font-medium ${chat.unreadCount > 0 ? 'text-[#00a884]' : 'text-[#8696a0]'}`}>
                      {timeStr}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-[14px] text-[#8696a0] truncate flex items-center gap-1 min-w-0">
                      {chat.isTyping ? (
                         <span className="text-[#00a884] font-medium animate-pulse">מקליד/ה...</span>
                      ) : (
                        <>
                          {lastMsg?.user.id === currentUserId && renderMessageStatus(lastMsg, chat.isGroup)}
                          {lastMsg?.attachmentType?.startsWith('image') && <><ImageIcon size={14} className="ml-1" /> תמונה</>}
                          {lastMsg?.attachmentType?.startsWith('audio') && <><Mic size={14} className="ml-1 text-[#00a884]" /> הודעה קולית</>}
                          {lastMsg?.attachmentType === 'application/pdf' && <><FileText size={14} className="ml-1" /> מסמך</>}
                          {(!lastMsg?.attachmentType) && <span className="truncate">{lastMsg?.content}</span>}
                        </>
                      )}
                    </div>
                    {chat.unreadCount > 0 && (
                      <div className="bg-[#00a884] text-[#111b21] text-[12px] font-bold h-[20px] min-w-[20px] rounded-full flex items-center justify-center px-1.5 ml-1 mt-0.5 shadow-sm">
                        {chat.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* --- RIGHT PANE: ACTIVE CHAT --- */}
      <div className={`flex-1 flex flex-col relative bg-[#0b141a] transition-all duration-300 ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Active Chat Header */}
        <div className="flex items-center justify-between px-4 h-[60px] bg-[#202c33] shrink-0 border-l border-[#222d34] z-10 shadow-sm relative">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-[#aebac1] hover:bg-[#374248] p-2 rounded-full" onClick={() => setActiveChatId(null)}>
              <ArrowLeft size={20} />
            </button>
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-[#6a7175] cursor-pointer shadow-sm hover:opacity-90 shrink-0"
              onClick={() => setShowRightPanel(true)}
            >
              {activeChat.avatar}
            </div>
            <div className="flex flex-col cursor-pointer min-w-0" onClick={() => setShowRightPanel(true)}>
              <span className="font-normal text-[16px] text-[#e9edef] truncate">{activeChat.name}</span>
              <span className="text-[13px] text-[#8696a0] truncate">
                {activeChat.isTyping ? <span className="text-[#00a884] font-medium">מקליד/ה...</span> : activeChat.isGroup ? `${totalActiveUsers} מחוברים כעת` : 'פעיל כעת'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[#aebac1]">
            <button className="hover:bg-[#374248] p-2.5 rounded-full transition-colors active:scale-95 hidden sm:block"><Search size={19} /></button>
            <button className="hover:bg-[#374248] p-2.5 rounded-full transition-colors active:scale-95" onClick={() => setShowRightPanel(!showRightPanel)}><MoreVertical size={20} /></button>
          </div>
        </div>

        {/* Main Chat Body (Split if right panel is open) */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Messages Area */}
          <div 
            className="flex-1 flex flex-col overflow-y-auto px-[5%] sm:px-[10%] pt-4 pb-12 custom-scrollbar relative z-0 scroll-smooth"
            style={{
              backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
              backgroundSize: '400px',
              backgroundBlendMode: 'overlay',
              backgroundColor: 'rgba(11, 20, 26, 0.95)'
            }}
          >
            {/* Encryption Warning */}
            <div className="flex justify-center mb-6 mt-4">
              <span className="bg-[#182229] border border-[#ffd279]/20 text-[#ffd279] text-[12.5px] px-4 py-2 rounded-lg shadow-sm text-center max-w-sm flex items-center justify-center gap-2">
                <span className="text-[10px]">🔒</span> ההודעות בשיחה זו מאובטחות מקצה לקצה. אף אחד מחוץ לצ'אט לא יכול לקרוא או להאזין להן.
              </span>
            </div>

            {activeChat.messages.filter(m => !m.isDeleted).map((msg, idx) => {
              const prevMsg = idx > 0 ? activeChat.messages[idx - 1] : null
              const msgDate = new Date(msg.createdAt).toDateString()
              const prevDate = prevMsg ? new Date(prevMsg.createdAt).toDateString() : ''
              const isFirstOfDay = msgDate !== prevDate

              const isMine = msg.user.id === currentUserId
              const isContinuous = prevMsg && prevMsg.user.id === msg.user.id && !isFirstOfDay
              
              let replyMsg = null
              if (msg.replyTo) replyMsg = { content: msg.replyTo.content, user: msg.replyTo.user }

              return (
                <React.Fragment key={msg.id}>
                  {isFirstOfDay && (
                    <div className="flex justify-center mb-6 mt-2 sticky top-2 z-10 opacity-90 pointer-events-none">
                      <span className="bg-[#182229] border border-[#2a3942] text-[#8696a0] text-[12px] font-medium px-3 py-1.5 rounded-lg shadow-sm backdrop-blur-sm uppercase tracking-wide">
                        {new Date(msg.createdAt).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                  )}

                  <div 
                    className={`flex flex-col mb-1 group relative w-full transition-transform ${swipedMsgId === msg.id ? 'translate-x-12' : ''} ${isMine ? 'items-start' : 'items-end'} ${!isContinuous ? 'mt-2.5' : ''}`}
                    onTouchStart={(e) => onMsgTouchStart(e, msg)}
                    onTouchMove={(e) => onMsgTouchMove(e, msg)}
                    onTouchEnd={(e) => onMsgTouchEnd(e, msg)}
                  >
                    <div className={`relative max-w-[85%] md:max-w-[70%] rounded-[8px] shadow-sm flex flex-col ${isMine ? 'bg-[#005c4b]' : 'bg-[#202c33]'}`}
                         style={{ 
                           borderTopRightRadius: isMine && !isContinuous ? '0px' : '8px',
                           borderTopLeftRadius: !isMine && !isContinuous ? '0px' : '8px',
                         }}
                         onContextMenu={(e) => handleContextMenu(e, msg)}
                    >
                      {/* CSS Triangle tail */}
                      {!isContinuous && (
                        <div className={`absolute top-0 w-2 h-3 ${isMine ? '-right-2 text-[#005c4b]' : '-left-2 text-[#202c33]'}`}>
                          <svg viewBox="0 0 8 13" width="8" height="13" className="fill-current">
                            {isMine ? (
                               <path opacity=".13" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                            ) : (
                               <path opacity=".13" d="M1.533 3.568L8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path>
                            )}
                            {isMine ? (
                               <path d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"></path>
                            ) : (
                               <path d="M1.533 2.568L8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"></path>
                            )}
                          </svg>
                        </div>
                      )}

                      {!isMine && !isContinuous && (
                         <span className="text-[12.5px] font-bold text-[#e9edef] px-2.5 pt-1.5 pb-0 opacity-80">{msg.user.name}</span>
                      )}

                      {/* Quoted Reply */}
                      {replyMsg && (
                        <div className="px-1.5 pt-1.5 pb-0.5">
                          <div className={`flex flex-col p-2.5 pb-2 rounded-[5px] bg-black/20 border-r-4 cursor-pointer hover:bg-black/30 transition-colors ${isMine ? 'border-[#53bdeb]' : 'border-[#bc68c8]'}`}>
                            <span className={`text-[12.5px] font-bold leading-tight mb-1 ${isMine ? 'text-[#53bdeb]' : 'text-[#bc68c8]'}`}>
                              {replyMsg.user?.name}
                            </span>
                            <span className="text-[13px] text-[#e9edef]/80 line-clamp-3 leading-snug">
                              {replyMsg.content || 'מדיה'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Media rendering */}
                      {msg.attachmentType?.startsWith('image') && msg.attachmentData && (
                        <div className="p-1 pb-0">
                          <img src={msg.attachmentData} alt="Media" className="rounded-md max-w-full h-auto max-h-[300px] object-cover border border-[#ffffff10]" />
                        </div>
                      )}

                      {msg.attachmentType === 'application/pdf' && (
                         <div className="flex items-center gap-3 bg-black/20 p-3 m-1 rounded-md border border-[#ffffff10]">
                           <div className="bg-[#bc68c8] text-white p-2.5 rounded-full"><FileText size={20} /></div>
                           <div className="flex flex-col">
                             <span className="text-[14px] font-medium text-[#e9edef]">{msg.content || 'PDF'}</span>
                           </div>
                         </div>
                      )}

                      {msg.attachmentType?.startsWith('audio') && (
                         <div className="flex items-center gap-3 p-3 min-w-[240px]">
                            <audio controls src={msg.attachmentData} className="w-full h-10 custom-audio" />
                         </div>
                      )}

                      {/* Text Content */}
                      {msg.content && !msg.attachmentType?.startsWith('audio') && (
                        <div className={`relative text-[15px] leading-[20px] whitespace-pre-wrap break-words pl-2 text-[#e9edef] ${msg.attachmentType ? 'px-2 pb-1.5' : 'px-2.5 pt-1.5 pb-2'}`}>
                          <span>{msg.content}</span>
                          <span className="inline-block w-[60px] h-3"></span> {/* Spacer for time */}
                          
                          {/* Timestamp & Ticks */}
                          <div className="absolute bottom-1 left-2 flex items-center gap-1 opacity-80 select-none" dir="ltr">
                              <span className="text-[11px] font-medium leading-none mt-0.5 text-[#ffffff99]">
                                {new Date(msg.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMine && renderMessageStatus(msg, activeChat.isGroup)}
                          </div>
                        </div>
                      )}

                      {!msg.content && (
                        <div className="absolute bottom-1 left-2 flex items-center gap-1 opacity-80 select-none bg-black/30 px-1.5 py-0.5 rounded-full" dir="ltr">
                            <span className="text-[11px] font-medium leading-none mt-0.5 text-white">
                              {new Date(msg.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMine && renderMessageStatus(msg, activeChat.isGroup)}
                        </div>
                      )}
                      
                      {/* Quick Context Menu Trigger */}
                      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div 
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-gradient-to-r from-transparent to-[#005c4b] cursor-pointer"
                          style={{ backgroundImage: isMine ? 'linear-gradient(to right, transparent, #005c4b 40%)' : 'linear-gradient(to right, transparent, #202c33 40%)' }}
                          onClick={(e) => handleContextMenu(e, msg)}
                        >
                          <svg viewBox="0 0 19 20" width="19" height="20" className="fill-current text-[#ffffff99] rotate-180"><path d="M3.8 6.7l5.7 5.7 5.7-5.7 1.6 1.6-7.3 7.2-7.3-7.2 1.6-1.6z"></path></svg>
                        </div>
                      </div>

                    </div>

                    {/* Reactions Display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`flex items-center gap-1 -mt-2.5 z-10 ${isMine ? 'mr-2' : 'ml-2'}`}>
                        <div className="flex items-center bg-[#202c33] border border-[#2a3942] rounded-full px-1.5 py-0.5 shadow-md text-[13px] cursor-pointer hover:bg-[#2a3942] transition-colors gap-0.5">
                          {msg.reactions.map((r: any, i: number) => <span key={i} className="hover:scale-125 transition-transform">{r.emoji}</span>)}
                          {msg.reactions.reduce((sum: number, r: any) => sum + r.count, 0) > 1 && (
                            <span className="text-[#8696a0] font-bold text-[11px] px-1">{msg.reactions.reduce((sum: number, r: any) => sum + r.count, 0)}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              )
            })}
            <div ref={messagesEndRef} className="h-6" />
          </div>

          {/* Chat Input Area */}
          <div className="bg-[#202c33] px-4 py-2.5 flex flex-col shrink-0 relative z-20 w-full shadow-[0_-1px_3px_rgba(0,0,0,0.2)]">
            
            {/* Reply Preview Box */}
            {replyingTo && (
              <div className="bg-[#202c33] w-full flex mb-2 pb-2">
                <div className="flex-1 bg-[#2a3942] rounded-lg p-2.5 border-r-[5px] border-[#00a884] flex items-center justify-between shadow-sm relative overflow-hidden">
                   <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[#00a884] text-[13px] font-bold mb-1">{replyingTo.user.id === currentUserId ? 'את/ה' : replyingTo.user.name}</span>
                      <span className="text-[#8696a0] text-[13px] truncate">{replyingTo.content || 'מדיה'}</span>
                   </div>
                   <button onClick={() => setReplyingTo(null)} className="text-[#8696a0] hover:text-[#e9edef] p-1.5 rounded-full hover:bg-[#374248] transition-colors absolute top-1.5 left-1.5">
                     <X size={16} />
                   </button>
                </div>
              </div>
            )}

            <div className="flex items-end gap-2 sm:gap-4 min-h-[44px]">
              <div className="flex gap-1 text-[#8696a0] mb-1.5 shrink-0 relative">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-[#374248] rounded-full transition-colors active:scale-95"><Paperclip size={24} /></button>
              </div>
              
              <div className="flex-1 bg-[#2a3942] rounded-[24px] relative flex items-end shadow-sm border border-transparent focus-within:border-[#374248] px-2 min-h-[48px]">
                <textarea 
                  value={inputText}
                  onChange={e => {
                    handleInputChange(e)
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="הודעה"
                  className="w-full bg-transparent text-[#e9edef] placeholder-[#8696a0] text-[16px] px-2 py-3 outline-none resize-none max-h-32 min-h-[44px] custom-scrollbar leading-[22px]"
                  style={{ height: '44px' }}
                />
              </div>
              
              <div className="mb-0.5 shrink-0 flex items-end h-full">
                {inputText.trim() ? (
                  <button 
                    onClick={handleSendMessage}
                    className="w-[48px] h-[48px] bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center transition-colors rounded-full shadow-md active:scale-95"
                  >
                    <Send size={20} className="mr-1" />
                  </button>
                ) : isRecording ? (
                   <button 
                    onClick={stopRecording}
                    className="w-[48px] h-[48px] bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors rounded-full shadow-md active:scale-95 animate-pulse"
                  >
                    <Check size={20} />
                  </button>
                ) : (
                  <button 
                    onClick={startRecording}
                    className="w-[48px] h-[48px] bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center transition-colors rounded-full shadow-md active:scale-95"
                  >
                    <Mic size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* --- Right Info Panel (Sliding) --- */}
          <div className={`absolute top-0 bottom-0 left-0 w-full sm:w-[350px] bg-[#111b21] shadow-2xl transition-transform duration-300 transform ${showRightPanel ? 'translate-x-0' : '-translate-x-full'} z-30 border-r border-[#222d34] flex flex-col`}>
            <div className="flex items-center gap-6 px-5 h-[60px] bg-[#202c33] shrink-0 shadow-sm">
              <button onClick={() => setShowRightPanel(false)} className="text-[#8696a0] hover:text-[#e9edef] active:scale-95 transition-all"><X size={24} /></button>
              <span className="font-normal text-[16px]">פרטי הקבוצה</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="flex flex-col items-center justify-center p-8 bg-[#111b21] shadow-sm mb-2">
                <div className="w-[200px] h-[200px] rounded-full bg-[#6a7175] flex items-center justify-center text-[80px] shadow-lg mb-6">{activeChat.avatar}</div>
                <h2 className="text-[24px] font-normal text-[#e9edef]">{activeChat.name}</h2>
                <span className="text-[#8696a0] text-[15px] mt-1">קבוצה · {totalActiveUsers} מחוברים</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* --- Context Menu (Right Click / Hover Menu) --- */}
      {contextMenu && (
        <div 
          className="fixed inset-0 z-50 bg-transparent"
          onContextMenu={e => e.preventDefault()}
        >
          <div 
            className="absolute bg-[#233138] border border-[#2a3942] rounded-lg shadow-2xl py-2 min-w-[180px] backdrop-blur-md"
            style={{ 
              top: `${Math.min(contextMenu.y, window.innerHeight - 250)}px`, 
              left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px` 
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Quick Reactions */}
            <div className="flex items-center justify-between px-4 pb-2 mb-2 border-b border-[#2a3942]">
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                <button 
                  key={emoji}
                  className="text-xl hover:scale-125 transition-transform focus:outline-none p-1"
                  onClick={() => {
                    handleAddReaction(contextMenu.msg.id, emoji)
                    setContextMenu(null)
                  }}
                >{emoji}</button>
              ))}
            </div>
            {/* Menu Items */}
            <ul className="text-[#e9edef] text-[15px]">
              <li className="px-5 py-2 hover:bg-[#182229] cursor-pointer transition-colors flex items-center justify-between" onClick={() => { setReplyingTo(contextMenu.msg); setContextMenu(null) }}>השב <Reply size={18} className="text-[#8696a0]" /></li>
              <li className="px-5 py-2 hover:bg-[#182229] cursor-pointer transition-colors flex items-center justify-between" onClick={() => setContextMenu(null)}>העתק <Copy size={18} className="text-[#8696a0]" /></li>
              {(isAdmin || contextMenu.msg.user.id === currentUserId || !activeChat.isGroup) && (
                <li className="px-5 py-2 hover:bg-[#182229] cursor-pointer transition-colors text-[#f15c6d] flex items-center justify-between mt-1 border-t border-[#2a3942] pt-3" onClick={() => { handleDelete(contextMenu.msg.id); setContextMenu(null) }}>מחק <Trash2 size={18} /></li>
              )}
            </ul>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.16); border-radius: 10px; }
        .custom-audio::-webkit-media-controls-panel { background-color: #202c33; }
        .custom-audio::-webkit-media-controls-current-time-display,
        .custom-audio::-webkit-media-controls-time-remaining-display { color: #8696a0; }
      `}} />
    </div>
  )
}
