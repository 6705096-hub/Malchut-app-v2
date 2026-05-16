'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Search, X, ArrowUp, ArrowDown, Loader2, Lock } from 'lucide-react'

interface SearchResult {
  id: string
  text: string | null
  createdAt: string
  sender: { name: string }
}

interface ChatSearchBarProps {
  conversationId: string
  onResultClick: (messageId: string) => void
}

export function ChatSearchBar({ conversationId, onResultClick }: ChatSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [encryptionBlocked, setEncryptionBlocked] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setEncryptionBlocked(false)
      return
    }
    setIsSearching(true)
    setEncryptionBlocked(false)
    try {
      const res = await fetch(
        `/api/messages?conversationId=${conversationId}&search=${encodeURIComponent(q)}&limit=30`
      )
      if (res.ok) {
        const data = await res.json()
        setResults(data.messages || [])
        setActiveIndex(data.messages?.length ? 0 : -1)
      } else if (res.status === 400) {
        const data = await res.json()
        if (data.encryptionActive) setEncryptionBlocked(true)
      }
    } catch {
      // silent
    } finally {
      setIsSearching(false)
    }
  }, [conversationId])

  const handleInputChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 400)
  }

  const handleOpen = () => {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleClose = () => {
    setIsOpen(false)
    setQuery('')
    setResults([])
    setActiveIndex(-1)
  }

  const navigateResult = (dir: 'up' | 'down') => {
    if (results.length === 0) return
    const next = dir === 'down'
      ? Math.min(activeIndex + 1, results.length - 1)
      : Math.max(activeIndex - 1, 0)
    setActiveIndex(next)
    onResultClick(results[next].id)
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) +
      ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }

  // Collapsed: just a search icon button
  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="p-2 text-[#aebac1] hover:text-white transition-colors rounded-full hover:bg-white/5"
        title="חיפוש בשיחה"
      >
        <Search className="w-5 h-5" />
      </button>
    )
  }

  // Expanded: search bar + results
  return (
    <div className="flex flex-col">
      {/* Search input bar */}
      <div className="bg-slate-800/80 backdrop-blur-md px-3 py-2 flex items-center gap-2 border-b border-white/5">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleClose()
            if (e.key === 'ArrowDown') { e.preventDefault(); navigateResult('down') }
            if (e.key === 'ArrowUp') { e.preventDefault(); navigateResult('up') }
            if (e.key === 'Enter' && results[activeIndex]) onResultClick(results[activeIndex].id)
          }}
          placeholder="חיפוש הודעות..."
          className="flex-1 bg-transparent text-slate-100 text-sm placeholder-slate-400 outline-none"
          dir="auto"
        />
        {isSearching && <Loader2 className="w-4 h-4 text-teal-500 animate-spin flex-shrink-0" />}
        {results.length > 0 && (
          <div className="flex items-center gap-1 text-slate-400 text-xs flex-shrink-0">
            <span>{activeIndex + 1}/{results.length}</span>
            <button onClick={() => navigateResult('up')} className="p-0.5 hover:text-white">
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => navigateResult('down')} className="p-0.5 hover:text-white">
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <button onClick={handleClose} className="p-1 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Results / states */}
      {encryptionBlocked && query.trim() && (
        <div className="bg-[#0B1120] px-4 py-3 flex items-center justify-center gap-2 text-slate-400 text-xs border-b border-white/5">
          <Lock className="w-3.5 h-3.5 text-teal-500" />
          <span>חיפוש אינו זמין — הצפנה פעילה</span>
        </div>
      )}
      {!encryptionBlocked && query.trim() && !isSearching && results.length === 0 && (
        <div className="bg-[#0B1120] px-4 py-3 text-center text-slate-400 text-xs border-b border-white/5">
          לא נמצאו תוצאות
        </div>
      )}
      {results.length > 0 && (
        <div className="bg-[#0B1120] max-h-48 overflow-y-auto border-b border-white/5">
          {results.map((msg, i) => (
            <button
              key={msg.id}
              onClick={() => { setActiveIndex(i); onResultClick(msg.id) }}
              className={`w-full text-right px-4 py-2 flex flex-col gap-0.5 hover:bg-slate-800 transition-colors ${
                i === activeIndex ? 'bg-slate-700' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-teal-400 text-xs font-medium">{msg.sender.name}</span>
                <span className="text-slate-400 text-[10px]">{formatTime(msg.createdAt)}</span>
              </div>
              <span className="text-slate-100 text-xs truncate">
                {highlightMatch(msg.text || '', query)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Highlight search term in text */
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-teal-500/30 text-slate-100 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}
