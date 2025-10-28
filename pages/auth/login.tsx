import { useState } from 'react'
import { useRouter } from 'next/router'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/api/_libs/firebase'
import { sendLoginNotification } from '@/utils/email'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password)
      const token = await userCred.user.getIdToken()
      localStorage.setItem('firebaseToken', token)

      await sendLoginNotification(email)

      router.push('/dashboard')
    } catch (err: any) {
      console.error(err)
      setError('Failed to login. Please check your credentials.')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutralBg">
      <form onSubmit={onSubmit} className="bg-white p-8 rounded-md shadow-md w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4">Login</h1>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full mb-3 px-4 py-2 border rounded-md"
          required
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full mb-3 px-4 py-2 border rounded-md"
          required
        />
        
        <button type="submit" className="w-full bg-cta text-white rounded-md px-4 py-2 font-medium shadow-sm">
          Login
        </button>

        <div className="mt-3 text-sm">
          Don't have an account? <a href="/auth/signup" className="text-accent">Sign up</a>
        </div>
      </form>
    </main>
  )
        }
