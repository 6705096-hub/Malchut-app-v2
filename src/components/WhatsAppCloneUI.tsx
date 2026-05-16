"use client"

import React, { useState, useRef, useEffect } from 'react'
import { 
  Search, MoreVertical, Paperclip, Smile, Mic, Send, 
  Check, CheckCheck, ArrowLeft, Image as ImageIcon,
  Reply, CornerDownLeft, Phone, Video, Info, X, Play, Pause,
  Download, Star, Trash2, Copy, Forward
} from 'lucide-react'

// --- Types ---
type MessageStatus = 'sent' | 'delivered' | 'read'
type Reaction = { emoji: string; count: number; userReacted: boolean }
type MessageType = 'text' | 'image' | 'audio' | 'document'

interface Message {
  id: string
  text: string
  timestamp: string
  isMine: boolean
  status?: MessageStatus
  replyToId?: string
  reactions?: Reaction[]
  type: MessageType
  mediaUrl?: string
  fileName?: string
  fileSize?: string
  audioDuration?: string
}

interface Chat {
  id: string
  name: string
  avatar: string
  isGroup: boolean
  isOnline: boolean
  lastSeen?: string
  unreadCount: number
  isTyping?: boolean
  messages: Message[]
}

// --- Mock Data ---
const CURRENT_USER_ID = 'me'

