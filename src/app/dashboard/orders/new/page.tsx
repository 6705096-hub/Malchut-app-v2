import { OrderWizard } from '@/components/OrderWizard'
import { Suspense } from 'react'

export default function NewOrderPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading order form...</div>}>
        <OrderWizard />
      </Suspense>
    </div>
  )
}
