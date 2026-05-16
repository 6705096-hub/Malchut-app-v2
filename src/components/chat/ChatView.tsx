'use client'

import React, { useState, useEffect, useRef, FormEvent, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Send, Check, CheckCheck, Clock, Paperclip, Image as ImageIcon, FileText, X, Camera, Loader2, Trash2, Mic, Square, Reply, Play, Pause, MapPin, Search, ArrowRight, Video } from 'lucide-react'
import { useChatRealtime } from '@/hooks/useChatRealtime'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { compressImage, readFileAsBase64, isImageType, isAudioType, isPdfType } from '@/lib/fileUtils'
import { ChatSearchBar } from './ChatSearchBar'
import { ImageEditor } from './ImageEditor'
import { MessageBubble, Message } from './MessageBubble'

interface ChatViewProps {
  conversationId: string
  theme?: 'light' | 'dark'
}

// ── WhatsApp-style voice message player ──────────────────────────────────────
function VoiceMessagePlayer({ src, isMe, theme, initialDuration }: { src: string | null; isMe: boolean; theme?: 'light' | 'dark'; initialDuration?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(initialDuration || 0)
  const [current, setCurrent] = useState(0)
  
  const fmtTime = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (isPlaying) { a.pause() } else { a.play() }
  }

  if (!src) return null

  // Define colors based on theme and isMe
  const btnBg = isMe 
    ? (theme === 'dark' ? 'bg-teal-400/30 hover:bg-teal-400/50 text-teal-100' : 'bg-teal-600/20 hover:bg-teal-600/30 text-teal-800')
    : (theme === 'dark' ? 'bg-slate-600/60 hover:bg-slate-600/80 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-600');
  
  const activeBarBg = isMe
    ? (theme === 'dark' ? 'bg-teal-100' : 'bg-teal-600')
    : (theme === 'dark' ? 'bg-teal-400' : 'bg-teal-500');
  
  const inactiveBarBg = isMe
    ? (theme === 'dark' ? 'bg-teal-200/40' : 'bg-teal-600/30')
    : (theme === 'dark' ? 'bg-slate-400/40' : 'bg-slate-300');
    
  const timeText = isMe
    ? (theme === 'dark' ? 'text-teal-100/70' : 'text-teal-800/70')
    : (theme === 'dark' ? 'text-slate-400' : 'text-slate-500');

  return (
    <div className={`flex items-center gap-3 mt-1 mb-1 px-1 py-0.5 min-w-[200px] max-w-[260px]`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setProgress(0); setCurrent(0) }}
        onLoadedMetadata={() => {
          let d = audioRef.current?.duration || 0
          if (d === Infinity || isNaN(d)) d = 0 // Will update onTimeUpdate if needed
          setDuration(d)
        }}
        onTimeUpdate={() => {
          const a = audioRef.current
          if (!a) return
          let d = a.duration
          if (!isFinite(d)) d = 0 // Some browsers return Infinity for data URIs until fully buffered
          if (d > 0 && d !== duration) setDuration(d)
          
          setCurrent(a.currentTime)
          if (d > 0) setProgress((a.currentTime / d) * 100)
        }}
      />

      {/* Play/Pause button */}
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 ${btnBg}`}
      >
        {isPlaying
          ? <Pause className="w-4 h-4" />
          : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      {/* Waveform + progress */}
      <div className="flex-1 flex flex-col gap-1.5">
        {/* Waveform bars (animated when playing) */}
        <div className="flex items-end gap-[2px] h-6">
          {Array.from({ length: 20 }).map((_, i) => {
            const barH = [3,5,8,5,10,7,4,9,6,8,5,7,3,6,9,4,7,5,8,4][i]
            return (
              <div
                key={i}
                className={`rounded-full w-[3px] transition-all ${
                  progress > (i / 20) * 100 ? activeBarBg : inactiveBarBg
                } ${isPlaying ? 'animate-pulse' : ''}`}
                style={{
                  height: `${barH}px`,
                  animationDelay: `${i * 50}ms`,
                  animationDuration: '600ms'
                }}
              />
            )
          })}
        </div>

        {/* Progress bar */}
        <div className={`h-0.5 rounded-full overflow-hidden ${inactiveBarBg}`}>
          <div
            className={`h-full rounded-full transition-all ${activeBarBg}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Time */}
      <span className={`text-[10px] font-mono shrink-0 ${timeText}`}>
        {current > 0 ? fmtTime(current) : fmtTime(duration)}
      </span>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

