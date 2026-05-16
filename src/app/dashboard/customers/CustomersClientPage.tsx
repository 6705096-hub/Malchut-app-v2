'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, CircleUser, Phone, MapPin, FileText, X, Filter } from 'lucide-react'
import { CustomerAddModal } from '@/components/CustomerAddModal'
import { BackButton } from '@/components/BackButton'
import { initiateCustomerCall } from '@/lib/callCustomer'
import { ErrorBoundary } from '@/components/ErrorBoundary'

type Customer = {
  id: string
  name: string
  phone: string
  address: string | null
  city?: string | null
  defaultDeliveryAreaId?: string | null
  debt: number
  _count: { orders: number }
  type?: { name: string } | null
  orders?: { deliveryArea?: { id: string; name: string } | null }[]
}

export default function CustomersClientPage({ 
  customers, 
  canEdit = true,
  customerTypes = [],
  areas = []
}: { 
  customers: Customer[], 
  canEdit?: boolean,
  customerTypes?: { id: string, name: string }[],
  areas?: { id: string, name: string }[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [filterCity, setFilterCity] = useState<string>('ALL')
  const [filterArea, setFilterArea] = useState<string>('ALL')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterDebt, setFilterDebt] = useState<'ALL' | 'DEBT' | 'NO_DEBT'>('ALL')

  const availableCities = Array.from(new Set(customers.map(c => c.city).filter(Boolean))) as string[]
  
  // Create a map of area ID -> area Name for quick lookup
  const areasMap = new Map(areas.map(a => [a.id, a.name]))

  // Show all areas defined in the system
  const availableAreas = Array.from(new Set(areas.map(a => a.name))) as string[]

  const availableTypes = Array.from(new Set(customers.map(c => c.type?.name).filter(Boolean))) as string[]

  const handleCityChange = (val: string) => {
    setFilterCity(val)
    setFilterArea('ALL')
  }

  // Base filtered list by dropdowns
  const baseFiltered = customers.filter(c => {
    if (filterCity !== 'ALL' && c.city !== filterCity) return false
    
    // Check if the customer's default area matches the selected filterArea name
    if (filterArea !== 'ALL') {
      const customerAreaName = c.defaultDeliveryAreaId ? areasMap.get(c.defaultDeliveryAreaId) : null;
      if (customerAreaName !== filterArea) return false;
    }
    
    if (filterType !== 'ALL' && (c.type?.name || 'רגיל') !== filterType) return false
    if (filterDebt === 'DEBT' && c.debt <= 0) return false
    if (filterDebt === 'NO_DEBT' && c.debt > 0) return false
    return true
  })

  // Final filtered list including search query
  const filteredCustomers = query.length > 0
    ? baseFiltered.filter(c =>
        c.phone.startsWith(query) || c.phone.includes(query) || c.name.toLowerCase().includes(query.toLowerCase())
      )
    : baseFiltered

  const matchedSuggestions = query.length > 0 ? filteredCustomers.slice(0, 8) : []

  const selectCustomer = (customer: Customer) => {
    setQuery('')
    setShowSuggestions(false)
    router.push(`/dashboard/customers/${customer.id}`)
  }

  return (
    <div className="h-full flex flex-col pt-4 pb-20">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <ErrorBoundary name="BackButton">
            <BackButton />
          </ErrorBoundary>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">לקוחות</h1>
            <span className="text-sm text-gray-400">{filteredCustomers.length} מתוך {customers.length}</span>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {/* Filter Button - Square side button */}
          <button 
            type="button"
            onClick={() => setShowFilters(true)}
            className="relative flex items-center justify-center w-10 h-10 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors shrink-0 shadow-sm"
          >
            <Filter className="w-5 h-5" />
            {(filterCity !== 'ALL' || filterArea !== 'ALL' || filterDebt !== 'ALL' || filterType !== 'ALL') && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white"></span>
            )}
          </button>
          
          <ErrorBoundary name="CustomerAddModal">
            <CustomerAddModal customerTypes={customerTypes} areas={areas} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Floating Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-4 px-4">
           {/* Backdrop to close when clicked outside */}
           <div 
             className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" 
             onClick={() => setShowFilters(false)}
           />
           
           <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-gray-900 flex items-center gap-2">
                 <Filter className="w-5 h-5 text-gray-400" /> אפשרויות סינון
               </h3>
               <button 
                 onClick={() => setShowFilters(false)}
                 className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>
             </div>

             <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* City Filter */}
              <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-wider">עיר</label>
                <div className="space-y-1">
                  {[{val: 'ALL', label: 'כל הערים'}, ...availableCities.map(c => ({val: c, label: c}))].map(opt => (
                    <label key={opt.val} className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-gray-200 hover:shadow-sm">
                      <input type="radio" value={opt.val} checked={filterCity === opt.val} onChange={e => handleCityChange(e.target.value)} className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer" />
                      <span className={`text-sm ${filterCity === opt.val ? 'font-bold text-blue-900' : 'font-medium text-gray-700'}`}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Area Filter */}
              {(filterCity === 'בית שמש' && availableAreas.length > 0) && (
                <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2 fade-in">
                  <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-wider">אזור</label>
                  <div className="space-y-1">
                    {[{val: 'ALL', label: 'כל האזורים'}, ...availableAreas.map(a => ({val: a, label: a}))].map(opt => (
                      <label key={opt.val} className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-gray-200 hover:shadow-sm">
                        <input type="radio" value={opt.val} checked={filterArea === opt.val} onChange={e => setFilterArea(e.target.value)} className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer" />
                        <span className={`text-sm ${filterArea === opt.val ? 'font-bold text-blue-900' : 'font-medium text-gray-700'}`}>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Type Filter */}
              <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-wider">סוג לקוח</label>
                <div className="space-y-1">
                  {[{val: 'ALL', label: 'הכל'}, {val: 'רגיל', label: 'רגיל'}, ...availableTypes.map(t => ({val: t, label: t}))].map(opt => (
                    <label key={opt.val} className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-gray-200 hover:shadow-sm">
                      <input type="radio" value={opt.val} checked={filterType === opt.val} onChange={e => setFilterType(e.target.value)} className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer" />
                      <span className={`text-sm ${filterType === opt.val ? 'font-bold text-blue-900' : 'font-medium text-gray-700'}`}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Debt Filter */}
              <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-wider">מצב חוב</label>
                <div className="space-y-1">
                  {[
                    {val: 'ALL', label: 'הכל'},
                    {val: 'DEBT', label: 'חייבים בלבד (חוב > 0)'},
                    {val: 'NO_DEBT', label: 'יתרה ₪0 / זכות'}
                  ].map(opt => (
                    <label key={opt.val} className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-gray-200 hover:shadow-sm">
                      <input type="radio" value={opt.val} checked={filterDebt === opt.val} onChange={e => setFilterDebt(e.target.value as any)} className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer" />
                      <span className={`text-sm ${filterDebt === opt.val ? 'font-bold text-blue-900' : 'font-medium text-gray-700'}`}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
             </div>
             
             <button 
               type="button"
               onClick={() => setShowFilters(false)}
               className="mt-6 w-full py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition"
             >
               החל סינון
             </button>
           </div>
        </div>
      )}

      {/* Phone / Name Search with Autocomplete */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          dir="auto"
          className="block w-full pr-10 pl-10 py-3 border border-gray-300 rounded-xl bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
          placeholder="חיפוש חופשי (טלפון או שם)..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => matchedSuggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          autoComplete="off"
        />
        {query.length > 0 && (
          <button
            className="absolute inset-y-0 left-3 flex items-center text-gray-400 hover:text-gray-600"
            onClick={() => { setQuery(''); setShowSuggestions(false); inputRef.current?.focus() }}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Autocomplete Dropdown */}
        {showSuggestions && (
          <ul className="absolute z-20 mt-1 w-full bg-white shadow-xl rounded-xl border border-gray-100 max-h-72 overflow-y-auto divide-y divide-gray-50">
            {matchedSuggestions.map(customer => (
              <li
                key={customer.id}
                onMouseDown={() => selectCustomer(customer)}
                className="cursor-pointer px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-gray-900 flex items-center gap-2">
                    {customer.name}
                    {customer.type && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase">{customer.type.name}</span>}
                  </p>
                  <p className="text-sm text-blue-600 font-mono mt-0.5">
                    <span className="hover:underline cursor-pointer" onClick={e => { e.preventDefault(); e.stopPropagation(); initiateCustomerCall(customer.phone); }} dir="ltr">
                      {customer.phone}
                    </span>
                  </p>
                  {customer.address && (
                    <p className="text-xs text-gray-400 mt-0.5">{customer.address}</p>
                  )}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full border ${customer.debt > 0 ? 'bg-red-50 text-red-600 border-red-100' : customer.debt < 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {customer.debt > 0 ? `חוב ₪${customer.debt.toFixed(0)}` : customer.debt < 0 ? `זכות ₪${Math.abs(customer.debt).toFixed(0)}` : '₪0'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12 text-gray-500 flex flex-col items-center">
          <CircleUser className="w-12 h-12 text-gray-300 mb-3" />
          <p>{query ? 'לא נמצאו לקוחות' : 'אין לקוחות עדיין'}</p>
          {!query && <p className="text-sm mt-1">לקוחות נוספים אוטומטית בעת יצירת הזמנה.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map(customer => (
            <Link href={`/dashboard/customers/${customer.id}`} key={customer.id}
              className="block bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition active:scale-[0.98]"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      {customer.name}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5 font-mono">
                      <Phone className="w-3.5 h-3.5" /> 
                      <span className="hover:text-blue-600 hover:underline cursor-pointer transition-all" onClick={e => { e.preventDefault(); e.stopPropagation(); initiateCustomerCall(customer.phone); }} dir="ltr">
                        {customer.phone}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full border ${customer.debt > 0 ? 'bg-red-50 text-red-600 border-red-100' : customer.debt < 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {customer.debt > 0 ? `חוב ₪${customer.debt.toFixed(0)}` : customer.debt < 0 ? `זכות ₪${Math.abs(customer.debt).toFixed(0)}` : '₪0'}
                  </span>
                  {customer.type ? (
                    <span className="text-[11px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase shadow-sm border border-indigo-200">
                      {customer.type.name}
                    </span>
                  ) : (
                    <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold shadow-sm border border-gray-200">
                      רגיל
                    </span>
                  )}
                </div>
              </div>

              {customer.address && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {customer.address}
                </p>
              )}

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> {customer._count.orders} הזמנות
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
