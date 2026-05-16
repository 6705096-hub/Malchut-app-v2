'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'

// Fetch the VAPID Public Key from environment variables
const NEXT_PUBLIC_VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if ('serviceWorker' in navigator && 'PushManager' in window && NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setIsSupported(true)
      // Register SW
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setIsSubscribed(!!sub)
          setLoading(false)
        })
      }).catch(err => {
        console.error('SW registration failed', err)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  const subscribe = async () => {
    try {
      setLoading(true)
      // Request permission explicitly first (helps with Safari)
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Permission not granted for Notification')
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY)
      })
      
      // Save to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      })
      if (res.ok) {
        setIsSubscribed(true)
      } else {
        throw new Error('Failed to save sub to server')
      }
    } catch (err) {
      console.error(err)
      alert('שגיאה בהפעלת התראות, אולי סירבת להרשאה?')
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    if (!window.confirm('האם אתה בטוח שברצונך לכבות התראות קופצות למכשיר זה?')) return
    try {
      setLoading(true)
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        // Delete from server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint })
        })
        // Unsubscribe from browser
        await sub.unsubscribe()
      }
      setIsSubscribed(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  if (!isSupported) {
    const hasSW = 'serviceWorker' in navigator
    const hasPush = 'PushManager' in window
    const hasKey = !!NEXT_PUBLIC_VAPID_PUBLIC_KEY
    return (
      <div className="text-xs text-red-500 text-center p-2 border border-red-200 rounded mt-2">
        לא נתמך: {!hasSW ? 'ללא ServiceWorker ' : ''}{!hasPush ? 'ללא PushManager ' : ''}{!hasKey ? 'ללא מפתח VAPID' : ''}
      </div>
    )
  }

  return (
    <button 
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={loading}
      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border transition shrink-0 w-full mt-2 ${
        isSubscribed 
          ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
          : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
      }`}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin" />
      ) : isSubscribed ? (
        <><BellOff className="w-4 h-4" /> כבה התראות</>
      ) : (
        <><Bell className="w-4 h-4" /> הפעל התראות מכשיר</>
      )}
    </button>
  )
}