export function ChatView({ conversationId, theme = 'dark' }: ChatViewProps) {
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id

  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<Map<string, { name: string; timeout: NodeJS.Timeout }>>(new Map())
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null)
  const [deleteMenuMsgId, setDeleteMenuMsgId] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; mode: 'for_me' | 'for_everyone' } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [messageInfo, setMessageInfo] = useState<Message | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTypingSentRef = useRef<number>(0)
  const micDownTimeRef = useRef<number>(0)

  // Voice recorder
  const { isRecording, duration: recordingDuration, startRecording, stopRecording, cancelRecording } = useVoiceRecorder()

  const handleMicPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return // Only left click / main touch
    micDownTimeRef.current = Date.now()
    startRecording()
  }

  const handleMicPointerUp = async (e: React.PointerEvent) => {
    const holdTime = Date.now() - micDownTimeRef.current
    if (holdTime < 300) {
      // It's a quick tap! Let it record. The UI will show stop/send buttons.
    } else {
      // It's a long hold and release! Send immediately if it was recording.
      if (isRecording) {
        const blob = await stopRecording()
        if (blob) sendAttachment(blob.base64, blob.mimeType)
      }
    }
  }

  const handleSendRecording = async () => {
    const blob = await stopRecording()
    if (blob) sendAttachment(blob.base64, blob.mimeType)
  }

  const scrollToBottom = (behavior: 'auto' | 'smooth' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // Listen for search toggle from header
  useEffect(() => {
    const toggle = () => setShowSearch(v => !v)
    window.addEventListener('chatToggleSearch', toggle)
    return () => window.removeEventListener('chatToggleSearch', toggle)
  }, [])

  // Advanced Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilter, setSearchFilter] = useState<'all' | 'image' | 'audio' | 'video' | 'document' | 'location'>('all')
  const [searchUser, setSearchUser] = useState<string>('all')
  const [searchDate, setSearchDate] = useState<string>('')

  // Location Share State
  const [locationStatus, setLocationStatus] = useState<'idle' | 'fetching' | 'ready'>('idle')
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number, accuracy: number} | null>(null)

  const handleLocationClick = () => {
    setShowAttachMenu(false)
    if (!navigator.geolocation) {
      alert('שירות מיקום לא נתמך בדפדפן זה')
      return
    }
    setLocationStatus('fetching')
    navigator.geolocation.getCurrentPosition((pos) => {
      setCurrentLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy)
      })
      setLocationStatus('ready')
    }, () => {
      alert('שגיאה בקבלת מיקום. ודא שיש הרשאה.')
      setLocationStatus('idle')
    }, { enableHighAccuracy: true })
  }

  const sendLocationMessage = async (type: 'exact' | 'live') => {
    if (!currentLocation) return
    const data = `${currentLocation.lat},${currentLocation.lng},${type}`
    setLocationStatus('idle')
    setCurrentLocation(null)
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          text: type === 'live' ? 'מיקום בזמן אמת' : 'מיקום מדויק',
          attachmentData: data,
          attachmentType: 'location'
        })
      })
    } catch {}
  }

  // Derived filtered results from currently loaded messages
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim() && searchFilter === 'all' && searchUser === 'all' && !searchDate) return []
    
    return messages.filter(m => {
      // Filter by text
      if (searchQuery.trim() && !(m.text || '').toLowerCase().includes(searchQuery.toLowerCase())) return false
      
      // Filter by type
      if (searchFilter === 'image' && !m.attachmentType?.startsWith('image')) return false
      if (searchFilter === 'audio' && !m.attachmentType?.startsWith('audio')) return false
      if (searchFilter === 'video' && !m.attachmentType?.startsWith('video')) return false
      if (searchFilter === 'document' && !['application/pdf'].includes(m.attachmentType || '')) return false
      if (searchFilter === 'location' && m.attachmentType !== 'location') return false

      // Filter by user
      if (searchUser !== 'all' && m.senderId !== searchUser) return false

      // Filter by date
      if (searchDate) {
        const msgDate = new Date(m.createdAt).toISOString().split('T')[0]
        if (msgDate !== searchDate) return false
      }

      return true
    }).reverse() // show newest first in search
  }, [messages, searchQuery, searchFilter, searchUser, searchDate])

  // Get unique participants for filter
  const uniqueParticipants = React.useMemo(() => {
    const users = new Map()
    messages.forEach(m => { if (m.sender) users.set(m.senderId, m.sender.name) })
    return Array.from(users.entries())
  }, [messages])

  // Smart date label helper
  const getDateLabel = (dateStr: string): string => {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'היום'
    if (d.toDateString() === yesterday.toDateString()) return 'אתמול'
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  // Fetch initial messages (latest 50)
  const PAGE_SIZE = 50
  useEffect(() => {
    let mounted = true
    const fetchMessages = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/messages?conversationId=${conversationId}&limit=${PAGE_SIZE}`)
        if (!res.ok) throw new Error('Failed to fetch messages')
        const data = await res.json()
        if (mounted) {
          setMessages(data.messages || [])
          setHasMore(data.hasMore ?? false)
          setTimeout(() => scrollToBottom('auto'), 100)
        }
      } catch (error) {
        console.error('Error fetching messages:', error)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    fetchMessages()
    return () => { mounted = false }
  }, [conversationId])

  // Load older messages (cursor-based pagination)
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || !hasMore || messages.length === 0) return
    const oldestId = messages[0]?.id
    if (!oldestId) return

    setIsLoadingOlder(true)
    try {
      const res = await fetch(
        `/api/messages?conversationId=${conversationId}&limit=${PAGE_SIZE}&cursor=${oldestId}`
      )
      if (!res.ok) throw new Error('Failed to load older messages')
      const data = await res.json()
      const olderMsgs = data.messages || []

      if (olderMsgs.length > 0) {
        // Preserve scroll position
        const container = messagesContainerRef.current
        const prevHeight = container?.scrollHeight || 0

        setMessages((prev) => {
          // Avoid duplicates
          const existingIds = new Set(prev.map((m) => m.id))
          const newMsgs = olderMsgs.filter((m: Message) => !existingIds.has(m.id))
          return [...newMsgs, ...prev]
        })

        // Restore scroll position after prepend
        requestAnimationFrame(() => {
          if (container) {
            const newHeight = container.scrollHeight
            container.scrollTop = newHeight - prevHeight
          }
        })
      }
      setHasMore(data.hasMore ?? false)
    } catch (error) {
      console.error('Error loading older messages:', error)
    } finally {
      setIsLoadingOlder(false)
    }
  }, [conversationId, messages, isLoadingOlder, hasMore])

  // Auto-load older messages when scrolled near top
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      if (container.scrollTop < 80 && hasMore && !isLoadingOlder) {
        loadOlderMessages()
      }
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMore, isLoadingOlder, loadOlderMessages])

  // Mark as read
  useEffect(() => {
    if (!conversationId || messages.length === 0) return
    const unreadFromOthers = messages.filter(
      (m) => m.senderId !== currentUserId && m.status !== 'READ'
    )
    if (unreadFromOthers.length > 0) {
      fetch('/api/messages/update-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      }).catch(console.error)
    }
  }, [conversationId, messages, currentUserId])

  // Real-time
  useChatRealtime({
    conversationId,
    onNewMessage: (newMsg) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })
      // Clear typing for sender (they just sent a message)
      setTypingUsers((prev) => {
        const next = new Map(prev)
        if (next.has(newMsg.senderId)) {
          clearTimeout(next.get(newMsg.senderId)!.timeout)
          next.delete(newMsg.senderId)
        }
        return next
      })
      setTimeout(() => scrollToBottom('smooth'), 100)
    },
    onStatusUpdated: (update) => {
      if (update.status === 'READ') {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === currentUserId && m.status !== 'READ'
              ? { ...m, status: 'READ' }
              : m
          )
        )
      }
    },
    onTyping: (data: any) => {
      // data comes as { userId, userName, conversationId, at } from our typing route
      const userId = data.userId || data[0]
      const userName = data.userName || data[0]
      if (!userId || userId === currentUserId) return

      setTypingUsers((prev) => {
        const next = new Map(prev)
        // Clear previous timeout for this user
        if (next.has(userId)) {
          clearTimeout(next.get(userId)!.timeout)
        }
        // Auto-expire typing after 4 seconds
        const timeout = setTimeout(() => {
          setTypingUsers((p) => {
            const n = new Map(p)
            n.delete(userId)
            return n
          })
        }, 4000)
        next.set(userId, { name: userName, timeout })
        return next
      })
    },
    onMessageDeleted: (data) => {
      // For 'delete for everyone': mark as deleted in local state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, isDeleted: true, text: null, attachmentData: null, attachmentType: null }
            : m
        )
      )
    },
  })

  // ── Send typing event (debounced) ──
  const sendTypingEvent = () => {
    const now = Date.now()
    // Throttle: only send once every 2 seconds
    if (now - lastTypingSentRef.current < 2000) return
    lastTypingSentRef.current = now

    fetch(`/api/conversations/${conversationId}/typing`, {
      method: 'POST',
    }).catch(() => {})
  }

  // Cleanup typing timeouts on unmount
  useEffect(() => {
    return () => {
      typingUsers.forEach((v) => clearTimeout(v.timeout))
    }
  }, []) // eslint-disable-line

  // ── Scroll to a specific message by ID (for search) ──
  const scrollToMessage = useCallback((messageId: string) => {
    const container = messagesContainerRef.current
    if (!container) return
    const el = container.querySelector(`[data-msg-id="${messageId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedMsgId(messageId)
      setTimeout(() => setHighlightedMsgId(null), 2000)
    }
  }, [])

  // ── Delete message — shows confirmation first ──
  const requestDelete = (messageId: string, mode: 'for_me' | 'for_everyone') => {
    setDeleteMenuMsgId(null)
    setDeleteConfirm({ id: messageId, mode })
  }

  const handleDeleteMessage = async (messageId: string, mode: 'for_me' | 'for_everyone') => {
    setDeleteConfirm(null)
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'שגיאה במחיקה')
        return
      }
      if (mode === 'for_me') {
        setMessages((prev) => prev.filter((m) => m.id !== messageId))
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, text: null, attachmentData: null, attachmentType: null }
              : m
          )
        )
      }
    } catch {
      alert('שגיאה במחיקת הודעה')
    }
  }

  // ── Bulk delete selected ──
  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setDeleteConfirm({ id: `bulk:${ids.join(',')}`, mode: 'for_me' })
  }

  const executeBulkDelete = async (ids: string[], mode: 'for_me' | 'for_everyone') => {
    await Promise.all(ids.map(id => fetch(`/api/messages/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    }).then(r => r.ok && mode === 'for_me'
      ? setMessages(p => p.filter(m => m.id !== id))
      : setMessages(p => p.map(m => m.id === id ? { ...m, isDeleted: true, text: null, attachmentData: null, attachmentType: null } : m))
    )))
    setSelectedIds(new Set())
    setIsSelecting(false)
  }

  // ── Edit message ──
  const handleEdit = async (updated: Message) => {
    try {
      const res = await fetch(`/api/messages/${updated.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: updated.text }),
      })
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, text: updated.text } : m))
      }
    } catch { /* silent */ }
  }

  // ── Toggle message selection ──
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ── Send text message ──
  const handleSend = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || isSending) return

    const tempId = `temp-${Date.now()}`
    const newMsgText = inputText.trim()

    const optimisticMessage: Message = {
      id: tempId,
      text: newMsgText,
      senderId: currentUserId || 'me',
      status: 'SENT',
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId || 'me', name: session?.user?.name || 'אני' },
      replyToId: replyingTo?.id || null,
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.sender } : null,
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setInputText('')
    setReplyingTo(null)
    setIsSending(true)
    setTimeout(() => scrollToBottom('smooth'), 50)

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, text: newMsgText, replyToId: replyingTo?.id || null }),
      })
      if (!res.ok) throw new Error('Failed to send')
      const savedMessage = await res.json()
      setMessages((prev) => prev.map((m) => (m.id === tempId ? savedMessage : m)))
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }

  // ── Send attachment (image or file) ──
  const sendAttachment = async (base64: string, mimeType: string, caption?: string) => {
    const tempId = `temp-${Date.now()}`

    const optimisticMessage: Message = {
      id: tempId,
      text: caption || null,
      senderId: currentUserId || 'me',
      status: 'SENT',
      createdAt: new Date().toISOString(),
      attachmentData: base64,
      attachmentType: mimeType,
      sender: { id: currentUserId || 'me', name: session?.user?.name || 'אני' },
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setShowAttachMenu(false)
    setReplyingTo(null)
    setIsUploading(true)
    setTimeout(() => scrollToBottom('smooth'), 50)

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          text: caption || null,
          attachmentData: base64,
          attachmentType: mimeType,
          replyToId: replyingTo?.id || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to send attachment')
      const savedMessage = await res.json()
      setMessages((prev) => prev.map((m) => (m.id === tempId ? savedMessage : m)))
    } catch (error) {
      console.error('Error sending attachment:', error)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setIsUploading(false)
    }
  }

  // ── Handle image file selected — open editor first ──
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset
    // Read as data URL and open editor
    const reader = new FileReader()
    reader.onload = (ev) => setPendingImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // Called when user confirms from ImageEditor
  const handleEditorConfirm = async (editedBase64: string, caption: string) => {
    setPendingImage(null)
    try {
      setIsUploading(true)
      // editedBase64 is already a data URL (jpeg), extract mime
      const mimeType = 'image/jpeg'
      const base64 = editedBase64.split(',')[1] ?? editedBase64
      await sendAttachment(base64, mimeType, caption || undefined)
    } catch (err: any) {
      console.error('Image send error:', err)
      alert(err.message || 'שגיאה בשליחת תמונה')
    } finally {
      setIsUploading(false)
    }
  }

  // ── Handle document file selected ──
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset

    try {
      setIsUploading(true)
      const { base64, mimeType, fileName } = await readFileAsBase64(file)
      await sendAttachment(base64, mimeType, fileName)
    } catch (err: any) {
      console.error('File upload error:', err)
      alert(err.message || 'שגיאה בהעלאת קובץ')
    } finally {
      setIsUploading(false)
    }
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'READ':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
      case 'DELIVERED':
        return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
      case 'SENT':
        return <Check className="w-3.5 h-3.5 text-gray-400" />
      default:
        return <Clock className="w-3 h-3 text-gray-400" />
    }
  }

  // ── Render attachment inside bubble ──
  const renderAttachment = (msg: Message) => {
    if (!msg.attachmentData || !msg.attachmentType) return null

    // Image
    if (isImageType(msg.attachmentType)) {
      return (
        <button
          onClick={() => setPreviewImage(msg.attachmentData!)}
          className="block rounded-md overflow-hidden mt-1 mb-1 max-w-[280px] cursor-pointer"
        >
          <img
            src={msg.attachmentData}
            alt="תמונה"
            className="w-full h-auto max-h-[300px] object-cover rounded-md"
            loading="lazy"
          />
        </button>
      )
    }

    // Location
    if (msg.attachmentType === 'location') {
      const parts = msg.attachmentData.split(',')
      const lat = parts[0]
      const lng = parts[1]
      const locType = parts[2] || 'exact' // fallback
      const mapUrl = `https://maps.google.com/?q=${lat},${lng}`
      const isLive = locType === 'live'
      
      return (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-1 mb-1 rounded-xl overflow-hidden border border-white/10 relative"
        >
          <div className="bg-slate-800 flex flex-col items-center justify-center p-5">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${isLive ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <MapPin className={`w-7 h-7 ${isLive ? 'text-green-500 animate-pulse' : 'text-red-500'}`} />
            </div>
            <span className={`text-[15px] font-bold ${isLive ? 'text-green-400' : 'text-red-400'}`}>
              {isLive ? 'מיקום בזמן אמת' : 'מיקום נוכחי'}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 text-center px-2">
              {isLive ? 'מתעדכן ברקע - לחץ לפתיחה במפה' : 'לחץ לניווט ב-Google Maps'}
            </span>
          </div>
        </a>
      )
    }

    // Audio — WhatsApp-style voice message player
    if (isAudioType(msg.attachmentType)) {
      const durationMatch = msg.attachmentType.match(/duration=(\d+)/)
      const initialDuration = durationMatch ? parseInt(durationMatch[1], 10) : undefined
      return <VoiceMessagePlayer src={msg.attachmentData} isMe={msg.senderId === currentUserId} theme={theme} initialDuration={initialDuration} />
    }

    // PDF
    if (isPdfType(msg.attachmentType)) {
      return (
        <a
          href={msg.attachmentData}
          download={msg.text || 'document.pdf'}
          className="flex items-center gap-2 mt-1 mb-1 bg-white/5 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors"
        >
          <FileText className="w-8 h-8 text-red-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{msg.text || 'מסמך PDF'}</div>
            <div className="text-[10px] text-slate-400">PDF</div>
          </div>
        </a>
      )
    }

    // Generic file
    return (
      <a
        href={msg.attachmentData}
        download={msg.text || 'file'}
        className="flex items-center gap-2 mt-1 mb-1 bg-white/5 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors"
      >
        <FileText className="w-6 h-6 text-slate-400 flex-shrink-0" />
        <span className="text-sm truncate">{msg.text || 'קובץ'}</span>
      </a>
    )
  }

  return (
    <div className={`flex flex-col h-full overflow-hidden w-full max-w-2xl mx-auto border-x relative shadow-2xl transition-colors ${theme === 'dark' ? 'bg-[#0B1120] text-slate-100 border-white/5' : 'bg-[#E5DDD5] text-slate-900 border-slate-300'}`}>

      {/* ── Advanced Search Modal/Drawer ── */}
      {showSearch && (
        <div className={`absolute inset-0 z-[200] flex flex-col transition-colors ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-[#F0F2F5]'}`}>
          {/* Header */}
          <div className={`backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b shrink-0 ${theme === 'dark' ? 'bg-[#0F172A]/80 border-white/10' : 'bg-white/90 border-slate-200 shadow-sm'}`}>
            <button onClick={() => setShowSearch(false)} className={`p-2 -mr-2 rounded-full transition-colors active:scale-95 ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}>
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${theme === 'dark' ? 'bg-slate-800/80 border border-white/5' : 'bg-white border border-slate-300'}`}>
              <Search className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                placeholder="חיפוש בהודעות, תמונות, קול ועוד..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full bg-transparent outline-none text-sm ${theme === 'dark' ? 'text-slate-100 placeholder-slate-400' : 'text-slate-900 placeholder-slate-500'}`}
              />
            </div>
          </div>

          {/* Filters Area */}
          <div className={`px-4 py-3 border-b shrink-0 flex flex-col gap-3 ${theme === 'dark' ? 'bg-[#0F172A]/40 border-white/5' : 'bg-white border-slate-200'}`}>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              <button onClick={() => setSearchFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${searchFilter === 'all' ? 'bg-teal-500 text-white' : (theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700')}`}>הכל</button>
              <button onClick={() => setSearchFilter('image')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${searchFilter === 'image' ? 'bg-teal-500 text-white' : (theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700')}`}><ImageIcon className="w-3.5 h-3.5"/> תמונות</button>
              <button onClick={() => setSearchFilter('audio')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${searchFilter === 'audio' ? 'bg-teal-500 text-white' : (theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700')}`}><Mic className="w-3.5 h-3.5"/> הודעות קוליות</button>
              <button onClick={() => setSearchFilter('location')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${searchFilter === 'location' ? 'bg-teal-500 text-white' : (theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700')}`}><MapPin className="w-3.5 h-3.5"/> מיקומים</button>
              <button onClick={() => setSearchFilter('document')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${searchFilter === 'document' ? 'bg-teal-500 text-white' : (theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700')}`}><FileText className="w-3.5 h-3.5"/> מסמכים</button>
            </div>
            
            <div className="flex gap-2">
              <select 
                value={searchUser} 
                onChange={e => setSearchUser(e.target.value)} 
                className={`flex-1 px-3 py-2 rounded-lg text-xs outline-none appearance-none transition-colors ${theme === 'dark' ? 'bg-slate-800 text-slate-200 border border-white/5' : 'bg-slate-100 text-slate-700 border border-slate-300'}`}
              >
                <option value="all">כל המשתמשים</option>
                {uniqueParticipants.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              <input 
                type="date" 
                value={searchDate} 
                onChange={e => setSearchDate(e.target.value)} 
                className={`flex-1 px-3 py-2 rounded-lg text-xs outline-none transition-colors ${theme === 'dark' ? 'bg-slate-800 text-slate-200 border border-white/5' : 'bg-slate-100 text-slate-700 border border-slate-300'}`}
              />
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <Search className="w-12 h-12 opacity-20" />
                <p className="text-sm">התחל להקליד כדי לחפש או בחר מסנן</p>
              </div>
            ) : (
              searchResults.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => {
                    setShowSearch(false)
                    scrollToMessage(msg.id)
                  }}
                  className={`w-full text-right p-3 rounded-xl flex flex-col gap-1 transition-colors ${theme === 'dark' ? 'hover:bg-white/5 border border-white/5' : 'bg-white hover:bg-slate-50 border border-slate-200 shadow-sm'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-teal-500 text-xs font-semibold">{msg.sender?.name ?? ''}</span>
                    <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{formatTime(msg.createdAt)}</span>
                  </div>
                  <div className={`text-sm truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                    {msg.text || (msg.attachmentType?.startsWith('image') ? '🖼️ תמונה' : msg.attachmentType?.startsWith('audio') ? '🎤 הודעה קולית' : msg.attachmentType === 'location' ? '📍 מיקום' : '📎 קובץ')}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Location Share Modal ── */}
      {locationStatus !== 'idle' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-[#0F172A]' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>שלח מיקום</h3>
            
            {locationStatus === 'fetching' ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>מאתר את המיקום שלך בדיוק מירבי...</span>
              </div>
            ) : currentLocation ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => sendLocationMessage('live')}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-colors text-right ${theme === 'dark' ? 'bg-slate-800/80 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'}`}
                >
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-green-500 animate-pulse" />
                  </div>
                  <div>
                    <div className={`font-bold text-[15px] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>שתף מיקום בזמן אמת</div>
                    <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      יעודכן ברקע ככל שתנוע
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => sendLocationMessage('exact')}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-colors text-right ${theme === 'dark' ? 'bg-slate-800/80 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'}`}
                >
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <div className={`font-bold text-[15px] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>שלח מיקום נוכחי</div>
                    <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      מדויק עד {currentLocation.accuracy} מטרים
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => { setLocationStatus('idle'); setCurrentLocation(null); }}
                  className={`mt-2 w-full p-3 text-[15px] font-bold rounded-xl transition-colors ${theme === 'dark' ? 'text-slate-400 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  ביטול
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Message Info Modal ── */}
      {messageInfo && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={() => setMessageInfo(null)}>
          <div className="bg-slate-800 rounded-2xl shadow-2xl p-5 w-full max-w-xs border border-white/10 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-slate-100 font-semibold text-base">פרטי הודעה</h3>
              <button onClick={() => setMessageInfo(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-sm text-slate-300">נשלחה</span>
                <div className="flex items-center gap-2 text-xs text-teal-400">
                  <span>{new Date(messageInfo.createdAt).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}</span>
                  <Check className="w-4 h-4" />
                </div>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-sm text-slate-300">נמסרה</span>
                <div className="flex items-center gap-2 text-xs text-teal-400">
                  <span>{new Date(new Date(messageInfo.createdAt).getTime() + 1500).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}</span>
                  <CheckCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-sm text-slate-300">{messageInfo.attachmentType?.startsWith('audio/') ? 'הושמעה' : 'נקראה'}</span>
                <div className="flex items-center gap-2 text-xs text-blue-400">
                  <span>{new Date(new Date(messageInfo.createdAt).getTime() + 4500).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}</span>
                  <CheckCheck className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Editor overlay ── */}
      {pendingImage && (
        <ImageEditor
          src={pendingImage}
          onConfirm={handleEditorConfirm}
          onCancel={() => setPendingImage(null)}
        />
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-slate-800 rounded-2xl shadow-2xl p-5 w-full max-w-xs border border-white/10 animate-in zoom-in-95 duration-150">
            <h3 className="text-slate-100 font-semibold text-base mb-1">
              {deleteConfirm.mode === 'for_everyone' ? 'מחק לכולם?' : 'מחק אצלך?'}
            </h3>
            <p className="text-slate-400 text-sm mb-5">
              {deleteConfirm.id.startsWith('bulk:')
                ? `תמחק ${deleteConfirm.id.split(':')[1].split(',').length} הודעות אצלך.`
                : deleteConfirm.mode === 'for_everyone'
                  ? 'ההודעה תימחק אצל כל המשתתפים בשיחה.'
                  : 'ההודעה תוסר רק מאצלך.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:bg-white/10 transition-colors"
              >
                בטל
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.id.startsWith('bulk:')) {
                    const ids = deleteConfirm.id.split(':')[1].split(',')
                    setDeleteConfirm(null)
                    executeBulkDelete(ids, deleteConfirm.mode)
                  } else {
                    handleDeleteMessage(deleteConfirm.id, deleteConfirm.mode)
                  }
                }}
                className="px-4 py-2 rounded-xl text-sm bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {deleteConfirm.mode === 'for_everyone' ? 'מחק לכולם' : 'מחק אצלי'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Image Preview ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
          >
            <X className="w-7 h-7" />
          </button>
          <img
            src={previewImage}
            alt="תצוגה מקדימה"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}

      {/* ── Search Bar (toggled from header) ── */}
      {showSearch && <ChatSearchBar conversationId={conversationId} onResultClick={scrollToMessage} />}

      {/* ── Multi-select toolbar ── */}
      {isSelecting && (
        <div className="bg-slate-800/90 backdrop-blur-md px-4 py-2.5 flex items-center justify-between border-b border-white/10 shrink-0 z-10">
          <button
            onClick={() => { setIsSelecting(false); setSelectedIds(new Set()) }}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            ביטול
          </button>
          <span className="text-sm text-slate-300">{selectedIds.size} נבחרו</span>
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            className="text-sm text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            מחק
          </button>
        </div>
      )}

      {/* ── Chat Messages Area ── */}
      <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth transition-colors ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-[#E5DDD5]'}`}>
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
          </div>
        ) : (
          <>
            {isLoadingOlder && (
              <div className="flex justify-center py-3">
                <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
              </div>
            )}
            {!hasMore && messages.length > 0 && (
              <div className="text-center py-4">
                <span className={`text-xs rounded-full px-4 py-1.5 shadow-sm ${theme === 'dark' ? 'text-slate-400 bg-slate-800/50' : 'text-slate-600 bg-white/80'}`}>תחילת השיחה</span>
              </div>
            )}
            {messages
              // Show all messages — deleted-for-me are filtered, deleted-for-everyone show placeholder
              .filter((msg) => {
                const deletedFor = (msg.deletedForUsers as string[]) || []
                return !deletedFor.includes(currentUserId || '')
              })
              .map((msg, index, arr) => {
                const isMe = msg.senderId === currentUserId
                const prevMsg = arr[index - 1]
                const showDateSep = !prevMsg || getDateLabel(msg.createdAt) !== getDateLabel(prevMsg.createdAt)
                return (
                  <React.Fragment key={msg.id}>
                    {showDateSep && (
                      <div className="flex items-center justify-center py-3">
                        <span className={`text-xs rounded-full px-3 py-1 shadow-sm ${theme === 'dark' ? 'text-slate-300 bg-slate-800/60' : 'text-slate-600 bg-white/80'}`}>
                          {getDateLabel(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <MessageBubble
                      msg={msg}
                      isMe={isMe}
                      currentUserId={currentUserId || ''}
                      isAdmin={(session?.user as any)?.role === 'ADMIN'}
                      isSelected={selectedIds.has(msg.id)}
                      isSelecting={isSelecting}
                      highlightedMsgId={highlightedMsgId}
                      onReply={(m) => setReplyingTo(m)}
                      onDelete={(id, mode) => setDeleteConfirm({ id, mode })}
                      onCopy={(text) => navigator.clipboard.writeText(text).catch(() => {})}
                      onForward={(m) => alert(`העבר: ${m.text || 'קובץ'}`)}
                      onEdit={handleEdit}
                      onScrollToReply={scrollToMessage}
                      onToggleSelect={toggleSelect}
                      onLongPress={() => setIsSelecting(true)}
                      onShowInfo={setMessageInfo}
                      renderAttachment={renderAttachment}
                      formatTime={formatTime}
                      getStatusIcon={getStatusIcon}
                      theme={theme}
                    />
                  </React.Fragment>
                )
              })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Typing Indicator ── */}
      {typingUsers.size > 0 && (
        <div className={`px-4 py-1.5 flex items-center gap-2 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-[#E5DDD5]'}`}>
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-teal-500 text-xs font-medium">
            {Array.from(typingUsers.values()).map(v => v.name).join(', ')} כותב/ת...
          </span>
        </div>
      )}

      {/* ── Uploading Indicator ── */}
      {isUploading && (
        <div className={`backdrop-blur-md px-4 py-2 flex items-center gap-2 text-xs border-t ${theme === 'dark' ? 'bg-[#0F172A]/80 text-slate-400 border-white/5' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
          <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
          <span>מעלה קובץ...</span>
        </div>
      )}

      {/* ── Attachment Menu Popup ── */}
      {showAttachMenu && (
        <div className={`rounded-2xl mx-3 mb-2 p-3 flex gap-4 justify-center animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-lg border ${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200'}`}>
          <button
            onClick={() => { imageInputRef.current?.click(); }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl active:scale-95 transition-all ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
          >
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-purple-400" />
            </div>
            <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>גלריה</span>
          </button>

          <button
            onClick={() => { cameraInputRef.current?.click(); }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl active:scale-95 transition-all ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
          >
            <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
              <Camera className="w-6 h-6 text-pink-400" />
            </div>
            <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>מצלמה</span>
          </button>

          <button
            onClick={() => { fileInputRef.current?.click(); }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl active:scale-95 transition-all ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>מסמך</span>
          </button>

          <button
            onClick={handleLocationClick}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl active:scale-95 transition-all ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
          >
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-green-500" />
            </div>
            <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>מיקום</span>
          </button>
        </div>
      )}

      {/* ── Hidden File Inputs ── */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* ── Reply Preview ── */}
      {replyingTo && (
        <div className="bg-slate-800/80 backdrop-blur-md px-4 py-2 flex items-center gap-2 border-t border-white/5">
          <div className="flex-1 border-r-2 border-teal-500 pr-2 min-w-0">
            <div className="text-[10px] font-semibold text-teal-400">{replyingTo.sender.name}</div>
            <div className="text-[11px] text-slate-400 truncate">
              {replyingTo.text || '📎 קובץ מצורף'}
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Message Input Area ── */}
      <div className={`p-2 flex items-end gap-2 shrink-0 z-10 transition-colors ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-[#F0F2F5]'}`}>

        {isRecording ? (
          /* ── Voice Recording Mode ── */
          <div className={`flex-1 flex items-center justify-between rounded-[24px] px-4 py-2 min-h-[48px] shadow-sm transition-colors ${theme === 'dark' ? 'bg-[#2A3942]' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <button
                onClick={cancelRecording}
                className="p-2 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-200/20 transition-all"
                aria-label="בטל הקלטה"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <span className="text-slate-400 text-xs animate-[pulse_2s_infinite] opacity-70 whitespace-nowrap">{"<"} ביטול</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} text-[15px] font-mono tracking-wider`}>
                {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </span>
              <Mic className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
          </div>
        ) : (
          /* ── Normal Input Mode ── */
          <div className={`flex-1 flex items-end rounded-[24px] shadow-sm transition-colors ${theme === 'dark' ? 'bg-[#2A3942]' : 'bg-white'}`}>
            
            {/* Icons inside the input on the right (visual right) */}
            <div className="flex items-center gap-1 px-2 pb-1">
              <button
                onClick={() => { setShowAttachMenu(!showAttachMenu) }}
                className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
                aria-label="צרף קובץ"
              >
                {showAttachMenu ? <X className="w-[22px] h-[22px]" /> : <Paperclip className="w-[22px] h-[22px] transform -rotate-45" />}
              </button>
              <button
                onClick={() => { cameraInputRef.current?.click() }}
                className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
                aria-label="מצלמה"
              >
                <Camera className="w-[22px] h-[22px]" />
              </button>
            </div>

            <form onSubmit={handleSend} className="flex-1 flex">
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value)
                  if (e.target.value.trim()) sendTypingEvent()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="הודעה"
                className={`flex-1 bg-transparent px-4 py-[14px] text-[15px] outline-none resize-none max-h-32 min-h-[48px] leading-relaxed ${theme === 'dark' ? 'text-white placeholder-slate-400' : 'text-slate-900 placeholder-slate-500'}`}
                rows={1}
                dir="auto"
              />
            </form>
          </div>
        )}

        {/* Send or Mic button (Left Side) */}
        <div className="flex-shrink-0 relative w-[48px] h-[48px]">
          {isRecording ? (
            <div className="absolute inset-0 flex items-center justify-center scale-100 opacity-100 rotate-0 transition-all duration-300">
              <button
                onClick={handleSendRecording}
                className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md active:scale-95 hover:bg-teal-600 transition-colors"
                aria-label="שלח הקלטה"
              >
                <Send className="w-5 h-5 -ml-1 mt-0.5" style={{ transform: 'rotate(180deg)' }} />
              </button>
            </div>
          ) : (
            <>
              <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${inputText.trim() ? 'scale-100 opacity-100 rotate-0' : 'scale-50 opacity-0 -rotate-90 pointer-events-none'}`}>
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md active:scale-95 hover:bg-teal-600 transition-colors"
                  aria-label="שלח הודעה"
                >
                  <Send className="w-5 h-5 -ml-1 mt-0.5" style={{ transform: 'rotate(180deg)' }} />
                </button>
              </div>
              <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${!inputText.trim() ? 'scale-100 opacity-100 rotate-0' : 'scale-50 opacity-0 rotate-90 pointer-events-none'}`}>
                <button
                  onPointerDown={handleMicPointerDown}
                  onPointerUp={handleMicPointerUp}
                  onPointerCancel={handleMicPointerUp}
                  className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md active:scale-95 hover:bg-teal-600 transition-colors touch-none select-none"
                  aria-label="הקלט הודעה קולית"
                >
                  <Mic className="w-6 h-6" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
