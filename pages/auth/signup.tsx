import { useState } from 'react'
import { useRouter } from 'next/router'
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import emailjs from '@emailjs/browser'

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
      const auth = getAuth()
      const userCred = await createUserWithEmailAndPassword(auth, email, password)
      const token = await userCred.user.getIdToken()
      localStorage.setItem('firebaseToken', token)
      // Create profile in Lovable Cloud
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: userCred.user.uid, email })
      })
      // Send welcome email via EmailJS
      await emailjs.send(
        process.env.EMAILJS_SERVICE_ID!,
        process.env.EMAILJS_TEMPLATE_WELCOME!,
        { name: email },
        process.env.EMAILJS_PUBLIC_KEY
      )
      router.push('/dashboard')
    } catch (err: any) {
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
