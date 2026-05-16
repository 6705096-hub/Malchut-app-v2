'use client'

import { useEffect, useState } from 'react'
import { getPendingActions, removeActionFromQueue, markActionError } from '@/lib/offlineQueue'
import { OfflineConflictsModal } from './OfflineConflictsModal'

export function OnlineSyncManager() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [activeConflict, setActiveConflict] = useState<any>(null)

  const processQueue = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    
    try {
      const pending = await getPendingActions()
      if (pending.length === 0) return

      console.log(`[Sync] Found ${pending.length} pending actions. Starting sync...`)

      for (const action of pending) {
        try {
          // Send to bulk sync endpoint
          const res = await fetch('/api/sync/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
          })

          const data = await res.json()

          if (!res.ok) {
            if (data.duplicateDetected) {
              // Pause sync and ask user
              await markActionError(action.id, data.error, true)
              setActiveConflict({ action, conflictDetails: data.details })
              break; // Stop further syncing until user resolves this
            } else {
              // General error
              console.error(`[Sync] Error syncing action ${action.id}:`, data.error)
              await markActionError(action.id, data.error || 'Unknown error')
            }
          } else {
            // Success
            console.log(`[Sync] Action ${action.id} synced successfully.`)
            await removeActionFromQueue(action.id)
          }
        } catch (e) {
          console.error(`[Sync] Network error while syncing action ${action.id}`)
          // Will retry later since it is still PENDING
          break 
        }
      }
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Run on mount in case we came back online while app was closed
    if (navigator.onLine) {
      processQueue()
    }

    const handleOnline = () => {
      processQueue()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return (
    <>
      <OfflineConflictsModal 
        conflict={activeConflict} 
        onClose={() => setActiveConflict(null)}
        onResolved={async (id, actionToTake) => {
          // e.g. 'delete', 'force_create'
          setActiveConflict(null)
          
          if (actionToTake === 'delete') {
            await removeActionFromQueue(id)
          } else if (actionToTake === 'force_create') {
              try {
                // Fetch again with force flag
                const res = await fetch('/api/sync/bulk', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: activeConflict.action, force: true })
                })
                if (res.ok) {
                   await removeActionFromQueue(id)
                }
              } catch (e) {}
          }
          
          // Resume queue
          processQueue()
        }}
      />
    </>
  )
}
