'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Calendar as CalendarIcon, Phone, MapPin, Edit, RefreshCw, CircleX, Check, X, Pause, Play, Filter, Copy, SkipForward, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startOfWeek, addWeeks, format } from 'date-fns'
import { LoadingStars } from '@/components/LoadingStars'
import { OrderWizardModal } from '@/components/OrderWizardModal'
import { initiateCustomerCall } from '@/lib/callCustomer'

type OrderTemplate = {
  id: string
  customer: { name: string; phone: string; typeId: string | null }
  customerId: string
  deliveryDay: string
  address: string | null
  city: string | null
  deliveryArea: { id: string; name: string } | null
  notes: string | null
  totalPrice: number
  isActive: boolean
  requiresApproval: boolean
  skippedWeeks: string[]
  items: { productId: string; product: { name: string; unitName: string | null }; quantity: number; variant: string }[]
  orders?: { id: string; status: string }[]
  pausedUntil: string | null
  pausedForever: boolean
}

export default function FixedOrdersClient({ session }: { session: any }) {
  const [templates, setTemplates] = useState<OrderTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dayFilter, setDayFilter] = useState('ALL')
  const [cityFilter, setCityFilter] = useState('ALL')
  const [areaFilter, setAreaFilter] = useState('ALL')
  const [pauseModalTarget, setPauseModalTarget] = useState<{ templateId: string, customerName: string } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [generateMsg, setGenerateMsg] = useState<{ type: 'success'|'error', text: string } | null>(null)
  const [rowActionLoading, setRowActionLoading] = useState<string | null>(null)
  const [editModalTarget, setEditModalTarget] = useState<{ templateId: string, orderId?: string, customerName: string, isGenerated: boolean } | null>(null)
  const [wizardTarget, setWizardTarget] = useState<{ isFixed: boolean, orderId?: string, templateId?: string } | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [cloneModalOpen, setCloneModalOpen] = useState(false)
  const [cloneTargetDate, setCloneTargetDate] = useState('')
  const [isCloningToDate, setIsCloningToDate] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null)
  
  const router = useRouter()

  const loadTemplates = async () => {
    setIsLoading(true)
    try {
      const weekStartStr = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
      const res = await fetch(`/api/order-templates?weekStart=${weekStartStr}&_t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.templates) setTemplates(data.templates)
      // Also load pending approval orders
      const pendingRes = await fetch(`/api/orders/pending?_t=${Date.now()}`, { cache: 'no-store' })
      const pendingData = await pendingRes.json()
      if (pendingData.orders) setPendingOrders(pendingData.orders)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const dayLabels: Record<string, string> = {
    'Shabbat': 'שבת',
    'Sunday': 'ראשון',
    'Monday': 'שני',
    'Tuesday': 'שלישי',
    'Wednesday': 'רביעי',
    'Thursday': 'חמישי',
    'Friday': 'שישי',
    'THIS_WEEK': 'אמצע שבוע'
  }

  const days = useMemo(() => Array.from(new Set(templates.map(t => t.deliveryDay))).filter(Boolean) as string[], [templates])
  const cities = useMemo(() => Array.from(new Set(templates.map(t => t.city))).filter(Boolean) as string[], [templates])
  const areas = useMemo(() => Array.from(new Set(templates.map(t => t.deliveryArea?.name))).filter(Boolean) as string[], [templates])

  const filteredTemplates = useMemo(() => {
    let list = [...templates]
    if (dayFilter !== 'ALL') list = list.filter(t => t.deliveryDay === dayFilter)
    if (cityFilter !== 'ALL') list = list.filter(t => t.city === cityFilter)
    if (areaFilter !== 'ALL') list = list.filter(t => t.deliveryArea?.name === areaFilter)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(t => 
        t.customer.name.toLowerCase().includes(q) || 
        t.customer.phone.includes(q) ||
        (t.address && t.address.toLowerCase().includes(q))
      )
    }

    list.sort((a, b) => {
       const aGen = (a.orders && a.orders.length > 0) ? 1 : 0
       const bGen = (b.orders && b.orders.length > 0) ? 1 : 0
       return aGen - bGen
    })

    return list
  }, [search, dayFilter, cityFilter, areaFilter, templates])

  const handleGenerateBulk = async (targetDateString: string) => {
    if (selectedIds.size === 0) return alert('אנא סמן לפחות הזמנה קבועה אחת לאישור.')
    if (!confirm(`האם לאשר ${selectedIds.size} הזמנות ולייצר אותן לשבוע זה?`)) return
    setIsGenerating(true)
    setGenerateMsg(null)
    try {
      const res = await fetch('/api/order-templates/generate-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWeekDate: targetDateString, templateIds: Array.from(selectedIds) })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה ביצירת הזמנות')
      setGenerateMsg({ type: 'success', text: `נוצרו ${data.count} הזמנות בהצלחה!` })
      setSelectedIds(new Set())
      loadTemplates()
    } catch (e: any) {
      setGenerateMsg({ type: 'error', text: e.message })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCancelGeneration = async (targetDateString: string) => {
    if (!confirm('אזהרה: פעולה זו תמחק את כל ההזמנות שנוצרו אוטומטית לשבוע זה (כולל זיכוי חוב הלקוחות). האם להמשיך?')) return
    setIsCanceling(true)
    setGenerateMsg(null)
    try {
      const res = await fetch(`/api/order-templates/generate?targetWeekDate=${targetDateString}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה בביטול הזמנות')
      setGenerateMsg({ type: 'success', text: `בוטלו ונמחקו ${data.count} הזמנות בהצלחה!` })
      loadTemplates()
    } catch (e: any) {
      setGenerateMsg({ type: 'error', text: e.message })
    } finally {
      setIsCanceling(false)
    }
  }

  const handleRowApprove = async (templateId: string, targetDateString: string) => {
    setRowActionLoading(templateId)
    try {
      const res = await fetch(`/api/order-templates/${templateId}/generate-week`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWeekDate: targetDateString })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה ביצירת הזמנה להשבוע')
      setGenerateMsg({ type: 'success', text: 'ההזמנה אושרה בהצלחה לשבוע זה.' })
      loadTemplates()
    } catch (e: any) {
      setGenerateMsg({ type: 'error', text: e.message })
    } finally {
      setRowActionLoading(null)
    }
  }

  const handleRowUnapprove = async (templateId: string, targetDateString: string) => {
    if (!confirm('האם אתה בטוח שברצונך לבטל את אישור ההזמנה לשבוע זה?')) return
    setRowActionLoading(templateId)
    try {
      const res = await fetch(`/api/order-templates/${templateId}/generate-week`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWeekDate: targetDateString })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה בביטול הזמנה להשבוע')
      setGenerateMsg({ type: 'success', text: 'אישור ההזמנה בוטל בהצלחה.' })
      loadTemplates()
    } catch (e: any) {
      setGenerateMsg({ type: 'error', text: e.message })
    } finally {
      setRowActionLoading(null)
    }
  }

  const handleDeletePermanently = async (templateId: string) => {
    if (!confirm('האם למחוק לתמיד? המערכת תשכח שההזמנה הזו הייתה קיימת מעולם (הזמנות עבר שכבר סופקו לא יימחקו).')) return
    setRowActionLoading(templateId)
    try {
      const res = await fetch(`/api/order-templates/${templateId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה במחיקת התבנית')
      setGenerateMsg({ type: 'success', text: 'ההזמנה הקבועה נמחקה בהצלחה לתמיד.' })
      loadTemplates()
    } catch (e: any) {
      setGenerateMsg({ type: 'error', text: e.message })
    } finally {
      setRowActionLoading(null)
    }
  }

  const handlePauseTemplate = async (templateId: string, pausedUntil: Date | null, pausedForever: boolean) => {
    setRowActionLoading(templateId)
    try {
      const res = await fetch(`/api/order-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pausedUntil, pausedForever })
      })
      if (!res.ok) throw new Error('שגיאה בהשהיית התבנית')
      setGenerateMsg({ type: 'success', text: 'מצב ההשהייה עודכן בהצלחה.' })
      loadTemplates()
    } catch (e: any) {
      setGenerateMsg({ type: 'error', text: e.message })
    } finally {
      setRowActionLoading(null)
    }
  }

  const handleSkipWeek = async (templateId: string, targetDateString: string) => {
    setRowActionLoading(templateId)
    try {
      const res = await fetch(`/api/order-templates/${templateId}/skip-week`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWeekDate: targetDateString })
      })
      if (!res.ok) throw new Error('שגיאה בהשהייה לשבוע')
      setGenerateMsg({ type: 'success', text: 'ההזמנה הושהתה לשבוע זה בהצלחה.' })
      loadTemplates()
    } catch (e: any) {
      setGenerateMsg({ type: 'error', text: e.message })
    } finally {
      setRowActionLoading(null)
    }
  }

  const handleApprovePendingOrder = async (orderId: string) => {
    setApprovingOrderId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error('שגיאה באישור ההזמנה')
      setGenerateMsg({ type: 'success', text: 'ההזמנה אושרה ועברה לתכנון!' })
      loadTemplates()
    } catch (e: any) {
      setGenerateMsg({ type: 'error', text: e.message })
    } finally {
      setApprovingOrderId(null)
    }
  }

  const handleRejectPendingOrder = async (orderId: string) => {
    if (!confirm('לדחות הזמנה זו השבוע? היא תחזור לממתין בשבוע הבא.')) return
    setApprovingOrderId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/approve`, { method: 'DELETE' })
      if (!res.ok) throw new Error('שגיאה בדחיית ההזמנה')
      setGenerateMsg({ type: 'success', text: 'ההזמנה נדחתה לשבוע זה.' })
      loadTemplates()
    } catch (e: any) {
      setGenerateMsg({ type: 'error', text: e.message })
    } finally {
      setApprovingOrderId(null)
    }
  }

  const handleEditThisWeek = async () => {
    if (!editModalTarget) return;
    
    if (editModalTarget.isGenerated && editModalTarget.orderId) {
      setWizardTarget({ isFixed: false, orderId: editModalTarget.orderId })
      setEditModalTarget(null)
    } else {
      setRowActionLoading(editModalTarget.templateId)
      setEditModalTarget(null)
      try {
        const res = await fetch(`/api/order-templates/${editModalTarget.templateId}/generate-week`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetWeekDate: targetDateForThisWeek })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'שגיאה ביצירת הזמנה')
        setWizardTarget({ isFixed: false, orderId: data.order.id })
        loadTemplates()
      } catch (e: any) {
        setGenerateMsg({ type: 'error', text: e.message })
      } finally {
        setRowActionLoading(null)
      }
    }
  }

  const handleBulkPause = async (pausedForever: boolean) => {
    if (selectedIds.size === 0) return
    setBulkActionLoading('pause')
    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        fetch(`/api/order-templates/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pausedForever, pausedUntil: null })
        })
      ))
      setGenerateMsg({ type: 'success', text: `${selectedIds.size} הזמנות הושהו בהצלחה.` })
      setSelectedIds(new Set())
      loadTemplates()
    } catch (e: any) {
      setGenerateMsg({ type: 'error', text: e.message })
    } finally {
      setBulkActionLoading(null)
    }
  }

  const handleBulkResume = async () => {
    if (selectedIds.size === 0) return
    setBulkActionLoading('resume')
    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        fetch(`/api/order-templates/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pausedForever: false, pausedUntil: null, isActive: true })
        })
      ))
      setGenerateMsg({ type: 'success', text: `${selectedIds.size} הזמנות הופעלו מחדש.` })
      setSelectedIds(new Set())
      loadTemplates()
    } catch (e: any) {
      setGenerateMsg({ type: 'error', text: e.message })
    } finally {
      setBulkActionLoading(null)
    }
  }

  const handleBulkSkipNextWeek = async () => {
    if (selectedIds.size === 0) return
    const nextWeekStr = format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 0 }), 1), 'yyyy-MM-dd')
    setBulkActionLoading('skip')
    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        fetch(`/api/order-templates/${id}/skip-week`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetWeekDate: nextWeekStr })
        })
      ))
      setGenerateMsg({ type: 'success', text: `שבוע הבא בוטל ל-${selectedIds.size} הזמנות.` })
      setSelectedIds(new Set())
      loadTemplates()
    } catch (e: any) {
      setGenerateMsg({ type: 'error', text: e.message })
    } finally {
      setBulkActionLoading(null)
    }
  }

  const handleCloneToSpecialDate = async () => {
    if (!cloneTargetDate || selectedIds.size === 0) return
    setIsCloningToDate(true)
    try {
      const res = await fetch('/api/order-templates/generate-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWeekDate: cloneTargetDate, templateIds: Array.from(selectedIds), forceDate: cloneTargetDate })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה ביצירת הזמנות')
      setGenerateMsg({ type: 'success', text: `נוצרו ${data.count} הזמנות לתאריך ${format(new Date(cloneTargetDate), 'dd/MM/yyyy')} בהצלחה! 🎉` })
      setSelectedIds(new Set())
      setCloneModalOpen(false)
      setCloneTargetDate('')
      loadTemplates()
    } catch (e: any) {
      setGenerateMsg({ type: 'error', text: e.message })
    } finally {
      setIsCloningToDate(false)
    }
  }

  const toggleSelectAll = () => {
    const selectableTemplates = filteredTemplates.filter(t => {
      const isSkipped = t.skippedWeeks?.includes(targetDateForThisWeek)
      const isGen = !!(t.orders && t.orders.length > 0)
      return !isSkipped && !isGen
    })

    if (selectedIds.size === selectableTemplates.length && selectableTemplates.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableTemplates.map(t => t.id)))
    }
  }

  const checkSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const targetDateForThisWeek = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
  
  return (
    <div className="space-y-6">
      <div className="flex flex-row justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm items-center relative">
         <div className="flex flex-row gap-2 items-center w-full justify-end flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200 ml-auto shrink-0">
               <input 
                 type="checkbox" 
                 checked={selectedIds.size > 0 && selectedIds.size === filteredTemplates.filter(t => !(t.skippedWeeks?.includes(targetDateForThisWeek)) && !(t.orders && t.orders.length > 0)).length} 
                 onChange={toggleSelectAll} 
                 className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
               />
               <span className="font-bold text-xs">בחר הכל</span>
            </label>

            <button 
              onClick={() => { setShowSearch(!showSearch); setShowFilters(false); }}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm shrink-0 ${showSearch ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'}`}
              title="חיפוש"
            >
              <Search className="w-5 h-5" />
            </button>
            <button 
              onClick={() => { setShowFilters(!showFilters); setShowSearch(false); }}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm shrink-0 ${showFilters ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'}`}
              title="סינונים"
            >
              <Filter className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setWizardTarget({ isFixed: true })}
              className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl font-bold shadow-sm transition-all shrink-0"
              title="הוספת הזמנה קבועה חדשה"
            >
              <Plus className="w-5 h-5" />
            </button>
         </div>

         {/* Floating Search Bar */}
         {showSearch && (
           <div className="absolute top-20 right-0 left-0 sm:left-auto sm:w-80 bg-white p-3 rounded-xl shadow-xl border border-purple-200 z-20">
             <div className="relative flex items-center">
               <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
               <input 
                 autoFocus
                 type="text" 
                 placeholder="חיפוש לפי שם, טלפון או כתובת..." 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="w-full pl-10 pr-10 py-2.5 rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500 bg-gray-50 text-right text-sm"
               />
               <button onClick={() => { setShowSearch(false); setSearch(''); }} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                 <X className="w-4 h-4" />
               </button>
             </div>
           </div>
         )}

         {/* Floating Filters */}
         {showFilters && (
           <div className="absolute top-20 right-0 left-0 sm:left-auto sm:w-72 bg-white p-4 rounded-xl shadow-xl border border-purple-200 z-20 flex flex-col gap-3">
              <h3 className="font-bold text-gray-800 text-sm mb-1">סינון הזמנות קבועות</h3>
              <select value={dayFilter} onChange={e => setDayFilter(e.target.value)} className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-purple-500 py-2.5">
                <option value="ALL">כל הימים</option>
                <option value="Shabbat">שבת</option>
                <option value="Sunday">ראשון</option>
                <option value="Monday">שני</option>
                <option value="Tuesday">שלישי</option>
                <option value="Wednesday">רביעי</option>
                <option value="Thursday">חמישי</option>
              </select>
              <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-purple-500 py-2.5">
                <option value="ALL">כל הערים</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-purple-500 py-2.5">
                <option value="ALL">כל האזורים</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
           </div>
         )}
      </div>
      
      {/* Bulk Selection Action Bar - Sticky below header, doesn't cover cards */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-30 flex justify-center">
          <div className="bg-gray-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/10 p-2.5 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 overflow-x-auto w-full scrollbar-none">
            {/* Count Badge */}
            <div className="bg-purple-500 text-white text-xs font-black px-2.5 py-1 rounded-xl shrink-0 whitespace-nowrap">
              {selectedIds.size} נבחרו
            </div>

            <div className="w-px h-5 bg-white/20 shrink-0" />

            {/* Approve for this week - PRIMARY action */}
            <button
              onClick={() => handleGenerateBulk(targetDateForThisWeek)}
              disabled={isGenerating}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 disabled:opacity-50"
              title="אשר לשבוע זה"
            >
              {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              אשר לשבוע
            </button>

            {/* Clone to Holiday */}
            <button
              onClick={() => setCloneModalOpen(true)}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0"
              title="שכפל לחג / תאריך מיוחד"
            >
              <Copy className="w-3.5 h-3.5" />
              שכפל לחג
            </button>

            {/* Skip Next Week */}
            <button
              onClick={handleBulkSkipNextWeek}
              disabled={bulkActionLoading === 'skip'}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 disabled:opacity-50"
              title="בטל שבוע הבא"
            >
              {bulkActionLoading === 'skip' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SkipForward className="w-3.5 h-3.5" />}
              דלג שבוע
            </button>

            {/* Pause All */}
            <button
              onClick={() => handleBulkPause(true)}
              disabled={bulkActionLoading === 'pause'}
              className="flex items-center gap-1.5 bg-orange-500/80 hover:bg-orange-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 disabled:opacity-50"
            >
              {bulkActionLoading === 'pause' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
              השהה
            </button>

            {/* Resume All */}
            <button
              onClick={handleBulkResume}
              disabled={bulkActionLoading === 'resume'}
              className="flex items-center gap-1.5 bg-emerald-500/80 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 disabled:opacity-50"
            >
              {bulkActionLoading === 'resume' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              הפעל
            </button>

            <div className="w-px h-5 bg-white/20 shrink-0" />

            {/* Deselect */}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center justify-center w-7 h-7 bg-white/10 hover:bg-white/20 rounded-xl transition-all shrink-0"
              title="בטל בחירה"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Clone to Special Date Modal */}
      {cloneModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => { setCloneModalOpen(false); setCloneTargetDate('') }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <Copy className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base">שכפול לחג / תאריך מיוחד</h3>
                <p className="text-xs text-gray-500">{selectedIds.size} הזמנות קבועות נבחרו</p>
              </div>
              <button onClick={() => { setCloneModalOpen(false); setCloneTargetDate('') }} className="mr-auto p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 text-xs text-amber-800">
              💡 בחר תאריך החג ומשימה נפרדת תיווצר לכל לקוח. ההזמנה הקבועה הרגילה <strong>לא תיפגע</strong>.
            </div>

            {/* Date Picker */}
            <label className="block text-xs font-bold text-gray-700 mb-2">תאריך החג / האירוע</label>
            <input
              type="date"
              value={cloneTargetDate}
              onChange={e => setCloneTargetDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 mb-5 text-center font-bold"
            />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => { setCloneModalOpen(false); setCloneTargetDate('') }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleCloneToSpecialDate}
                disabled={!cloneTargetDate || isCloningToDate}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isCloningToDate ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> יוצר...</>
                ) : (
                  <><Zap className="w-4 h-4" /> צור {selectedIds.size} הזמנות</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {generateMsg && (
        <div className={`p-3 rounded-xl text-center font-bold text-sm ${generateMsg.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
          {generateMsg.text}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 mt-4">
          <LoadingStars size={32} />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-bold text-lg">לא נמצאו הזמנות קבועות</p>
          <p className="text-sm">הוסף הזמנות קבועות דרך מסך הזמנה חדשה בסימון "הפוך לקבועה"</p>
        </div>
      ) : (
        <div className="space-y-3">

          {/* ── PENDING APPROVAL SECTION ── */}
          {pendingOrders.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200 bg-amber-100">
                <span className="text-amber-600 text-lg">🔔</span>
                <span className="font-black text-amber-800 text-sm">ממתינות לאישור ({pendingOrders.length})</span>
              </div>
              <div className="divide-y divide-amber-100">
                {pendingOrders.map(order => (
                  <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm truncate">{order.customer?.name}</div>
                      <div className="text-xs text-gray-500">
                        {dayLabels[order.deliveryDay] || order.deliveryDay} | {order.address}
                      </div>
                      <div className="text-xs text-gray-700 font-medium mt-0.5">
                        {order.items?.map((i: any) => `${i.product?.name} x${i.quantity}`).join(' • ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleApprovePendingOrder(order.id)}
                        disabled={approvingOrderId === order.id}
                        className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
                      >
                        {approvingOrderId === order.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        אשר
                      </button>
                      <button
                        onClick={() => handleRejectPendingOrder(order.id)}
                        disabled={approvingOrderId === order.id}
                        className="flex items-center gap-1 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 text-xs font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        דחה
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredTemplates.map(template => {
            const isSkipped = template.skippedWeeks?.includes(targetDateForThisWeek)
            const isGenerated = !!(template.orders && template.orders.length > 0)
            const isPausedForever = template.pausedForever
            const isPausedUntil = template.pausedUntil ? new Date(template.pausedUntil) > new Date() : false
            const isPaused = isPausedForever || isPausedUntil
            
            const isSelected = selectedIds.has(template.id);
            const canSelect = !isGenerated && !isSkipped && !isPaused;

            return (
            <div 
              key={template.id} 
              onClick={() => { if (canSelect) checkSelect(template.id); }}
              className={`border ${isSkipped ? 'border-red-200 bg-red-50' : isPaused ? 'border-orange-200 bg-orange-50/50 opacity-80' : isGenerated ? 'border-gray-200 bg-gray-100 opacity-70 grayscale-[0.4]' : isSelected ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/50' : 'bg-white border-gray-200'} rounded-lg p-2.5 shadow-sm flex flex-row items-center gap-3 relative overflow-hidden group ${!template.isActive ? 'opacity-50' : canSelect ? 'hover:shadow-md cursor-pointer transition-all' : ''}`}
            >
               {!template.isActive && (
                 <div className="absolute top-0 right-0 bg-red-100 text-red-600 px-3 py-1 rounded-bl-xl text-xs font-bold">לא פעיל</div>
               )}
               {template.isActive && isPaused && (
                 <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 px-3 py-1 rounded-bl-xl text-xs font-bold flex items-center gap-1">
                   <Pause className="w-3 h-3" />
                   {isPausedForever ? 'מושהה' : `מושהה עד ${format(new Date(template.pausedUntil!), 'dd/MM/yyyy')}`}
                 </div>
               )}
               {template.isActive && isGenerated && !isPaused && (
                 <div className="absolute top-0 right-0 bg-gray-200 text-gray-700 w-7 h-5 rounded-bl-lg flex items-center justify-center shadow-sm" title="נוצר להשבוע">
                   <Check className="w-3.5 h-3.5 stroke-[3]" />
                 </div>
               )}
               {isSkipped && template.isActive && !isPaused && (
                 <div className="absolute top-0 right-0 bg-red-100 text-red-600 px-3 py-1 rounded-bl-xl text-xs font-bold flex items-center gap-1">
                   <X className="w-3 h-3" />
                   בוטל השבוע
                 </div>
               )}

               {/* Info Column (Right side) */}
               <div className="flex flex-col min-w-0 flex-1">
                 {/* Name, Day Tag and Phone Inline */}
                 <div className="flex flex-row items-center gap-2 mb-1">
                    <h3 className="font-black text-gray-900 text-sm leading-tight truncate">{template.customer.name}</h3>
                    <div className="text-purple-600 font-bold text-[9px] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 whitespace-nowrap">
                      {dayLabels[template.deliveryDay] || template.deliveryDay}
                    </div>
                    <span className="text-gray-300">|</span>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        initiateCustomerCall(template.customer.phone);
                      }} 
                      className="text-gray-600 text-xs hover:text-blue-600 hover:underline transition-all whitespace-nowrap" 
                      dir="ltr"
                    >
                      {template.customer.phone}
                    </button>
                 </div>

                 {/* Address */}
                 <div className="flex items-start gap-1 text-gray-500 text-[11px] mb-1.5 leading-tight pr-0.5">
                   <MapPin className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                   <span className="break-words whitespace-normal leading-tight">
                     {template.city || 'עיר חסרה'} {template.deliveryArea ? ` - ${template.deliveryArea.name}` : ''} | {template.address || 'כתובת חסרה'}
                   </span>
                 </div>

                 {/* Items Text Only */}
                 <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-gray-800 font-medium leading-tight">
                   {template.items.map((item, idx) => {
                      const showHotCold = template.deliveryDay !== 'Shabbat';
                      const hotColdText = showHotCold ? (item.variant === 'HOT' ? ' חם' : ' קר') : '';
                      return (
                        <span key={item.productId + item.variant} className="inline-flex items-center whitespace-nowrap">
                          {item.product.name} {item.quantity}{hotColdText}
                          {idx < template.items.length - 1 && <span className="mx-1.5 text-gray-300">•</span>}
                        </span>
                      )
                   })}
                 </div>
               </div>

               {/* Action Buttons (Left side, Compact Grid) */}
               <div className="shrink-0 flex items-center justify-center mr-auto">
                 {rowActionLoading === template.id ? (
                   <span className="text-sm font-bold text-gray-400 p-2"><RefreshCw className="w-5 h-5 animate-spin" /></span>
                 ) : (
                   <div className="grid grid-cols-2 gap-0.5">
                     {isGenerated ? (
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleRowUnapprove(template.id, targetDateForThisWeek); }}
                         className="flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-700 w-8 h-8 rounded-full transition-all"
                         title="בטל השבוע"
                       >
                         <X className="w-5 h-5" />
                       </button>
                     ) : (
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleRowApprove(template.id, targetDateForThisWeek); }}
                         className="flex items-center justify-center text-green-600 hover:bg-green-50 hover:text-green-700 w-8 h-8 rounded-full transition-colors"
                         title="אשר השבוע"
                       >
                         <Check className="w-5 h-5" />
                       </button>
                     )}
                     
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         setEditModalTarget({ 
                           templateId: template.id, orderId: template.orders?.[0]?.id, customerName: template.customer.name, isGenerated
                         })
                       }}
                       className="flex items-center justify-center text-blue-500 hover:bg-blue-50 hover:text-blue-700 w-8 h-8 rounded-full transition-colors"
                       title="ערוך"
                     >
                       <Edit className="w-4 h-4" />
                     </button>

                     {!template.isActive || isPaused ? (
                       <button 
                         onClick={async (e) => {
                           e.stopPropagation();
                           if (!template.isActive) {
                             setRowActionLoading(template.id)
                             try {
                               const res = await fetch(`/api/order-templates/${template.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: true }) })
                               if (!res.ok) throw new Error('שגיאה בהפעלת התבנית')
                               setGenerateMsg({ type: 'success', text: 'ההזמנה הופעלה מחדש בהצלחה.' })
                               loadTemplates()
                             } catch (err: any) { setGenerateMsg({ type: 'error', text: err.message }) } finally { setRowActionLoading(null) }
                           } else {
                             handlePauseTemplate(template.id, null, false);
                           }
                         }}
                         className="flex items-center justify-center text-green-600 hover:bg-green-50 hover:text-green-700 w-8 h-8 rounded-full transition-colors"
                         title="הפעל מחדש (בטל השהייה)"
                       >
                         <Play className="w-4 h-4" />
                       </button>
                     ) : (
                       <button 
                         onClick={(e) => { e.stopPropagation(); setPauseModalTarget({ templateId: template.id, customerName: template.customer.name }); }}
                         className="flex items-center justify-center text-orange-400 hover:bg-orange-50 hover:text-orange-600 w-8 h-8 rounded-full transition-colors"
                         title="השהייה"
                       >
                         <Pause className="w-4 h-4" />
                       </button>
                     )}
                     
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleDeletePermanently(template.id); }}
                       className="flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 w-8 h-8 rounded-full transition-colors"
                       title="מחיקה לתמיד"
                     >
                       <CircleX className="w-4 h-4" />
                     </button>
                   </div>
                 )}
               </div>
            </div>
            )
          })}
        </div>
      )}


      {/* Edit Dual Modal */}
      {editModalTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col text-center border-t-4 border-purple-500">
             <div className="p-6">
                <div className="bg-purple-100 text-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Edit className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">אפשרויות עריכה</h3>
                <p className="text-gray-500 text-sm mb-6 font-medium">
                  מה ברצונך לערוך עבור ההזמנה של <strong className="text-gray-900">{editModalTarget.customerName}</strong>?
                  {!editModalTarget.isGenerated && (
                     <span className="block mt-1 text-purple-600 bg-purple-50 p-2 rounded text-xs">
                        שים לב: בחירה ב"לשבת זו בלבד" תייצר כעת אוטומטית את ההזמנה להשבוע ותפתח אותה לעריכה.
                     </span>
                  )}
                </p>
                <div className="flex flex-col gap-3">
                   <button 
                     onClick={handleEditThisWeek}
                     className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 py-3 rounded-xl font-bold transition-colors border border-blue-200"
                   >
                     ערוך לשבוע זה בלבד (חד פעמי)
                   </button>
                   <button 
                     onClick={() => { setEditModalTarget(null); setWizardTarget({ isFixed: true, templateId: editModalTarget.templateId }) }}
                     className="w-full bg-purple-50 text-purple-700 hover:bg-purple-100 py-3 rounded-xl font-bold transition-colors border border-purple-200"
                   >
                     ערוך את התבנית לתמיד (קבוע)
                   </button>
                </div>
             </div>
             <div className="bg-gray-50 p-4 border-t border-gray-100">
                <button 
                  onClick={() => setEditModalTarget(null)}
                  className="w-full text-gray-500 font-bold hover:text-gray-900 transition-colors"
                >
                  בטל וסגור
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {pauseModalTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col text-center border-t-4 border-orange-500">
             <div className="p-6">
                <div className="bg-orange-100 text-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">אפשרויות השהייה</h3>
                <p className="text-gray-500 text-sm mb-6 font-medium">
                  כיצד תרצה להשהות את ההזמנה של <strong className="text-gray-900">{pauseModalTarget.customerName}</strong>?
                </p>
                   <button 
                     onClick={() => {
                        const dateStr = prompt('עד איזה תאריך להשהות? (פורמט: YYYY-MM-DD)', format(addWeeks(new Date(), 4), 'yyyy-MM-dd'))
                        if (dateStr) {
                          const date = new Date(dateStr)
                          if (!isNaN(date.getTime())) {
                            handlePauseTemplate(pauseModalTarget.templateId, date, false);
                            setPauseModalTarget(null);
                          } else {
                            alert('תאריך לא תקין')
                          }
                        }
                     }}
                     className="w-full bg-orange-50 text-orange-700 hover:bg-orange-100 py-3 rounded-xl font-bold transition-colors border border-orange-200"
                   >
                     השהייה עד תאריך מסוים...
                   </button>
                   <button 
                     onClick={() => { handlePauseTemplate(pauseModalTarget.templateId, null, true); setPauseModalTarget(null); }}
                     className="w-full bg-red-50 text-red-700 hover:bg-red-100 py-3 rounded-xl font-bold transition-colors border border-red-200"
                   >
                     השהייה לתמיד (עד להפעלה ידנית)
                   </button>
                   <button 
                     onClick={() => { handleSkipWeek(pauseModalTarget.templateId, targetDateForThisWeek); setPauseModalTarget(null); }}
                     className="w-full bg-gray-50 text-gray-700 hover:bg-gray-100 py-3 rounded-xl font-bold transition-colors border border-gray-200 mt-2"
                   >
                     ביטול רק להשבוע
                   </button>
             </div>
             <div className="bg-gray-50 p-4 border-t border-gray-100">
                <button 
                  onClick={() => setPauseModalTarget(null)}
                  className="w-full text-gray-500 font-bold hover:text-gray-900 transition-colors"
                >
                  בטל וסגור
                </button>
             </div>
          </div>
        </div>
      )}

      <OrderWizardModal
        isOpen={!!wizardTarget}
        onClose={() => { setWizardTarget(null); loadTemplates(); }}
        initialOrderId={wizardTarget?.orderId}
        initialTemplateId={wizardTarget?.templateId}
        isFixedInitial={wizardTarget?.isFixed}
      />
    </div>

  )
}
