import { useState } from 'react'
import { useRouter } from 'next/router'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/api/_libs/firebase'
import { sendWelcomeEmail } from '@/utils/email'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password)
      const token = await userCred.user.getIdToken()
      localStorage.setItem('firebaseToken', token)

      await sendWelcomeEmail(email)

      await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ uid: userCred.user.uid, email })
      })

      router.push('/dashboard')
    } catch (err: any) {
      console.error(err)
      setError('Failed to sign up. Try a different email.')
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutralBg">
      <form onSubmit={onSubmit} className="bg-white p-8 rounded-md shadow-md w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4">Sign Up</h1>
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
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cta text-white rounded-md px-4 py-2 font-medium shadow-sm"
        >
          {loading ? "Processing..." : "Sign Up"}
        </button>
        <div className="mt-3 text-sm">
          Already have an account? <a href="/auth/login" className="text-accent">Login</a>
        </div>
      </form>
    </main>
  )
    }
