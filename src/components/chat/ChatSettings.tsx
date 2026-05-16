'use client'

/**
 * ChatSettings — User settings panel for the chat module
 */

import React, { useState, useEffect, useRef } from 'react'
import { ShieldCheck, Bell, BellOff, Palette, X, Loader2, User as UserIcon, Camera, Moon, Sun, Pencil } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { compressImage, readFileAsBase64 } from '@/lib/fileUtils'
import { parsePermissions } from '@/lib/permissions'

interface Props {
  onClose: () => void
}

interface ConversationPreview {
  id: string
  name?: string
  isGroup: boolean
  isMuted: boolean
  participants: any[]
}

export function ChatSettings({ onClose }: Props) {
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id
  
  const rawPerms = parsePermissions((session?.user as any)?.permissions) as any
  const isAdmin = (session?.user as any)?.role === 'ADMIN' || !!rawPerms?._chat?.isAdmin

  const [isLoading, setIsLoading] = useState(true)
  const [isSavingAdmin, setIsSavingAdmin] = useState(false)
  const [allowUserMute, setAllowUserMute] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  
  // Profile overrides
  const [profileName, setProfileName] = useState((session?.user?.name as string) || '')
  const [profileImage, setProfileImage] = useState((session?.user?.image as string) || '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Conversations for mute toggles
  const [conversations, setConversations] = useState<ConversationPreview[]>([])

  useEffect(() => {
    // Load local settings
    const savedTheme = localStorage.getItem('chatTheme') as 'light' | 'dark' | null
    if (savedTheme) setTheme(savedTheme)
      
    const savedProfile = localStorage.getItem('chatProfile')
    if (savedProfile) {
      const p = JSON.parse(savedProfile)
      if (p.name) setProfileName(p.name)
      if (p.image) setProfileImage(p.image)
    }

    // Load admin settings if admin
    if (isAdmin) {
      fetch('/api/settings/chat')
        .then(r => r.json())
        .then(d => {
          setAllowUserMute(d.allowUserMute ?? false)
        })
    }

    // Load conversations for mute settings
    fetch('/api/conversations')
      .then(r => r.json())
      .then(data => {
        setConversations(data.conversations || [])
      })
      .finally(() => setIsLoading(false))
  }, [isAdmin])

  const saveAdminSettings = async (patch: object) => {
    setIsSavingAdmin(true)
    try {
      await fetch('/api/settings/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } finally {
      setIsSavingAdmin(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setProfileImage(compressed.base64)
      localStorage.setItem('chatProfile', JSON.stringify({ name: profileName, image: compressed.base64 }))
      window.dispatchEvent(new Event('chatProfileUpdated'))
    } catch {
      alert('שגיאה בהעלאת תמונה')
    }
  }

  const saveProfile = () => {
    localStorage.setItem('chatProfile', JSON.stringify({ name: profileName, image: profileImage }))
    // Dispatch event so other components can update
    window.dispatchEvent(new Event('chatProfileUpdated'))
  }

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    localStorage.setItem('chatTheme', newTheme)
    window.dispatchEvent(new Event('chatThemeUpdated'))
  }

  const handleToggleMute = async (conv: ConversationPreview) => {
    const newMuted = !conv.isMuted
    // Optimistic update
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, isMuted: newMuted } : c))
    try {
      await fetch(`/api/conversations/${conv.id}/mute`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muted: newMuted })
      })
    } catch {
      // Revert on error
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, isMuted: !newMuted } : c))
    }
  }

  const getDisplayName = (conv: ConversationPreview) => {
    if (conv.isGroup) return conv.name || 'קבוצה'
    const otherParticipant = conv.participants?.find(p => p.userId !== currentUserId)
    return otherParticipant?.name || 'שיחה פרטית'
  }

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${theme === 'dark' ? 'bg-[#0B1120] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6 p-4">
          
          {/* Profile Editing */}
          <div className={`flex flex-col gap-4 p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold opacity-70">
              <UserIcon className="w-4 h-4" />
              <span>פרופיל אישי</span>
            </div>
            
            <div className="flex flex-col items-center gap-3">
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
              <div 
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-teal-500" />
                ) : (
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center border-2 border-teal-500 ${theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>
                    <UserIcon className="w-12 h-12" />
                  </div>
                )}
                {/* Camera/Edit Overlay */}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <div className="absolute bottom-0 right-0 bg-teal-500 text-white p-1.5 rounded-full shadow-lg border-2 border-[#0B1120]">
                  <Pencil className="w-3.5 h-3.5" />
                </div>
              </div>
              
              <div className="w-full mt-2">
                <div>
                  <label className="text-xs opacity-70 mb-1 block">שם משתמש</label>
                  <input 
                    type="text" 
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    onBlur={saveProfile}
                    className={`w-full px-3 py-2 rounded-xl border outline-none transition-colors ${theme === 'dark' ? 'bg-slate-900/50 border-white/10 focus:border-teal-500' : 'bg-slate-50 border-slate-200 focus:border-teal-500'}`}
                    placeholder="הכנס שם..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Theme selection */}
          <div className={`flex flex-col gap-3 p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold opacity-70">
              <Palette className="w-4 h-4" />
              <span>ערכת עיצוב</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  theme === 'light' ? 'border-teal-500 bg-teal-500/10' : (theme === 'dark' ? 'border-white/10 hover:border-white/30' : 'border-slate-200 hover:border-slate-300')
                }`}
              >
                <Sun className={`w-6 h-6 ${theme === 'light' ? 'text-teal-600' : ''}`} />
                <span className="text-sm">בהיר</span>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  theme === 'dark' ? 'border-teal-500 bg-teal-500/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Moon className={`w-6 h-6 ${theme === 'dark' ? 'text-teal-400' : ''}`} />
                <span className="text-sm">כהה</span>
              </button>
            </div>
          </div>

          {/* Mute Settings */}
          <div className={`flex flex-col gap-3 p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold opacity-70">
              <Bell className="w-4 h-4" />
              <span>השתקת שיחות</span>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {conversations.length === 0 ? (
                <div className="text-center text-sm opacity-50 py-2">אין שיחות פעילות</div>
              ) : (
                conversations.map(conv => (
                  <div key={conv.id} className={`flex items-center justify-between p-2.5 rounded-lg ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <span className="text-sm font-medium truncate max-w-[200px]">{getDisplayName(conv)}</span>
                    <button
                      onClick={() => handleToggleMute(conv)}
                      className={`p-1.5 rounded-full transition-all ${
                        conv.isMuted 
                          ? 'bg-slate-500/20 text-slate-400' 
                          : 'bg-teal-500/20 text-teal-500'
                      }`}
                    >
                      {conv.isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Admin only section */}
          {isAdmin && (
            <div className={`flex flex-col gap-3 p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold opacity-70 text-red-400">
                <ShieldCheck className="w-4 h-4" />
                <span>ניהול (מנהל בלבד)</span>
              </div>

              {/* allowUserMute toggle */}
              <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-teal-400" />
                  <div>
                    <div className="text-sm font-medium">הרשאת השתקת שיחות</div>
                    <div className="text-xs opacity-60 mt-0.5">כאשר כבוי — משתמשים לא יוכלו להשתיק</div>
                  </div>
                </div>
                <button
                  disabled={isSavingAdmin}
                  onClick={() => {
                    const next = !allowUserMute
                    setAllowUserMute(next)
                    saveAdminSettings({ allowUserMute: next })
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${allowUserMute ? 'bg-teal-500' : 'bg-slate-600'}`}
                >
                  {isSavingAdmin
                    ? <Loader2 className="w-3 h-3 animate-spin text-white absolute top-1.5 left-4" />
                    : <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${allowUserMute ? 'left-[26px]' : 'left-0.5'}`} />
                  }
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
