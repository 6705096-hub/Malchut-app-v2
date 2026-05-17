'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ArrowUpDown, GripVertical, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

type Area = {
  id: string
  name: string
  isActive: boolean
  routeId?: string | null
  route?: { id: string, name: string } | null
  sortOrder?: number
}

export function AreaManager({ initialAreas, routes = [] }: { initialAreas: Area[], routes?: {id:string, name:string}[] }) {
  const [areas, setAreas] = useState<Area[]>(initialAreas)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [isSortMode, setIsSortMode] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => { setIsMounted(true) }, [])
  const router = useRouter()

  const handleAdd = async () => {
    if (!newName.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      })
      if (!res.ok) throw new Error('׳©׳’׳™׳׳” ׳‘׳”׳•׳¡׳₪׳× ׳׳–׳•׳¨')
      const { area } = await res.json()
      setAreas([...areas, area])
      setNewName('')
      setIsAdding(false)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('׳©׳’׳™׳׳” ׳‘׳”׳•׳¡׳₪׳× ׳׳–׳•׳¨ ׳—׳׳•׳§׳”')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('׳”׳׳ ׳׳×׳” ׳‘׳˜׳•׳— ׳©׳‘׳¨׳¦׳•׳ ׳ ׳׳׳—׳•׳§ ׳׳–׳•׳¨ ׳–׳”?')) return
    try {
      const res = await fetch(`/api/areas/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || '׳©׳’׳™׳׳” ׳‘׳׳—׳™׳§׳× ׳׳–׳•׳¨')
      }
      setAreas(areas.filter(a => a.id !== id))
      router.refresh()
    } catch (error: any) {
      console.error(error)
      alert(error.message)
    }
  }

  const startEdit = (area: Area) => {
    setEditingId(area.id)
    setEditName(area.name)
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/areas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      })
      if (!res.ok) throw new Error('׳©׳’׳™׳׳” ׳‘׳¢׳“׳›׳•׳ ׳׳–׳•׳¨')
      const { area } = await res.json()
      setAreas(areas.map(a => a.id === id ? area : a))
      setEditingId(null)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('׳©׳’׳™׳׳” ׳‘׳¢׳“׳›׳•׳ ׳׳–׳•׳¨')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleStatus = async (area: Area) => {
    try {
      const res = await fetch(`/api/areas/${area.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !area.isActive })
      })
      if (!res.ok) throw new Error('׳©׳’׳™׳׳” ׳©׳™׳ ׳•׳™ ׳¡׳˜׳˜׳•׳¡')
      const { area: updatedArea } = await res.json()
      setAreas(areas.map(a => a.id === area.id ? updatedArea : a))
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('׳©׳’׳™׳׳” ׳‘׳¢׳“׳›׳•׳ ׳”׳¡׳˜׳˜׳•׳¡')
    }
  }

  const changeRoute = async (areaId: string, routeId: string) => {
    try {
      const res = await fetch(`/api/areas/${areaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: routeId === 'none' ? null : routeId })
      })
      if (!res.ok) throw new Error('׳©׳’׳™׳׳” ׳‘׳¢׳“׳›׳•׳ ׳¨׳›׳‘')
      const { area: updatedArea } = await res.json()
      setAreas(areas.map(a => a.id === areaId ? updatedArea : a))
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('׳©׳’׳™׳׳” ׳‘׳¢׳“׳›׳•׳ ׳¨׳›׳‘ ׳׳׳–׳•׳¨')
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const startIndex = result.source.index;
    const endIndex = result.destination.index;
    if (startIndex === endIndex) return;

    const newItems = Array.from(areas);
    const [removed] = newItems.splice(startIndex, 1);
    newItems.splice(endIndex, 0, removed);
    
    setAreas(newItems);
    try {
      await fetch('/api/areas/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newItems.map(a => a.id) })
      });
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('׳©׳’׳™׳׳” ׳‘׳©׳׳™׳¨׳× ׳”׳¡׳“׳¨');
      router.refresh();
    }
  }

  if (!isMounted) return null;

  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">׳׳–׳•׳¨׳™ ׳—׳׳•׳§׳”</h2>
          <p className="text-sm text-gray-500">׳ ׳™׳”׳•׳ ׳׳–׳•׳¨׳™ ׳—׳׳•׳§׳”</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setIsSortMode(!isSortMode); setEditingId(null); setIsAdding(false); }}
            className={`flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm ${isSortMode ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            {isSortMode ? <Check className="w-4 h-4 ml-1" /> : <ArrowUpDown className="w-4 h-4 ml-1" />}
            {isSortMode ? '׳¡׳™׳•׳ ׳׳™׳•׳' : '׳׳™׳•׳'}
          </button>
          
          {!isSortMode && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition"
            >
              <Plus className="w-4 h-4" /> ׳”׳•׳¡׳₪׳”
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isAdding && (
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col gap-3">
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="׳׳“׳•׳’׳׳”: ׳׳¨׳›׳–, ׳¨׳׳•׳×..."
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-4 h-10 text-sm font-medium text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                ׳‘׳™׳˜׳•׳
              </button>
              <button 
                onClick={handleAdd}
                disabled={!newName.trim() || isSubmitting}
                className="px-6 h-10 bg-blue-600 text-white text-sm font-bold rounded-lg disabled:opacity-50 hover:bg-blue-700 transition"
              >
                ׳©׳׳™׳¨׳”
              </button>
            </div>
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="areas">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="divide-y divide-gray-50"
              >
                {areas.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    ׳˜׳¨׳ ׳”׳•׳’׳“׳¨׳• ׳׳–׳•׳¨׳™ ׳—׳׳•׳§׳”.
                  </div>
                ) : (
                  areas.map((area, index) => (
                    <Draggable key={area.id} draggableId={area.id} index={index} isDragDisabled={!isSortMode}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`p-4 flex flex-col md:flex-row md:justify-between md:items-center transition-colors gap-3 ${snapshot.isDragging ? 'bg-indigo-50 shadow-md ring-1 ring-indigo-500 z-50 rounded-xl' : 'hover:bg-gray-50'}`}
                        >
                          {editingId === area.id ? (
                            <div className="flex-1 flex gap-2 w-full">
                              <input 
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 h-9 px-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                autoFocus
                              />
                              <button onClick={() => setEditingId(null)} className="px-2 text-sm text-gray-500">׳‘׳™׳˜׳•׳</button>
                              <button onClick={() => saveEdit(area.id)} disabled={isSubmitting} className="px-3 bg-blue-600 text-white text-sm font-bold rounded">׳©׳׳•׳¨</button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                {isSortMode && (
                                  <div {...provided.dragHandleProps} className="px-2 py-1 flex items-center justify-center text-gray-400 hover:text-indigo-600 cursor-grab active:cursor-grabbing border-l border-gray-100 ml-1">
                                    <GripVertical className="w-5 h-5" />
                                  </div>
                                )}
                                
                                <span className="font-semibold text-gray-900 min-w-[120px]">{area.name}</span>
                                
                                {!isSortMode && (
                                  <>
                                    <button 
                                      onClick={() => toggleStatus(area)}
                                      className={`text-xs font-bold px-2 py-1 rounded transition ${area.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} shrink-0`}
                                    >
                                      {area.isActive ? '׳₪׳¢׳™׳' : '׳׳ ׳₪׳¢׳™׳'}
                                    </button>
                                    
                                    <div className="mr-4 sm:mr-8 max-w-[150px] sm:max-w-none">
                                      <select
                                        value={area.routeId || 'none'}
                                        onChange={(e) => changeRoute(area.id, e.target.value)}
                                        className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 w-full"
                                      >
                                        <option value="none">-- ׳׳׳ ׳¨׳›׳‘ --</option>
                                        {routes.map(r => (
                                          <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              {!isSortMode && (
                                <div className="flex gap-2 mr-auto self-end md:self-auto">
                                  <button 
                                    onClick={() => startEdit(area)}
                                    className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
                                  >
                                    ׳¢׳¨׳•׳
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(area.id)}
                                    className="text-red-500 bg-red-50 p-1.5 rounded-lg hover:bg-red-100 transition"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  )
}

