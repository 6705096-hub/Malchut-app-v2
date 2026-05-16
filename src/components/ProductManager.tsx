'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Edit2, CircleCheck, GripVertical, ArrowUpDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { BackButton } from '@/components/BackButton'

type Product = {
  id: string
  name: string
  price: number
  category: string
  isActive: boolean
  isManufactured: boolean
  linkedWholeProductId?: string | null
  bulkQuantity?: number | null
  bulkPrice?: number | null
  discountType?: 'PACK_OF_N' | 'ALL_REDUCED_PRICE' | null
  discountIfAnyOtherPrice?: number | null
  sortOrder?: number
  sortOrderStores?: number
  isSpecial?: boolean
  isSpecialStores?: boolean
}

export function ProductManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [isAdding, setIsAdding] = useState(false)
  const [isSortMode, setIsSortMode] = useState(false)
  const [sortContext, setSortContext] = useState<'REGULAR' | 'STORES'>('REGULAR')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])
  
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('10')
  const [newCategory, setNewCategory] = useState('HOT')
  const [newIsManufactured, setNewIsManufactured] = useState(false)
  const [newLinkedProductId, setNewLinkedProductId] = useState<string>('')
  const [newBulkQuantity, setNewBulkQuantity] = useState<string>('')
  const [newBulkPrice, setNewBulkPrice] = useState<string>('')
  const [newDiscountType, setNewDiscountType] = useState<'PACK_OF_N'|'ALL_REDUCED_PRICE'>('PACK_OF_N')
  const [newDiscountIfAnyOtherPrice, setNewDiscountIfAnyOtherPrice] = useState('')
  const [newIsSpecial, setNewIsSpecial] = useState(false)
  const [newIsSpecialStores, setNewIsSpecialStores] = useState(false)
  
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('10')
  const [editCategory, setEditCategory] = useState('HOT')
  const [editIsManufactured, setEditIsManufactured] = useState(false)
  const [editLinkedProductId, setEditLinkedProductId] = useState<string>('')
  const [editBulkQuantity, setEditBulkQuantity] = useState<string>('')
  const [editBulkPrice, setEditBulkPrice] = useState<string>('')
  const [editDiscountType, setEditDiscountType] = useState<'PACK_OF_N'|'ALL_REDUCED_PRICE'>('PACK_OF_N')
  const [editDiscountIfAnyOtherPrice, setEditDiscountIfAnyOtherPrice] = useState('')
  const [editIsSpecial, setEditIsSpecial] = useState(false)
  const [editIsSpecialStores, setEditIsSpecialStores] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const valA = sortContext === 'REGULAR' ? (a.sortOrder || 0) : (a.sortOrderStores || 0)
      const valB = sortContext === 'REGULAR' ? (b.sortOrder || 0) : (b.sortOrderStores || 0)
      if (valA !== valB) return valA - valB
      return a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    })
  }, [products, sortContext])

  const handleAdd = async () => {
    if (!newName.trim() || !newPrice) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newName.trim(), 
          price: parseFloat(newPrice),
          category: newCategory,
          isManufactured: newIsManufactured,
          linkedWholeProductId: newLinkedProductId || null,
          bulkQuantity: newBulkQuantity ? parseInt(newBulkQuantity) : null,
          bulkPrice: newBulkPrice ? parseFloat(newBulkPrice) : null,
          discountType: newDiscountType,
          discountIfAnyOtherPrice: newDiscountIfAnyOtherPrice ? parseFloat(newDiscountIfAnyOtherPrice) : null,
          isSpecial: newIsSpecial,
          isSpecialStores: newIsSpecialStores
        })
      })
      if (!res.ok) throw new Error('Error')
      const data = await res.json()
      const addedProduct = data.product || data.newProduct
      setProducts([...products, addedProduct])
      
      setNewName(''); setNewPrice('10'); setNewIsManufactured(false);
      setNewLinkedProductId(''); setNewBulkQuantity(''); setNewBulkPrice('');
      setNewDiscountType('PACK_OF_N'); setNewDiscountIfAnyOtherPrice('')
      setNewIsSpecial(false); setNewIsSpecialStores(false);
      setIsAdding(false)
      router.refresh()
    } catch (error) {
      alert('׳©׳’׳™׳׳” ׳‘׳”׳•׳¡׳₪׳× ׳׳•׳¦׳¨')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })
      if (res.ok) {
        setProducts(products.map(p => p.id === id ? { ...p, isActive: !currentStatus } : p))
        router.refresh()
      }
    } catch(e) { console.error(e) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('׳׳׳—׳•׳§ ׳׳¦׳׳™׳×׳•׳×?')) return
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error')
      setProducts(products.filter(p => p.id !== id))
      router.refresh()
    } catch (error: any) {
      alert('׳©׳’׳™׳׳” ׳‘׳׳—׳™׳§׳× ׳׳•׳¦׳¨')
    }
  }

  const startEdit = (product: Product) => {
    setEditingId(product.id)
    setEditName(product.name)
    setEditPrice(product.price.toString())
    setEditCategory(product.category)
    setEditIsManufactured(product.isManufactured || false)
    setEditLinkedProductId(product.linkedWholeProductId || '')
    setEditBulkQuantity(product.bulkQuantity ? product.bulkQuantity.toString() : '')
    setEditBulkPrice(product.bulkPrice ? product.bulkPrice.toString() : '')
    setEditDiscountType(product.discountType || 'PACK_OF_N')
    setEditDiscountIfAnyOtherPrice(product.discountIfAnyOtherPrice?.toString() || '')
    setEditIsSpecial(product.isSpecial || false)
    setEditIsSpecialStores(product.isSpecialStores || false)
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim() || !editPrice) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editName.trim(),
          price: parseFloat(editPrice),
          category: editCategory,
          isManufactured: editIsManufactured,
          linkedWholeProductId: editLinkedProductId || null,
          bulkQuantity: editBulkQuantity ? parseInt(editBulkQuantity) : null,
          bulkPrice: editBulkPrice ? parseFloat(editBulkPrice) : null,
          discountType: editDiscountType,
          isSpecial: editIsSpecial,
          isSpecialStores: editIsSpecialStores
        })
      })
      if (!res.ok) throw new Error('Error')
      const { product } = await res.json()
      setProducts(products.map(p => p.id === id ? product : p))
      setEditingId(null)
      router.refresh()
    } catch (error) {
      alert('׳©׳’׳™׳׳” ׳‘׳¢׳“׳›׳•׳ ׳׳•׳¦׳¨')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const startIndex = result.source.index;
    const endIndex = result.destination.index;
    if (startIndex === endIndex) return;

    const newItems = Array.from(sortedProducts);
    const [removed] = newItems.splice(startIndex, 1);
    newItems.splice(endIndex, 0, removed);

    // Compute new sort order properties
    const updatedProductsMap = new Map(products.map(p => [p.id, { ...p }]));
    const orderedIds = newItems.map(p => p.id);
    
    // Optimistic update locally
    newItems.forEach((item, i) => {
      const p = updatedProductsMap.get(item.id)!;
      if (sortContext === 'REGULAR') p.sortOrder = i;
      if (sortContext === 'STORES') p.sortOrderStores = i;
    });
    
    setProducts(Array.from(updatedProductsMap.values()));

    // API sync
    try {
      await fetch('/api/products/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds, context: sortContext })
      });
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('׳©׳’׳™׳׳” ׳‘׳©׳׳™׳¨׳× ׳”׳¡׳“׳¨');
    }
  }

  if (!isMounted) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900 truncate tracking-tight pr-1">׳׳•׳¦׳¨׳™׳</h1>
        
        <div className="flex items-center justify-end gap-2 pl-1">
          <button 
            onClick={() => { setIsSortMode(!isSortMode); setEditingId(null); setIsAdding(false); }}
            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors shadow-sm shrink-0 ${isSortMode ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            {isSortMode ? <CircleCheck className="w-5 h-5" /> : <ArrowUpDown className="w-5 h-5" />}
          </button>
          
          {!isSortMode && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center w-10 h-10 bg-gray-900 text-white rounded-xl shadow-sm hover:bg-gray-800 transition shrink-0"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}

          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          
          <BackButton />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8 pl-1 pr-1 pb-1">
        {/* Sort Context Toggle */}
        {isSortMode && (
          <div className="bg-indigo-50/50 p-4 border-b border-indigo-100/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-bold text-indigo-900">׳‘׳—׳¨ ׳׳™׳•׳ ׳¨׳׳•׳•׳ ׳˜׳™ ׳׳¡׳™׳“׳•׳¨:</span>
            <div className="flex gap-2 p-1 bg-white border border-gray-200 rounded-xl w-full sm:w-auto shadow-sm">
              <button 
                onClick={() => setSortContext('REGULAR')}
                className={`flex-1 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${sortContext === 'REGULAR' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                ׳”׳–׳׳ ׳•׳× ׳¨׳’׳™׳׳•׳× ׳•׳©׳‘׳×
              </button>
              <button 
                onClick={() => setSortContext('STORES')}
                className={`flex-1 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all ${sortContext === 'STORES' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                ׳—׳ ׳•׳™׳•׳× ׳‘׳׳‘׳“
              </button>
            </div>
          </div>
        )}

        {isAdding && (
          <div className="p-5 bg-gray-50 border-b border-gray-100 flex flex-col gap-3">
            {/* Same implementation as before */}
            <h3 className="font-bold text-gray-800 text-sm">׳׳•׳¦׳¨ ׳—׳“׳©</h3>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="׳©׳ ׳׳•׳¦׳¨" className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none font-bold" autoFocus />
            <div className="flex gap-3">
              <div className="flex-1 flex gap-2 p-1 bg-gray-100 rounded-xl h-12 w-full">
                <button onClick={() => setNewCategory(newCategory === 'HOT' ? 'OTHER' : newCategory === 'COLD' ? 'BOTH' : newCategory === 'BOTH' ? 'COLD' : 'HOT')} className={`flex-1 rounded-lg text-sm font-bold ${newCategory === 'HOT' || newCategory === 'BOTH' ? 'bg-red-400 text-white' : 'text-gray-500'}`}>׳—׳ נ”¥</button>
                <button onClick={() => setNewCategory(newCategory === 'COLD' ? 'OTHER' : newCategory === 'HOT' ? 'BOTH' : newCategory === 'BOTH' ? 'HOT' : 'COLD')} className={`flex-1 rounded-lg text-sm font-bold ${newCategory === 'COLD' || newCategory === 'BOTH' ? 'bg-blue-400 text-white' : 'text-gray-500'}`}>׳§׳¨ ג„ן¸</button>
              </div>
              <div className="flex-1 relative">
                <span className="absolute left-4 top-3 text-gray-500 font-bold">ג‚×</span>
                <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="w-full h-12 pl-8 pr-4 rounded-xl border border-gray-300 focus:ring-2 outline-none font-bold text-gray-800" />
              </div>
            </div>
            
            {/* Promo Settings */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 mt-2">
              <p className="text-xs font-bold text-gray-500 mb-2">׳׳‘׳¦׳¢ ׳׳׳׳¨׳–׳™׳ / ׳”׳ ׳—׳× ׳›׳׳•׳×</p>
              <div className="flex gap-2">
                <input type="number" placeholder="׳›׳׳•׳×" value={newBulkQuantity} onChange={e=>setNewBulkQuantity(e.target.value)} className="w-20 h-10 px-2 rounded-lg border border-gray-300 text-sm" />
                <input type="number" placeholder="׳׳—׳™׳¨" value={newBulkPrice} onChange={e=>setNewBulkPrice(e.target.value)} className="w-20 h-10 px-2 rounded-lg border border-gray-300 text-sm" />
                <select value={newDiscountType} onChange={e=>setNewDiscountType(e.target.value as any)} className="flex-1 h-10 px-2 rounded-lg border border-gray-300 text-sm bg-white">
                  <option value="PACK_OF_N">׳׳—׳™׳¨ ׳׳׳׳¨׳– ׳‘׳׳‘׳“ (׳”׳©׳׳¨׳™׳× ׳¨׳’׳™׳)</option>
                  <option value="ALL_REDUCED_PRICE">׳׳—׳™׳¨ ׳׳•׳–׳ ׳׳›׳•׳׳ (׳׳©׳×׳׳ ׳‘׳›׳׳•׳×)</option>
                </select>
              </div>
            </div>

            {/* Condition Settings */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 mt-2">
              <p className="text-xs font-bold text-gray-500 mb-2">׳׳—׳™׳¨ ׳׳•׳×׳ ׳” (׳§׳•׳׳‘׳• ׳¡׳ ׳׳׳•׳¦׳¨׳™׳ ׳׳—׳¨׳™׳)</p>
              <div className="flex gap-2 items-center">
                <span className="text-[10px] text-gray-400 font-bold w-1/2 leading-tight">׳׳ ׳™׳© ׳›׳ ׳“׳‘׳¨ ׳׳—׳¨ ׳‘׳¢׳’׳׳”, ׳”׳׳—׳™׳¨ ׳©׳ ׳”׳₪׳¨׳™׳˜ ׳”׳–׳” ׳™׳•׳¨׳“ ׳׳:</span>
                <input type="number" placeholder="׳׳—׳™׳¨ ׳§׳•׳׳‘׳•" value={newDiscountIfAnyOtherPrice} onChange={e=>setNewDiscountIfAnyOtherPrice(e.target.value)} className="w-[100px] h-10 px-2 rounded-lg border border-gray-300 text-sm flex-1 font-bold text-indigo-700 bg-indigo-50" />
              </div>
            </div>

            {/* Link to Whole Product */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 mt-2">
              <p className="text-xs font-bold text-gray-500 mb-2">׳©׳™׳•׳ ׳׳¡׳™׳¨ ׳©׳׳ (׳¢׳‘׳•׳¨ ׳׳¡׳ ׳”׳׳˜׳‘׳—)</p>
              <select value={newLinkedProductId} onChange={e => setNewLinkedProductId(e.target.value)} className="w-full h-10 px-2 rounded-lg border border-gray-300 text-sm bg-white">
                <option value="">׳׳׳ ׳§׳™׳©׳•׳¨</option>
                {products.filter(p => p.id !== editingId).map(p => (
                  <option key={`link-${p.id}`} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-200 mt-2">
              <p className="text-xs font-bold text-gray-500 mb-2">׳¡׳™׳•׳•׳’ ׳›׳׳•׳¦׳¨ ׳׳™׳•׳—׳“ (׳׳•׳¡׳×׳¨ ׳›׳‘׳¨׳™׳¨׳× ׳׳—׳“׳)</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer w-max"><input type="checkbox" checked={newIsSpecial} onChange={e => setNewIsSpecial(e.target.checked)}/> <span className="text-sm font-bold text-gray-700">׳׳•׳¦׳¨ ׳׳™׳•׳—׳“ - ׳”׳–׳׳ ׳•׳× ׳¨׳’׳™׳׳•׳× ׳•׳©׳‘׳×</span></label>
                <label className="flex items-center gap-2 cursor-pointer w-max"><input type="checkbox" checked={newIsSpecialStores} onChange={e => setNewIsSpecialStores(e.target.checked)}/> <span className="text-sm font-bold text-gray-700">׳׳•׳¦׳¨ ׳׳™׳•׳—׳“ - ׳”׳–׳׳ ׳•׳× ׳—׳ ׳•׳™׳•׳×</span></label>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer w-max mt-2"><input type="checkbox" checked={newIsManufactured} onChange={e => setNewIsManufactured(e.target.checked)}/> <b>׳”׳¦׳’ ׳‘׳׳¡׳ ׳”׳™׳™׳¦׳•׳¨ נ‘¨ג€נ³</b></label>
            <div className="flex gap-2 justify-end mt-2">
              <button onClick={() => setIsAdding(false)} className="px-5 h-10 text-sm font-bold text-gray-500 bg-gray-200 rounded-xl">׳‘׳™׳˜׳•׳</button>
              <button onClick={handleAdd} disabled={!newName.trim() || !newPrice || isSubmitting} className="px-6 h-10 bg-blue-600 text-white text-sm font-bold rounded-xl disabled:opacity-50">׳©׳׳™׳¨׳”</button>
            </div>
          </div>
        )}

        {/* Flat list */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="products-list">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="divide-y divide-gray-100 px-2 py-4">
                {sortedProducts.map((product, index) => (
                  <Draggable isDragDisabled={!isSortMode || editingId !== null} key={product.id} draggableId={product.id} index={index}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.draggableProps} 
                        className={`p-3 flex flex-col sm:flex-row justify-between sm:items-center transition-colors rounded-xl mx-2 gap-3 group ${snapshot.isDragging ? 'bg-indigo-50 shadow-lg scale-[1.02] border border-indigo-200 z-50' : 'hover:bg-gray-50'}`}
                      >
                        
                        {/* Drag Handle */}
                        {isSortMode && (
                          <div {...provided.dragHandleProps} className="w-10 sm:w-8 flex items-center justify-center text-gray-300 hover:text-indigo-500 shrink-0 select-none touch-none touch-action-none">
                            <GripVertical className="w-6 h-6" />
                          </div>
                        )}

                        {editingId === product.id && !isSortMode ? (
                          <div className="flex-1 flex flex-col gap-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-blue-200 outline-none text-sm font-bold" autoFocus />
                            <div className="flex gap-2">
                              <div className="flex-1 relative"><span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">ג‚×</span><input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full h-10 pl-7 pr-3 rounded-lg border border-blue-200 outline-none font-bold text-sm" /></div>
                              <div className="flex flex-[2] gap-1 p-1 bg-white border border-blue-200 rounded-lg">
                                <button onClick={() => setEditCategory(editCategory === 'HOT' ? 'OTHER' : editCategory === 'COLD' ? 'BOTH' : editCategory === 'BOTH' ? 'COLD' : 'HOT')} className={`flex-1 rounded font-bold text-xs ${editCategory === 'HOT' || editCategory === 'BOTH' ? 'bg-red-400 text-white' : 'text-gray-500'}`}>׳—׳ נ”¥</button>
                                <button onClick={() => setEditCategory(editCategory === 'COLD' ? 'OTHER' : editCategory === 'HOT' ? 'BOTH' : editCategory === 'BOTH' ? 'HOT' : 'COLD')} className={`flex-1 rounded font-bold text-xs ${editCategory === 'COLD' || editCategory === 'BOTH' ? 'bg-blue-400 text-white' : 'text-gray-500'}`}>׳§׳¨ ג„ן¸</button>
                              </div>
                            </div>
                            
                            {/* Promo Settings Edit */}
                            <div className="mt-2 bg-white/50 p-2 rounded-lg border border-blue-100">
                              <p className="text-xs font-bold text-blue-800 mb-1">׳”׳’׳“׳¨׳× ׳׳‘׳¦׳¢׳™׳ / ׳׳׳׳™:</p>
                              <div className="flex gap-2">
                                <input type="number" placeholder="׳›׳׳•׳× ׳׳׳‘׳¦׳¢" value={editBulkQuantity} onChange={e=>setEditBulkQuantity(e.target.value)} className="w-16 h-8 px-1 rounded border border-blue-200 text-xs" />
                                <input type="number" placeholder="׳׳—׳™׳¨ ׳׳‘׳¦׳¢" value={editBulkPrice} onChange={e=>setEditBulkPrice(e.target.value)} className="w-20 h-8 px-1 rounded border border-blue-200 text-xs" />
                                <select value={editDiscountType} onChange={e=>setEditDiscountType(e.target.value as any)} className="flex-1 h-8 px-1 rounded border border-blue-200 text-[10px] bg-white">
                                  <option value="PACK_OF_N">׳׳׳¨׳–׳™׳</option>
                                  <option value="ALL_REDUCED_PRICE">׳”׳ ׳—׳× ׳›׳׳•׳×</option>
                                </select>
                              </div>
                            </div>

                            <div className="mt-2">
                              <select value={editLinkedProductId} onChange={e=>setEditLinkedProductId(e.target.value)} className="w-full h-8 px-1 text-xs rounded border border-blue-200 bg-white">
                                <option value="">׳׳׳ ׳§׳™׳©׳•׳¨ ׳׳•׳¦׳¨</option>
                                {products.filter(p => p.id !== product.id).map(p => (
                                  <option key={`edit-link-${p.id}`} value={p.id}>׳§׳©׳¨ ׳: {p.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="bg-white/50 p-2 rounded-lg border border-blue-100 mt-2">
                              <p className="text-[10px] font-bold text-blue-800 mb-1">׳¡׳™׳•׳•׳’ ׳›׳׳•׳¦׳¨ ׳׳™׳•׳—׳“:</p>
                              <div className="flex flex-col gap-1">
                                <label className="flex items-center gap-2 cursor-pointer w-max"><input type="checkbox" checked={editIsSpecial} onChange={e => setEditIsSpecial(e.target.checked)} className="rounded"/> <span className="text-xs font-bold text-gray-700">׳׳•׳¦׳¨ ׳׳™׳•׳—׳“ (׳¨׳’׳™׳/׳©׳‘׳×)</span></label>
                                <label className="flex items-center gap-2 cursor-pointer w-max"><input type="checkbox" checked={editIsSpecialStores} onChange={e => setEditIsSpecialStores(e.target.checked)} className="rounded"/> <span className="text-xs font-bold text-gray-700">׳׳•׳¦׳¨ ׳׳™׳•׳—׳“ (׳—׳ ׳•׳™׳•׳×)</span></label>
                              </div>
                            </div>

                            <label className="flex items-center gap-2 mt-2 cursor-pointer w-max"><input type="checkbox" checked={editIsManufactured} onChange={(e) => setEditIsManufactured(e.target.checked)} className="rounded" /><span className="font-bold text-xs">׳”׳¦׳’ ׳‘׳™׳™׳¦׳•׳¨ נ‘¨ג€נ³</span></label>
                            <div className="flex justify-end gap-2 mt-1">
                              <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-lg">׳‘׳™׳˜׳•׳</button>
                              <button onClick={() => saveEdit(product.id)} disabled={isSubmitting} className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-1">׳©׳׳•׳¨ <CircleCheck className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 pr-2">
                              <div className="flex items-center gap-2">
                                <p className={`font-bold text-base ${product.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{product.name}</p>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1 bg-gray-100 rounded">
                                  {product.category === 'HOT' ? '׳—׳' : product.category === 'COLD' ? '׳§׳¨' : product.category === 'BOTH' ? '׳—׳+׳§׳¨' : '׳׳—׳¨'}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <p className="text-sm text-gray-500 font-semibold">ג‚×{product.price.toFixed(2)}</p>
                                {!product.isActive && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">׳׳•׳¡׳×׳¨</span>}
                                {product.isManufactured && <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-bold">׳׳¢׳§׳‘ ׳™׳™׳¦׳•׳¨</span>}
                                {product.isSpecial && <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-100 px-1.5 py-0.5 rounded font-bold">ג­ ׳׳™׳•׳—׳“ (׳©׳‘׳×)</span>}
                                {product.isSpecialStores && <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-100 px-1.5 py-0.5 rounded font-bold">ג­ ׳׳™׳•׳—׳“ (׳—׳ ׳•׳×)</span>}
                                
                                {/* Linked Product Display */}
                                {product.linkedWholeProductId && (
                                  <span className="text-[10px] bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                    נ”— ׳׳§׳•׳©׳¨ ׳׳: {products.find(p => p.id === product.linkedWholeProductId)?.name || '׳׳•׳¦׳¨ ׳©׳ ׳׳—׳§'}
                                  </span>
                                )}

                                {/* Promo Display */}
                                {product.bulkQuantity && product.bulkPrice && (
                                  <span className="text-[10px] bg-orange-50 text-orange-600 border border-orange-100 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                    נ ׳׳‘׳¦׳¢: {product.discountType === 'ALL_REDUCED_PRICE' ? '׳-' : '׳׳׳¨׳– '}{product.bulkQuantity} ׳‘-ג‚×{product.bulkPrice} {product.discountType === 'ALL_REDUCED_PRICE' ? '׳׳™׳—\'' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {!isSortMode && (
                              <div className="flex items-center justify-end gap-2 shrink-0 border-t border-gray-100 sm:border-0 pt-2 sm:pt-0 mt-2 sm:mt-0">
                                <button onClick={() => toggleActive(product.id, product.isActive)} className={`min-w-[4rem] text-center text-xs font-black px-3 h-9 rounded-xl border ${product.isActive ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{product.isActive ? '׳₪׳¢׳™׳' : '׳”׳¡׳×׳¨'}</button>
                                <button onClick={() => startEdit(product)} className="w-9 h-9 flex items-center justify-center text-gray-500 bg-gray-50 hover:text-blue-600 rounded-xl"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(product.id)} className="w-9 h-9 flex items-center justify-center text-red-400 bg-red-50 hover:text-red-600 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
          {sortedProducts.length === 0 && !isAdding && (
             <div className="p-8 text-center text-gray-500 text-sm font-medium">׳”׳×׳₪׳¨׳™׳˜ ׳¨׳™׳§</div>
          )}
      </div>
    </div>
  )
}

