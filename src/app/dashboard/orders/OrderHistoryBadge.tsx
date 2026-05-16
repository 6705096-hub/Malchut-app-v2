'use client'

import { useState } from 'react'

export function OrderHistoryBadge({ order }: { order: any }) {
  const [isOpen, setIsOpen] = useState(false)
  
  const histories = order.histories || []
  const createdHistory = histories.find((h: any) => h.action === 'CREATED')
  const editHistories = histories.filter((h: any) => h.action === 'UPDATED').sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  
  const creatorName = createdHistory?.user?.name || order.createdBy?.name || 'מערכת'
  const createdDateStr = new Date(createdHistory?.createdAt || order.createdAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
  
  const latestEdit = editHistories[0]
  
  // Decide what string to show normally
  let displayText = `נוצר ע״י ${creatorName} ב-${createdDateStr}`
  if (latestEdit) {
    const editDateStr = new Date(latestEdit.createdAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
    displayText = `נערך ע״י ${latestEdit.user?.name || 'מערכת'} ב-${editDateStr}`
  }

  return (
    <div className="relative z-10 w-full text-right" onClick={(e) => e.stopPropagation()}>
      <span 
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer hover:underline text-[9px] text-gray-400 opacity-90 inline-block font-medium tracking-tight"
      >
        {displayText}
      </span>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[50]" onClick={() => setIsOpen(false)} />
          <div className="absolute text-right bottom-full left-0 mb-1 w-56 bg-white border border-gray-200 shadow-xl rounded-xl p-3 z-[60] text-[11px] text-gray-800 animate-in fade-in zoom-in-95">
            <h4 className="font-bold border-b border-gray-100 pb-1 mb-2 text-indigo-800">היסטוריית הזמנה</h4>
            <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pl-1">
              {/* Edits */}
              {editHistories.map((h: any) => (
                <div key={h.id} className="flex flex-col border-r-2 border-amber-300 pr-1.5 opacity-80 hover:opacity-100">
                  <span className="font-bold">נערך ע״י {h.user?.name || 'מערכת'}</span>
                  <span className="text-gray-500 font-mono text-[9px]">{new Date(h.createdAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              ))}
              {/* Created */}
              <div className="flex flex-col border-r-2 border-emerald-300 pr-1.5 opacity-80 hover:opacity-100 mt-1">
                 <span className="font-bold">נוצר ע״י {creatorName}</span>
                 <span className="text-gray-500 font-mono text-[9px]">{createdDateStr}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
