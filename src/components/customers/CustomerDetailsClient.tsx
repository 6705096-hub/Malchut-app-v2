'use client'

import { useState } from 'react'
import { ArrowLeft, Phone, MapPin, FileText } from 'lucide-react'
import Link from 'next/link'
import CustomerEditForm from './CustomerEditForm'

type Order = {
  id: string
  deliveryDay: string
  deliveryWeek: string
  totalPrice: number
  status: string
  createdAt: Date
}

type Customer = {
  id: string
  name: string
  phone: string
  address: string | null
  debt: number
  orders: Order[]
}

export default function CustomerDetailsClient({ customer }: { customer: Customer }) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <div className="pt-4 pb-20">
        <CustomerEditForm 
          customer={customer} 
          onCancel={() => setIsEditing(false)} 
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col pt-1 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-3">
        <Link href="/customers" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 
          onClick={() => setIsEditing(true)}
          className="text-2xl font-bold text-gray-900 flex-1 cursor-pointer hover:text-blue-600 transition-colors"
          title="ערוך לקוח"
        >
          {customer.name}
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5 space-y-5">
        <div className="flex items-center gap-4 text-gray-700">
          <div className="p-2 bg-gray-50 rounded-lg">
            <Phone className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Phone Number</p>
            <span className="font-bold">{customer.phone}</span>
          </div>
        </div>
        
        <div className="flex items-start gap-4 text-gray-700">
          <div className="p-2 bg-gray-50 rounded-lg">
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Default Address</p>
            <span className="font-bold">{customer.address || 'Not specified'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-gray-700">
          <div className="p-2 bg-gray-50 rounded-lg">
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Account Balance</p>
            <span className={`font-black text-lg ${customer.debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₪{customer.debt.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-black text-gray-900 mb-4 px-1">Order History</h2>
      <div className="space-y-4">
        {customer.orders.length === 0 ? (
          <div className="text-gray-400 text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
            <p className="font-medium text-sm">No orders found for this customer.</p>
          </div>
        ) : (
          customer.orders.map(order => (
            <div key={order.id} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex justify-between items-center hover:border-blue-100 transition-colors">
              <div>
                <p className="font-black text-gray-900">{order.deliveryDay}</p>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-xs text-gray-400 font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                   <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                   <p className="text-xs text-gray-400 font-medium uppercase tracking-tighter">{order.deliveryWeek.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-gray-900 text-lg">₪{order.totalPrice.toFixed(2)}</p>
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg mt-1 inline-block tracking-widest ${
                  order.status === 'PLANNED' ? 'bg-orange-50 text-orange-600' : 
                  order.status === 'PAID' ? 'bg-green-50 text-green-600' : 
                  order.status === 'EXECUTED' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {order.status === 'PLANNED' ? 'ממתין' : 
                   order.status === 'PAID' ? 'שולם' : 
                   order.status === 'EXECUTED' ? 'בוצע' : 
                   order.status === 'EXECUTED' ? 'סופק' : order.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
