'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Loader2, X, CircleCheck, ArrowLeft, Save } from 'lucide-react'

type CustomerType = { id: string, name: string }
type Area = { id: string, name: string }
type Product = { id: string, name: string, price: number, category: string }
type CustomerPriceMap = Record<string, { price: string, bulkQuantity: string, bulkPrice: string, discountType: 'PACK_OF_N' | 'ALL_REDUCED_PRICE' }>

export function CustomerAddModal({ 
  customerTypes = [], 
  areas = [] 
}: { 
  customerTypes?: CustomerType[], 
  areas?: Area[] 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState('')
  
  // Step 1 State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [typeId, setTypeId] = useState('')
  const [saveAddress, setSaveAddress] = useState(true)
  const [areaId, setAreaId] = useState('')
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null)

  // Step 2 State
  const [products, setProducts] = useState<Product[]>([])
  const [draftCustomPrices, setDraftCustomPrices] = useState<CustomerPriceMap>({})

  const router = useRouter()

  // Reset state when opening
  useEffect(() => {
    if (isOpen && step === 1) {
      setName('')
      setPhone('')
      setAddress('')
      setCity('')
      setTypeId('')
      setSaveAddress(true)
      setAreaId('')
      setErrorText('')
      setCreatedCustomerId(null)
    }
  }, [isOpen, step])

  // Auto-fill City and Area based on Address
  useEffect(() => {
    if (!address || address.length < 2 || !isOpen || step !== 1) return;
    
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/addresses/lookup?street=${encodeURIComponent(address)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.city) {
            setCity(data.city);
            if (data.deliveryAreaId) {
              setAreaId(data.deliveryAreaId);
            }
          }
        }
      } catch (e) {
        // silently ignore
      }
    }, 600);
    
    return () => clearTimeout(handler);
  }, [address, isOpen, step]);

  const handleSaveStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorText('')
    
    try {
      const res = await fetch(`/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          phone, 
          address, 
          city, 
          defaultDeliveryAreaId: areaId || null, 
          typeId: typeId || null, 
          saveAddress 
        })
      })

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('׳׳¡׳₪׳¨ ׳”׳˜׳׳₪׳•׳ ׳›׳‘׳¨ ׳§׳™׳™׳ ׳‘׳׳¢׳¨׳›׳×')
        }
        throw new Error('׳©׳’׳™׳׳” ׳‘׳™׳¦׳™׳¨׳× ׳”׳׳§׳•׳—')
      }
      
      const newCustomer = await res.json()
      setCreatedCustomerId(newCustomer.id)
      
      // Load products for step 2
      const pRes = await fetch(`/api/products?t=${Date.now()}`)
      const pData = await pRes.json()
      setProducts(pData.products || [])
      
      setStep(2)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      setErrorText(err.message)
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

  const handleSaveStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createdCustomerId) return
    setIsLoading(true)
    
    const payload = Object.entries(draftCustomPrices)
      .map(([productId, conf]) => ({
        productId,
        price: parseFloat(conf.price),
        bulkQuantity: conf.bulkQuantity ? parseInt(conf.bulkQuantity) : null,
        bulkPrice: conf.bulkPrice ? parseFloat(conf.bulkPrice) : null,
        discountType: conf.discountType
      }))
      .filter(p => !isNaN(p.price))
      
    if (payload.length === 0) {
      // Nothing to save, just finish
      finishProcess()
      return
    }

    try {
      const res = await fetch(`/api/customers/${createdCustomerId}/prices`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices: payload })
      })

      if (res.ok) {
        finishProcess()
      } else {
        setErrorText('׳©׳’׳™׳׳” ׳‘׳©׳׳™׳¨׳× ׳”׳׳—׳™׳¨׳™׳')
      }
    } catch (err) {
      console.error(err)
      setErrorText('׳©׳’׳™׳׳” ׳‘׳—׳™׳‘׳•׳¨ ׳׳©׳¨׳×')
    } finally {
      setIsLoading(false)
    }
  }

  const finishProcess = () => {
    setIsOpen(false)
    setStep(1)
    if (createdCustomerId) {
      router.push(`/dashboard/customers/${createdCustomerId}`)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm"
      >
        <UserPlus className="w-5 h-5" />
        ׳׳§׳•׳— ׳—׳“׳©
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => step === 1 && setIsOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {step === 1 && (
              <>
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">׳”׳•׳¡׳₪׳× ׳׳§׳•׳— ׳—׳“׳©</h2>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSaveStep1} className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
                  {errorText && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
                      {errorText}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">׳©׳ ׳׳׳</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold bg-gray-50 focus:bg-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">׳˜׳׳₪׳•׳</label>
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold bg-gray-50 focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">׳›׳×׳•׳‘׳×</label>
                    <input 
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium bg-gray-50 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                     <input type="checkbox" id="saveAdd" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer" />
                     <label htmlFor="saveAdd" className="text-sm font-bold text-gray-700 cursor-pointer">׳©׳׳•׳¨ ׳›׳×׳•׳‘׳× ׳§׳‘׳•׳¢׳” ׳׳”׳–׳׳ ׳•׳× ׳¢׳×׳™׳“׳™׳•׳×</label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">׳¢׳™׳¨ ׳׳’׳•׳¨׳™׳ ׳•׳׳–׳•׳¨</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => setCity('')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${city === '' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 border border-transparent'}`}
                      >
                        ׳׳׳
                      </button>
                      {['׳™׳¨׳•׳©׳׳™׳', '׳‘׳™׳× ׳©׳׳©'].map(cName => (
                        <button 
                          key={cName} 
                          type="button" 
                          onClick={() => setCity(cName)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${city === cName ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 border border-transparent'}`}
                        >
                          {cName}
                        </button>
                      ))}

                      {city === '׳‘׳™׳× ׳©׳׳©' && areas && areas.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-right-2 ml-auto">
                          <select 
                            value={areaId} 
                            onChange={e => setAreaId(e.target.value)}
                            className="w-auto text-sm font-bold bg-purple-50 text-purple-700 px-3 py-1.5 border border-purple-200 rounded-lg outline-none cursor-pointer hover:bg-purple-100 transition-colors"
                          >
                            <option value="">׳׳׳ ׳׳–׳•׳¨ ׳§׳‘׳•׳¢</option>
                            {areas.map(a => (
                               <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {customerTypes.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">׳¡׳•׳’ ׳׳§׳•׳— ׳§׳‘׳•׳¢</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setTypeId('')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${typeId === '' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                          ׳¨׳’׳™׳
                        </button>
                        {customerTypes.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTypeId(t.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${typeId === t.id ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex gap-3 mt-4">
                    <button 
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                    >
                      ׳‘׳™׳˜׳•׳
                    </button>
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '׳©׳׳•׳¨ ׳׳§׳•׳—'}
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-green-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                      <CircleCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">׳”׳׳§׳•׳— ׳ ׳©׳׳¨ ׳‘׳”׳¦׳׳—׳”!</h2>
                      <p className="text-sm text-gray-600">׳”׳׳ ׳×׳¨׳¦׳” ׳׳”׳’׳“׳™׳¨ ׳׳• ׳׳—׳™׳¨׳•׳ ׳׳™׳©׳™?</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveStep2} className="flex flex-col flex-1 overflow-hidden">
                  <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50 custom-scrollbar">
                    {errorText && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-4">
                        {errorText}
                      </div>
                    )}
                    
                    <div className="space-y-2 mb-4">
                      {products.map(p => {
                        const isCustomUrl = draftCustomPrices[p.id] !== undefined
                        const conf = draftCustomPrices[p.id] || { price: '', bulkQuantity: '', bulkPrice: '', discountType: 'PACK_OF_N' }
                        
                        return (
                          <div key={p.id} className={`flex flex-col gap-2 p-3 rounded-xl border ${isCustomUrl ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-bold text-gray-800">{p.name}</div>
                                <div className="text-xs text-gray-400">׳׳—׳™׳¨ ׳‘׳¡׳™׳¡: ג‚×{p.price}</div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                 <span className="text-gray-500 font-bold text-sm leading-none">ג‚×</span>
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
                                <span className="text-xs font-bold text-orange-800">׳׳‘׳¦׳¢ ׳›׳׳•׳×:</span>
                                <div className="flex items-center gap-1">
                                  <input type="number" placeholder="׳›׳׳•׳×" value={conf.bulkQuantity} onChange={e=>handlePriceChange(p.id, 'bulkQuantity', e.target.value)} className="w-16 h-8 px-1 text-center bg-white border border-orange-300 rounded text-xs" />
                                  <input type="number" placeholder="׳׳—׳™׳¨" value={conf.bulkPrice} onChange={e=>handlePriceChange(p.id, 'bulkPrice', e.target.value)} className="w-16 h-8 px-1 text-center bg-white border border-orange-300 rounded text-xs" />
                                  <select value={conf.discountType} onChange={e=>handlePriceChange(p.id, 'discountType', e.target.value)} className="flex-1 h-8 px-1 bg-white border border-orange-300 rounded text-xs min-w-[100px]">
                                    <option value="PACK_OF_N">׳׳׳¨׳–׳™׳</option>
                                    <option value="ALL_REDUCED_PRICE">׳”׳ ׳—׳× ׳›׳׳•׳×</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-white flex gap-3">
                    <button 
                      type="button"
                      onClick={finishProcess}
                      className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                    >
                      ׳“׳׳’ ׳•׳”׳׳©׳ ׳׳׳§׳•׳—
                    </button>
                    <button 
                      type="submit"
                      disabled={isLoading || Object.keys(draftCustomPrices).length === 0}
                      className="flex-[1.5] flex justify-center items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-xl font-bold transition-colors disabled:opacity-50 text-sm"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      ׳©׳׳•׳¨ ׳׳—׳™׳¨׳•׳ ׳׳™׳©׳™
                    </button>
                  </div>
                </form>
              </>
            )}
            
          </div>
        </div>
      )}
    </>
  )
}

