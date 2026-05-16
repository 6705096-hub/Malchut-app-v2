import { Suspense } from 'react'
import Image from 'next/image'
import { LoginForm } from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center flex flex-col items-center">
        <Image src="/logo.jpg" alt="מעדנצ'יק - מלכות קוגל" width={320} height={150} className="object-contain mb-4 h-36 w-auto" priority />
        <p className="mt-2 text-sm text-gray-600"> ניהול פשוט וקל של ההזמנות שלכם. </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md flex justify-center px-4">
        <Suspense fallback={<div className="p-4">טוען מסך התחברות...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
