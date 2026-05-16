'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

export function AppTracker() {
  const pathname = usePathname()
  const { data: session } = useSession()

  useEffect(() => {
    // Only track authenticated users
    if (!session?.user) return

    const sendHeartbeat = () => {
      fetch('/api/users/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathname })
      }).catch(() => {}) // Ignore fetch errors for silent tracker
    }

    // Send immediately on path change or mount
    sendHeartbeat()

    // Send every 1 minute
    const interval = setInterval(sendHeartbeat, 60000)
    
    return () => clearInterval(interval)
  }, [pathname, session])

  return null // Render nothing, just runs the global hook
}
