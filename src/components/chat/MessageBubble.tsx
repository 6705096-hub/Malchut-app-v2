'use client'

/**
 * MessageBubble — self-contained bubble component with:
 * - Long-press / right-click → WhatsApp-style context menu
 * - Swipe right → Reply (with smooth animation + icon)
 * - Swipe left → Quick delete (triggers confirm)
 * - Multi-select support (checkbox on left)
 */

import React, { useRef, useState, useCallback } from 'react'
import { Reply, Trash2, Copy, Forward, Pencil, Download, Check } from 'lucide-react'
import { isImageType, isAudioType } from '@/lib/fileUtils'

export interface Message {
  id: string
  text: string | null
  senderId: string
  status: 'SENT' | 'DELIVERED' | 'READ'
  createdAt: string
  attachmentData?: string | null
  attachmentType?: string | null
  isDeleted?: boolean
  deletedForUsers?: string[]
  replyToId?: string | null
  replyTo?: { id: string; text: string | null; sender: { name: string } } | null
  sender: { id: string; name: string }
}

interface Props {
  msg: Message
  isMe: boolean
  currentUserId: string
  isAdmin: boolean
  isSelected: boolean
  isSelecting: boolean
  highlightedMsgId: string | null
  onReply: (msg: Message) => void
  onDelete: (id: string, mode: 'for_me' | 'for_everyone') => void
  onCopy: (text: string) => void
  onForward: (msg: Message) => void
  onEdit: (msg: Message) => void
  onScrollToReply: (id: string) => void
  onToggleSelect: (id: string) => void
  onLongPress: () => void  // enters select mode
  onShowInfo: (msg: Message) => void
  renderAttachment: (msg: Message) => React.ReactNode
  formatTime: (iso: string) => React.ReactNode
  getStatusIcon: (status: string) => React.ReactNode
  theme?: 'light' | 'dark'
}

