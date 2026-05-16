'use client'

import { useState, useEffect } from 'react'

type Props = {
  productId: string
  productName: string
  targetDateString: string
  requiredQuantity: number
  initialProduced: number // The raw absolute database value
  deduction?: number // How many of these were already 'supplied'
  viewStatus?: string // 'PLANNED', 'COMPLETED', 'ALL'
}

export function ProductionBatchInput({ productId, productName, targetDateString, requiredQuantity, initialProduced, deduction = 0, viewStatus = 'PLANNED' }: Props) {
  const [produced, setProduced] = useState(initialProduced || 0)
  const [isUpdating, setIsUpdating] = useState(false)
  
  const finalDisplayed = viewStatus === 'PLANNED' ? Math.max(0, produced - deduction) : produced;
  const [localInput, setLocalInput] = useState(finalDisplayed.toString())

  // Sync state when props change (e.g., when the user selects a new date or data refetches)
  useEffect(() => {
    setProduced(initialProduced || 0)
  }, [initialProduced, targetDateString])

  useEffect(() => {
    setLocalInput(finalDisplayed.toString())
  }, [finalDisplayed])

  const handleUpdate = async (newAbsoluteQuantity: number) => {
    // Optimistic
    setProduced(newAbsoluteQuantity)
    setIsUpdating(true)

    try {
      const res = await fetch('/api/production-batch', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          targetDateString,
          producedQuantity: newAbsoluteQuantity
        })
      })

      if (!res.ok) {
        throw new Error('Failed to update batch')
      }
    } catch (err) {
      console.error(err)
      // Revert on error
      setProduced(initialProduced || 0)
    } finally {
      setIsUpdating(false)
    }
  }

  // We are lacking if what we NEED is more than what we SHOW as produced.
  // (requiredQuantity is already correctly pre-filtered by the server based on the active tab)
  const isLacking = requiredQuantity > finalDisplayed

  return (
    <div className={`flex items-center gap-0.5 px-1 py-0.5 rounded transition-colors ${isLacking ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
      <button 
        onClick={(e) => { e.preventDefault(); handleUpdate(Math.max(0, produced - 1)) }}
        disabled={isUpdating || produced <= 0}
        className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 px-1 font-bold text-sm leading-none select-none"
      >
        -
      </button>

      <input
        type="text"
        inputMode="numeric"
        value={localInput}
        onChange={(e) => setLocalInput(e.target.value.replace(/\D/g, ''))}
        onBlur={(e) => {
          let typedVal = parseInt(e.target.value, 10)
          if (isNaN(typedVal)) typedVal = 0
          const newAbsolute = viewStatus === 'PLANNED' ? typedVal + deduction : typedVal;
          if (newAbsolute !== produced) {
            handleUpdate(newAbsolute)
          } else {
            setLocalInput(finalDisplayed.toString())
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur()
          }
        }}
        className={`w-[24px] text-center bg-transparent font-bold text-xs p-0 border-none focus:ring-0 focus:outline-none focus:bg-white/50 rounded ${isLacking ? 'text-orange-600' : 'text-green-600'}`}
      />

      <button 
        onClick={(e) => { e.preventDefault(); handleUpdate(produced + 1) }}
        disabled={isUpdating}
        className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1 font-bold text-sm leading-none select-none"
      >
        +
      </button>
    </div>
  )
}
