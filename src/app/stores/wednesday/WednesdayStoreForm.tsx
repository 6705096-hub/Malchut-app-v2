'use client'

import { useState } from 'react'
import { Store, MapPin, Phone, User, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Product = {
  id: string
  name: string
  price: number
  category: string
}

type WednesdayStoreFormProps = {
  products: Product[]
  initialCity: string
}

export function WednesdayStoreForm({ products, initialCity }: WednesdayStoreFormProps) {
  const router = useRouter()
  
  // Customer Details
  const [storeName, setStoreName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState(initialCity)

  // Order Items
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  
  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleQuantityChange = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0
      const next = Math.max(0, current + delta)
      if (next === 0) {
        const copy = { ...prev }
        delete copy[productId]
        return copy
      }
      return { ...prev, [productId]: next }
    })
  }

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0)
  const totalPrice = Object.entries(quantities).reduce((sum, [productId, q]) => {
    const p = products.find(p => p.id === productId)
    return sum + (p ? p.price * q : 0)
  }, 0)

  const handleSubmit = async () => {
    if (!storeName || !phone) {
      alert('׳ ׳ ׳׳”׳–׳™׳ ׳©׳ ׳—׳ ׳•׳× ׳•׳׳¡׳₪׳¨ ׳˜׳׳₪׳•׳.')
      return
    }

    if (totalItems === 0) {
      alert('׳™׳© ׳׳‘׳—׳•׳¨ ׳׳₪׳—׳•׳× ׳׳•׳¦׳¨ ׳׳—׳“ ׳׳”׳–׳׳ ׳”.')
      return
    }

    setIsSubmitting(true)
    try {
      const orderData = {
        customer: {
          name: storeName,
          phone: phone,
          address: address,
          city: city
        },
        items: Object.entries(quantities).map(([productId, quantity]) => ({
          productId,
          quantity
        })),
        totalPrice,
        deliveryDay: 'Wednesday_Stores',
        city: city
      }

      const res = await fetch('/api/orders/wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '׳©׳’׳™׳׳” ׳‘׳©׳׳™׳¨׳× ׳”׳”׳–׳׳ ׳”')
      }

      setSuccess(true)
      
      // Reset form after short delay to allow taking another order quickly
      setTimeout(() => {
        setStoreName('')
        setPhone('')
        setAddress('')
        setQuantities({})
        setSuccess(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        router.refresh()
      }, 2000)

    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-green-50 rounded-3xl border border-green-100 text-center gap-4 animate-in fade-in zoom-in duration-300">
        <Check className="w-16 h-16 text-green-500" />
        <div>
          <h2 className="text-2xl font-black text-green-800">׳”׳”׳–׳׳ ׳” ׳ ׳©׳׳¨׳” ׳‘׳”׳¦׳׳—׳”!</h2>
          <p className="text-green-600 font-medium mt-1">׳׳›׳™׳ ׳׳× ׳”׳˜׳•׳₪׳¡ ׳׳”׳–׳׳ ׳” ׳”׳‘׳׳”...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-40">
      
      {/* Customer Information Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-2">׳₪׳¨׳˜׳™ ׳”׳—׳ ׳•׳× (׳׳§׳•׳—)</div>
        
        <div className="space-y-3">
          <div className="relative">
            <Store className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="׳©׳ ׳”׳—׳ ׳•׳×..."
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full pl-3 pr-10 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-medium"
            />
          </div>
          
          <div className="relative">
            <Phone className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
            <input 
              type="tel" 
              placeholder="׳׳¡׳₪׳¨ ׳˜׳׳₪׳•׳ ׳׳–׳™׳”׳•׳™ ׳׳§׳•׳—..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-3 pr-10 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-medium"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="׳›׳×׳•׳‘׳× ׳”׳—׳ ׳•׳×..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-3 pr-10 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-medium"
              />
            </div>
            
            <select 
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-1/3 p-3 rounded-xl border border-gray-200 outline-none font-bold text-gray-700 bg-gray-50 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            >
              <option value="׳™׳¨׳•׳©׳׳™׳">׳™׳¨׳•׳©׳׳™׳</option>
              <option value="׳‘׳™׳× ׳©׳׳©">׳‘׳™׳× ׳©׳׳©</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products List Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex-1">
        <div className="font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 flex justify-between items-center">
          <span>׳‘׳—׳™׳¨׳× ׳׳•׳¦׳¨׳™׳</span>
          {totalItems > 0 && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">{totalItems} ׳₪׳¨׳™׳˜׳™׳ ׳ ׳‘׳—׳¨׳•</span>}
        </div>
        
        <div className="space-y-3">
          {products.map(product => {
            const q = quantities[product.id] || 0
            
            return (
              <div key={product.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors border ${q > 0 ? 'border-orange-200 bg-orange-50/50' : 'border-gray-50 bg-gray-50 hover:bg-gray-100'}`}>
                <div className="flex flex-col">
                  <span className={`font-bold ${q > 0 ? 'text-orange-900' : 'text-gray-800'}`}>{product.name}</span>
                  <span className="text-sm font-medium text-gray-500">ג‚×{product.price.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                  <button 
                    onClick={() => handleQuantityChange(product.id, -1)}
                    disabled={q === 0}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold bg-gray-50 text-gray-600 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-30 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-black text-lg text-gray-900">
                    {q}
                  </span>
                  <button 
                    onClick={() => handleQuantityChange(product.id, 1)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold bg-orange-100 text-orange-700 hover:bg-orange-200 active:bg-orange-300 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-40 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-gray-600 font-medium">׳¡׳ ׳”׳›׳ ({totalItems} ׳₪׳¨׳™׳˜׳™׳):</span>
          <span className="text-2xl font-black text-gray-900">ג‚×{totalPrice.toFixed(2)}</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || totalItems === 0 || !storeName || !phone}
          className="w-full bg-orange-500 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 flex justify-center items-center gap-2 relative overflow-hidden group"
        >
          {isSubmitting ? '׳©׳•׳׳¨ ׳”׳–׳׳ ׳”...' : '׳©׳׳•׳¨ ׳”׳–׳׳ ׳× ׳—׳ ׳•׳×'}
          {!isSubmitting && (
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
          )}
        </button>
      </div>

    </div>
  )
}

