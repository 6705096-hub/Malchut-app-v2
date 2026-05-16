'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'

export function LoginForm() {
  const { status } = useSession()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const urlError = searchParams.get('error')

  useEffect(() => {
    if (status === 'authenticated') {
      window.location.replace(callbackUrl)
    }
  }, [status, callbackUrl])

  useEffect(() => {
    if (urlError === 'OAuthSignin') {
      setError('שגיאת גוגל: חסרים מפתחות (Client ID/Secret) במערכת. יש להגדירם תחילה.')
    } else if (urlError) {
      setError('אירעה שגיאה במהלך ההתחברות.')
    }
  }, [urlError])

  const handleGoogleSignIn = () => {
    setIsLoading(true)
    signIn('google', { callbackUrl }, { prompt: 'select_account' })
  }

  return (
    <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-xl flex flex-col items-center gap-6" dir="rtl">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">ברוכים הבאים</h1>
        <p className="text-sm text-gray-500 mt-2">הכנס את פרטי ההתחברות שלך</p>
      </div>

      {error && (
        <div className="w-full text-red-600 bg-red-50 p-3 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading || status === 'loading' || status === 'authenticated'}
        className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:ring-2 focus:ring-offset-1 focus:ring-gray-200 transition-all font-medium text-gray-700 disabled:opacity-50 active:scale-[0.98]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
          <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
          <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
          <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
          <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
        </svg>
        התחברות באמצעות גוגל
      </button>
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => {
            setIsLoading(true)
            signIn('credentials', { username: 'test_admin', password: 'password', callbackUrl })
          }}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-red-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm hover:bg-red-700 transition-all disabled:opacity-50"
        >
          TEST ADMIN LOGIN
        </button>
      )}
    </div>
  )
}