const MOCK_CHATS: Chat[] = [
  {
    id: 'group_team',
    name: 'צוות כללי (קייטרינג)',
    avatar: '👥',
    isGroup: true,
    isOnline: true,
    unreadCount: 3,
    isTyping: true,
    messages: [
      { id: 'm1', type: 'text', text: 'בוקר טוב לכולם! מה הלו"ז להיום?', timestamp: '08:00', isMine: false, status: 'read' },
      { id: 'm2', type: 'text', text: 'יש לנו 5 אירועים בערב. צריך לתקתק הכל.', timestamp: '08:05', isMine: true, status: 'read' },
      { id: 'm3', type: 'image', text: 'תראו איזה סידור מנות יפה יצא', mediaUrl: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=400&q=80', timestamp: '08:15', isMine: false, status: 'read', reactions: [{ emoji: '🔥', count: 4, userReacted: true }, { emoji: '😍', count: 2, userReacted: false }] },
      { id: 'm4', type: 'text', text: 'ואוו מדהים! שלחתי ללקוח.', timestamp: '08:16', isMine: true, status: 'read', replyToId: 'm3' },
      { id: 'm5', type: 'audio', text: '', audioDuration: '0:14', timestamp: '08:30', isMine: false, status: 'delivered' },
    ]
  },
  {
    id: 'user_1',
    name: 'אברמי',
    avatar: '👨‍💼',
    isGroup: false,
    isOnline: true,
    unreadCount: 0,
    messages: [
      { id: 'm1', type: 'text', text: 'היי, ראית את ההזמנה של כהן?', timestamp: 'אתמול', isMine: false, status: 'read' },
      { id: 'm2', type: 'document', text: 'הזמנה_כהן_סופי.pdf', fileName: 'הזמנה_כהן_סופי.pdf', fileSize: '2.4 MB', timestamp: 'אתמול', isMine: true, status: 'read' },
      { id: 'm3', type: 'text', text: 'תודה רבה! 🙏', timestamp: 'אתמול', isMine: false, status: 'read' },
    ]
  },
  {
    id: 'user_2',
    name: 'משה (נהג)',
    avatar: '🚚',
    isGroup: false,
    isOnline: false,
    lastSeen: 'נראה לאחרונה ב-10:45',
    unreadCount: 1,
    messages: [
      { id: 'm1', type: 'text', text: 'איפה הכתובת של האירוע בירושלים?', timestamp: '10:30', isMine: false, status: 'read' },
      { id: 'm2', type: 'text', text: 'רחוב הרצל 50, אולם אירועים', timestamp: '10:32', isMine: true, status: 'read' },
      { id: 'm3', type: 'text', text: 'הבנתי, אני יוצא לדרך.', timestamp: '10:45', isMine: false, status: 'delivered' },
    ]
  }
]

export default function WhatsAppCloneUI() {
  const [chats, setChats] = useState<Chat[]>(MOCK_CHATS)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputText, setInputText] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [contextMenu, setContextMenu] = useState<{msg: Message, x: number, y: number} | null>(null)
  const [showRightPanel, setShowRightPanel] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeChat = chats.find(c => c.id === activeChatId)
  const filteredChats = chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat?.messages])

  useEffect(() => {
    if (activeChatId) {
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, unreadCount: 0 } : c))
    }
  }, [activeChatId])

  // Click outside context menu to close
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeChatId) return

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'text',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
      status: 'sent',
      replyToId: replyingTo?.id
    }

    setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, newMessage] } : chat))
    setInputText('')
    setReplyingTo(null)

    // Simulate "Delivered" and "Read" status
    setTimeout(() => {
      setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: chat.messages.map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m) } : chat))
    }, 1500)
    
    setTimeout(() => {
      setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: chat.messages.map(m => m.id === newMessage.id ? { ...m, status: 'read' } : m) } : chat))
    }, 3000)
  }

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (!activeChatId) return
    setChats(prev => prev.map(chat => {
      if (chat.id !== activeChatId) return chat
      return {
        ...chat,
        messages: chat.messages.map(msg => {
          if (msg.id !== messageId) return msg
          const existingReaction = msg.reactions?.find(r => r.emoji === emoji)
          let newReactions = [...(msg.reactions || [])]
          if (existingReaction) {
             if(existingReaction.userReacted) {
                newReactions = newReactions.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, userReacted: false } : r).filter(r => r.count > 0)
             } else {
                newReactions = newReactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, userReacted: true } : r)
             }
          } else {
             newReactions.push({ emoji, count: 1, userReacted: true })
          }
          return { ...msg, reactions: newReactions }
        })
      }
    }))
  }

  const renderMessageStatus = (status?: MessageStatus) => {
    if (!status) return null
    if (status === 'sent') return <Check size={14} className="text-[#8696a0]" />
    if (status === 'delivered') return <CheckCheck size={14} className="text-[#8696a0]" />
    if (status === 'read') return <CheckCheck size={14} className="text-[#53bdeb]" />
    return null
  }

  const getMessageById = (chat: Chat, id?: string) => {
    if (!id) return null
    return chat.messages.find(m => m.id === id)
  }

  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ msg, x: e.clientX, y: e.clientY })
  }

  return (
    <div className="flex h-[100dvh] w-full bg-[#111b21] text-[#e9edef] overflow-hidden" dir="rtl">
      
      {/* --- LEFT PANE: CHATS LIST --- */}
      <div className={`flex flex-col border-l border-[#222d34] transition-all duration-300 ${activeChatId ? 'hidden md:flex md:w-[350px] lg:w-[400px]' : 'w-full md:w-[350px] lg:w-[400px]'} shrink-0 z-20`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-[60px] bg-[#202c33] shrink-0 border-b border-[#222d34]">
          <div className="w-10 h-10 rounded-full bg-[#6a7175] flex items-center justify-center text-xl overflow-hidden cursor-pointer shadow-sm border border-[#2a3942]">
            👑
          </div>
          <div className="flex items-center gap-2 text-[#aebac1]">
            <button className="hover:bg-[#374248] p-2 rounded-full transition-colors active:scale-95"><div className="w-5 h-5 rounded-full border-2 border-dashed border-[#aebac1]" /></button>
            <button className="hover:bg-[#374248] p-2 rounded-full transition-colors active:scale-95"><svg viewBox="0 0 24 24" height="20" width="20" preserveAspectRatio="xMidYMid meet" className="fill-current"><path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z"></path></svg></button>
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
            return (
              <div 
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`flex items-center px-3 py-3 cursor-pointer transition-colors group relative ${isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}
              >
                <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center text-2xl shrink-0 bg-[#6a7175] shadow-sm relative">
                  {chat.avatar}
                  {chat.isOnline && !chat.isGroup && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] border-2 border-[#111b21] rounded-full z-10" />
                  )}
                </div>
                <div className="flex-1 ml-4 border-b border-[#222d34] pb-3 pt-1 w-full min-w-0 pr-4 group-last:border-b-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-normal text-[17px] truncate text-[#e9edef]">{chat.name}</span>
                    <span className={`text-xs font-medium ${chat.unreadCount > 0 ? 'text-[#00a884]' : 'text-[#8696a0]'}`}>
                      {lastMsg?.timestamp || ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-[14px] text-[#8696a0] truncate flex items-center gap-1 min-w-0">
                      {chat.isTyping ? (
                         <span className="text-[#00a884] font-medium animate-pulse">מקליד/ה...</span>
                      ) : (
                        <>
                          {lastMsg?.isMine && renderMessageStatus(lastMsg.status)}
                          {lastMsg?.type === 'image' && <ImageIcon size={14} className="ml-1" />}
                          {lastMsg?.type === 'audio' && <Mic size={14} className="ml-1" />}
                          {lastMsg?.type === 'document' && <Paperclip size={14} className="ml-1" />}
                          <span className="truncate">{lastMsg?.type === 'text' ? lastMsg.text : (lastMsg?.type === 'image' ? 'תמונה' : lastMsg?.type === 'audio' ? 'הודעה קולית' : 'מסמך')}</span>
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
        
        {!activeChat ? (
          // Empty State (WhatsApp Web style)
          <div className="flex-1 flex flex-col items-center justify-center border-b-[6px] border-[#00a884] relative bg-[#222e35]">
            <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10c0-5.523 4.477-10 10-10h60c5.523 0 10 4.477 10 10v60c0 5.523-4.477 10-10 10H20c-5.523 0-10-4.477-10-10V10z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`}} />
            <div className="w-[320px] h-[320px] bg-[url('https://static.whatsapp.net/rsrc.php/v3/y6/r/wa669aeJeom.png')] bg-contain bg-no-repeat bg-center opacity-70 mb-8 mix-blend-screen" />
            <h1 className="text-[32px] font-light text-[#e9edef] mb-4 z-10">Malchut Web Chat</h1>
            <p className="text-[#8696a0] text-[14px] text-center max-w-[420px] leading-[22px] z-10">
              שלח וקבל הודעות באופן מיידי במערכת הניהול שלך.<br/>
              הודעות מסונכרנות בזמן אמת עם הצוות, תומך בשליחת מדיה, אישורי קריאה, ותצוגה מותאמת אישית.
            </p>
            <div className="mt-12 flex items-center gap-1.5 text-[#8696a0] text-[13px] z-10">
              <span>🔒</span> מוגן ומאובטח מקצה לקצה
            </div>
          </div>
        ) : (
          <>
            {/* Active Chat Header */}
            <div className="flex items-center justify-between px-4 h-[60px] bg-[#202c33] shrink-0 border-l border-[#222d34] z-10 shadow-sm relative">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveChatId(null)}
                  className="md:hidden text-[#aebac1] hover:bg-[#374248] p-2 rounded-full -mr-2 active:scale-95"
                >
                  <ArrowLeft size={20} />
                </button>
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-[#6a7175] cursor-pointer shadow-sm hover:opacity-90"
                  onClick={() => setShowRightPanel(true)}
                >
                  {activeChat.avatar}
                </div>
                <div className="flex flex-col cursor-pointer" onClick={() => setShowRightPanel(true)}>
                  <span className="font-normal text-[16px] text-[#e9edef]">{activeChat.name}</span>
                  <span className="text-[13px] text-[#8696a0]">
                    {activeChat.isTyping ? <span className="text-[#00a884] font-medium">מקליד/ה...</span> : activeChat.isOnline ? 'מחובר/ת' : activeChat.lastSeen || 'לא מקוון'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[#aebac1]">
                <button className="hover:bg-[#374248] p-2.5 rounded-full transition-colors active:scale-95 hidden sm:block"><Video size={19} /></button>
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
                {/* Date Divider */}
                <div className="flex justify-center mb-6 mt-2 sticky top-2 z-10 opacity-90">
                  <span className="bg-[#182229] border border-[#2a3942] text-[#8696a0] text-[12px] font-medium px-3 py-1.5 rounded-lg shadow-sm backdrop-blur-sm uppercase tracking-wide">
                    היום
                  </span>
                </div>
                
                {/* Encryption Warning */}
                <div className="flex justify-center mb-6">
                  <span className="bg-[#182229] border border-[#ffd279]/20 text-[#ffd279] text-[12.5px] px-4 py-2 rounded-lg shadow-sm text-center max-w-sm flex items-center justify-center gap-2">
                    <span className="text-[10px]">🔒</span> ההודעות בשיחה זו מאובטחות מקצה לקצה. אף אחד מחוץ לצ'אט לא יכול לקרוא או להאזין להן.
                  </span>
                </div>

                {activeChat.messages.map((msg, idx) => {
                  const prevMsg = idx > 0 ? activeChat.messages[idx - 1] : null
                  const isContinuous = prevMsg && prevMsg.isMine === msg.isMine
                  const replyMsg = getMessageById(activeChat, msg.replyToId)

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col mb-1 group relative w-full ${msg.isMine ? 'items-start' : 'items-end'} ${!isContinuous ? 'mt-2.5' : ''}`}
                    >
                      <div className={`relative max-w-[85%] md:max-w-[70%] rounded-[8px] shadow-sm flex flex-col ${msg.isMine ? 'bg-[#005c4b]' : 'bg-[#202c33]'}`}
                           style={{ 
                             borderTopRightRadius: msg.isMine && !isContinuous ? '0px' : '8px',
                             borderTopLeftRadius: !msg.isMine && !isContinuous ? '0px' : '8px',
                           }}
                           onContextMenu={(e) => handleContextMenu(e, msg)}
                      >
                        {/* CSS Triangle tail */}
                        {!isContinuous && (
                          <div className={`absolute top-0 w-2 h-3 ${msg.isMine ? '-right-2 text-[#005c4b]' : '-left-2 text-[#202c33]'}`}>
                            <svg viewBox="0 0 8 13" width="8" height="13" className="fill-current">
                              {msg.isMine ? (
                                 <path opacity=".13" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                              ) : (
                                 <path opacity=".13" d="M1.533 3.568L8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path>
                              )}
                              {msg.isMine ? (
                                 <path d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"></path>
                              ) : (
                                 <path d="M1.533 2.568L8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"></path>
                              )}
                            </svg>
                          </div>
                        )}

                        {/* Quoted Reply */}
                        {replyMsg && (
                          <div className="px-1.5 pt-1.5 pb-0.5">
                            <div className={`flex flex-col p-2.5 pb-2 rounded-[5px] bg-black/20 border-r-4 cursor-pointer hover:bg-black/30 transition-colors ${replyMsg.isMine ? 'border-[#53bdeb]' : 'border-[#bc68c8]'}`}>
                              <span className={`text-[12.5px] font-bold leading-tight mb-1 ${replyMsg.isMine ? 'text-[#53bdeb]' : 'text-[#bc68c8]'}`}>
                                {replyMsg.isMine ? 'את/ה' : activeChat.name}
                              </span>
                              <span className="text-[13px] text-[#e9edef]/80 line-clamp-3 leading-snug">
                                {replyMsg.type === 'image' ? '📷 תמונה' : replyMsg.type === 'audio' ? '🎤 הודעה קולית' : replyMsg.text}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Media rendering (Image) */}
                        {msg.type === 'image' && msg.mediaUrl && (
                          <div className="p-1 pb-0">
                            <img src={msg.mediaUrl} alt="Media" className="rounded-md max-w-full h-auto max-h-[300px] object-cover border border-[#ffffff10]" />
                          </div>
                        )}

                        {/* Media rendering (Document) */}
                        {msg.type === 'document' && (
                           <div className="flex items-center gap-3 bg-black/20 p-3 m-1 rounded-md border border-[#ffffff10]">
                             <div className="bg-[#bc68c8] text-white p-2.5 rounded-full"><Paperclip size={20} /></div>
                             <div className="flex flex-col">
                               <span className="text-[14px] font-medium text-[#e9edef]">{msg.fileName}</span>
                               <span className="text-[12px] text-[#8696a0] mt-0.5">{msg.fileSize} • PDF</span>
                             </div>
                           </div>
                        )}

                        {/* Audio rendering */}
                        {msg.type === 'audio' && (
                           <div className="flex items-center gap-3 p-3 min-w-[240px]">
                              <button className="w-10 h-10 rounded-full bg-[#374248] hover:bg-[#8696a0]/30 flex items-center justify-center shrink-0">
                                <Play size={20} fill="currentColor" className="ml-1" />
                              </button>
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="h-4 flex items-end gap-0.5 w-full">
                                  {Array.from({length: 20}).map((_, i) => (
                                    <div key={i} className="w-1 bg-[#8696a0] rounded-full" style={{ height: `${Math.max(10, Math.random() * 100)}%`, opacity: i < 5 ? 1 : 0.4 }} />
                                  ))}
                                </div>
                                <span className="text-[11px] text-[#8696a0]">{msg.audioDuration}</span>
                              </div>
                           </div>
                        )}

                        {/* Text Content */}
                        {msg.text && (
                          <div className={`flex items-end gap-3 flex-wrap ${msg.type !== 'text' ? 'px-2 pb-1.5' : 'px-2.5 pt-1.5 pb-2'}`}>
                            <span className="text-[14.5px] leading-[20px] whitespace-pre-wrap break-words pl-2 text-[#e9edef]">
                              {msg.text}
                            </span>
                          </div>
                        )}

                        {/* Timestamp & Ticks (Absolutely positioned inside bubble or relative if text exists) */}
                        <div className={`flex items-center gap-1 shrink-0 ml-auto justify-end ${msg.type === 'text' && !msg.text ? 'hidden' : ''} ${msg.type !== 'text' && !msg.text ? 'px-2 pb-1.5 -mt-2' : 'pr-2 pb-1.5 -mt-3'}`}>
                            <span className="text-[11px] text-[#ffffff99] font-medium tracking-wide">
                              {msg.timestamp}
                            </span>
                            {msg.isMine && renderMessageStatus(msg.status)}
                        </div>
                        
                        {/* Quick Context Menu Trigger (Down Arrow on hover) */}
                        <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div 
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-gradient-to-r from-transparent to-[#005c4b] cursor-pointer"
                            style={{ backgroundImage: msg.isMine ? 'linear-gradient(to right, transparent, #005c4b 40%)' : 'linear-gradient(to right, transparent, #202c33 40%)' }}
                            onClick={(e) => handleContextMenu(e, msg)}
                          >
                            <svg viewBox="0 0 19 20" width="19" height="20" className="fill-current text-[#ffffff99] rotate-180"><path d="M3.8 6.7l5.7 5.7 5.7-5.7 1.6 1.6-7.3 7.2-7.3-7.2 1.6-1.6z"></path></svg>
                          </div>
                        </div>

                      </div>

                      {/* Reactions Display (Overlaps the bubble bottom) */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className={`flex items-center gap-1 -mt-2.5 z-10 ${msg.isMine ? 'mr-2' : 'ml-2'}`}>
                          <div className="flex items-center bg-[#202c33] border border-[#2a3942] rounded-full px-1.5 py-0.5 shadow-md text-[13px] cursor-pointer hover:bg-[#2a3942] transition-colors gap-0.5">
                            {msg.reactions.map((r, i) => <span key={i} className="hover:scale-125 transition-transform">{r.emoji}</span>)}
                            {msg.reactions.reduce((sum, r) => sum + r.count, 0) > 1 && (
                              <span className="text-[#8696a0] font-bold text-[11px] px-1">{msg.reactions.reduce((sum, r) => sum + r.count, 0)}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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
                          <span className="text-[#00a884] text-[13px] font-bold mb-1">{replyingTo.isMine ? 'את/ה' : activeChat.name}</span>
                          <span className="text-[#8696a0] text-[13px] truncate">{replyingTo.type === 'text' ? replyingTo.text : replyingTo.type === 'image' ? '📷 תמונה' : '🎤 מדיה'}</span>
                       </div>
                       <button onClick={() => setReplyingTo(null)} className="text-[#8696a0] hover:text-[#e9edef] p-1.5 rounded-full hover:bg-[#374248] transition-colors absolute top-1.5 left-1.5">
                         <X size={16} />
                       </button>
                    </div>
                  </div>
                )}

                <div className="flex items-end gap-2 sm:gap-4 min-h-[44px]">
                  <div className="flex gap-1 text-[#8696a0] mb-1.5 shrink-0">
                    <button className="p-2 hover:bg-[#374248] rounded-full transition-colors active:scale-95"><Smile size={24} /></button>
                    <button className="p-2 hover:bg-[#374248] rounded-full transition-colors active:scale-95"><Paperclip size={24} /></button>
                  </div>
                  
                  <div className="flex-1 bg-[#2a3942] rounded-lg relative flex items-end shadow-inner border border-transparent focus-within:border-[#374248]">
                    <textarea 
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="הקלד/י הודעה"
                      className="w-full bg-transparent text-[#e9edef] placeholder-[#8696a0] text-[15px] px-4 py-2.5 outline-none resize-none max-h-32 min-h-[44px] custom-scrollbar leading-[20px]"
                      style={{ height: '44px' }}
                    />
                  </div>
                  
                  <div className="mb-1 shrink-0">
                    {inputText.trim() ? (
                      <button 
                        onClick={handleSendMessage}
                        className="p-3 text-[#00a884] hover:bg-[#374248] transition-colors rounded-full active:scale-95"
                      >
                        <Send size={24} />
                      </button>
                    ) : (
                      <button className="p-3 text-[#8696a0] hover:bg-[#374248] transition-colors rounded-full active:scale-95">
                        <Mic size={24} />
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
                    <span className="text-[#8696a0] text-[15px] mt-1">{activeChat.isGroup ? 'קבוצה · 12 משתתפים' : activeChat.lastSeen}</span>
                  </div>
                  <div className="bg-[#111b21] p-5 shadow-sm border-t border-[#222d34] flex flex-col gap-4">
                     <div className="flex items-center justify-between text-[#00a884] cursor-pointer hover:underline">
                        <span>מדיה, קישורים ומסמכים</span>
                        <ArrowLeft size={16} />
                     </div>
                     <div className="flex gap-2 mt-2">
                       <div className="w-20 h-20 bg-[#202c33] rounded-md border border-[#2a3942]"></div>
                       <div className="w-20 h-20 bg-[#202c33] rounded-md border border-[#2a3942]"></div>
                       <div className="w-20 h-20 bg-[#202c33] rounded-md border border-[#2a3942]"></div>
                     </div>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}
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
              <li className="px-5 py-2 hover:bg-[#182229] cursor-pointer transition-colors flex items-center justify-between" onClick={() => setContextMenu(null)}>העבר <Forward size={18} className="text-[#8696a0]" /></li>
              <li className="px-5 py-2 hover:bg-[#182229] cursor-pointer transition-colors flex items-center justify-between" onClick={() => setContextMenu(null)}>סמן בכוכב <Star size={18} className="text-[#8696a0]" /></li>
              <li className="px-5 py-2 hover:bg-[#182229] cursor-pointer transition-colors text-[#f15c6d] flex items-center justify-between mt-1 border-t border-[#2a3942] pt-3" onClick={() => setContextMenu(null)}>מחק <Trash2 size={18} /></li>
            </ul>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255,255,255,0.16);
          border-radius: 10px;
        }
      `}} />
    </div>
  )
}
