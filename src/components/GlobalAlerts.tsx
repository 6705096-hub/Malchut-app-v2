'use client'

import { useState, useEffect, useRef } from 'react'
import { UserPlus, X, Check } from 'lucide-react'

type PendingUser = {
  id: string
  name: string
  email: string
  createdAt: string
}

export function GlobalAlerts() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [dismissedUserIds, setDismissedUserIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const storedUsers = sessionStorage.getItem('dismissedUsers')
      if (storedUsers) {
        setDismissedUserIds(new Set(JSON.parse(storedUsers)))
      }
    } catch (e) {}
  }, [])

  const fetchAlerts = async () => {
    try {
      const usersRes = await fetch('/api/users/pending')
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setPendingUsers(usersData.pendingUsers || [])
      }
    } catch (err) {}
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleApproveUser = async (userId: string, role: string) => {
    setPendingUsers(prev => prev.filter(u => u.id !== userId))
    handleDismissUser(userId)
    try {
      const res = await fetch(`/api/users/${userId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      })
      if (!res.ok) alert('שגיאה באישור משתמש')
    } catch (err) { }
  }

  const handleRejectUser = async (userId: string) => {
    setPendingUsers(prev => prev.filter(u => u.id !== userId))
    handleDismissUser(userId)
    try {
      const res = await fetch(`/api/users/${userId}/reject`, { method: 'PATCH' })
      if (!res.ok) alert('שגיאה בדחיית משתמש')
    } catch (err) {}
  }

  const handleDismissUser = (userId: string) => {
    const newSet = new Set(dismissedUserIds)
    newSet.add(userId)
    setDismissedUserIds(newSet)
    sessionStorage.setItem('dismissedUsers', JSON.stringify(Array.from(newSet)))
  }

  const visibleUsers = pendingUsers.filter(u => !dismissedUserIds.has(u.id))

  if (visibleUsers.length === 0) return null

  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {visibleUsers.map(user => (
        <SwipeableUserAlert 
          key={user.id} 
          user={user} 
          onDismiss={() => handleDismissUser(user.id)}
          onApproveRole={handleApproveUser}
          onReject={handleRejectUser}
        />
      ))}
    </div>
  )
}

function SwipeableUserAlert({ user, onDismiss, onApproveRole, onReject }: any) {
  const [offsetX, setOffsetX] = useState(0)
  const dragStartX = useRef<number | null>(null)
  const [showRoles, setShowRoles] = useState(false)

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    dragStartX.current = clientX
  }

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragStartX.current === null) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const diff = clientX - dragStartX.current
    setOffsetX(diff)
  }

  const handleTouchEnd = () => {
    if (dragStartX.current !== null) {
      if (Math.abs(offsetX) > 80) {
         onDismiss()
      } else {
         setOffsetX(0)
      }
      dragStartX.current = null
    }
  }

  return (
    <div className="relative w-full">
      <div 
        className="bg-white pointer-events-auto border-2 border-amber-400 rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-top-5 fade-in duration-300 w-full select-none"
        style={{ transform: `translateX(${offsetX}px)`, transition: dragStartX.current !== null ? 'none' : 'transform 0.2s' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        <div className="p-3 flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-full shrink-0 animate-pulse">
            <UserPlus className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 pointer-events-none">
            <h4 className="font-black text-amber-900 leading-none mb-1 text-[13px]">משתמש חדש ממתין</h4>
            <p className="text-gray-800 font-medium text-xs truncate">{user.name}</p>
            <p className="text-gray-500 font-bold text-[10px] mt-1 truncate">{user.email}</p>
          </div>
          
          <div className="flex items-center gap-1 shrink-0 px-1">
            <button 
              onClick={(e) => {
                 e.stopPropagation()
                 setShowRoles(true)
              }}
              className="bg-amber-50 hover:bg-amber-100 p-2 rounded-full text-amber-600 transition-colors"
              title="אשר וקבע הרשאה"
            >
              <Check className="w-5 h-5" />
            </button>
            <button 
              onClick={(e) => {
                 e.stopPropagation()
                 onReject(user.id)
              }}
              className="bg-red-50 hover:bg-red-100 p-2 rounded-full text-red-600 transition-colors"
              title="דחה / חסום"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Roles Overlay */}
      {showRoles && (
         <div className="absolute inset-0 pointer-events-auto bg-white/95 rounded-2xl flex flex-col justify-center items-center z-10 animate-in fade-in zoom-in duration-200 shadow-[inset_0_0_15px_rgba(251,191,36,0.3)]">
           <p className="text-xs font-bold text-gray-800 mb-3">בחר הרשאה למשתמש (לאישור):</p>
           <div className="flex gap-2">
             <button onClick={() => onApproveRole(user.id, 'ADMIN')} className="px-3 py-1.5 bg-amber-500 text-white rounded text-xs font-bold hover:bg-amber-600 transition-colors">מנהל מערכת</button>
             <button onClick={() => onApproveRole(user.id, 'USER')} className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-bold hover:bg-blue-600 transition-colors">משתמש/צוות</button>
             <button onClick={() => onApproveRole(user.id, 'VIEWER')} className="px-3 py-1.5 bg-gray-500 text-white rounded text-xs font-bold hover:bg-gray-600 transition-colors">צופה בלבד</button>
           </div>
           <button onClick={() => setShowRoles(false)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-700 bg-white rounded-full transition-colors">
             <X className="w-4 h-4"/>
           </button>
         </div>
      )}
    </div>
  )
}
