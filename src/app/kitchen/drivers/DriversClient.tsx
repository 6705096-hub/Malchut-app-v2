'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Truck, MapPin, Edit2, Trash2, Check, X, ChevronRight, Settings } from 'lucide-react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

type Driver = {
  id: string
  name: string
  city: string
  type: string
  userId: string | null
  isActive: boolean
  sortOrder: number
  assignedAreas: { id: string; deliveryAreaId: string; weekDate: string | null }[]
}

type Area = { id: string; name: string }
type SystemUser = { id: string; name: string | null; phone: string | null }

const CITY_LABELS: Record<string, string> = {
  JERUSALEM: 'ירושלים',
  BEIT_SHEMESH: 'בית שמש',
  BOTH: 'שניהם'
}
const TYPE_LABELS: Record<string, string> = {
  MIDWEEK: 'אמצע שבוע',
  SHABBAT: 'שבת',
  BOTH: 'שניהם'
}
const CITY_COLORS: Record<string, string> = {
  JERUSALEM: 'bg-blue-100 text-blue-800',
  BEIT_SHEMESH: 'bg-green-100 text-green-800',
  BOTH: 'bg-purple-100 text-purple-800'
}
const TYPE_COLORS: Record<string, string> = {
  MIDWEEK: 'bg-amber-100 text-amber-800',
  SHABBAT: 'bg-indigo-100 text-indigo-800',
  BOTH: 'bg-teal-100 text-teal-800'
}

