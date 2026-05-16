'use client'

import { useState } from 'react'
import { Plus, Trash2, Truck } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Route = {
  id: string
  name: string
  _count?: { areas: number }
}

export function RouteManager({ initialRoutes }: { initialRoutes: Route[] }) {
  const [routes, setRoutes] = useState<Route[]>(initialRoutes)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const router = useRouter()

  const handleAdd = async () => {
    if (!newName.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      })
      if (!res.ok) throw new Error('שגיאה בהוספת רכב')
      const { route } = await res.json()
      setRoutes([...routes, { ...route, _count: { areas: 0 } }])
      setNewName('')
      setIsAdding(false)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('שגיאה בהוספת רכב')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק רכב/מסלול זה? הפעולה תנתק אותו מכל אזורי החלוקה שלו.')) return
    try {
      const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error('שגיאה במחיקת רכב')
      }
      setRoutes(routes.filter(r => r.id !== id))
      router.refresh()
    } catch (error: any) {
      console.error(error)
      alert(error.message)
    }
  }

  const startEdit = (route: Route) => {
    setEditingId(route.id)
    setEditName(route.name)
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/routes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      })
      if (!res.ok) throw new Error('שגיאה בעדכון רכב')
      const { route } = await res.json()
      setRoutes(routes.map(r => r.id === id ? { ...route, _count: r._count } : r))
      setEditingId(null)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('שגיאה בעדכון רכב')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-end mb-4 mt-8">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            רכבי חלוקה
          </h2>
          <p className="text-sm text-gray-500">ניהול צי הרכבים</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" /> הוספת רכב
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        {isAdding && (
          <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex flex-col gap-3">
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="לדוגמה: רכב אליהו, רכב דרום..."
              className="w-full h-10 px-3 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-4 h-10 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50"
              >
                ביטול
              </button>
              <button 
                onClick={handleAdd}
                disabled={!newName.trim() || isSubmitting}
                className="px-6 h-10 bg-indigo-600 text-white text-sm font-bold rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition"
              >
                שמירה
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-50">
          {routes.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              טרם הוגדרו רכבים.
            </div>
          ) : (
            routes.map(route => (
              <div key={route.id} className="p-4 flex flex-col md:flex-row md:justify-between md:items-center hover:bg-gray-50 transition-colors gap-3">
                {editingId === route.id ? (
                  <div className="flex-1 flex gap-2">
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 h-9 px-2 rounded border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      autoFocus
                    />
                    <button onClick={() => setEditingId(null)} className="px-2 text-sm text-gray-500">ביטול</button>
                    <button onClick={() => saveEdit(route.id)} disabled={isSubmitting} className="px-3 bg-indigo-600 text-white text-sm font-bold rounded">שמור</button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{route.name}</span>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
                        {route._count?.areas || 0} אזורים מקושרים
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => startEdit(route)}
                        className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
                      >
                        ערוך
                      </button>
                      <button 
                        onClick={() => handleDelete(route.id)}
                        className="text-red-500 bg-red-50 p-1.5 rounded-lg hover:bg-red-100 transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
