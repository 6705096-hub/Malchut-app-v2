'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, ArrowRight, Save, X, Phone, User, Check, CircleAlert } from 'lucide-react'
import Link from 'next/link'
import { BackButton } from '@/components/BackButton'

type CustomerTypePrice = {
  id: string
  productId: string
  price: number
  bulkQuantity?: number | null
  bulkPrice?: number | null
  discountType?: 'PACK_OF_N' | 'ALL_REDUCED_PRICE' | null
  discountIfAnyOtherPrice?: number | null
}

type CustomerType = {
  id: string
  name: string
  saveAddress: boolean
  prices: CustomerTypePrice[]
}

type Product = {
  id: string
  name: string
  price: number
}

export default function CustomerTypesClient({ 
  initialTypes,
  products,
  isAdmin
}: { 
  initialTypes: CustomerType[]
  products: Product[]
  isAdmin: boolean
}) {
  const [types, setTypes] = useState<CustomerType[]>(initialTypes)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [name, setName] = useState('')
  const [saveAddress, setSaveAddress] = useState(true)
  
  // prices map: productId -> Config
  const [customPrices, setCustomPrices] = useState<Record<string, { price: string, bulkQuantity: string, bulkPrice: string, discountType: 'PACK_OF_N' | 'ALL_REDUCED_PRICE', discountIfAnyOtherPrice: string }>>({})

  const resetForm = () => {
    setName('')
    setSaveAddress(true)
    setCustomPrices({})
    setIsEditing(null)
    setError('')
  }

  const handleEdit = (type: CustomerType) => {
    setName(type.name)
    setSaveAddress(type.saveAddress)
    
    const priceMap: Record<string, { price: string, bulkQuantity: string, bulkPrice: string, discountType: 'PACK_OF_N' | 'ALL_REDUCED_PRICE', discountIfAnyOtherPrice: string }> = {}
    type.prices.forEach(p => {
      priceMap[p.productId] = {
        price: p.price.toString(),
        bulkQuantity: p.bulkQuantity ? p.bulkQuantity.toString() : '',
        bulkPrice: p.bulkPrice ? p.bulkPrice.toString() : '',
        discountType: p.discountType || 'PACK_OF_N',
        discountIfAnyOtherPrice: p.discountIfAnyOtherPrice ? p.discountIfAnyOtherPrice.toString() : ''
      }
    })
    setCustomPrices(priceMap)
    
    setIsEditing(type.id)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePriceChange = (productId: string, field: 'price' | 'bulkQuantity' | 'bulkPrice' | 'discountType' | 'discountIfAnyOtherPrice', value: string) => {
    setCustomPrices(prev => {
      const existing = prev[productId] || { price: '', bulkQuantity: '', bulkPrice: '', discountType: 'PACK_OF_N', discountIfAnyOtherPrice: '' }
      return {
        ...prev,
        [productId]: { ...existing, [field]: value }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('חובה להזין שם לסוג הלקוח')
      return
    }

    setIsLoading(true)
    setError('')

    // Prepare prices array
    const pricesArray = Object.entries(customPrices)
      .filter(([_, conf]) => conf.price !== '')
      .map(([productId, conf]) => ({
        productId,
        price: parseFloat(conf.price),
        bulkQuantity: conf.bulkQuantity ? parseInt(conf.bulkQuantity) : null,
        bulkPrice: conf.bulkPrice ? parseFloat(conf.bulkPrice) : null,
        discountType: conf.discountType,
        discountIfAnyOtherPrice: conf.discountIfAnyOtherPrice ? parseFloat(conf.discountIfAnyOtherPrice) : null
      }))

    try {
      const url = isEditing === 'new' 
        ? '/api/customer-types' 
        : `/api/customer-types/${isEditing}`
        
      const method = isEditing === 'new' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          saveAddress,
          prices: pricesArray
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'אירעה שגיאה בשמירה')
      }

      if (isEditing === 'new') {
        setTypes([...types, data.customerType])
      } else {
        setTypes(types.map(t => t.id === isEditing ? data.customerType : t))
      }

      resetForm()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק סוג לקוח זה? פעולה זו אינה הפיכה.')) return
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/customer-types/${id}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'שגיאה במחיקה')
      }

      setTypes(types.filter(t => t.id !== id))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col pt-4 pb-20">
      <div className="flex justify-between items-center mb-6 mt-[-10px] w-full">
        <h1 className="text-2xl font-black text-gray-900 pr-2 pt-2">מחירונים וסוגי לקוחות</h1>
        <div className="flex items-center gap-3">
          <BackButton />
        </div>
      </div>

      {!isAdmin && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex gap-3 text-orange-800">
          <CircleAlert className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">אין לך הרשאות ניהול לערוך סוגי לקוחות ומחירונים.</p>
        </div>
      )}

      {/* Editor Form */}
      {isAdmin && isEditing && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8 animation-slideDown">
          <h2 className="text-lg font-bold text-gray-900 mb-6">
            {isEditing === 'new' ? 'צור סוג לקוח חדש' : 'עריכת סוג לקוח'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-medium flex gap-2">
                <CircleAlert className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">שם הסוג (למשל: לקוח עסקי, VIP)</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                className="w-full h-14 bg-gray-50 border-none rounded-2xl px-4 text-left text-lg focus:ring-2 focus:ring-blue-500"
                placeholder="הכנס שם..."
              />
            </div>

            <div className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="block font-bold text-gray-900 text-lg">שמירת כתובת?</span>
                  <span className="block text-sm text-gray-500 mt-1">
                    האם המערכת תשמור את הכתובת של הלקוח לפעמים הבאות כשהוא עושה הזמנה? (שימושי לבטל ללקוחות שלוקחים מהחנות)
                  </span>
                </div>
                <div className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${saveAddress ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                  />
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${saveAddress ? '-translate-x-8' : '-translate-x-1'}`} />
                </div>
              </label>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-4 text-lg">מחירון ייעודי (אופציונלי)</h3>
              <p className="text-sm text-gray-500 mb-4">השאר ריק כדי להשתמש במחיר הרגיל של המוצר.</p>
              
              <div className="space-y-3">
                {products.map(product => {
                  const conf = customPrices[product.id] || { price: '', bulkQuantity: '', bulkPrice: '', discountType: 'PACK_OF_N', discountIfAnyOtherPrice: '' }
                  return (
                    <div key={product.id} className="flex flex-col gap-2 p-3 border border-gray-100 rounded-2xl hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold block">{product.name}</span>
                          <span className="text-xs text-gray-500">מחיר רגיל: ₪{product.price}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-bold">₪</span>
                          <input
                            type="number" min="0" step="0.1" placeholder="מחיר פריט"
                            value={conf.price}
                            onChange={(e) => handlePriceChange(product.id, 'price', e.target.value)}
                            className="w-24 h-10 text-center bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" dir="ltr"
                          />
                        </div>
                      </div>
                      
                      {conf.price !== '' && (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 bg-blue-50/50 p-2 rounded-xl border border-blue-100/50">
                            <span className="text-[11px] font-bold text-blue-800 shrink-0">מבצע כמות:</span>
                            <div className="flex gap-1 flex-1">
                              <input type="number" placeholder="כמות" value={conf.bulkQuantity} onChange={e=>handlePriceChange(product.id, 'bulkQuantity', e.target.value)} className="w-[50px] h-8 px-1 text-center bg-white border border-blue-200 rounded text-xs" />
                              <input type="number" placeholder="מחיר" value={conf.bulkPrice} onChange={e=>handlePriceChange(product.id, 'bulkPrice', e.target.value)} className="w-[50px] h-8 px-1 text-center bg-white border border-blue-200 rounded text-xs" />
                              <select value={conf.discountType} onChange={e=>handlePriceChange(product.id, 'discountType', e.target.value)} className="flex-1 min-w-0 h-8 px-1 bg-white border border-blue-200 rounded text-[10px] sm:text-xs">
                                <option value="PACK_OF_N">מארזים בלבד</option>
                                <option value="ALL_REDUCED_PRICE">הנחת כמות</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 bg-purple-50/50 p-2 rounded-xl border border-purple-100/50">
                            <span className="text-[11px] font-bold text-purple-800 shrink-0">מחיר מותנה (קומבו סל):</span>
                            <div className="flex gap-2 flex-1 items-center">
                              <span className="text-[10px] text-purple-600 leading-tight flex-1">המחיר שיופעל אם יש מוצרים נוספים כלשהם בעגלה:</span>
                              <div className="relative shrink-0">
                                <span className="absolute left-2 top-1.5 text-xs text-purple-300 font-bold">₪</span>
                                <input type="number" placeholder="למשל 85" value={conf.discountIfAnyOtherPrice || ''} onChange={e=>handlePriceChange(product.id, 'discountIfAnyOtherPrice', e.target.value)} className="w-16 h-8 px-1 pl-5 text-center bg-white border border-purple-200 rounded text-xs font-bold text-purple-900" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={resetForm}
                disabled={isLoading}
                className="flex-1 h-14 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-[2] h-14 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>שמור סוג לקוח</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List Header */}
      {!isEditing && (
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">מחירונים קיימים</h2>
            <p className="text-sm text-gray-500">{types.length} סוגים מוגדרים במערכת</p>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setIsEditing('new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>הוסף סוג</span>
            </button>
          )}
        </div>
      )}

      {/* Types List */}
      {!isEditing && (
        <div className="space-y-4">
          {types.map(type => (
            <div key={type.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    {type.name}
                    {!type.saveAddress && (
                       <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold">לא לשמור כתובת</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {type.prices.length > 0 
                      ? `מוגדרים ${type.prices.length} תעריפים מיוחדים` 
                      : 'ללא מחירון מיוחד (מחירי תפריט רגילים)'}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(type)}
                      className="p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(type.id)}
                      disabled={isLoading}
                      className="p-2 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              {type.prices.length > 0 && (
                <div className="pt-3 border-t border-gray-50 flex gap-2 flex-wrap flex-col">
                  {type.prices.map(price => {
                    const prodName = products.find(p => p.id === price.productId)?.name
                    const hasPromo = price.bulkQuantity && price.bulkPrice
                    return (
                      <div key={price.id} className="text-sm bg-gray-50 border border-gray-200 text-gray-600 px-3 py-2 rounded-xl flex flex-col">
                        <div>{prodName}: <span className="font-bold text-gray-900">₪{price.price}</span></div>
                        {hasPromo && (
                           <div className="text-xs text-blue-700 mt-1 font-medium bg-blue-50 px-2 py-1 rounded inline-block self-start">
                             ⭐ מבצע: {price.bulkQuantity} יחידות ב-₪{price.bulkPrice} ({price.discountType === 'PACK_OF_N' ? 'מארז' : 'הנחה רוחבית'})
                           </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          {types.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-bold text-gray-600 mb-1">אין סוגי לקוחות</p>
              <p className="text-sm text-gray-500">כל הלקוחות כרגע מקבלים מחירי תפריט רגילים.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
