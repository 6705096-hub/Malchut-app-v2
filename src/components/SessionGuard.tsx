'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function SessionGuard() {
  const { status, data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // If the user is unauthenticated but they are on a protected route, kick them out.
    // This prevents the Next.js router cache or bfcache from showing stale protected pages
    // when they press the back button after logging out or being removed.
    if (status === 'unauthenticated' && pathname !== '/login') {
      window.location.href = '/login'
    }
    
    // Also, if the session data shows a different email than what might be expected, 
    // the UI will automatically re-render because it uses useSession().
  }, [status, pathname])

  return null
}
