'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'

type Customer = {
  id: string
  name: string
  phone: string
  debt: number
}

export default function CustomerList({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [query, setQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim() === '') {
        setCustomers(initialCustomers)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        setCustomers(data.customers || [])
      } catch (error) {
        console.error('Search failed', error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [query, initialCustomers])

  return (
    <div className="h-full flex flex-col pt-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">לקוחות</h1>
        <button className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" /> הוספה
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        </div>
        <input 
          type="text" 
          placeholder="חיפוש לפי שם או טלפון..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {customers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {isLoading ? 'מחפש...' : 'לא נמצאו לקוחות.'}
            </div>
          ) : (
            customers.map(customer => (
              <Link href={`/customers/${customer.id}`} key={customer.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center cursor-pointer">
                <div>
                  <h3 className="font-bold text-gray-900">{customer.name}</h3>
                  <p className="text-sm text-gray-500">{customer.phone}</p>
                </div>
                {customer.debt > 0 && (
                  <div className="text-right">
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                      חוב: ₪{customer.debt.toFixed(2)}
                    </span>
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
