'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit, Loader2, X } from 'lucide-react'
import { CustomerPricesModal } from './CustomerPricesModal'

type Customer = {
  id: string
  name: string
  phone: string
  address: string | null
  city?: string | null
  customerTypeId?: string | null
  saveAddress?: boolean
  defaultDeliveryAreaId?: string | null
}

type CustomerType = {
  id: string
  name: string
}

export function CustomerEditModal({ 
  customer, 
  customerTypes = [],
  triggerType = 'icon', // 'icon' | 'badge' | 'custom'
  children,
  areas = []
}: { 
  customer: Customer, 
  customerTypes?: CustomerType[],
  triggerType?: 'icon' | 'badge' | 'custom',
  children?: React.ReactNode,
  areas?: { id: string, name: string }[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone)
  const [address, setAddress] = useState(customer.address || '')
  const [city, setCity] = useState(customer.city || '')
  const [typeId, setTypeId] = useState(customer.customerTypeId || '')
  const [saveAddress, setSaveAddress] = useState(customer.saveAddress ?? true)
  const [areaId, setAreaId] = useState(customer.defaultDeliveryAreaId || '')
  
  const router = useRouter()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, address, city, typeId: typeId || '', saveAddress, defaultDeliveryAreaId: areaId || null })
      })

      if (!res.ok) throw new Error('שגיאה בעדכון הלקוח')
      
      setIsOpen(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('שגיאה בשמירת פרטי הלקוח')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {triggerType === 'custom' ? (
        <div onClick={() => setIsOpen(true)} className="contents cursor-pointer group" title="ערוך לקוח">
          {children}
        </div>
      ) : triggerType === 'icon' ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-7 h-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
          title="ערוך לקוח"
        >
          <Edit className="w-4 h-4" />
        </button>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md uppercase font-bold tracking-widest mt-0.5 hover:bg-indigo-200 transition-colors cursor-pointer"
          title="שנה סוג לקוח"
        >
          {customer.customerTypeId ? customerTypes.find(t => t.id === customer.customerTypeId)?.name || 'רגיל' : 'רגיל'}
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">ערוך לקוח</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-5 pt-5 flex justify-start">
               <CustomerPricesModal customerId={customer.id} customerName={customer.name} />
            </div>
            
            <form onSubmit={handleSave} className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">שם</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold bg-gray-50 focus:bg-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">טלפון</label>
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
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">כתובת</label>
                <input 
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium bg-gray-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                 <input type="checkbox" id="saveAdd" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer" />
                 <label htmlFor="saveAdd" className="text-sm font-bold text-gray-700 cursor-pointer">שמור כתובת קבועה</label>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">עיר מגורים ואזור</label>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setCity('')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${city === '' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 border border-transparent'}`}
                  >
                    ללא
                  </button>
                  {['ירושלים', 'בית שמש'].map(cName => (
                    <button 
                      key={cName} 
                      type="button" 
                      onClick={() => setCity(cName)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${city === cName ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 border border-transparent'}`}
                    >
                      {cName}
                    </button>
                  ))}

                  {city === 'בית שמש' && areas && areas.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-right-2 ml-auto">
                      <select 
                        value={areaId} 
                        onChange={e => setAreaId(e.target.value)}
                        className="w-auto text-sm font-bold bg-purple-50 text-purple-700 px-3 py-1.5 border border-purple-200 rounded-lg outline-none cursor-pointer hover:bg-purple-100 transition-colors"
                      >
                        <option value="">ללא אזור קבוע</option>
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
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">סוג לקוח קבוע</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTypeId('')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${typeId === '' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      רגיל
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
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                >
                  ביטול
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שמור שינויים'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
