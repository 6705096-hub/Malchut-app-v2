'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X, Loader2 } from 'lucide-react'

type Customer = {
  id: string
  name: string
  phone: string
  address: string | null
  debt: number
}

export default function CustomerEditForm({ customer, onCancel }: { customer: Customer, onCancel: () => void }) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: customer.name,
    phone: customer.phone,
    address: customer.address || '',
    debt: customer.debt
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('שגיאה בעדכון לקוח')
      }

      router.refresh()
      onCancel()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-gray-900">ערוך לקוח</h2>
        <button 
          type="button" 
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">שם</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">כתובת (ברירת מחדל)</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">יתרת חוב (₪)</label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.debt}
            onChange={(e) => setFormData({ ...formData, debt: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
      >
        {isSaving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Save className="w-5 h-5" />
            שמור שינויים
          </>
        )}
      </button>
    </form>
  )
}
