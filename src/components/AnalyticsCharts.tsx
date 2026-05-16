'use client'

import React, { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts'

export function AnalyticsCharts() {
  const [data, setData] = useState<{ revenueData: any[], topProducts: any[], totalOrders: number, totalRevenue: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics?days=30')
      .then(res => res.json())
      .then(d => {
        setData(d)
        setIsLoading(false)
      })
      .catch(e => {
        console.error('Failed to load analytics', e)
        setIsLoading(false)
      })
  }, [])

  if (isLoading) {
    return (
      <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data || data.revenueData.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-6 w-full mb-6 print:hidden">
      {/* Top Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl shadow text-white flex flex-col justify-center items-center">
          <span className="text-blue-100 text-sm font-bold mb-1">הזמנות (30 יום)</span>
          <span className="text-3xl font-black">{data.totalOrders}</span>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-2xl shadow text-white flex flex-col justify-center items-center">
          <span className="text-green-100 text-sm font-bold mb-1">הכנסות (30 יום)</span>
          <span className="text-3xl font-black">₪{data.totalRevenue.toLocaleString()}</span>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">הכנסות - 30 ימים אחרונים</h3>
        <div className="h-[250px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.revenueData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getDate()}/${d.getMonth()+1}`;
                }}
                tick={{ fontSize: 11, fill: '#888' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#888' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `₪${val}`}
              />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'right' }}
                formatter={(value: any) => [`₪${value.toLocaleString()}`, 'הכנסות'] as any}
                labelFormatter={(label: any) => {
                  const d = new Date(label);
                  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">10 המוצרים הנמכרים ביותר</h3>
        <div className="h-[250px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.topProducts} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: '#888' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#888' }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'right' }}
                cursor={{ fill: 'transparent' }}
                formatter={(value: any) => [value, 'כמות'] as any}
              />
              <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                {data.topProducts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8b5cf6' : '#a855f7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
