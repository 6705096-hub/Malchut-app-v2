'use client'

import { UserPermissionsModal } from '@/components/UserPermissionsModal'

export default function TestUIPage() {
  const mockUser = {
    id: '123',
    name: 'ישראל ישראלי',
    email: 'israel@example.com',
    role: 'ADMIN',
    permissions: {},
    isActive: true
  }
  
  const mockDeliveryAreas = [
    { id: 'area_1', name: 'אזור צפון' },
    { id: 'area_2', name: 'אזור דרום' }
  ]

  return (
    <div className="min-h-screen bg-gray-100 p-8" dir="rtl">
      <UserPermissionsModal 
        user={mockUser}
        deliveryAreas={mockDeliveryAreas}
        onClose={() => {}}
        onSave={async () => {}}
      />
    </div>
  )
}
