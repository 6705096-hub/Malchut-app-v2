'use client'

import { useEffect } from 'react'
import { X, LogOut, User as UserIcon, Search } from 'lucide-react'
import { MenuAccordion } from './MenuAccordion'
import { useSession, signOut } from 'next-auth/react' // Added signOut
import Link from 'next/link'

import { ChangelogModal, CURRENT_APP_VERSION } from './ChangelogModal'
import { useState } from 'react'
import { PushSubscribeButton } from './PushSubscribeButton'

import { UserProfileModal } from './UserProfileModal'
import { hasPermission } from '@/lib/permissions'

type SidebarMenuProps = {
  isOpen: boolean
  onClose: () => void
  onOpenSearch?: () => void
}

export function SidebarMenu({ isOpen, onClose, onOpenSearch }: SidebarMenuProps) {
  console.log('SidebarMenu rendering, isOpen:', isOpen);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const { data: session } = useSession()
  const role = (session?.user as any)?.role || 'VIEWER'
  const permissions = (session?.user as any)?.permissions || {}
  const userName = session?.user?.name || 'משתמש אורח'
  const userRoleStr = role === 'ADMIN' ? 'מנהל מערכת' : 'משתמש'

  // Limited access logic
  const mainModuleChecks = [
    hasPermission(role, permissions, 'dashboard', 'READ') || hasPermission(role, permissions, 'dash_midweek', 'READ') || hasPermission(role, permissions, 'dash_shabbat', 'READ') || hasPermission(role, permissions, 'dash_stats', 'READ'),
    hasPermission(role, permissions, 'customers', 'READ') || hasPermission(role, permissions, 'customers_manage', 'READ'),
    hasPermission(role, permissions, 'orders', 'READ') || hasPermission(role, permissions, 'orders_create', 'READ') || hasPermission(role, permissions, 'orders_fixed', 'READ') || hasPermission(role, permissions, 'orders_bs', 'READ') || hasPermission(role, permissions, 'orders_jlm', 'READ'),
    hasPermission(role, permissions, 'kitchen_events', 'READ') || hasPermission(role, permissions, 'kitchen_production', 'READ') || hasPermission(role, permissions, 'kitchen_routes', 'READ'),
    hasPermission(role, permissions, 'kitchen_driver_assign', 'READ') || hasPermission(role, permissions, 'kitchen_drivers_view', 'READ'),
  ]
  const mainModuleCount = mainModuleChecks.filter(Boolean).length
  const isLimited = role !== 'ADMIN' && mainModuleCount < 3

  // Prevent scrolling on body when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => { document.body.style.overflow = 'auto' }
  }, [isOpen])

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[100] transition-opacity backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out flex flex-col overflow-x-hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0 bg-gradient-to-l from-blue-50 to-white">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            {onOpenSearch && (
              <button 
                onClick={onOpenSearch}
                className="p-2 hover:bg-white rounded-xl transition-colors"
                title="חיפוש"
              >
                <Search className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
          <img src="/logo.jpg" alt="Logo" className="h-9 object-contain drop-shadow-sm" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <MenuAccordion role={role} permissions={permissions} onClose={onClose} />
        </div>

        {/* Footer (User Info & Logout & Actions) */}
        <div className="p-3 border-t border-gray-100 bg-gradient-to-t from-gray-50 to-white mt-auto flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between px-1">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-1.5 -ml-1.5 rounded-2xl transition-colors"
              onClick={() => setIsProfileOpen(true)}
              title="עריכת פרופיל"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-500/30">
                <UserIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 truncate max-w-[120px]">{userName}</span>
                <span className="text-xs text-gray-400 font-medium">{userRoleStr}</span>
              </div>
            </div>
            
            <button
              onClick={() => {
                localStorage.removeItem('sawApprovalWelcome')
                signOut({ callbackUrl: '/login' })
              }}
              className="w-9 h-9 shrink-0 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 shadow-sm border border-red-100 rounded-xl transition-colors"
              title="התנתק מהמערכת"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
            
          {/* Icon Actions Container */}
          <div className="flex items-center justify-center gap-5 bg-white rounded-2xl p-2.5 border border-gray-100 shadow-sm mx-1">
            {hasPermission(role, permissions, 'ai_chat', 'READ') && (
              <button
                onClick={() => {
                   onClose();
                   window.dispatchEvent(new CustomEvent('toggleAIChat'));
                }}
                className="w-11 h-11 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 border border-indigo-200"
                title="העוזר החכם"
              >
                <span className="text-xl">✨</span>
              </button>
            )}

            {hasPermission(role, permissions, 'chat', 'READ') && (
              <button
                onClick={() => {
                   onClose();
                   window.dispatchEvent(new CustomEvent('openTeamChat'));
                }}
                className="w-11 h-11 flex items-center justify-center bg-[#dcf8c6] text-[#008069] rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 border border-[#4A8E50]/20"
                title="צ'אט סגל"
              >
                <span className="text-xl">💬</span>
              </button>
            )}

            {!isLimited && (
              <div className="scale-110">
                <PushSubscribeButton />
              </div>
            )}
          </div>
          
          <button 
            type="button" 
            onClick={() => setIsChangelogOpen(true)}
            className="mt-1 text-center text-[11px] font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            גרסת מערכת {CURRENT_APP_VERSION}
          </button>
        </div>
      </div>
      
      <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  )
}