export function DriversClient({
  initialDrivers,
  deliveryAreas,
  systemUsers,
  canEditDrivers,
  canLinkDrivers,
  canAssignAreas,
  myDriverId,
  currentUserId
}: {
  initialDrivers: Driver[]
  deliveryAreas: Area[]
  systemUsers: SystemUser[]
  canEditDrivers: boolean
  canLinkDrivers: boolean
  canAssignAreas: boolean
  myDriverId: string | null
  currentUserId: string
}) {
  const router = useRouter()
  const [drivers, setDrivers] = useState(initialDrivers)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [editName, setEditName] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editType, setEditType] = useState('')
  const [areaModalDriver, setAreaModalDriver] = useState<Driver | null>(null)
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set())
  const [linkModalDriver, setLinkModalDriver] = useState<Driver | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // Add form state
  const [newName, setNewName] = useState('')
  const [newCity, setNewCity] = useState('BEIT_SHEMESH')
  const [newType, setNewType] = useState('MIDWEEK')

  const handleAddDriver = async () => {
    if (!newName.trim() || isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, city: newCity, type: newType })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDrivers(prev => [...prev, { ...data.driver, assignedAreas: [] }])
      setNewName('')
      setShowAddForm(false)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteDriver = async (driver: Driver) => {
    if (!confirm(`למחוק את הנהג "${driver.name}"?`)) return
    try {
      const res = await fetch(`/api/drivers/${driver.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('שגיאה במחיקה')
      setDrivers(prev => prev.filter(d => d.id !== driver.id))
    } catch (e: any) {
      alert(e.message)
    }
  }

  const startEdit = (driver: Driver) => {
    setEditingDriver(driver)
    setEditName(driver.name)
    setEditCity(driver.city)
    setEditType(driver.type)
  }

  const handleSaveEdit = async () => {
    if (!editingDriver || !editName.trim() || isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/drivers/${editingDriver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, city: editCity, type: editType })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDrivers(prev => prev.map(d => d.id === editingDriver.id ? { ...d, name: editName, city: editCity, type: editType } : d))
      setEditingDriver(null)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const openAreaModal = (driver: Driver) => {
    setAreaModalDriver(driver)
    // Pre-select permanent areas
    const permanentAreas = driver.assignedAreas.filter(a => !a.weekDate).map(a => a.deliveryAreaId)
    setSelectedAreas(new Set(permanentAreas))
  }

  const handleSaveAreas = async () => {
    if (!areaModalDriver || isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/drivers/${areaModalDriver.id}/areas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaIds: Array.from(selectedAreas), weekDate: null })
      })
      if (!res.ok) throw new Error('שגיאה בשמירה')
      // Update local state
      setDrivers(prev => prev.map(d => d.id === areaModalDriver.id ? {
        ...d,
        assignedAreas: Array.from(selectedAreas).map(id => ({
          id: `temp-${id}`,
          deliveryAreaId: id,
          weekDate: null
        }))
      } : d))
      setAreaModalDriver(null)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLinkUser = async () => {
    if (!linkModalDriver || isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/drivers/${linkModalDriver.id}/link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId || null })
      })
      if (!res.ok) throw new Error('שגיאה בשמירה')
      setDrivers(prev => prev.map(d => d.id === linkModalDriver.id ? { ...d, userId: selectedUserId || null } : d))
      setLinkModalDriver(null)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const openLinkModal = (driver: Driver) => {
    setLinkModalDriver(driver)
    setSelectedUserId(driver.userId || '')
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const midweekDrivers = drivers.filter(d => d.type === 'MIDWEEK' || d.type === 'BOTH')
  const shabbatDrivers = drivers.filter(d => d.type === 'SHABBAT' || d.type === 'BOTH')

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 -mt-6 -ml-6 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
        <h1 className="relative z-10 text-2xl font-black mb-1 flex items-center gap-2">
          <Truck className="w-7 h-7" /> ניהול נהגים וחלוקה
        </h1>
        <p className="relative z-10 text-slate-300 text-sm">שיוך הזמנות לנהגים, מסלולים ורכבי שבת</p>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'שיוך הזמנות', href: '/kitchen/drivers/assign', color: 'bg-amber-50 border-amber-200 text-amber-800' },
          { label: 'רכבי שבת', href: '/kitchen/drivers/vehicles', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
          { label: 'כרטסת נהג', href: '/kitchen/drivers/my-route', color: 'bg-green-50 border-green-200 text-green-800' }
        ].map(nav => (
          <button
            key={nav.href}
            onClick={() => router.push(nav.href)}
            className={`${nav.color} border rounded-2xl p-3 text-center text-sm font-bold flex flex-col items-center gap-1 hover:shadow-md transition-all`}
          >
            <ChevronRight className="w-4 h-4" />
            {nav.label}
          </button>
        ))}
      </div>

      {/* Add Driver */}
      {canEditDrivers && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-slate-400 hover:text-slate-700 transition-all font-bold text-sm"
            >
              <Plus className="w-4 h-4" /> הוספת נהג חדש
            </button>
          ) : (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-800 text-sm">נהג חדש</h3>
              <input
                type="text"
                placeholder="שם הנהג..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-slate-400 outline-none"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 font-bold mb-1 uppercase">עיר</label>
                  <select
                    value={newCity}
                    onChange={e => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:ring-2 focus:ring-slate-400 outline-none"
                  >
                    <option value="JERUSALEM">ירושלים</option>
                    <option value="BEIT_SHEMESH">בית שמש</option>
                    <option value="BOTH">שניהם</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 font-bold mb-1 uppercase">סוג</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:ring-2 focus:ring-slate-400 outline-none"
                  >
                    <option value="MIDWEEK">אמצע שבוע</option>
                    <option value="SHABBAT">שבת</option>
                    <option value="BOTH">שניהם</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddForm(false); setNewName('') }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
                >ביטול</button>
                <button
                  onClick={handleAddDriver}
                  disabled={!newName.trim() || isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-50"
                >
                  {isSaving ? 'שומר...' : 'הוסף נהג'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Midweek Drivers */}
      {midweekDrivers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
            <h2 className="font-black text-amber-900 text-sm">נהגי אמצע השבוע</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {midweekDrivers.map(driver => (
              <div key={driver.id} className="p-4">
                {editingDriver?.id === driver.id ? (
                  <div className="space-y-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold bg-gray-50 focus:ring-2 focus:ring-slate-400 outline-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={editCity} onChange={e => setEditCity(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 outline-none">
                        <option value="JERUSALEM">ירושלים</option>
                        <option value="BEIT_SHEMESH">בית שמש</option>
                        <option value="BOTH">שניהם</option>
                      </select>
                      <select value={editType} onChange={e => setEditType(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 outline-none">
                        <option value="MIDWEEK">אמצע שבוע</option>
                        <option value="SHABBAT">שבת</option>
                        <option value="BOTH">שניהם</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingDriver(null)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600">ביטול</button>
                      <button onClick={handleSaveEdit} disabled={isSaving} className="flex-1 py-2 rounded-xl bg-slate-800 text-white text-sm font-bold disabled:opacity-50">{isSaving ? 'שומר...' : 'שמור'}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-gray-900">{driver.name}</div>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${CITY_COLORS[driver.city]}`}>{CITY_LABELS[driver.city]}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TYPE_COLORS[driver.type]}`}>{TYPE_LABELS[driver.type]}</span>
                      </div>
                    </div>
                    {(canEditDrivers || canAssignAreas || canLinkDrivers) && (
                      <div className="flex gap-1">
                        <button onClick={() => router.push(`/kitchen/drivers/assign?driverId=${driver.id}&date=${todayStr}`)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="שיוך הזמנות">
                          <Settings className="w-4 h-4" />
                        </button>
                        {canLinkDrivers && (
                          <button onClick={() => openLinkModal(driver)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title={driver.userId ? 'משתמש מקושר' : 'קשר נהג למשתמש מערכת'}>
                            <div className="relative">
                              <Settings className="w-3.5 h-3.5" />
                              {driver.userId && <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-white" />}
                            </div>
                          </button>
                        )}
                        {canEditDrivers && (
                          <>
                            <button onClick={() => startEdit(driver)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteDriver(driver)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shabbat Drivers */}
      {shabbatDrivers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
            <h2 className="font-black text-indigo-900 text-sm">נהגי שבת</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {shabbatDrivers.map(driver => {
              const permanentAreas = driver.assignedAreas.filter(a => !a.weekDate)
              const areaNames = permanentAreas
                .map(a => deliveryAreas.find(da => da.id === a.deliveryAreaId)?.name || '')
                .filter(Boolean)

              return (
                <div key={driver.id} className="p-4">
                  {editingDriver?.id === driver.id ? (
                    <div className="space-y-2">
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold bg-gray-50 focus:ring-2 focus:ring-indigo-400 outline-none" />
                      <div className="grid grid-cols-2 gap-2">
                        <select value={editCity} onChange={e => setEditCity(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 outline-none">
                          <option value="JERUSALEM">ירושלים</option>
                          <option value="BEIT_SHEMESH">בית שמש</option>
                          <option value="BOTH">שניהם</option>
                        </select>
                        <select value={editType} onChange={e => setEditType(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 outline-none">
                          <option value="MIDWEEK">אמצע שבוע</option>
                          <option value="SHABBAT">שבת</option>
                          <option value="BOTH">שניהם</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingDriver(null)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600">ביטול</button>
                        <button onClick={handleSaveEdit} disabled={isSaving} className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">{isSaving ? 'שומר...' : 'שמור'}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-indigo-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-gray-900">{driver.name}</div>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${CITY_COLORS[driver.city]}`}>{CITY_LABELS[driver.city]}</span>
                        </div>
                        {areaNames.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {areaNames.map(name => (
                              <span key={name} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" /> {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {(canEditDrivers || canAssignAreas || canLinkDrivers) && (
                        <div className="flex gap-1">
                          {canAssignAreas && (
                            <button onClick={() => openAreaModal(driver)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="שיוך אזורים">
                              <MapPin className="w-4 h-4" />
                            </button>
                          )}
                          {canLinkDrivers && (
                            <button onClick={() => openLinkModal(driver)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title={driver.userId ? 'משתמש מקושר' : 'קשר נהג למשתמש מערכת'}>
                              <div className="relative">
                                <Settings className="w-3.5 h-3.5" />
                                {driver.userId && <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-white" />}
                              </div>
                            </button>
                          )}
                          {canEditDrivers && (
                            <>
                              <button onClick={() => startEdit(driver)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteDriver(driver)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {drivers.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">לא הוגדרו נהגים עדיין</p>
          <p className="text-sm">הוסף את הנהג הראשון למעלה</p>
        </div>
      )}

      {/* Area Assignment Modal (Shabbat) */}
      {areaModalDriver && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10" onClick={() => setAreaModalDriver(null)}>
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <div>
                <h3 className="font-black text-gray-900">{areaModalDriver.name}</h3>
                <p className="text-xs text-gray-500">שיוך אזורי שבת קבועים</p>
              </div>
              <button onClick={() => setAreaModalDriver(null)} className="p-1.5 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
              {deliveryAreas.map(area => (
                <label key={area.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedAreas.has(area.id) ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <input
                    type="checkbox"
                    checked={selectedAreas.has(area.id)}
                    onChange={() => {
                      setSelectedAreas(prev => {
                        const next = new Set(prev)
                        if (next.has(area.id)) next.delete(area.id)
                        else next.add(area.id)
                        return next
                      })
                    }}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-sm font-bold text-gray-800">{area.name}</span>
                  {selectedAreas.has(area.id) && <Check className="w-4 h-4 text-indigo-600 mr-auto" />}
                </label>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => setAreaModalDriver(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600">ביטול</button>
              <button onClick={handleSaveAreas} disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                {isSaving ? 'שומר...' : `שמור ${selectedAreas.size} אזורים`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Link Modal */}
      {linkModalDriver && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10" onClick={() => setLinkModalDriver(null)}>
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <div>
                <h3 className="font-black text-gray-900">{linkModalDriver.name}</h3>
                <p className="text-xs text-gray-500">קישור לפרופיל משתמש באפליקציה</p>
              </div>
              <button onClick={() => setLinkModalDriver(null)} className="p-1.5 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600">
                בחר משתמש מערכת. כאשר המשתמש הזה יתחבר, הוא יראה אוטומטית את "המסלול שלי" עבור הנהג הזה.
              </p>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">-- ללא משתמש מקושר --</option>
                {systemUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.phone ? `(${user.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => setLinkModalDriver(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600">ביטול</button>
              <button onClick={handleLinkUser} disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                {isSaving ? 'שומר...' : 'שמור קישור'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
