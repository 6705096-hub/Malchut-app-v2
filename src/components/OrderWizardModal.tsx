'use client'

import React from 'react'
import { OrderWizard } from '@/components/OrderWizard'

export function OrderWizardModal({
  isOpen,
  onClose,
  initialOrderId,
  initialTemplateId,
  isFixedInitial,
  initialOrderData
}: {
  isOpen: boolean
  onClose: () => void
  initialOrderId?: string | null
  initialTemplateId?: string | null
  isFixedInitial?: boolean
  initialOrderData?: any
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-2 sm:pt-4 px-2 sm:px-4 pb-0 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-[#f8fafc] w-full max-w-4xl h-full max-h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header Removed to save space - OrderWizard will implement its own header layout */}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto w-full rounded-3xl">
          <div className="max-w-xl mx-auto w-full p-3 sm:p-5 pb-32">
            <OrderWizard 
              initialOrderId={initialOrderId} 
              initialTemplateId={initialTemplateId} 
              isFixedInitial={isFixedInitial} initialOrderData={initialOrderData} 
              onClose={onClose} 
            />
          </div>
        </div>
        
      </div>
    </div>
  )
}
