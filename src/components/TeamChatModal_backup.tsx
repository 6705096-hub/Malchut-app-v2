'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import useSWR, { useSWRConfig } from 'swr'
import { X, Send, Reply, Trash2, ArrowRight, Mic, Paperclip, Copy, Edit2, Info, Check, CheckCheck, FileText, BarChart2, Image as ImageIcon, Volume2, Pin, Sun, Moon, Play, Pause, Camera, Store } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { ImageEditor } from './ImageEditor'

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
  user: { id: string, name: string, role: string, image: string | null }
  replyTo?: { id: string | null, content: string, user: { name: string } }
  receipts?: MessageReceipt[]
  reactions?: any
  isPinned?: boolean
  mentionedUsers?: any
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

type TeamChatModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialInputText?: string;
  onClearInitialInput?: () => void;
  initialOrderContext?: any;
  onClearInitialOrderContext?: () => void;
}

export function TeamChatModal({ isOpen, onClose, initialInputText, onClearInitialInput, initialOrderContext, onClearInitialOrderContext }: TeamChatModalProps) {
  const { data: session } = useSession()
  const currentEmail = session?.user?.email
  const currentUserRole = (session?.user as any)?.role
  const currentUserId = (session?.user as any)?.id

  const { data = { messages: [], totalActiveUsers: 0, teamMembers: [], typingUsers: [] }, mutate } = useSWR<{messages: MessageNode[], totalActiveUsers: number, teamMembers: any[], typingUsers: string[]}>(
    '/api/group-chat', 
    fetcher, 
    { refreshInterval: 5000 }
  )
  const messages = data.messages || []
  const totalActiveUsers = data.totalActiveUsers || 0
  const teamMembers = data.teamMembers || []
  const typingUsers = data.typingUsers || []

  const [inputVal, setInputVal] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem('teamChatTheme')
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme)
    }
  }, [])

  const toggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTheme(t => {
      const newTheme = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem('teamChatTheme', newTheme)
      return newTheme
    })
  }
  const [replyingTo, setReplyingTo] = useState<MessageNode | null>(null)
  const [editingMsg, setEditingMsg] = useState<MessageNode | null>(null)
  const [sharedOrder, setSharedOrder] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [showUnpinOption, setShowUnpinOption] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const isSelectMode = selectedMessages.size > 0
  
  const isMe = (userId?: string) => {
    if (!userId || !currentUserId) return false;
    return currentUserId === userId;
  }
  
  const isAdmin = currentUserRole === 'ADMIN'
  const canDeleteSelected = selectedMessages.size > 1 && Array.from(selectedMessages).every(id => {
     const msg = messages.find(m => m.id === id)
     return isAdmin || isMe(msg?.user?.id)
  })
  
  const [showMentionsMenu, setShowMentionsMenu] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [showPollOverlay, setShowPollOverlay] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)
  
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])

  const [editingStatus, setEditingStatus] = useState(false)
  const [statusInput, setStatusInput] = useState('')
  const [showGallery, setShowGallery] = useState(false)
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)
  const [imageToEdit, setImageToEdit] = useState<string | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const reportedSet = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen && initialInputText) {
      setInputVal(initialInputText)
      onClearInitialInput?.()
    }
    if (isOpen && initialOrderContext) {
      setSharedOrder(initialOrderContext)
      onClearInitialOrderContext?.()
    }
  }, [isOpen, initialInputText, initialOrderContext, onClearInitialInput, onClearInitialOrderContext])

  useEffect(() => {
    if (!isOpen || messages.length === 0 || !currentUserId) return
    const unreadIds = messages
      .filter(m => m.user.id !== currentUserId && !m.receipts?.find(r => r.userId === currentUserId) && !reportedSet.current.has(m.id))
      .map(m => m.id)
      
    if (unreadIds.length > 0) {
      unreadIds.forEach(id => reportedSet.current.add(id))
      fetch('/api/group-chat/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: unreadIds })
      }).then(() => mutate())
    }
  }, [messages, isOpen, currentUserId, mutate])

  const prevMessagesLength = useRef(messages.length)
  useEffect(() => {
    if (messagesEndRef.current) {
      // Only smooth scroll if the chat is already open AND it's just 1 or 2 new messages (not initial bulk load)
      const isNewMessage = isOpen && messages.length > prevMessagesLength.current && (messages.length - prevMessagesLength.current < 5)
      messagesEndRef.current.scrollIntoView({ behavior: isNewMessage ? 'smooth' : 'auto' })
      prevMessagesLength.current = messages.length
    }
  }, [messages.length, isOpen])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = 'auto' }
  }, [isOpen])

  const formatHebrewRelativeDate = (dateString: string) => {
    const d = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const twoDaysAgo = new Date(today)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    if (d.toDateString() === today.toDateString()) return "היום"
    if (d.toDateString() === yesterday.toDateString()) return "אתמול"
    if (d.toDateString() === twoDaysAgo.toDateString()) return "שלשום"
    
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const sendPayload = async (payload: any, optimisticMsg: any) => {
    setIsSubmitting(true)
    
    if (editingMsg) {
      const updatedMessages = messages.map(m => m.id === editingMsg.id ? { ...m, content: payload.content, isEdited: true } : m)
      mutate({ messages: updatedMessages as any, totalActiveUsers, teamMembers, typingUsers }, false)
      setEditingMsg(null)
      setInputVal('')
      
      await fetch(`/api/group-chat/${editingMsg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload.content })
      })
      
      mutate()
      setIsSubmitting(false)
      return
    }

    mutate({ messages: [...messages, optimisticMsg] as any, totalActiveUsers, teamMembers, typingUsers }, false)
    setInputVal('')
    setReplyingTo(null)
    setSharedOrder(null)

    await fetch('/api/group-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    mutate()
    setIsSubmitting(false)
  }

  const handleBulkDelete = async () => {
    if (selectedMessages.size === 0) return
    const ids = Array.from(selectedMessages)
    mutate({ messages: messages.filter(m => !ids.includes(m.id)), totalActiveUsers, teamMembers, typingUsers }, false)
    setSelectedMessages(new Set())
    
    try {
      await fetch('/api/group-chat/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: ids })
      })
      mutate()
    } catch(e) {}
  }

  const handlePin = async (messageId: string, isPinned: boolean) => {
    try {
      const updatedMessages = messages.map(m => 
        m.id === messageId ? { ...m, isPinned } : { ...m, isPinned: false }
      )
      mutate({ messages: updatedMessages as any, totalActiveUsers, teamMembers, typingUsers }, false)
      
      await fetch(`/api/group-chat/${messageId}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned })
      })
      mutate()
    } catch(e) {}
  }

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputVal(val)
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      fetch('/api/group-chat/typing', { method: 'POST' }).catch(() => {})
    }, 500);

    const words = val.split(/[\s]+/)
    const lastWord = words[words.length - 1]
    if (lastWord.startsWith('@')) {
      setShowMentionsMenu(true)
      setMentionQuery(lastWord.slice(1).toLowerCase())
    } else {
      setShowMentionsMenu(false)
    }
  }

  const insertMention = (name: string) => {
    const words = inputVal.split(/[\s]+/)
    words[words.length - 1] = `@${name} `
    setInputVal(words.join(' '))
    setShowMentionsMenu(false)
    inputRef.current?.focus()
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputVal.trim() && !editingMsg && !sharedOrder) return

    const mentionedIds = teamMembers
      .filter(m => inputVal.includes(`@${m.name}`))
      .map(m => m.id)

    let attachmentType = undefined
    let attachmentData = undefined
    
    if (sharedOrder) {
      attachmentType = 'order'
      attachmentData = JSON.stringify(sharedOrder)
    }

    const optimisticMsg = {
      id: 'temp-' + Date.now(),
      content: inputVal,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      isEdited: false,
      user: { id: currentUserId || 'me', name: session?.user?.name || 'אני', email: currentEmail },
      replyTo: replyingTo ? { content: replyingTo.content, user: { name: replyingTo.user?.name || 'מישהו' } } : null,
      receipts: [],
      mentionedUsers: mentionedIds,
      attachmentType,
      attachmentData
    }

    sendPayload({ content: inputVal, replyToId: replyingTo?.id, mentionedIds, attachmentType, attachmentData }, optimisticMsg)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
       setImageToEdit(ev.target?.result as string)
       setShowAttachmentMenu(false)
       if (fileInputRef.current) fileInputRef.current.value = ''
       if (cameraInputRef.current) cameraInputRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  const handleEditedImageSend = (editedImageUrl: string, caption: string) => {
    setImageToEdit(null)
    
    const optimisticMsg = {
      id: 'temp-' + Date.now(),
      content: caption,
      attachmentData: editedImageUrl,
      attachmentType: 'image/jpeg',
      createdAt: new Date().toISOString(),
      isDeleted: false,
      isEdited: false,
      user: { id: currentUserId || 'me', name: session?.user?.name || 'אני', email: currentEmail },
      replyTo: replyingTo ? { content: replyingTo.content, user: { name: replyingTo.user?.name || 'מישהו' } } : null,
      receipts: []
    }

    sendPayload({ 
      content: caption, 
      replyToId: replyingTo?.id,
      attachmentData: editedImageUrl,
      attachmentType: 'image/jpeg'
    }, optimisticMsg)
  }

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
        const base64 = ev.target?.result as string
        const optimisticMsg = {
          id: 'temp-' + Date.now(),
          content: file.name,
          attachmentData: base64,
          attachmentType: 'application/pdf',
          createdAt: new Date().toISOString(),
          isDeleted: false,
          isEdited: false,
          user: { id: currentUserId || 'me', name: session?.user?.name || 'אני', email: currentEmail },
          receipts: []
        }
        sendPayload({ attachmentData: base64, attachmentType: 'application/pdf', content: file.name }, optimisticMsg)
        setShowAttachmentMenu(false)
    }
    reader.readAsDataURL(file)
  }

  const handleSendPoll = () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
       alert("חובה להזין שאלה ולפחות 2 אפשרויות")
       return
    }
    
    const validOptions = pollOptions.filter(o => o.trim()).map((o, idx) => ({ id: idx.toString(), text: o.trim(), votes: [] }))
    const pollData = JSON.stringify({ question: pollQuestion, options: validOptions })

    const optimisticMsg = {
      id: 'temp-' + Date.now(),
      content: '',
      attachmentData: pollData,
      attachmentType: 'poll',
      createdAt: new Date().toISOString(),
      isDeleted: false,
      isEdited: false,
      user: { id: currentUserId || 'me', name: session?.user?.name || 'אני', email: currentEmail },
      receipts: []
    }
    sendPayload({ attachmentData: pollData, attachmentType: 'poll' }, optimisticMsg)
    setShowPollOverlay(false)
    setPollQuestion('')
    setPollOptions(['', ''])
    setShowAttachmentMenu(false)
  }

  const handleSaveStatus = async () => {
    try {
      setEditingStatus(false)
      await fetch('/api/users/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusText: statusInput })
      })
      mutate()
    } catch(e) {}
  }

  const isRecordingCancelled = useRef(false);

  const startRecording = async () => {
    try {
      isRecordingCancelled.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length > 0 && !isRecordingCancelled.current) {
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
              user: { id: currentUserId || 'me', name: session?.user?.name || 'אני', email: currentEmail },
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
      alert("נא לאשר גישה למיקרופון בהגדרות הדפדפן")
    }
  }

  const stopRecording = (cancel: boolean = false) => {
    if (mediaRecorderRef.current && isRecording) {
      if (cancel) {
        isRecordingCancelled.current = true;
      }
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 sm:left-auto sm:right-0 sm:w-[500px] sm:h-[100dvh] sm:border-l z-[120] flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl overflow-hidden ${
      theme === 'dark' ? 'bg-[#0b141a] border-gray-800' : 'bg-[#efeae2] border-gray-300'
    }`}>
      {imageToEdit && (
        <ImageEditor 
          imageUrl={imageToEdit} 
          onCancel={() => setImageToEdit(null)} 
          onSend={handleEditedImageSend} 
        />
      )}

      {/* Chat Background */}
      <div className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300" style={{ 
          backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', 
          backgroundRepeat: 'repeat',
          backgroundSize: '400px',
          backgroundBlendMode: theme === 'dark' ? 'overlay' : 'normal', 
          backgroundColor: theme === 'dark' ? '#0b141a' : '#efeae2', 
          opacity: theme === 'dark' ? 0.95 : 0.4 
      }} />

      {/* Header */}
      <div className={`${theme === 'dark' ? 'bg-[#202c33] text-[#e9edef] border-[#222d34]' : 'bg-[#008069] text-white border-[#008069]'} p-3 flex items-center justify-between shadow-sm z-10 sticky safe-top shrink-0 border-b`}>
        <div className="flex items-center gap-3 cursor-pointer select-none relative w-full pr-1" onClick={() => setShowGroupInfo(true)}>
          <button onClick={(e) => { e.stopPropagation(); onClose() }} className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95 text-[#aebac1]">
            <ArrowRight className="w-6 h-6" />
          </button>
          
          <div className="relative">
            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
               👑
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg flex items-center gap-1.5 leading-tight truncate pr-1">
              צוות מלכות קוגל
            </h2>
            <div className={`text-xs truncate ${theme === 'dark' ? 'text-white/80' : 'text-white/90'}`}>
               {totalActiveUsers > 0 ? (
                 <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#25D366] shadow-[0_0_4px_#25D366]"></span>
                    {totalActiveUsers} מחוברים כעת
                 </span>
               ) : 'לחץ לפרטי קבוצה'}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {canDeleteSelected && (
              <button onClick={(e) => { e.stopPropagation(); setMessageToDelete('bulk') }} className={`p-2 rounded-full transition-colors active:scale-95 shrink-0 ${theme === 'dark' ? 'text-[#aebac1] hover:bg-white/10' : 'text-white hover:bg-white/20'}`}>
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors active:scale-95 shrink-0 ${theme === 'dark' ? 'text-[#aebac1] hover:bg-white/10' : 'text-white hover:bg-white/20'}`}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button onClick={() => setShowGroupInfo(true)} className={`p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95 shrink-0 ${theme === 'dark' ? 'text-[#aebac1]' : 'text-white'}`}>
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {messages.find(m => m.isPinned) && (() => {
         const pinnedMessage = messages.find(m => m.isPinned);
         return (
           <div 
             className="bg-[#202c33] border-b border-[#222d34] px-4 py-2 flex items-center gap-3 shrink-0 shadow-sm z-20 cursor-pointer text-[#e9edef] transition-colors hover:bg-[#2a3942] relative"
             onClick={() => {
                const el = document.getElementById(`message-${pinnedMessage?.id}`)
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    el.classList.add('bg-[#00a884]/30', 'duration-500')
                    setTimeout(() => el.classList.remove('bg-[#00a884]/30'), 1500)
                }
             }}
             onContextMenu={(e) => {
                e.preventDefault()
                if (isAdmin || isMe(pinnedMessage?.user?.id)) {
                   setShowUnpinOption(true)
                }
             }}
           >
              <Pin className="w-5 h-5 text-[#8696a0]" />
              <div className="flex-1 min-w-0 border-r-2 border-[#53bdeb] pr-3">
                 <span className="text-xs font-bold text-[#8696a0] block leading-tight">הודעה נעוצה</span>
                 <span className="block text-sm truncate leading-tight mt-0.5">{pinnedMessage?.content || 'מדיה מצורפת'}</span>
              </div>
              
              {showUnpinOption && (
                <>
                  <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowUnpinOption(false) }} />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowUnpinOption(false)
                      if (pinnedMessage) handlePin(pinnedMessage.id, false)
                    }}
                    className="absolute top-10 left-4 z-50 bg-[#202c33] border border-[#2a3942] rounded-lg shadow-xl px-4 py-3 text-sm text-[#e9edef] hover:bg-[#2a3942] flex items-center gap-2 font-medium"
                  >
                    <Pin className="w-4 h-4 text-gray-400 rotate-45" /> ביטול נעיצה
                  </button>
                </>
              )}
           </div>
         )
      })()}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar relative z-10">
        {messages.length === 0 && (
           <div className={`text-center p-4 rounded-lg text-sm shadow-sm border mx-auto max-w-xs mt-10 ${
             theme === 'dark' ? 'bg-[#182229] border-[#222d34] text-[#8696a0]' : 'bg-[#ffeecd] border-[#ffeecd] text-gray-700'
           }`}>
              הודעות המערכת והצוות יופיעו כאן. מוזמנים להתחיל לקשקש!
           </div>
        )}

        {(Array.isArray(messages) ? messages : []).map((msg: any, idx: number) => {
          const amIOwner = isMe(msg.user?.id)
          const isAdmin = currentUserRole === 'ADMIN'
          const prevMsg = messages[idx - 1]
          const isFirstOfDay = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString()

          return (
            <div 
              key={msg.id} 
              id={`message-${msg.id}`} 
              className={`relative ${selectedMessages.has(msg.id) ? (theme === 'dark' ? 'bg-[#00a884]/20' : 'bg-[#00a884]/10') : ''} transition-colors cursor-default`}
              onClick={() => {
                if (isSelectMode) {
                   const newSet = new Set(selectedMessages)
                   if (newSet.has(msg.id)) newSet.delete(msg.id)
                   else newSet.add(msg.id)
                   setSelectedMessages(newSet)
                }
              }}
            >
              {isFirstOfDay && (
                <div className="flex justify-center my-3 sticky top-2 z-10 select-none pointer-events-none">
                  <span className={`text-[12px] font-medium px-3 py-1.5 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-[#202c33] text-[#e9edef]' : 'bg-white text-gray-600 border border-gray-100'}`}>
                    {formatHebrewRelativeDate(msg.createdAt)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 w-full pr-2">
                <div className="flex-1 min-w-0">
                  <MessageBubble 
                    msg={msg} 
                    amIOwner={amIOwner}
                    isAdmin={isAdmin}
                    totalActiveUsers={totalActiveUsers}
                    currentUserId={currentUserId}
                    theme={theme}
                    onReply={() => {
                      setEditingMsg(null)
                      setReplyingTo(msg)
                    }}
                    onEdit={() => {
                      setReplyingTo(null)
                      setEditingMsg(msg)
                      setInputVal(msg.content)
                    }}
                    onPin={isAdmin ? () => handlePin(msg.id, !msg.isPinned) : undefined}
                    onDelete={() => {
                      setMessageToDelete(msg.id)
                    }}
                    onClickImage={() => setFullScreenImage(msg.attachmentData)}
                    onLongPress={() => {
                       if (!isSelectMode) {
                         setSelectedMessages(new Set([msg.id]))
                       }
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className={`px-4 py-1.5 text-xs font-bold animate-in fade-in flex items-center gap-1 ${theme === 'dark' ? 'text-[#00a884] bg-[#202c33]' : 'text-blue-500 bg-[#f0f2f5]'}`}>
           <span>{typingUsers.join(', ')} מקליד{typingUsers.length > 1 ? 'ים' : ''}</span>
           <span className="flex gap-0.5 ml-1">
             <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
             <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
             <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
           </span>
        </div>
      )}

      {/* Input Area */}
      <div className={`${theme === 'dark' ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'} px-2 py-3 shrink-0 pb-[calc(env(safe-area-inset-bottom)+12px)] relative z-10`}>
        


        {isRecording ? (
          <div className="flex items-center gap-4 px-4 h-12 bg-[#2a3942] rounded-full mx-2 shadow-sm animate-in slide-in-from-right">
            <button onClick={() => stopRecording(true)} className="text-red-400 font-bold text-sm bg-[#111b21] px-3 py-1 rounded-full cursor-pointer hover:bg-red-900/30 flex items-center gap-1">
              <Trash2 className="w-4 h-4" />
              ביטול
            </button>
            <div className="flex-1 flex justify-center items-center gap-2 text-red-500">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-[#e9edef]">מקליט...</span>
            </div>
            <button onClick={() => stopRecording(false)} className="w-10 h-10 bg-[#00a884] text-white flex items-center justify-center rounded-full shadow-md active:scale-95">
              <Send className="w-4 h-4 mr-1" />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2 px-2 max-w-3xl mx-auto relative">
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
            <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleImageUpload} />
            <input type="file" accept="application/pdf" className="hidden" ref={pdfInputRef} onChange={handlePdfUpload} />
            
            {showAttachmentMenu && (
              <div className="absolute bottom-[60px] left-2 mb-2 bg-[#202c33] rounded-2xl shadow-xl border border-[#222d34] overflow-hidden z-[150] animate-in zoom-in-95 w-48 flex flex-col p-2 gap-1 origin-bottom-left">
                 <button type="button" onClick={() => { cameraInputRef.current?.click(); setShowAttachmentMenu(false) }} className="flex items-center gap-3 w-full p-2.5 hover:bg-[#111b21] rounded-xl transition-colors active:scale-95 text-[#e9edef]">
                   <div className="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center shrink-0"><Camera className="w-5 h-5 text-pink-500"/></div>
                   <span className="font-bold text-[15px]">מצלמה</span>
                 </button>
                 <button type="button" onClick={() => { fileInputRef.current?.click(); setShowAttachmentMenu(false) }} className="flex items-center gap-3 w-full p-2.5 hover:bg-[#111b21] rounded-xl transition-colors active:scale-95 text-[#e9edef]">
                   <div className="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center shrink-0"><ImageIcon className="w-5 h-5 text-blue-500"/></div>
                   <span className="font-bold text-[15px]">תמונות ווידאו</span>
                 </button>
                 <button type="button" onClick={() => { setShowPollOverlay(true); setShowAttachmentMenu(false) }} className="flex items-center gap-3 w-full p-2.5 hover:bg-[#111b21] rounded-xl transition-colors active:scale-95 text-[#e9edef]">
                   <div className="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center shrink-0"><BarChart2 className="w-5 h-5 text-yellow-400"/></div>
                   <span className="font-bold text-[15px]">סקר לקבוצה</span>
                 </button>
                 <button type="button" onClick={() => { pdfInputRef.current?.click(); setShowAttachmentMenu(false) }} className="flex items-center gap-3 w-full p-2.5 hover:bg-[#111b21] rounded-xl transition-colors active:scale-95 text-[#e9edef]">
                   <div className="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-red-400"/></div>
                   <span className="font-bold text-[15px]">קובץ PDF</span>
                 </button>
              </div>
            )}

            {/* Pill Container for Input and Attachment */}
            <div className={`flex-1 flex flex-col rounded-[24px] ${theme === 'dark' ? 'bg-[#2a3942]' : 'bg-white'} overflow-visible shadow-sm border border-transparent ${theme !== 'dark' ? 'border-gray-200' : ''}`}>
              
              {(replyingTo || editingMsg || sharedOrder) && (
                <div className={`border-r-4 ${theme === 'dark' ? 'bg-black/20 border-[#53bdeb]' : 'bg-gray-100 border-[#00a884]'} p-2.5 mx-2 mt-2 mb-0 rounded-lg relative flex overflow-hidden shadow-sm`}>
                   <button type="button" onClick={() => { setReplyingTo(null); setEditingMsg(null); setSharedOrder(null); setInputVal('') }} className={`absolute left-2 top-2 p-1 rounded-full z-10 ${theme === 'dark' ? 'text-[#8696a0] hover:text-[#e9edef] hover:bg-black/30' : 'text-gray-500 hover:text-gray-800 hover:bg-black/10'}`}>
                     <X className="w-4 h-4" />
                   </button>
                   <div className="flex-1 text-right pl-6">
                      <span className={`${theme === 'dark' ? 'text-[#53bdeb]' : 'text-[#00a884]'} text-[13px] font-bold block flex items-center gap-1`}>
                        {editingMsg ? <><Edit2 className="w-3.5 h-3.5" /> עריכת הודעה</> : sharedOrder ? <><Store className="w-3.5 h-3.5" /> שיתוף הזמנה: {sharedOrder.customerName}</> : (replyingTo?.user?.name || 'מישהו')}
                      </span>
                      <span className={`${theme === 'dark' ? 'text-[#e9edef] opacity-80' : 'text-gray-700'} text-[13px] block max-h-[44px] overflow-hidden text-ellipsis whitespace-pre-wrap mt-0.5 leading-snug`}>
                        {editingMsg ? editingMsg.content : sharedOrder ? sharedOrder.details : replyingTo?.content}
                      </span>
                   </div>
                </div>
              )}

              <div className="flex items-end w-full">
              <button 
                type="button"
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className={`p-3 rounded-full transition-all self-end mb-0.5 ${
                  theme === 'dark' 
                    ? (showAttachmentMenu ? 'bg-[#202c33] rotate-45 text-[#e9edef]' : 'text-[#8696a0] hover:text-[#e9edef]')
                    : (showAttachmentMenu ? 'bg-gray-100 rotate-45 text-gray-700' : 'text-gray-500 hover:text-gray-700')
                }`}
              >
                <Paperclip className="w-6 h-6" />
              </button>

              <form onSubmit={handleSubmit} className="flex-1 relative flex items-center">
                {showMentionsMenu && (
                   <div className="absolute bottom-full right-0 w-48 mb-2 bg-[#202c33] rounded-xl shadow-[0_5px_25px_-5px_rgba(0,0,0,0.5)] border border-[#2a3942] overflow-hidden z-[150] animate-in slide-in-from-bottom-2">
                      <div className="bg-[#111b21] px-3 py-1.5 text-xs font-bold text-[#8696a0] border-b border-[#2a3942]">תייג חבר צוות</div>
                      <ul className="max-h-40 overflow-y-auto custom-scrollbar">
                         {teamMembers.filter(m => m.name.toLowerCase().includes(mentionQuery)).map(m => (
                           <li key={m.id}>
                             <button type="button" onMouseDown={() => insertMention(m.name)} className="w-full text-right px-4 py-2 text-sm text-[#e9edef] hover:bg-[#2a3942] focus:bg-[#2a3942] focus:outline-none transition-colors border-b border-[#111b21] last:border-b-0">
                               {m.name}
                             </button>
                           </li>
                         ))}
                      </ul>
                   </div>
                )}
                <textarea
                  value={inputVal}
                  onChange={(e) => handleInputChange(e as any)}
                  placeholder="הודעה"
                  className={`w-full bg-transparent outline-none pt-3.5 pb-3.5 pr-2 pl-4 resize-none overflow-hidden min-h-[44px] max-h-32 text-[15px] leading-snug ${
                    theme === 'dark' ? 'text-[#e9edef] placeholder-[#8696a0]' : 'text-gray-800 placeholder-gray-500'
                  }`}
                  rows={1}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </form>
            </div>
            </div>

            {inputVal.trim() || editingMsg || sharedOrder ? (
              <button 
                onClick={(e: any) => handleSubmit(e)}
                disabled={isSubmitting}
                className="w-11 h-11 shrink-0 bg-[#00a884] mb-1 disabled:bg-gray-400 text-white flex items-center justify-center rounded-full shadow-md active:scale-95 transition-all"
              >
                <Send className="w-5 h-5 mr-1" />
              </button>
            ) : (
              <button 
                onMouseDown={startRecording}
                onTouchStart={startRecording}
                className="w-11 h-11 shrink-0 bg-[#00a884] mb-1 disabled:bg-gray-400 text-white flex items-center justify-center rounded-full shadow-md active:scale-95 transition-all"
              >
                <Mic className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
      </div>
      {/* Group Info Full Slide Over */}
      {showGroupInfo && (
        <div className="fixed inset-0 sm:left-auto sm:right-0 sm:w-[500px] h-[100dvh] z-[200] bg-[#111b21] animate-in slide-in-from-right duration-300 flex flex-col shadow-2xl">
          <div className="bg-[#202c33] text-[#e9edef] p-4 flex items-center gap-4 shadow-sm border-b border-[#222d34] safe-top shrink-0">
            <button onClick={() => setShowGroupInfo(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95 text-[#aebac1]">
              <ArrowRight className="w-6 h-6" />
            </button>
            <h2 className="font-bold text-xl">פרטי קבוצה</h2>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#111b21] custom-scrollbar pb-10">
            <div className="bg-[#202c33] p-6 shadow-sm mb-2 text-center text-[#e9edef]">
               <div className="w-32 h-32 bg-gray-600 rounded-full mx-auto flex items-center justify-center text-5xl text-white mb-4 shadow-md overflow-hidden border-4 border-[#202c33]">
                 👑
               </div>
               <h1 className="text-2xl font-bold text-[#e9edef]">צוות מלכות קוגל</h1>
               <p className="text-[#8696a0]">קבוצה פנימית • {totalActiveUsers} משתתפים</p>
               
               <button onClick={() => setShowGallery(true)} className="mt-4 flex items-center gap-2 mx-auto bg-[#2a3942] hover:bg-[#32454f] text-[#e9edef] px-5 py-2.5 rounded-xl transition-colors font-bold text-sm shadow-sm active:scale-95">
                 <ImageIcon className="w-4 h-4" /> מדיה, קישורים וקבצים
               </button>
            </div>
            
            <div className="bg-[#202c33] shadow-sm pb-4">
              <div className="px-5 py-3 text-[#00a884] font-bold text-sm">
                משתתפים ({totalActiveUsers})
              </div>
              <div className="divide-y divide-[#111b21]">
                 {teamMembers.map((member) => {
                    const diffMs = Date.now() - new Date(member.lastSeenAt).getTime()
                    const isOnline = diffMs < 3 * 60000 // 3 minutes threshold
                    const initial = member.name ? member.name.charAt(0) : 'U'
                    return (
                      <div key={member.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#111b21] transition-colors">
                         <div className="relative shrink-0">
                            <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center font-bold text-[#e9edef] text-xl border border-gray-700">
                              {initial}
                            </div>
                            {isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-[2.5px] border-[#202c33] rounded-full"></div>}
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="font-bold text-[#e9edef] text-[15px] truncate flex items-center gap-2">
                             {member.name} {member.id === currentUserId && <span className="text-[#8696a0] font-normal text-xs">(אתה)</span>}
                           </div>
                           
                           {member.id === currentUserId && editingStatus ? (
                              <div className="flex items-center gap-2 mt-1 relative z-10 w-full mb-1">
                                <input 
                                  value={statusInput} 
                                  onChange={e => setStatusInput(e.target.value)} 
                                  className="text-xs w-full bg-[#2a3942] text-[#e9edef] border-transparent rounded-md px-3 py-1.5 focus:ring-2 focus:ring-[#00a884] outline-none" 
                                  placeholder="מה הסטטוס שלך?"
                                  autoFocus
                                  onBlur={handleSaveStatus}
                                  onKeyDown={(e) => { if(e.key === 'Enter') handleSaveStatus() }}
                                />
                              </div>
                           ) : (
                              <div className="text-xs text-[#8696a0] truncate mt-0.5 group flex items-center">
                                <span className={member.statusText ? 'text-[#e9edef] font-medium' : ''}>
                                   {member.statusText || (isOnline ? <span className="text-[#00a884] font-bold">מחובר עכשיו</span> : `נראה לאחרונה ב-${new Date(member.lastSeenAt).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}`)}
                                </span>
                                
                                {member.id === currentUserId && !editingStatus && (
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); setStatusInput(member.statusText || ''); setEditingStatus(true); }} 
                                     className="mr-2 text-blue-400 hover:text-blue-300 bg-[#2a3942] p-1 rounded transition-opacity"
                                   >
                                      <Edit2 className="w-3 h-3" />
                                   </button>
                                )}
                              </div>
                           )}
                         </div>
                         {member.role === 'ADMIN' && <span className="text-[10px] font-bold text-[#00a884] bg-[#005c4b]/30 border border-[#005c4b] px-2 py-0.5 rounded-md self-start mt-2">מנהל</span>}
                      </div>
                    )
                 })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Gallery Overlay */}
      {showGallery && (
        <div className="fixed inset-0 sm:left-auto sm:right-0 sm:w-[500px] h-[100dvh] z-[300] bg-[#111b21] animate-in slide-in-from-right duration-300 flex flex-col shadow-2xl">
           <div className="bg-[#202c33] text-[#e9edef] p-4 flex items-center gap-4 shadow-sm border-b border-[#222d34] safe-top shrink-0 z-10">
             <button onClick={() => setShowGallery(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95 text-[#aebac1]">
               <ArrowRight className="w-6 h-6" />
             </button>
             <h2 className="font-bold text-xl">מדיה וקבצים</h2>
           </div>
           
           <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
             <div className="grid grid-cols-3 gap-1">
                {messages.filter(m => m.attachmentType?.startsWith('image')).map(m => (
                  <div key={m.id} className="aspect-square bg-gray-200 overflow-hidden relative cursor-pointer group" onClick={() => setFullScreenImage(m.attachmentData || null)}>
                    <img src={m.attachmentData} alt="Media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
                {messages.filter(m => m.attachmentType?.startsWith('image')).length === 0 && (
                  <div className="col-span-3 text-center text-[#8696a0] py-10 text-sm">אין תמונות בקבוצה זו</div>
                )}
             </div>
             
             <h3 className="font-bold text-[#8696a0] text-sm mt-6 mb-2 px-2">קבצי PDF</h3>
             <div className="flex flex-col gap-2 px-2">
                {messages.filter(m => m.attachmentType === 'application/pdf').map(m => (
                   <a key={m.id} href={m.attachmentData} download={m.content || 'מסמך'} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-[#202c33] hover:bg-[#2a3942] rounded-xl shadow-sm border border-[#222d34] transition-colors">
                     <FileText className="w-8 h-8 text-red-500" />
                     <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[#e9edef] truncate" dir="rtl">{m.content || 'מסמך PDF'}</div>
                     </div>
                   </a>
                ))}
                {messages.filter(m => m.attachmentType === 'application/pdf').length === 0 && (
                  <div className="text-center text-[#8696a0] py-4 text-sm">אין מסמכים בקבוצה זו</div>
                )}
             </div>
           </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-[500] bg-black/90 flex flex-col backdrop-blur-sm animate-in fade-in duration-200">
           <div className="flex justify-between items-center p-4 z-10 w-full absolute top-0 left-0 bg-gradient-to-b from-black/50 to-transparent">
             <button onClick={() => setFullScreenImage(null)} className="p-2 bg-black/40 text-white rounded-full hover:bg-white/20 transition-colors">
               <X className="w-6 h-6" />
             </button>
             <a href={fullScreenImage} download="image.jpg" target="_blank" rel="noreferrer" className="p-2 bg-black/40 text-white rounded-full hover:bg-white/20 transition-colors">
               <span className="font-bold text-sm px-2">שמור</span>
             </a>
           </div>
           
           <div className="flex-1 overflow-hidden flex items-center justify-center p-4" onClick={() => setFullScreenImage(null)}>
             <img 
               src={fullScreenImage} 
               alt="Full screen" 
               className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
               onClick={e => e.stopPropagation()} 
             />
           </div>
        </div>
      )}

      {/* Poll Creation Overlay */}
      {showPollOverlay && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center pointer-events-auto">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowPollOverlay(false)} />
          <div className="bg-white rounded-3xl p-5 w-80 max-w-[90vw] z-10 relative animate-in zoom-in-95 shadow-2xl">
            <h3 className="text-center font-bold text-gray-800 mb-4 text-lg">יצירת סקר חדש</h3>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="שאל את הקבוצה שאלה..."
                value={pollQuestion}
                onChange={e => setPollQuestion(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008069] text-gray-800 font-medium"
              />
              <div className="space-y-2 mt-4">
                <span className="text-xs font-bold text-gray-500">אפשרויות:</span>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input 
                      type="text"
                      placeholder={`אפשרות ${idx + 1}`}
                      value={opt}
                      onChange={e => {
                        const newOpts = [...pollOptions]
                        newOpts[idx] = e.target.value
                        setPollOptions(newOpts)
                      }}
                      className="flex-1 bg-gray-50 border border-gray-200 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008069] text-sm"
                    />
                    {idx > 1 && (
                      <button onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} className="text-red-500 p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 5 && (
                <button 
                  onClick={() => setPollOptions([...pollOptions, ''])} 
                  className="text-[#008069] font-bold text-sm bg-[#e8f6f3] px-3 py-1.5 rounded-lg mt-2 w-full"
                >
                  + הוסף אפשרות
                </button>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPollOverlay(false)} className="flex-1 p-3 bg-gray-100 hover:bg-gray-200 transition-colors rounded-xl text-sm font-bold text-gray-700">ביטול</button>
              <button onClick={handleSendPoll} className="flex-1 p-3 bg-[#008069] hover:bg-[#00a884] transition-colors rounded-xl text-sm font-bold text-white shadow-md">שלח סקר</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Overlay */}
      {messageToDelete && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center pointer-events-auto">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setMessageToDelete(null)} />
          <div className={`rounded-3xl p-6 w-80 max-w-[90vw] z-10 relative animate-in zoom-in-95 shadow-2xl ${theme === 'dark' ? 'bg-[#202c33] text-[#e9edef]' : 'bg-white text-gray-800'}`}>
            <h3 className="text-center font-bold mb-4 text-lg">מחיקת הודעה</h3>
            <p className="text-center mb-6 text-sm opacity-80">האם אתה בטוח שברצונך למחוק הודעה זו?</p>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setMessageToDelete(null)} className={`flex-1 p-3 transition-colors rounded-xl text-sm font-bold ${theme === 'dark' ? 'bg-[#2a3942] hover:bg-[#32454f]' : 'bg-gray-100 hover:bg-gray-200'}`}>ביטול</button>
              <button 
                onClick={async () => {
                  const id = messageToDelete
                  setMessageToDelete(null)
                  // If we use the bulk delete endpoint, it handles hiding tombstone vs soft delete
                  try {
                    await fetch('/api/group-chat/bulk-delete', { 
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ messageIds: [id] })
                    })
                    mutate()
                  } catch(e: any) {
                    alert('שגיאה בתקשורת: ' + e.message)
                  }
                }} 
                className="flex-1 p-3 bg-red-500 hover:bg-red-600 transition-colors rounded-xl text-sm font-bold text-white shadow-md"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Editor */}
      {imageToEdit && (
        <ImageEditor 
          imageUrl={imageToEdit}
          onSend={handleEditedImageSend}
          onCancel={() => setImageToEdit(null)}
        />
      )}
    </div>
  )
}

function CustomAudioPlayer({ src, onPlay, theme, userImage }: any) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Fix WebM duration infinity bug by getting the actual duration
    let getDurationInterval: NodeJS.Timeout;
    const fixWebMDuration = () => {
      if (audio.duration === Infinity || isNaN(audio.duration)) {
        audio.currentTime = 1e101; // Jump to end
        setTimeout(() => {
           audio.currentTime = 0; // Jump back to start
        }, 100);
      } else {
        setDuration(audio.duration)
        clearInterval(getDurationInterval)
      }
    };
    
    const updateProgress = () => setProgress(audio.currentTime)
    const updateDuration = () => {
       if (audio.duration !== Infinity && !isNaN(audio.duration)) {
           setDuration(audio.duration)
       }
    }
    const handleEnded = () => { setIsPlaying(false); setProgress(0) }
    
    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('loadedmetadata', () => {
        updateDuration()
        // Try fixing duration immediately, and then poll a few times
        fixWebMDuration()
        getDurationInterval = setInterval(fixWebMDuration, 500)
        setTimeout(() => clearInterval(getDurationInterval), 5000)
    })
    audio.addEventListener('ended', handleEnded)
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('ended', handleEnded)
      clearInterval(getDurationInterval)
    }
  }, [])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
      onPlay?.()
    }
  }

  const handleSeek = (e: any) => {
    if (!audioRef.current) return
    const newTime = parseFloat(e.target.value)
    audioRef.current.currentTime = newTime
    setProgress(newTime)
  }

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00'
    const m = Math.floor(time / 60)
    const s = Math.floor(time % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="flex items-center gap-3 min-w-[220px] max-w-[280px] py-1 px-1" dir="rtl">
      <audio ref={audioRef} src={src} className="hidden" preload="metadata" />
      
      {/* Play/Pause Button */}
      <button onClick={togglePlay} className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-transparent hover:bg-black/5 transition-colors text-gray-500">
        {isPlaying ? <Pause className="w-7 h-7" fill="currentColor" /> : <Play className="w-7 h-7 ml-1" fill="currentColor" />}
      </button>

      {/* Track */}
      <div className="flex-1 flex flex-col gap-1 pt-1.5 ml-1">
        <div className="relative w-full h-4 flex items-center">
          <input 
            type="range" 
            min={0} 
            max={duration || 100} 
            value={progress} 
            onChange={handleSeek} 
            className="w-full h-full appearance-none cursor-pointer absolute z-10 opacity-0"
          />
          {/* Custom Track */}
          <div className="w-full h-1.5 bg-black/20 rounded-full relative overflow-hidden">
            <div className="absolute top-0 bottom-0 right-0 transition-all" style={{ width: `${duration && duration > 0 && duration !== Infinity ? (progress / duration) * 100 : 0}%`, backgroundColor: theme === 'dark' ? '#00a884' : '#128C7E' }} />
          </div>
          {/* Custom Thumb */}
          <div className="absolute w-3 h-3 rounded-full z-0 transition-all pointer-events-none shadow-sm" style={{ right: `calc(${duration && duration > 0 && duration !== Infinity ? (progress / duration) * 100 : 0}% - 6px)`, backgroundColor: theme === 'dark' ? '#00a884' : '#128C7E' }} />
        </div>
        
        <div className="flex items-center justify-between px-1">
           <span className={`text-[11px] ${theme === 'dark' ? 'text-[#8696a0]' : 'text-gray-500'} font-medium`}>
             {isPlaying ? formatTime(progress) : formatTime(duration)}
           </span>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg, amIOwner, isAdmin, totalActiveUsers, currentUserId, theme = 'dark', onReply, onEdit, onPin, onDelete, onClickImage, onLongPress }: any) {
  const [showMenu, setShowMenu] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showReactionsOverlay, setShowReactionsOverlay] = useState(false)
  const [translateX, setTranslateX] = useState(0)
  const swipeStartX = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom')
  const { mutate } = useSWRConfig()

  useEffect(() => {
    if (showMenu && bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      // If the bubble is near the bottom of the screen (less than 300px space), open above
      if (viewportHeight - rect.bottom < 400) {
        setMenuPosition('top')
      } else {
        setMenuPosition('bottom')
      }
    }
  }, [showMenu])

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX
    timerRef.current = setTimeout(() => {
      onLongPress?.()
      setShowMenu(true)
    }, 400)
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (swipeStartX.current !== null) {
      const diff = e.touches[0].clientX - swipeStartX.current
      // Swipe right to reply
      if (diff > 0 && diff < 80) {
        setTranslateX(diff)
      }
    }
  }
  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (translateX > 40) {
      onReply()
    }
    setTranslateX(0)
    swipeStartX.current = null
  }
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowMenu(true)
  }

  const handleReaction = async (emoji: string) => {
    try {
      fetch(`/api/group-chat/${msg.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      }).then(() => mutate('/api/group-chat'))
    } catch(e) {}
  }

  const handleAudioPlay = () => {
    // Only report play if not mine
    if (!amIOwner && currentUserId) {
       fetch('/api/group-chat/play', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ messageId: msg.id })
       })
    }
  }

  const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''
  const isAudio = msg.attachmentType?.startsWith('audio')
  const isImage = msg.attachmentType?.startsWith('image')
  const isPdf = msg.attachmentType === 'application/pdf'
  const isPoll = msg.attachmentType === 'poll'
  const isOrder = msg.attachmentType === 'order'
  const isTemp = msg.id.startsWith('temp-')

  // Calculate Receipts
  const receipts = msg.receipts || []
  // Total others is total active users minus myself (the sender)
  const totalOthers = Math.max(1, totalActiveUsers - 1)
  
  // Who actually read this msg (excluding the sender themselves, to avoid counting own receipt)
  const validReads = receipts.filter((r: any) => r.userId !== msg.user?.id)
  const validPlays = receipts.filter((r: any) => r.playedAt && r.userId !== msg.user?.id)

  const readCount = validReads.length
  
  let CheckIconState = null
  if (amIOwner && !isTemp) {
    if (readCount >= totalOthers && totalOthers > 0) {
      CheckIconState = <CheckCheck className="w-[14px] h-[14px] text-[#53bdeb] ml-1 inline-block" />
    } else if (readCount > 0) {
      CheckIconState = <CheckCheck className={`w-[14px] h-[14px] ml-1 inline-block ${theme === 'dark' ? 'text-white/60' : 'text-gray-400'}`} />
    } else {
      CheckIconState = <Check className={`w-[14px] h-[14px] ml-1 inline-block ${theme === 'dark' ? 'text-white/60' : 'text-gray-400'}`} />
    }
  }

  const isMentioned = !amIOwner && Array.isArray(msg.mentionedUsers) && msg.mentionedUsers.includes(currentUserId)

  const bubbleContent = (
    <div className={`max-w-[85vw] md:max-w-md relative px-2 pt-1.5 pb-1.5 text-[15px] shadow-sm leading-snug z-10 ${
          amIOwner 
            ? (theme === 'dark' ? 'bg-[#005c4b] text-[#e9edef]' : 'bg-[#d9fdd3] text-[#111b21]') + ' rounded-lg rounded-tl-none shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]' 
            : (isMentioned 
                ? (theme === 'dark' ? 'bg-[#202c33] text-[#e9edef] ring-1 ring-yellow-400/30' : 'bg-white text-[#111b21] ring-1 ring-yellow-400/50') 
                : (theme === 'dark' ? 'bg-[#202c33] text-[#e9edef]' : 'bg-white text-[#111b21]')) + ' rounded-lg rounded-tr-none shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]'
        }`}>
          
          {!msg.isDeleted && !amIOwner && (
             <div className="text-[13px] font-bold mb-0.5 px-1" style={{ color: theme === 'dark' ? '#eb5528' : '#e53935' }}>
               {msg.user?.name || 'משתמש'}
             </div>
          )}

          {msg.replyTo && !msg.isDeleted && (
            <div className={`bg-black/10 border-r-4 ${amIOwner ? 'border-[#53bdeb]' : 'border-[#eb5528]'} rounded p-1.5 mb-1.5 mx-1 flex flex-col text-sm border-opacity-70`}>
              <span className={`font-bold text-xs ${amIOwner ? 'text-[#53bdeb]' : 'text-[#eb5528]'}`}>{msg.replyTo.user?.name || 'מישהו'}</span>
              <span className={`truncate opacity-80 ${theme === 'dark' ? 'text-[#e9edef]' : 'text-gray-700'}`}>{msg.replyTo.content}</span>
            </div>
          )}

          {!msg.isDeleted && isImage && (
            <div className="mb-1 mt-0.5 cursor-pointer relative" onClick={() => onClickImage?.()}>
              <img src={msg.attachmentData} alt="Attached image" className="rounded-lg max-w-full h-auto max-h-64 object-cover w-full" />
              {/* Overlay time on image if no text */}
              {!msg.content && (
                <div className="absolute bottom-1 left-1.5 flex items-center gap-1 text-[11px] text-white bg-black/40 px-1.5 py-0.5 rounded-full z-10">
                  <span className="leading-none mt-0.5">{time}</span>
                  {CheckIconState}
                </div>
              )}
            </div>
          )}
          
          {!msg.isDeleted && isPdf && (
            <a href={msg.attachmentData} download={msg.content || "document.pdf"} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 bg-[#2a3942] hover:bg-[#32454f] rounded-lg mt-1 mb-1 mx-1 transition-colors">
              <div className="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center shrink-0">
                 <FileText className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0 text-left" dir="ltr">
                 <div className="text-sm font-bold text-[#e9edef] truncate" dir="rtl">{msg.content || 'מסמך PDF'}</div>
                 <div className="text-[11px] text-[#8696a0] mt-0.5" dir="rtl">לחץ להורדה</div>
              </div>
            </a>
          )}
          
          {!msg.isDeleted && isPoll && (() => {
             let pollData: any = { question: 'סקר', options: [] };
             try { pollData = JSON.parse(msg.attachmentData) } catch(e){}
             const totalVotes = pollData.options.reduce((acc: number, opt: any) => acc + (opt.votes?.length || 0), 0)
             return (
               <div className="my-1 bg-black/10 rounded-xl p-3 w-full min-w-[220px]">
                 <div className="flex items-center gap-2 mb-3">
                   <BarChart2 className="w-4 h-4 text-[#53bdeb]" />
                   <div className="font-bold text-[#e9edef] text-[15px] leading-tight">{pollData.question}</div>
                 </div>
                 <div className="space-y-1.5">
                   {pollData.options.map((opt: any, i: number) => {
                     const votes = opt.votes || []
                     const myVote = votes.includes(currentUserId)
                     const percentage = totalVotes > 0 ? Math.round((votes.length / totalVotes) * 100) : 0
                     return (
                       <button key={i} onClick={() => alert('חיבור להצבעה בזמן אמת דורש API endpoint')} className="w-full relative group overflow-hidden bg-black/20 hover:bg-black/30 rounded-lg p-2 text-right transition-colors min-h-[36px]">
                         <div className="absolute top-0 bottom-0 right-0 bg-[#00a884]/30 transition-all duration-500" style={{width: `${percentage}%`}} />
                         <div className="relative z-10 flex justify-between items-center text-sm">
                           <span className={`font-semibold ${myVote ? 'text-[#53bdeb]' : 'text-[#e9edef]'}`}>{opt.text}</span>
                           {votes.length > 0 && <span className="text-xs font-bold text-[#e9edef]/80 bg-black/20 px-1.5 py-0.5 rounded-full">{percentage}%</span>}
                         </div>
                       </button>
                     )
                   })}
                 </div>
                 <div className="text-[11px] text-[#8696a0] mt-2 text-center font-medium">{totalVotes} הצבעות</div>
               </div>
             )
          })()}

          {!msg.isDeleted && isOrder && (() => {
             let orderData: any = null;
             try { orderData = JSON.parse(msg.attachmentData) } catch(e){}
             if (!orderData) return null;
             return (
               <a href={`/dashboard/orders?highlightId=${orderData.id}`} target="_blank" rel="noreferrer" className="block my-1.5 bg-black/10 hover:bg-black/20 rounded-xl p-3 w-full min-w-[220px] transition-colors border-r-4 border-emerald-500 text-right cursor-pointer">
                 <div className="flex items-center justify-between gap-2 mb-2">
                   <div className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                     <Store className="w-4 h-4" />
                     הזמנה: {orderData.customerName}
                   </div>
                   <div className="text-xs font-bold bg-white/20 px-1.5 py-0.5 rounded text-gray-800 dark:text-white">
                     ₪{orderData.totalPrice || 0}
                   </div>
                 </div>
                 <div className={`text-sm opacity-90 whitespace-pre-wrap leading-snug max-h-32 overflow-hidden text-ellipsis ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                   {orderData.details.replace(`📋 *הזמנה עבור ${orderData.customerName}*\n`, '')}
                 </div>
                 <div className="text-[11px] text-[#8696a0] mt-2 font-bold text-left">
                   לחץ כדי לפתוח הזמנה
                 </div>
               </a>
             )
          })()}
          
          {!msg.isDeleted && isAudio && (
            <div className="mb-0.5 mt-0.5">
              <CustomAudioPlayer src={msg.attachmentData} onPlay={handleAudioPlay} theme={theme} userImage={msg.user?.image} />
            </div>
          )}

          {msg.content && !isPdf && !isPoll && (
            <div className={`break-words whitespace-pre-wrap px-1 relative ${msg.isDeleted ? 'text-[#8696a0] italic' : ''}`}>
              {msg.content}
              {/* Invisible spacer to prevent text from overlapping absolute time */}
              <span className="inline-block w-14 h-3"></span>
            </div>
          )}

          {/* Time and Checkmarks located at the absolute bottom left of the bubble */}
          {(!isImage || msg.content) && (
            <div className={"absolute bottom-1 left-2 flex items-center gap-1 text-[11px] z-0 select-none "}>
               {msg.isEdited && !msg.isDeleted && <span className="italic mr-1 opacity-80">נערך</span>}
               <span className="leading-none mt-[2px]">{time}</span>
               {CheckIconState}
            </div>
          )}

          {/* Reactions bar - WhatsApp style overlapping bottom edge */}
          {!msg.isDeleted && Array.isArray(msg.reactions) && msg.reactions.length > 0 && (
             <button 
                onClick={() => setShowReactionsOverlay(true)}
                className={`absolute -bottom-3 border rounded-full px-1.5 py-0.5 text-[12px] shadow-sm flex items-center gap-0.5 z-10 ${amIOwner ? 'right-2' : 'left-2'} transition-colors ${
                  theme === 'dark' ? 'bg-[#2a3942] border-[#202c33] hover:bg-[#32454f]' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
             >
                {msg.reactions.map((r: any, i: number) => (
                   <span key={i} title={r.userName}>{r.emoji}</span>
                ))}
                {msg.reactions.length > 1 && <span className={`text-[10px] ml-1 font-bold leading-none ${theme === 'dark' ? 'text-[#e9edef]' : 'text-gray-500'}`}>{msg.reactions.length}</span>}
             </button>
          )}
        </div>
  );

  return (
    <>
      <div 
        ref={bubbleRef}
        className={`flex flex-col relative group ${amIOwner ? 'items-end' : 'items-start'} mb-1 transition-transform ${showMenu ? 'opacity-0 pointer-events-none' : 'z-0'}`}
        style={{ transform: translateX ? `translateX(${translateX}px)` : 'none' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onContextMenu={handleContextMenu}
      >
        {translateX > 20 && (
          <div className="absolute top-1/2 -translate-y-1/2 -left-8 text-gray-500 bg-white shadow-sm p-1.5 rounded-full z-0 transition-opacity">
            <Reply className="w-4 h-4" />
          </div>
        )}
        {bubbleContent}

      </div>

      {/* Reactions Details Overlay */}
      {showReactionsOverlay && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center pointer-events-auto">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowReactionsOverlay(false)} />
          <div className="bg-white rounded-3xl p-5 w-72 max-w-[85vw] z-10 relative animate-in zoom-in-95 shadow-2xl">
             <h3 className="text-center font-bold text-gray-800 mb-4 text-lg">מי הגיב?</h3>
             <ul className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
               {(msg.reactions || []).map((r: any, idx: number) => (
                 <li key={idx} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
                   <div className="flex items-center gap-3">
                     <span className="text-2xl drop-shadow-sm">{r.emoji}</span>
                     <div className="flex flex-col">
                       <span className="text-sm font-bold text-gray-800">
                         {r.userName || 'מישהו'} {r.userId === currentUserId && <span className="text-xs text-[#008069]">(אני)</span>}
                       </span>
                     </div>
                   </div>
                   {r.userId === currentUserId && (
                     <button 
                        onClick={() => { setShowReactionsOverlay(false); handleReaction(r.emoji); }} 
                        className="text-xs text-red-600 bg-red-100 px-3 py-1.5 rounded-full font-bold hover:bg-red-200 transition-colors"
                     >
                       הסר
                     </button>
                   )}
                 </li>
               ))}
             </ul>
             <button onClick={() => setShowReactionsOverlay(false)} className="w-full mt-4 p-3 bg-gray-100 hover:bg-gray-200 transition-colors rounded-xl text-base font-bold text-gray-700">
               סגור
             </button>
          </div>
        </div>
      )}

      {showMenu && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-auto" onTouchStart={(e) => { e.stopPropagation(); setShowMenu(false); }} onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" />
          
          <div 
             className={`absolute flex flex-col ${amIOwner ? 'items-end' : 'items-start'}`}
             style={{
               top: bubbleRef.current?.getBoundingClientRect().top,
               left: bubbleRef.current?.getBoundingClientRect().left,
               width: bubbleRef.current?.getBoundingClientRect().width,
               height: bubbleRef.current?.getBoundingClientRect().height,
               transform: translateX ? `translateX(${translateX}px)` : 'none'
             }}
             onClick={(e) => e.stopPropagation()}
             onTouchStart={(e) => e.stopPropagation()}
          >
            {bubbleContent}

            <div className={`absolute ${menuPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} ${amIOwner ? 'right-0' : 'left-0'} w-64 max-w-[80vw] rounded-xl shadow-2xl border pointer-events-auto animate-in zoom-in-95 duration-100 flex flex-col overflow-hidden z-10 scale-100 ${
              theme === 'dark' ? 'bg-[#202c33] border-[#2a3942]' : 'bg-white border-gray-200'
            }`}>
              {!msg.isDeleted && (
                <div className={`flex items-center justify-between p-2.5 border-b ${theme === 'dark' ? 'bg-[#111b21] border-[#2a3942]' : 'bg-gray-50 border-gray-100'}`}>
                  {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                    <button key={emoji} onClick={(e) => { e.stopPropagation(); setShowMenu(false); handleReaction(emoji); }} className="text-xl hover:scale-125 transition-transform active:scale-95 leading-none">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              
              {!msg.isDeleted && (
                <button 
                   onClick={(e) => { e.stopPropagation(); setShowMenu(false); onReply(); }}
                   className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-sm border-b ${
                     theme === 'dark' ? 'hover:bg-[#2a3942] text-[#e9edef] border-[#111b21]' : 'hover:bg-gray-50 text-gray-800 border-gray-100'
                   }`}
                 >
                   <span className="font-medium">הגב</span>
                   <Reply className={`w-4 h-4 ${theme === 'dark' ? 'text-[#8696a0]' : 'text-gray-400'}`} />
                 </button>
              )}
               
               {!msg.isDeleted && msg.content && (
                 <button 
                   onClick={(e) => { 
                     e.stopPropagation()
                     setShowMenu(false)
                     navigator.clipboard.writeText(msg.content)
                   }}
                   className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-sm border-b ${
                     theme === 'dark' ? 'hover:bg-[#2a3942] text-[#e9edef] border-[#111b21]' : 'hover:bg-gray-50 text-gray-800 border-gray-100'
                   }`}
                 >
                   <span className="font-medium">העתק</span>
                   <Copy className={`w-4 h-4 ${theme === 'dark' ? 'text-[#8696a0]' : 'text-gray-400'}`} />
                 </button>
               )}

               {!msg.isDeleted && amIOwner && !isTemp && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowInfo(true); }}
                   className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-sm text-indigo-400 border-b ${
                     theme === 'dark' ? 'hover:bg-[#2a3942] border-[#111b21]' : 'hover:bg-gray-50 border-gray-100'
                   }`}
                 >
                   <span className="font-medium">פרטים</span>
                   <Info className="w-4 h-4" />
                 </button>
               )}

               {!msg.isDeleted && amIOwner && !msg.attachmentType?.startsWith('image') && !msg.attachmentType?.startsWith('audio') && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(); }}
                   className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-sm text-blue-400 border-b ${
                     theme === 'dark' ? 'hover:bg-[#2a3942] border-[#111b21]' : 'hover:bg-gray-50 border-gray-100'
                   }`}
                 >
                   <span className="font-medium">ערוך</span>
                   <Edit2 className="w-4 h-4" />
                 </button>
               )}

               {!msg.isDeleted && isAdmin && !isTemp && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); setShowMenu(false); onPin?.(); }}
                   className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-sm text-yellow-500 border-b ${
                     theme === 'dark' ? 'hover:bg-[#2a3942] border-[#111b21]' : 'hover:bg-gray-50 border-gray-100'
                   }`}
                 >
                   <span className="font-medium">{msg.isPinned ? 'בטל נעצה (מנהל)' : 'נעץ הודעה (מנהל)'}</span>
                   <Pin className="w-4 h-4" />
                 </button>
               )}

               {(amIOwner || isAdmin) && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(); }}
                   className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-sm text-red-500 ${
                     theme === 'dark' ? 'hover:bg-[#2a3942]' : 'hover:bg-gray-50'
                   }`}
                 >
                   <span className="font-medium">{msg.isDeleted ? 'מחיקה סופית מכל המסכים' : 'מחק'}</span>
                   <Trash2 className="w-4 h-4" />
                 </button>
               )}
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Message Info Panel */}
      {showInfo && (
        <div className="fixed inset-0 z-[400] flex flex-col bg-[#0b141a] animate-in slide-in-from-right overflow-hidden">
          <div className="bg-[#202c33] text-[#e9edef] p-4 flex items-center gap-4 shadow-sm border-b border-[#2a3942] safe-top">
            <button onClick={() => setShowInfo(false)} className="p-2 hover:bg-white/10 rounded-full text-[#aebac1]">
              <ArrowRight className="w-6 h-6" />
            </button>
            <h2 className="font-bold text-xl">פרטי הודעה</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
            <div className="bg-[#202c33] rounded-2xl shadow-sm border border-[#2a3942] p-4 mb-6">
               <span className="text-[#8696a0] text-sm mb-2 block">הודעה שלך:</span>
               <div className="text-lg text-[#e9edef]">{msg.content || (isAudio ? '🎤 הודעה קולית' : '🖼️ תמונה')}</div>
            </div>

            <h3 className="font-bold text-[#8696a0] mb-3 text-sm px-2">ראו את ההודעה ({validReads.length} מתוך {totalOthers})</h3>
            <div className="bg-[#202c33] rounded-2xl shadow-sm border border-[#2a3942] overflow-hidden divide-y divide-[#111b21]">
               {validReads.length === 0 && <div className="p-4 text-center text-[#8696a0]">אף אחד לא ראה עדיין</div>}
               {validReads.map((r: any) => (
                 <div key={r.id} className="p-4 flex items-center justify-between">
                   <div className="font-bold text-[#e9edef]">{r.user?.name || 'משתמש'}</div>
                   <div className="text-sm text-[#8696a0]">{new Date(r.readAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} ע״י {new Date(r.readAt).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit'})}</div>
                 </div>
               ))}
            </div>

            {isAudio && (
              <div className="mt-6">
                <h3 className="font-bold text-[#8696a0] mb-3 text-sm px-2">הפעילו את ההקלטה ({validPlays.length})</h3>
                <div className="bg-[#202c33] rounded-2xl shadow-sm border border-[#2a3942] overflow-hidden divide-y divide-[#111b21]">
                  {validPlays.length === 0 && <div className="p-4 text-center text-[#8696a0]">אף אחד לא הפעיל עדיין</div>}
                  {validPlays.map((r: any) => (
                    <div key={r.id} className="p-4 flex items-center justify-between">
                      <div className="font-bold text-[#e9edef]">{r.user?.name || 'משתמש'}</div>
                      <div className="text-sm text-[#8696a0]">{new Date(r.playedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
