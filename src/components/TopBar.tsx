'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Menu, Bell, Plus, Search, X, ChevronLeft, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { SidebarMenu } from './SidebarMenu'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/permissions'

export function TopBar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  console.log('TopBar rendering, isSidebarOpen:', isSidebarOpen);
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const [pendingCount, setPendingCount] = useState(0)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ customers: any[], orders: any[], messages: any[] } | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Debounced Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    const delay = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        setSearchResults(data)
      } catch(e) {
        console.error('Search failed', e)
      } finally {
        setIsSearching(false)
      }
    }, 400)
    return () => clearTimeout(delay)
  }, [searchQuery])

  useEffect(() => {
    if (role === 'ADMIN') {
      const checkPending = async () => {
        try {
          const res = await fetch('/api/users/pending')
          const data = await res.json()
          if (Array.isArray(data)) {
            setPendingCount(data.length)
          } else if (data?.users) {
            setPendingCount(data.users.length)
          }
        } catch(e) {}
      }
      checkPending()
      const intv = setInterval(checkPending, 60000)
      return () => clearInterval(intv)
    }
  }, [role])

  return (
    <>
      {/* Premium TopBar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-100/80 sticky top-0 z-40 px-4 py-2.5 flex items-center justify-between shadow-sm">
        {/* Right side: Hamburger + Alerts */}
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => { setIsSidebarOpen(true); }}
            className="p-2.5 hover:bg-gray-100 rounded-2xl transition-all active:scale-95"
            aria-label="פתח תפריט ניווט"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>

          {role === 'ADMIN' && pendingCount > 0 && (
            <Link 
              href="/settings/users" 
              className="relative p-2 hover:bg-orange-50 rounded-xl transition-colors group"
              title="משתמשים ממתינים לאישור"
            >
              <Bell className="w-5 h-5 text-orange-500 animate-pulse" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </Link>
          )}
        </div>

        {/* Center: Logo */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <Link href="/dashboard" className="flex items-center justify-center">
            <Image 
              src="/logo.jpg" 
              alt="מעדנצ'יק - מלכות קוגל" 
              width={160} 
              height={56} 
              className="object-contain h-11 w-auto drop-shadow-sm" 
              priority 
            />
          </Link>
        </div>
        
        {/* Left Side: New Order button — glowing */}
        <div className="flex items-center gap-2">
          {hasPermission(role, (session?.user as any)?.permissions, 'orders_create', 'READ') && (
            <Link 
              href="/dashboard/orders/new" 
              className="bg-gradient-to-br from-blue-500 to-blue-700 text-white w-10 h-10 flex items-center justify-center rounded-2xl shadow-md shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all" 
              title="הזמנה חדשה"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </Link>
          )}
        </div>
      </div>

      {/* Global Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-white animate-in fade-in flex flex-col">
          <div className="flex items-center gap-3 p-4 border-b border-gray-100 shadow-sm">
            <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 shrink-0">
              <ArrowRight className="w-6 h-6" />
            </button>
            <div className="relative flex-1">
              <input
                autoFocus
                type="text"
                placeholder="חפש לקוחות, הזמנות, או בצ'אט..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-900"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            {isSearching ? (
              <div className="flex justify-center mt-10">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : searchResults ? (
              <div className="space-y-6">
                {searchResults.customers?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">לקוחות ({searchResults.customers.length})</h3>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                      {searchResults.customers.map((c: any) => (
                        <Link key={c.id} href={`/dashboard/customers/${c.id}`} onClick={() => setIsSearchOpen(false)} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                            <p className="text-xs text-gray-500" dir="ltr">{c.phone}</p>
                          </div>
                          <ChevronLeft className="w-4 h-4 text-gray-300" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                
                {searchResults.orders?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">הזמנות ({searchResults.orders.length})</h3>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                      {searchResults.orders.map((o: any) => (
                        <Link key={o.id} href={`/dashboard/orders/new?edit=${o.id}`} onClick={() => setIsSearchOpen(false)} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">הזמנה #{o.orderNumber || o.id.slice(-4)}</p>
                            <p className="text-xs text-gray-500">{o.customer?.name} • ₪{o.totalPrice}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${o.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {o.status === 'DELIVERED' ? 'נמסר' : 'פעיל'}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.messages?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">הודעות צ'אט ({searchResults.messages.length})</h3>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                      {searchResults.messages.map((m: any) => (
                        <div key={m.id} className="p-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-xs text-blue-600">{m.user?.name}</span>
                            <span className="text-[10px] text-gray-400">{new Date(m.createdAt).toLocaleDateString('he-IL')}</span>
                          </div>
                          <p className="text-sm text-gray-800 break-words">{m.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.customers?.length === 0 && searchResults.orders?.length === 0 && searchResults.messages?.length === 0 && (
                  <div className="text-center mt-10 text-gray-400 font-medium">לא נמצאו תוצאות ל"{searchQuery}"</div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Search className="w-10 h-10 mb-3 opacity-20" />
                <p className="font-medium">הזן טקסט לחיפוש בכל המערכת</p>
              </div>
            )}
          </div>
        </div>
      )}

      <SidebarMenu 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onOpenSearch={() => { setIsSidebarOpen(false); setIsSearchOpen(true); }}
      />
    </>
  )
}
