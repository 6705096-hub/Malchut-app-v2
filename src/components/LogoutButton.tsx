'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center justify-between p-5 hover:bg-red-50 transition-colors active:bg-red-100 mt-4 bg-white rounded-3xl shadow-sm border border-red-100"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
          <LogOut className="w-5 h-5" />
        </div>
        <div className="text-right">
          <p className="font-bold text-red-600 text-lg">התנתק מהמערכת</p>
          <p className="text-sm text-red-400 font-medium">יציאה בטוחה מהחשבון שלך</p>
        </div>
      </div>
    </button>
  )
}