const SWIPE_THRESHOLD = 60   // px to trigger action
const SWIPE_MAX = 90         // max visual travel

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export function MessageBubble({
  msg, isMe, currentUserId, isAdmin, isSelected, isSelecting,
  highlightedMsgId, onReply, onDelete, onCopy, onForward, onEdit,
  onScrollToReply, onToggleSelect, onLongPress, onShowInfo, renderAttachment,
  formatTime, getStatusIcon, theme = 'dark'
}: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [swipeX, setSwipeX] = useState(0)
  const [swipeDir, setSwipeDir] = useState<'reply' | 'delete' | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editText, setEditText] = useState(msg.text || '')
  
  // Local reactions
  const [reaction, setReaction] = useState<string | null>(() => {
    try { return typeof window !== 'undefined' ? localStorage.getItem(`reaction_${msg.id}`) : null } catch { return null }
  })

  const handleReaction = (emoji: string) => {
    setReaction(emoji)
    try { localStorage.setItem(`reaction_${msg.id}`, emoji) } catch { /* ignore */ }
    closeMenu()
  }

  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)

  const hasAttachment = !msg.isDeleted && msg.attachmentData && msg.attachmentType
  const isImage = hasAttachment && isImageType(msg.attachmentType!)

  // ── Long press detection ──────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
    longPressTimer.current = setTimeout(() => {
      if (!isSelecting) openMenu(t.clientX, t.clientY)
    }, 500)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    // Cancel long press if moved
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
    const dx = e.touches[0].clientX - touchStart.current.x
    const dy = e.touches[0].clientY - touchStart.current.y
    // Only horizontal swipes
    if (Math.abs(dy) > 30) return
    if (Math.abs(dx) > 10) {
      const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx))
      setSwipeX(clamped)
      setSwipeDir(dx > 0 ? 'reply' : 'delete')
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
    if (Math.abs(swipeX) >= SWIPE_THRESHOLD) {
      if (swipeDir === 'reply' && !msg.isDeleted) onReply(msg)
      if (swipeDir === 'delete') onDelete(msg.id, (isMe || isAdmin) ? 'for_everyone' : 'for_me')
    }
    setSwipeX(0)
    setSwipeDir(null)
    touchStart.current = null
  }

  // ── Context menu ──────────────────────────────────────────────────────────
  const openMenu = (x: number, y: number) => {
    setMenuPos({ x, y })
    setShowMenu(true)
  }

  const closeMenu = () => { setShowMenu(false); setMenuPos(null) }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isSelecting) return
    openMenu(e.clientX, e.clientY)
  }

  // ── Edit message (local only — optimistic) ────────────────────────────────
  const handleEditSubmit = async () => {
    if (!editText.trim() || editText === msg.text) { setIsEditMode(false); return }
    onEdit({ ...msg, text: editText })
    setIsEditMode(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const swipeReplyVisible = swipeDir === 'reply' && swipeX > 20
  const swipeDeleteVisible = swipeDir === 'delete' && swipeX < -20

  return (
    <div className="relative" data-msg-id={msg.id}>

      {/* Swipe hint icons (behind bubble) */}
      {swipeReplyVisible && (
        <div
          className="absolute inset-y-0 left-2 flex items-center transition-opacity"
          style={{ opacity: Math.min(1, swipeX / SWIPE_THRESHOLD) }}
        >
          <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
            <Reply className="w-4 h-4 text-teal-400" />
          </div>
        </div>
      )}
      {swipeDeleteVisible && (
        <div
          className="absolute inset-y-0 right-2 flex items-center transition-opacity"
          style={{ opacity: Math.min(1, Math.abs(swipeX) / SWIPE_THRESHOLD) }}
        >
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
        </div>
      )}

      {/* Row: checkbox + bubble */}
      <div
        className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} transition-all duration-200`}
        style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? 'transform 0.2s ease' : 'none' }}
      >
        {/* Select checkbox */}
        {isSelecting && (
          <button
            onClick={() => onToggleSelect(msg.id)}
            className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected ? 'bg-teal-500 border-teal-500' : 'border-slate-500 bg-transparent'
            } ${isMe ? 'order-last ml-1' : 'order-first mr-1'}`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>
        )}

        {/* Bubble */}
        <div
          ref={bubbleRef}
          className={`relative shadow-sm text-[15px] leading-relaxed select-none ${
            isImage ? 'p-1 rounded-2xl' : 'px-3.5 py-2 rounded-2xl'
          } ${
            isMe
              ? (theme === 'dark' ? 'bg-teal-600 text-white' : 'bg-[#DCF8C6] text-slate-900') + ' rounded-tr-[4px] max-w-[85%] md:max-w-[75%]'
              : (theme === 'dark' ? 'bg-slate-800 text-slate-100 border border-white/5' : 'bg-white text-slate-900 border border-slate-200 shadow-sm') + ' rounded-tl-[4px] max-w-[85%] md:max-w-[75%]'
          } ${
            highlightedMsgId === msg.id ? 'ring-2 ring-teal-500 ring-offset-2 ring-offset-[#0B1120]' : ''
          } ${msg.isDeleted ? 'opacity-60' : ''} ${
            isSelected ? 'ring-2 ring-teal-400' : ''
          } cursor-pointer`}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            if (isSelecting) { onToggleSelect(msg.id); return }
            if (showMenu) { closeMenu(); return }
          }}
          onMouseDown={(e) => {
            // Long press simulation for desktop
            longPressTimer.current = setTimeout(() => openMenu(e.clientX, e.clientY), 600)
          }}
          onMouseUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }}
          onMouseLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }}
        >
          {/* Sender name (incoming) */}
          {!isMe && (
            <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'} ${isImage ? 'px-1.5 pt-1' : ''}`}>
              {msg.sender?.name || 'משתמש'}
            </div>
          )}

          {/* Quoted reply */}
          {msg.replyTo && !msg.isDeleted && (
            <button
              onClick={(e) => { e.stopPropagation(); if (msg.replyTo?.id) onScrollToReply(msg.replyTo.id) }}
              className={`w-full text-right rounded-md mb-2 px-2.5 py-1.5 border-r-[3px] border-teal-400 ${
                isMe ? (theme === 'dark' ? 'bg-teal-700/40 hover:bg-teal-700/60' : 'bg-teal-600/10 hover:bg-teal-600/20') : (theme === 'dark' ? 'bg-slate-700/50 hover:bg-slate-700/70' : 'bg-slate-100 hover:bg-slate-200')
              } transition-colors`}
            >
              <div className={`text-[11px] font-semibold ${isMe ? (theme === 'dark' ? 'text-teal-100' : 'text-teal-800') : (theme === 'dark' ? 'text-teal-400' : 'text-teal-600')}`}>
                {msg.replyTo.sender?.name ?? ''}
              </div>
              <div className={`text-xs truncate max-w-[220px] ${isMe ? (theme === 'dark' ? 'text-teal-50' : 'text-teal-900/80') : (theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}`}>
                {msg.replyTo.text || '📎 קובץ מצורף'}
              </div>
            </button>
          )}

          {/* Deleted placeholder */}
          {msg.isDeleted ? (
            <div className="flex items-center gap-1.5 text-slate-400/80 italic text-xs py-1">
              <Trash2 className="w-3.5 h-3.5" />
              <span>הודעה זו נמחקה</span>
            </div>
          ) : isEditMode ? (
            /* Edit mode */
            <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
              <textarea
                autoFocus
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit() } }}
                className="bg-black/20 rounded-lg px-2 py-1 text-sm outline-none resize-none min-h-[60px] w-full"
                dir="auto"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditMode(false)} className="text-xs text-slate-300 hover:text-white px-2 py-1">ביטול</button>
                <button onClick={handleEditSubmit} className="text-xs bg-teal-500 text-white rounded-lg px-3 py-1 hover:bg-teal-600">שמור</button>
              </div>
            </div>
          ) : (
            <>
              {hasAttachment && renderAttachment(msg)}
              {msg.text && (!hasAttachment || isImage || isAudioType(msg.attachmentType!)) && (
                <div className={`whitespace-pre-wrap break-words leading-snug ${isImage ? 'px-1.5' : ''}`}>
                  {msg.text}
                </div>
              )}
            </>
          )}

          {/* Time + status */}
          <div className={`flex items-center justify-end gap-1 mt-1 opacity-80 text-[10px] ${isImage ? 'px-1.5 pb-0.5' : ''}`}>
            <span>{formatTime(msg.createdAt)}</span>
            {isMe && getStatusIcon(msg.status)}
          </div>

          {/* Emoji reaction display */}
          {reaction && (
            <div className={`absolute -bottom-3 ${isMe ? 'left-2' : 'right-2'} bg-slate-800 border border-white/10 rounded-full px-1.5 py-0.5 text-xs shadow-sm`}>
              {reaction}
            </div>
          )}
        </div>
      </div>

      {/* ── Context Menu Overlay ── */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[100]" onClick={closeMenu} />

          {/* Menu panel */}
          <div
            className="fixed z-[101] flex flex-col gap-0 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              // position smartly near click but keep on screen
              left: Math.min(menuPos!.x - 80, window.innerWidth - 220),
              top: Math.min(menuPos!.y - 20, window.innerHeight - 320),
              minWidth: 200,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Emoji reactions row */}
            {!msg.isDeleted && (
              <div className="flex items-center justify-around px-2 py-2.5 border-b border-white/10">
                {QUICK_EMOJIS.map(e => (
                  <button
                    key={e}
                    className="text-xl hover:scale-125 active:scale-95 transition-transform p-1 rounded-full hover:bg-white/10"
                    onClick={() => handleReaction(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="py-1">
              {!msg.isDeleted && (
                <MenuItem icon={<Reply className="w-4 h-4 text-teal-400" />} label="הגב" onClick={() => { closeMenu(); onReply(msg) }} />
              )}
              {msg.text && !msg.isDeleted && (
                <MenuItem icon={<Copy className="w-4 h-4 text-slate-400" />} label="העתק" onClick={() => { closeMenu(); onCopy(msg.text!) }} />
              )}
              {!msg.isDeleted && (
                <MenuItem icon={<Forward className="w-4 h-4 text-slate-400" />} label="העבר" onClick={() => { closeMenu(); onForward(msg) }} />
              )}
              {isMe && !msg.isDeleted && msg.text && !hasAttachment && (
                <MenuItem icon={<Pencil className="w-4 h-4 text-yellow-400" />} label="ערוך" onClick={() => { closeMenu(); setIsEditMode(true); setEditText(msg.text || '') }} />
              )}
              {isImage && (
                <MenuItem
                  icon={<Download className="w-4 h-4 text-blue-400" />}
                  label="שמור לגלריה"
                  onClick={() => {
                    closeMenu()
                    const a = document.createElement('a')
                    a.href = msg.attachmentData!
                    a.download = `image-${msg.id}.jpg`
                    a.click()
                  }}
                />
              )}
              {/* Select mode trigger */}
              <MenuItem
                icon={<Check className="w-4 h-4 text-slate-400" />}
                label="בחר"
                onClick={() => { closeMenu(); onLongPress(); onToggleSelect(msg.id) }}
              />
              <MenuItem
                icon={<div className="w-4 h-4 rounded-full border border-slate-400 text-[10px] flex items-center justify-center font-bold text-slate-400">i</div>}
                label="פרטים"
                onClick={() => { closeMenu(); onShowInfo(msg) }}
              />
              <div className="border-t border-white/10 mt-1 pt-1">
                <MenuItem
                  icon={<Trash2 className="w-4 h-4 text-red-400" />}
                  label="מחק אצלי"
                  danger
                  onClick={() => { closeMenu(); onDelete(msg.id, 'for_me') }}
                />
                {(isMe || isAdmin) && (
                  <MenuItem
                    icon={<Trash2 className="w-4 h-4 text-red-500" />}
                    label="מחק לכולם"
                    danger
                    onClick={() => { closeMenu(); onDelete(msg.id, 'for_everyone') }}
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MenuItem({ icon, label, onClick, danger }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5 active:bg-white/10 text-right ${
        danger ? 'text-red-400' : 'text-slate-200'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
