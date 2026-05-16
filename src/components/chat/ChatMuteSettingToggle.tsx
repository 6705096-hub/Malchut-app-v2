'use client'

/**
 * ChatMuteSettingToggle — Admin-only component
 * Displayed in the TeamChatModal header (or settings panel) for admins.
 * Lets admin toggle whether users can mute conversations.
 */

import React, { useState, useEffect } from 'react'
import { ShieldCheck, Bell, BellOff, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

export function ChatMuteSettingToggle() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  const [allowUserMute, setAllowUserMute] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/settings/chat')
      .then(r => r.json())
      .then(d => {
        setAllowUserMute(d.allowUserMute ?? false)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [isAdmin])

  if (!isAdmin) return null

  const handleToggle = async () => {
    const newVal = !allowUserMute
    setIsSaving(true)
    try {
      const res = await fetch('/api/settings/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowUserMute: newVal })
      })
      if (res.ok) {
        setAllowUserMute(newVal)
      }
    } catch {
      // silent
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return null

  return (
    <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2 border border-white/5 shadow-sm">
      <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
      <span className="text-slate-400 text-xs flex-1 font-medium">אפשר למשתמשים להשתיק</span>
      <button
        onClick={handleToggle}
        disabled={isSaving}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
          allowUserMute ? 'bg-teal-500' : 'bg-slate-600'
        }`}
        title={allowUserMute ? 'בטל הרשאת השתקה למשתמשים' : 'אפשר השתקה למשתמשים'}
      >
        {isSaving ? (
          <Loader2 className="w-3 h-3 animate-spin text-white absolute top-1 left-3.5" />
        ) : (
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
            allowUserMute ? 'left-5' : 'left-0.5'
          }`} />
        )}
      </button>
    </div>
  )
}
