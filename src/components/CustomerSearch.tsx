'use client'

import { useState, useEffect } from 'react'
import { Search, UserCheck } from 'lucide-react'

type Customer = {
  id: string
  name: string
  phone: string
  address: string | null
}

export function CustomerSearch({ onSelect }: { onSelect: (customer: Customer) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length < 2) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        setResults(data.customers || [])
      } catch (error) {
        console.error('Search failed', error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  return (
    <div className="w-full relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
          placeholder="חיפוש לפי שם או טלפון..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
             <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-xl overflow-auto border border-gray-100 divide-y divide-gray-100">
          {results.map((customer) => (
            <li
              key={customer.id}
              onClick={() => {
                onSelect(customer)
                setQuery('')
                setResults([])
              }}
              className="cursor-pointer select-none relative px-4 py-3 hover:bg-blue-50 hover:text-blue-900 transition-colors flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900">{customer.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{customer.phone} {customer.address ? `• ${customer.address}` : ''}</p>
              </div>
              <UserCheck className="w-5 h-5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
