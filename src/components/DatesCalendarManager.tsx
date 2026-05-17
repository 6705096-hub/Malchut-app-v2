'use client'

import { useState } from 'react'
import { Plus, Trash2, Calendar as CalendarIcon, Ban, Pen, Loader, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

type SpecialDate = {
  id: string
  name: string
  date: string | Date
}

type BlockedDate = {
  id: string
  date: string | Date
  reason: string | null
}

export function DatesCalendarManager({ 
  initialSpecialDates, 
  initialBlockedDates 
}: { 
  initialSpecialDates: SpecialDate[], 
  initialBlockedDates: BlockedDate[] 
}) {
  const router = useRouter()
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>(initialSpecialDates)
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>(initialBlockedDates)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'SPECIAL' | 'BLOCKED'>('SPECIAL')

  // Add Special Date State
  const [isAddingSpecial, setIsAddingSpecial] = useState(false)
  const [newSpecialName, setNewSpecialName] = useState('')
  const [newSpecialDate, setNewSpecialDate] = useState('')

  // SquarePen Special Date State
  const [editingSpecialId, setEditingSpecialId] = useState<string | null>(null)
  const [editSpecialName, setEditSpecialName] = useState('')
  const [editSpecialDate, setEditSpecialDate] = useState('')

  // Add Blocked Date State
  const [isAddingBlocked, setIsAddingBlocked] = useState(false)
  const [newBlockedDate, setNewBlockedDate] = useState('')
  const [newBlockedReason, setNewBlockedReason] = useState('')

  // SquarePen Blocked Date State
  const [editingBlockedId, setEditingBlockedId] = useState<string | null>(null)
  const [editBlockedReason, setEditBlockedReason] = useState('')
  const [editBlockedDate, setEditBlockedDate] = useState('')

  // Handlers for Special Dates
  const handleAddSpecialDate = async () => {
    if (!newSpecialName.trim() || !newSpecialDate) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/settings/special-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSpecialName, date: newSpecialDate })
      })
      if (!res.ok) throw new Error()
      
      const newD = await res.json()
      setSpecialDates([...specialDates, newD].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
      setNewSpecialName('')
      setNewSpecialDate('')
      setIsAddingSpecial(false)
      router.refresh()
    } catch {
      alert('׳©׳’׳™׳׳” ׳‘׳”׳•׳¡׳₪׳× ׳×׳׳¨׳™׳ ׳׳™׳•׳—׳“')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateSpecialDate = async (id: string) => {
    if (!editSpecialName.trim() || !editSpecialDate) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/settings/special-dates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editSpecialName, date: editSpecialDate })
      })
      if (!res.ok) throw new Error()
      
      const updated = await res.json()
      setSpecialDates(specialDates.map(d => d.id === id ? updated : d).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
      setEditingSpecialId(null)
      router.refresh()
    } catch {
      alert('׳©׳’׳™׳׳” ׳‘׳¢׳“׳›׳•׳ ׳×׳׳¨׳™׳ ׳׳™׳•׳—׳“')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSpecialDate = async (id: string) => {
    if (!confirm('׳׳׳—׳•׳§ ׳׳•׳¢׳“ ׳–׳”?')) return
    try {
      await fetch(`/api/settings/special-dates/${id}`, { method: 'DELETE' })
      setSpecialDates(specialDates.filter(d => d.id !== id))
      router.refresh()
    } catch (e) {
      console.error(e)
    }
  }

  // Handlers for Blocked Dates
  const handleAddBlockedDate = async () => {
    if (!newBlockedDate) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/settings/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newBlockedDate, reason: newBlockedReason })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '׳©׳’׳™׳׳”')
      }
      
      const newB = await res.json()
      setBlockedDates([...blockedDates, newB].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
      setNewBlockedDate('')
      setNewBlockedReason('')
      setIsAddingBlocked(false)
      router.refresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateBlockedDate = async (id: string) => {
    if (!editBlockedDate) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/settings/blocked-dates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: editBlockedDate, reason: editBlockedReason })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '׳©׳’׳™׳׳”')
      }
      
      const updated = await res.json()
      setBlockedDates(blockedDates.map(d => d.id === id ? updated : d).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
      setEditingBlockedId(null)
      router.refresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBlockedDate = async (id: string) => {
    if (!confirm('׳׳©׳—׳¨׳¨ ׳—׳¡׳™׳׳× ׳×׳׳¨׳™׳ ׳–׳” ׳׳׳©׳׳•׳—׳™׳?')) return
    try {
      await fetch(`/api/settings/blocked-dates/${id}`, { method: 'DELETE' })
      setBlockedDates(blockedDates.filter(d => d.id !== id))
      router.refresh()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <div className="flex border-b border-gray-100 bg-gray-50/50">
        <button 
          onClick={() => setActiveTab('SPECIAL')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'SPECIAL' ? 'border-fuchsia-600 text-fuchsia-700 bg-fuchsia-50/50' : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
        >
          <CalendarIcon className="w-4 h-4" />
          ׳׳•׳¢׳“׳™׳ ׳•׳×׳׳¨׳™׳›׳™׳ ׳׳™׳•׳—׳“׳™׳
        </button>
        <button 
          onClick={() => setActiveTab('BLOCKED')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'BLOCKED' ? 'border-red-600 text-red-700 bg-red-50/50' : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
        >
          <Ban className="w-4 h-4" />
          ׳™׳׳™׳ ׳—׳¡׳•׳׳™׳ ׳׳׳©׳׳•׳—
        </button>
      </div>

      <div className="p-0">
        {activeTab === 'SPECIAL' && (
          <div>
            <div className="p-5 flex justify-between items-center bg-white">
              <p className="text-sm text-gray-500 font-medium max-w-sm">׳”׳’׳“׳¨ ׳‘׳׳™׳׳• ׳×׳׳¨׳™׳›׳™׳ ׳”׳׳¢׳¨׳›׳× ׳×׳×׳ ׳”׳’ ׳›׳׳• ׳©׳‘׳× (׳¡׳•׳’ ׳׳•׳¦׳¨ ׳™׳—׳™׳“, ׳‘׳—׳™׳¨׳× ׳׳–׳•׳¨׳™׳ ׳•׳¡׳™׳›׳•׳ ׳ ׳₪׳¨׳“ ׳׳“׳׳©׳‘׳•׳¨׳“).</p>
              <button onClick={() => setIsAddingSpecial(true)} className="flex items-center gap-1.5 bg-fuchsia-100 text-fuchsia-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-fuchsia-200 transition-colors shrink-0">
                <Plus className="w-4 h-4"/> ׳”׳•׳¡׳£ ׳×׳׳¨׳™׳
              </button>
            </div>

            {isAddingSpecial && (
              <div className="p-5 bg-fuchsia-50/50 border-y border-fuchsia-100 flex flex-col sm:flex-row gap-3 items-center">
                <input 
                  type="text" 
                  value={newSpecialName}
                  onChange={e => setNewSpecialName(e.target.value)}
                  placeholder="׳©׳ (׳׳“׳•׳’׳׳”: ׳₪׳•׳¨׳™׳)" 
                  className="h-11 px-3 rounded-xl border border-fuchsia-200 focus:ring-2 focus:ring-fuchsia-500 outline-none w-full sm:w-1/3 text-sm font-bold placeholder:font-normal"
                  autoFocus
                />
                <input 
                  type="date" 
                  value={newSpecialDate}
                  onChange={e => setNewSpecialDate(e.target.value)}
                  className="h-11 px-3 rounded-xl border border-fuchsia-200 focus:ring-2 focus:ring-fuchsia-500 outline-none w-full sm:w-1/3 text-sm font-bold"
                />
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 mr-auto">
                  <button onClick={() => setIsAddingSpecial(false)} className="flex-1 sm:flex-none px-4 h-11 text-sm font-bold text-gray-500 bg-gray-200 rounded-xl hover:bg-gray-300">׳‘׳™׳˜׳•׳</button>
                  <button onClick={handleAddSpecialDate} disabled={isSubmitting || !newSpecialDate || !newSpecialName.trim()} className="flex-1 sm:flex-none px-6 h-11 bg-fuchsia-600 text-white font-bold rounded-xl flex items-center gap-2 justify-center disabled:opacity-50">
                    {isSubmitting ? <Loader className="w-4 h-4 animate-spin"/> : '׳©׳׳™׳¨׳”'}
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {specialDates.length === 0 && !isAddingSpecial && <p className="text-center py-12 text-gray-400 font-medium">׳׳™׳ ׳×׳׳¨׳™׳›׳™׳ ׳׳™׳•׳—׳“׳™׳ ׳‘׳׳¢׳¨׳›׳×.</p>}
              {specialDates.map((sd) => (
                <div key={sd.id} className="p-4 px-6 flex items-start sm:items-center justify-between hover:bg-gray-50 transition-colors group">
                  {editingSpecialId === sd.id ? (
                    <div className="flex flex-col sm:flex-row gap-3 w-full items-center mr-4">
                      <input 
                        type="text" 
                        value={editSpecialName}
                        onChange={e => setEditSpecialName(e.target.value)}
                        className="h-11 px-3 rounded-xl border border-fuchsia-200 focus:ring-2 focus:ring-fuchsia-500 outline-none w-full sm:w-1/3 text-sm font-bold"
                        autoFocus
                      />
                      <input 
                        type="date" 
                        value={editSpecialDate}
                        onChange={e => setEditSpecialDate(e.target.value)}
                        className="h-11 px-3 rounded-xl border border-fuchsia-200 focus:ring-2 focus:ring-fuchsia-500 outline-none w-full sm:w-1/3 text-sm font-bold"
                      />
                      <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 mr-auto">
                        <button onClick={() => setEditingSpecialId(null)} className="flex-1 sm:flex-none px-4 h-11 text-sm font-bold text-gray-500 bg-gray-200 rounded-xl hover:bg-gray-300">׳‘׳™׳˜׳•׳</button>
                        <button onClick={() => handleUpdateSpecialDate(sd.id)} disabled={isSubmitting || !editSpecialDate || !editSpecialName.trim()} className="flex-1 sm:flex-none px-6 h-11 bg-fuchsia-600 text-white font-bold rounded-xl flex items-center justify-center disabled:opacity-50">׳©׳׳™׳¨׳”</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 pr-4">
                        <p className="font-black text-lg text-gray-900 break-words whitespace-normal leading-tight">{sd.name}</p>
                        <p className="text-sm text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded inline-block mt-2 sm:mt-1">
                          {format(new Date(sd.date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => {
                          setEditingSpecialId(sd.id)
                          setEditSpecialName(sd.name)
                          setEditSpecialDate(new Date(sd.date).toISOString().split('T')[0])
                        }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition border border-transparent hover:border-blue-200">
                          <Pen className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDeleteSpecialDate(sd.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition border border-transparent hover:border-red-200">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'BLOCKED' && (
          <div>
            <div className="p-5 flex justify-between items-center bg-white">
              <p className="text-sm text-gray-500 font-medium max-w-sm">׳׳ ׳¢ ׳׳—׳׳•׳˜׳™׳ ׳”׳•׳¡׳₪׳× ׳”׳–׳׳ ׳•׳× ׳׳™׳׳™׳ ׳¡׳₪׳¦׳™׳₪׳™׳™׳.</p>
              <button onClick={() => setIsAddingBlocked(true)} className="flex items-center gap-1.5 bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors shrink-0">
                <Plus className="w-4 h-4"/> ׳”׳•׳¡׳£ ׳—׳¡׳™׳׳”
              </button>
            </div>

            {isAddingBlocked && (
              <div className="p-5 bg-red-50/50 border-y border-red-100 flex flex-col sm:flex-row gap-3 items-center">
                <input 
                  type="text" 
                  value={newBlockedReason}
                  onChange={e => setNewBlockedReason(e.target.value)}
                  placeholder="׳¡׳™׳‘׳× ׳—׳¡׳™׳׳” (׳׳“׳•׳’׳׳”: ׳¢׳¨׳‘ ׳₪׳•׳¨׳™׳)" 
                  className="h-11 px-3 rounded-xl border border-red-200 focus:ring-2 focus:ring-red-500 outline-none w-full sm:w-1/3 text-sm font-bold placeholder:font-normal"
                  autoFocus
                />
                <input 
                  type="date" 
                  value={newBlockedDate}
                  onChange={e => setNewBlockedDate(e.target.value)}
                  className="h-11 px-3 rounded-xl border border-red-200 focus:ring-2 focus:ring-red-500 outline-none w-full sm:w-1/3 text-sm font-bold"
                />
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 mr-auto">
                  <button onClick={() => { setIsAddingBlocked(false); setNewBlockedReason(''); }} className="flex-1 sm:flex-none px-4 h-11 text-sm font-bold text-gray-500 bg-gray-200 rounded-xl hover:bg-gray-300">׳‘׳™׳˜׳•׳</button>
                  <button onClick={handleAddBlockedDate} disabled={isSubmitting || !newBlockedDate} className="flex-1 sm:flex-none px-6 h-11 bg-red-600 text-white font-bold rounded-xl flex items-center gap-2 justify-center disabled:opacity-50">
                    {isSubmitting ? <Loader className="w-4 h-4 animate-spin"/> : '׳—׳¡׳•׳ ׳×׳׳¨׳™׳'}
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {blockedDates.length === 0 && !isAddingBlocked && <p className="text-center py-12 text-gray-400 font-medium">׳׳™׳ ׳×׳׳¨׳™׳›׳™׳ ׳—׳¡׳•׳׳™׳ ׳›׳¨׳’׳¢.</p>}
              {blockedDates.map((bd) => (
                <div key={bd.id} className="p-4 px-6 flex items-start sm:items-center justify-between hover:bg-gray-50 transition-colors">
                  {editingBlockedId === bd.id ? (
                    <div className="flex flex-col sm:flex-row gap-3 w-full items-center mr-4">
                      <input 
                        type="text" 
                        value={editBlockedReason}
                        onChange={e => setEditBlockedReason(e.target.value)}
                        placeholder="׳¡׳™׳‘׳× ׳—׳¡׳™׳׳”" 
                        className="h-11 px-3 rounded-xl border border-red-200 focus:ring-2 focus:ring-red-500 outline-none w-full sm:w-1/3 text-sm font-bold placeholder:font-normal"
                        autoFocus
                      />
                      <input 
                        type="date" 
                        value={editBlockedDate}
                        onChange={e => setEditBlockedDate(e.target.value)}
                        className="h-11 px-3 rounded-xl border border-red-200 focus:ring-2 focus:ring-red-500 outline-none w-full sm:w-1/3 text-sm font-bold"
                      />
                      <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 mr-auto">
                        <button onClick={() => setEditingBlockedId(null)} className="flex-1 sm:flex-none px-4 h-11 text-sm font-bold text-gray-500 bg-gray-200 rounded-xl hover:bg-gray-300">׳‘׳™׳˜׳•׳</button>
                        <button onClick={() => handleUpdateBlockedDate(bd.id)} disabled={isSubmitting || !editBlockedDate} className="flex-1 sm:flex-none px-6 h-11 bg-red-600 text-white font-bold rounded-xl flex items-center justify-center disabled:opacity-50">׳¢׳“׳›׳</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start sm:items-center gap-3 flex-1 pr-4">
                        <div className="w-10 h-10 shrink-0 mt-1 sm:mt-0 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
                          <Ban className="w-4 h-4" />
                        </div>
                        <div>
                          {bd.reason && <p className="font-black text-lg text-gray-900 break-words whitespace-normal leading-tight mb-1">{bd.reason}</p>}
                          <p className={`font-bold text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 inline-block ${bd.reason ? 'text-sm' : 'text-lg'}`}>
                            {format(new Date(bd.date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => {
                          setEditingBlockedId(bd.id)
                          setEditBlockedReason(bd.reason || '')
                          setEditBlockedDate(new Date(bd.date).toISOString().split('T')[0])
                        }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition border border-transparent hover:border-blue-200">
                          <Pen className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDeleteBlockedDate(bd.id)} title="׳©׳—׳¨׳¨ ׳—׳¡׳™׳׳”" className="px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:text-green-600 hover:border-green-300 hover:bg-green-50 rounded-xl text-sm font-bold transition-colors">
                          ׳‘׳˜׳ ׳—׳¡׳™׳׳”
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

