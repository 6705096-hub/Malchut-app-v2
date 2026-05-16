'use client'

import { useState } from 'react'
import { ShieldCheck, User as UserIcon, Settings2, Trash2, Ban, CircleCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { UserPermissionsModal } from './UserPermissionsModal'
import { UserPermissions } from '@/lib/permissions'

type User = {
  id: string
  name: string | null
  email: string | null
  role: string
  isActive: boolean
  permissions?: any
  lastSeenAt?: Date | null
  lastPath?: string | null
  activityLogs?: { activeMins: number }[]
}

const roleMap: Record<string, string> = {
  ADMIN: 'מנהל מערכת',
  ORDERS_MANAGER: 'מנהל הזמנות',
  FINANCE_MANAGER: 'מנהל כספים',
  KITCHEN: 'מטבח',
  DRIVER: 'נהג',
  CUSTOMER_SERVICE: 'שירות לקוחות',
  USER: 'משתמש רגיל',
  PENDING: 'ממתין לאישור'
}

export function UserManager({ initialUsers, deliveryAreas }: { initialUsers: User[], deliveryAreas: { id: string, name: string }[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const router = useRouter()
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const handleSavePermissions = async (userId: string, newRole: string, newPermissions: UserPermissions) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, permissions: newPermissions })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'שגיאה בעדכון הרשאות המשתמש')
      }

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole, permissions: newPermissions } : u))
      router.refresh()
    } catch (error: any) {
      console.error(error)
      alert(error.message)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משתמש זה? משתמשים בעלי היסטוריית הזמנות לא ניתנים למחיקה מלאה.')) return
    
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'שגיאה במחיקת משתמש')
      }
      
      setUsers(users.filter(u => u.id !== userId))
      router.refresh()
    } catch (error: any) {
      console.error(error)
      alert(error.message)
    }
  }

  const handleToggleActive = async (userId: string, currentIsActive: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentIsActive })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'שגיאה בעדכון מצב משתמש')
      }

      setUsers(users.map(u => u.id === userId ? { ...u, isActive: !currentIsActive } : u))
      router.refresh()
    } catch (error: any) {
      console.error(error)
      alert(error.message)
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden pl-1 pr-1 pb-1">
      <div className="divide-y divide-gray-100">
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm font-medium">
            לא נמצאו משתמשים.
          </div>
        ) : (
           users.map(user => (
              <div key={user.id} className="p-3 sm:p-4 flex flex-row items-center justify-between hover:bg-gray-50 transition-colors mx-2 my-2 rounded-2xl gap-2 sm:gap-4 overflow-hidden">
              <div className="flex items-center gap-2.5 sm:gap-4 truncate flex-1 min-w-0">
                <div className="relative shrink-0 flex items-center justify-center" suppressHydrationWarning>
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gray-100 ${
                    user.role === 'ADMIN' ? 'text-red-500' : user.role === 'PENDING' ? 'text-orange-500' : 'text-blue-500'
                  }`}>
                    {user.role === 'ADMIN' ? <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" /> : <UserIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </div>
                  {user.lastSeenAt && (new Date().getTime() - new Date(user.lastSeenAt).getTime() < 300000) && (
                    <span 
                      className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full z-10" 
                      title={user.lastPath ? `במסך: ${user.lastPath}` : 'מחובר כעת'}
                    />
                  )}
                  {!user.isActive && (
                    <span className="absolute -bottom-1 text-[9px] bg-red-100 text-red-700 font-black px-1.5 py-px rounded-full border border-white z-10 whitespace-nowrap">
                      חסום
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex flex-col gap-0.5 mt-1 sm:mt-0">
                    <p className="font-bold text-gray-900 text-sm sm:text-base truncate max-w-[140px] sm:max-w-[200px]">
                      {user.name || 'משתמש ללא שם'}
                    </p>
                    
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs text-gray-500 font-medium truncate max-w-[150px] sm:max-w-full" dir="ltr">{user.email || 'אין אימייל'}</p>
                      {user.role && (
                         <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-px rounded">
                           {roleMap[user.role] || user.role}
                         </span>
                      )}
                    </div>
                  </div>
                  
                  {user.activityLogs && user.activityLogs.length > 0 && (
                    <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 w-fit mt-0.5">
                      פעילות החודש: {user.activityLogs.reduce((acc: number, log: any) => acc + log.activeMins, 0)} דק'
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center gap-2.5 shrink-0 pl-1">
                {user.role === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => setEditingUser(user)}
                      className="h-10 px-3 sm:px-6 flex items-center justify-center font-black text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-sm text-xs sm:text-base"
                      title="אשר משתמש וקבע הרשאות"
                    >
                      <span className="hidden sm:inline">אשר משתמש</span>
                      <span className="sm:hidden">אשר</span>
                    </button>
                    <button
                      onClick={() => handleToggleActive(user.id, true)}
                      className="h-10 px-3 sm:px-6 flex items-center justify-center font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl transition-colors text-xs sm:text-base"
                      title="דחה משתמש (יחסום גישה ללא מחיקה)"
                    >
                      <span className="hidden sm:inline">לא מאושר (חסום)</span>
                      <span className="sm:hidden">חסום</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-blue-500 hover:text-blue-700 transition-colors hover:scale-110 active:scale-95"
                      title="ערוך הרשאות"
                    >
                      <Settings2 className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleToggleActive(user.id, user.isActive)}
                      className={`transition-colors hover:scale-110 active:scale-95 ${
                        user.isActive ? 'text-amber-500 hover:text-amber-700' : 'text-green-500 hover:text-green-700'
                      }`}
                      title={user.isActive ? 'חסום משתמש' : 'שחרר חסימה'}
                    >
                      {user.isActive ? <Ban className="w-5 h-5" /> : <CircleCheck className="w-5 h-5" />}
                    </button>
                    
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      title="מחק משתמש"
                      className="text-red-400 hover:text-red-600 transition-colors hover:scale-110 active:scale-95"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
           ))
        )}
      </div>

      {editingUser && (
        <UserPermissionsModal 
          user={editingUser} 
          deliveryAreas={deliveryAreas}
          onClose={() => setEditingUser(null)} 
          onSave={handleSavePermissions} 
        />
      )}
    </div>
  )
}
