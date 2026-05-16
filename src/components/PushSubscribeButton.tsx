'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'

// You must pass the PUBLIC VAPID KEY from the env to the client
const NEXT_PUBLIC_VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BOo4IsVjU5VLIzdfnMAsMKNwhda6VHsKQDexUGfRnzqkQdUbC3RvY6ICmwHfIw00KPsYLuQAi0Vn9FDNfbRi20A';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushSubscribeButton() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (window as any).workbox !== undefined) {
      // run after SW is registered
      navigator.serviceWorker.ready.then(reg => {
        setRegistration(reg)
        reg.pushManager.getSubscription().then(sub => {
          if (sub && !(sub.expirationTime && Date.now() > sub.expirationTime - 5 * 60 * 1000)) {
            setSubscription(sub)
            setIsSubscribed(true)
          }
          setIsLoading(false)
        })
      })
    } else {
      setIsLoading(false)
    }
  }, [])

  const subscribeButtonOnClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (!registration) return
    setIsLoading(true)
    
    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY)
      })
      
      // Save subscription to our database
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({ subscription: sub })
      })

      setSubscription(sub)
      setIsSubscribed(true)
      console.log('web push subscribed!')
    } catch (err) {
      console.error('Failed to subscribe to push', err)
      alert('נכשל בהרשמה להתראות. ודא שאישרת התראות בדפדפן.')
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribeButtonOnClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (!subscription) return
    setIsLoading(true)
    
    try {
      await subscription.unsubscribe()
      setSubscription(null)
      setIsSubscribed(false)
      console.log('web push unsubscribed!')
    } catch (err) {
      console.error('Failed to unsubscribe', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <button disabled className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-400 rounded-full">
        <Loader2 className="w-5 h-5 animate-spin" />
      </button>
    )
  }

  if (isSubscribed) {
    return (
      <button 
        onClick={unsubscribeButtonOnClick}
        className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 border border-blue-200"
        title="בטל התראות פוש"
      >
        <Bell className="w-5 h-5" />
      </button>
    )
  }

  return (
    <button 
      onClick={subscribeButtonOnClick}
      className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95 border border-gray-200"
      title="הפעל התראות פוש"
    >
      <BellOff className="w-5 h-5" />
    </button>
  )
}
