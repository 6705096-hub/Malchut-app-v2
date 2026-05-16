'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Loader2, IndianRupee, Save } from 'lucide-react'

type Product = {
  id: string
  name: string
  price: number
  category: string
}

type CustomerPriceMap = Record<string, { price: string, bulkQuantity: string, bulkPrice: string, discountType: 'PACK_OF_N' | 'ALL_REDUCED_PRICE' }>

export function CustomerPricesModal({ customerId, customerName }: { customerId: string, customerName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  if (!customerId || customerId === 'NEW') return null;
  
  // Base products
  const [products, setProducts] = useState<Product[]>([])
  
  const [customPrices, setCustomPrices] = useState<CustomerPriceMap>({})
  
  // Editable state internally
  const [draftCustomPrices, setDraftCustomPrices] = useState<Record<string, { price: string, bulkQuantity: string, bulkPrice: string, discountType: 'PACK_OF_N' | 'ALL_REDUCED_PRICE' }>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Fetch active products
      const pRes = await fetch(`/api/products?t=${Date.now()}`)
      const pData = await pRes.json()
      setProducts(pData.products || [])
      
      const cRes = await fetch(`/api/customers/${customerId}/prices?t=${Date.now()}`)
      if (cRes.ok) {
        const cData = await cRes.json()
        const priceMap: CustomerPriceMap = {}
        const draftMap: Record<string, { price: string, bulkQuantity: string, bulkPrice: string, discountType: 'PACK_OF_N' | 'ALL_REDUCED_PRICE' }> = {}
        
        if (Array.isArray(cData)) {
          cData.forEach((cp: any) => {
            const conf = {
               price: cp.price.toString(),
               bulkQuantity: cp.bulkQuantity ? cp.bulkQuantity.toString() : '',
               bulkPrice: cp.bulkPrice ? cp.bulkPrice.toString() : '',
               discountType: cp.discountType || 'PACK_OF_N'
            };
            priceMap[cp.productId] = conf
            draftMap[cp.productId] = { ...conf }
          })
        }
        
        setCustomPrices(priceMap)
        setDraftCustomPrices(draftMap)
      } else {
        console.warn('Could not load custom prices. Status:', cRes.status)
      }
    } catch (e) {
      console.error('Error fetching data:', e)
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Prepare the payload 
    // Filter out invalid or empty values
    const payload = Object.entries(draftCustomPrices)
      .map(([productId, conf]) => ({
        productId,
        price: parseFloat(conf.price),
        bulkQuantity: conf.bulkQuantity ? parseInt(conf.bulkQuantity) : null,
        bulkPrice: conf.bulkPrice ? parseFloat(conf.bulkPrice) : null,
        discountType: conf.discountType
      }))
      .filter(p => !isNaN(p.price))
    try {
      const res = await fetch(`/api/customers/${customerId}/prices`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices: payload })
      })

      if (res.ok) {
        await loadData() // reload instantly so parent updates
        setIsOpen(false)
      } else {
        alert('שגיאה בשמירת המחירים')
      }
    } catch (e) {
      console.error(e)
      alert('שגיאה בחיבור לשרת')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePriceChange = (productId: string, field: 'price' | 'bulkQuantity' | 'bulkPrice' | 'discountType', val: string) => {
    setDraftCustomPrices(prev => {
       const next = { ...prev }
       const existing = next[productId] || { price: '', bulkQuantity: '', bulkPrice: '', discountType: 'PACK_OF_N' }
       
       if (field === 'price' && val === '') {
         delete next[productId] 
       } else {
         next[productId] = { ...existing, [field]: val }
       }
       return next
    })
  }

  return (
    <>
      <div className="flex items-center gap-3 w-full border-t border-gray-100 pt-3">
        <button 
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 font-bold text-xs transition-colors shadow-sm"
        >
          <span className="text-orange-600 font-black text-sm leading-none">₪</span> מחירון אישי
        </button>

        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 max-w-[280px]">
          {Object.entries(customPrices).map(([productId, conf]) => {
             const product = products.find(p => p.id === productId)
             if (!product) return null
             return (
               <span key={productId} className="whitespace-nowrap px-2 py-0.5 whitespace-pre bg-orange-100 border border-orange-200 text-orange-800 text-[11px] font-bold rounded-md">
                 {product.name} - ₪{conf.price}
               </span>
             )
          })}
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white w-full sm:max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col animate-in fade-in slide-in-from-bottom-4">
            
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">מחירון אישי - {customerName}</h2>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="customer-prices-form" onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="font-bold">טוען מחירון...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-orange-50/50 text-orange-800 p-3 rounded-lg text-sm mb-4 border border-orange-100">
                      <span className="font-bold">שים לב:</span> השארת שדה ריק תחזיר את המוצר למחירון הרגיל שלו (או למחירון סוג לקוח אם יש). מחיר כאן גובר על הכל.
                    </div>

                  <div className="space-y-2 mb-6">
                    {products.map(p => {
                      const isCustomUrl = draftCustomPrices[p.id] !== undefined
                      const conf = draftCustomPrices[p.id] || { price: '', bulkQuantity: '', bulkPrice: '', discountType: 'PACK_OF_N' }
                      
                      return (
                        <div key={p.id} className={`flex flex-col gap-2 p-3 rounded-xl border ${isCustomUrl ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-gray-800">{p.name}</div>
                              <div className="text-xs text-gray-400">מחיר בסיס: ₪{p.price}</div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                               <span className="text-gray-500 font-bold text-sm leading-none">₪</span>
                               <input 
                                 type="number"
                                 step="0.01"
                                 value={conf.price}
                                 onChange={(e) => handlePriceChange(p.id, 'price', e.target.value)}
                                 placeholder={p.price.toString()}
                                 className={`w-24 p-3 text-center font-bold text-lg outline-none rounded-xl border-2 focus:ring-4 transition-all
                                   ${isCustomUrl 
                                     ? 'border-orange-400 text-orange-700 bg-white focus:border-orange-500 focus:ring-orange-200' 
                                     : 'border-gray-200 text-gray-700 bg-gray-50 focus:border-blue-400 focus:ring-blue-100'}`}
                               />
                            </div>
                          </div>

                          {isCustomUrl && (
                            <div className="flex flex-wrap items-center gap-2 bg-orange-100/50 p-2.5 rounded-xl border border-orange-200 mt-1">
                              <span className="text-xs font-bold text-orange-800">מבצע כמות (לא חובה):</span>
                              <div className="flex items-center gap-1">
                                <input type="number" placeholder="כמות" value={conf.bulkQuantity} onChange={e=>handlePriceChange(p.id, 'bulkQuantity', e.target.value)} className="w-16 h-8 px-1 text-center bg-white border border-orange-300 rounded text-xs" />
                                <input type="number" placeholder="מחיר" value={conf.bulkPrice} onChange={e=>handlePriceChange(p.id, 'bulkPrice', e.target.value)} className="w-16 h-8 px-1 text-center bg-white border border-orange-300 rounded text-xs" />
                                <select value={conf.discountType} onChange={e=>handlePriceChange(p.id, 'discountType', e.target.value)} className="flex-1 h-8 px-1 bg-white border border-orange-300 rounded text-xs min-w-[100px]">
                                  <option value="PACK_OF_N">מארזים</option>
                                  <option value="ALL_REDUCED_PRICE">הנחת כמות</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  שמור מחירון אישי
                </button>
              </div>
            </form>
            
          </div>
        </div>
      )}
    </>
  )
}
