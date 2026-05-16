'use client'

import React, { useState, useEffect } from 'react'
import { X, CircleUser, Save, Loader2, Phone } from 'lucide-react'

export function UserProfileModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' })

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setFormData({ name: data.name || '', email: data.email || '', phone: data.phone || '' })
          }
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, phone: formData.phone })
      })
      if (res.ok) {
        // Force refresh session or just close
        // window.location.reload() would refresh the name in the sidebar, 
        // but for now let's just close and show success
        onClose()
      } else {
        alert('שגיאה בשמירת הפרופיל')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white text-center">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
            <CircleUser className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-xl font-bold">הפרופיל שלי</h2>
          <p className="text-blue-100 text-sm mt-1">עריכת פרטים אישיים</p>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">שם מלא</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">אימייל (לקריאה בלבד)</label>
              <input 
                type="email" 
                value={formData.email}
                className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 font-mono text-sm cursor-not-allowed"
                disabled
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">טלפון אישי (לשיחות)</label>
              <div className="relative">
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold font-mono text-left"
                  dir="ltr"
                  placeholder="05..."
                />
                <Phone className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
              </div>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">מספר זה ישמש כמזהה כשתלחץ לחייג ללקוח דרך המערכת.</p>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={saving}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                שמור שינויים
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
