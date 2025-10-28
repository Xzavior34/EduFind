import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/api/_libs/firebase'

export default function Dashboard() {
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        router.push('/auth/login')
        return
      }

      const token = await user.getIdToken()

      const res = await fetch('/api/users/me/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setEnrollments(data.enrollments || [])
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  if (loading) return <div>Loading...</div>

  return (
    <main className="max-w-content mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-4xl font-semibold mb-4">My Dashboard</h1>
      {enrollments.length === 0
        ? <div>No enrollments yet.</div>
        : (
          <ul className="space-y-4">
            {enrollments.map((e: any) => (
              <li key={e.course_id} className="bg-white rounded-md p-4 shadow-sm">
                <div className="font-semibold">{e.course_title}</div>
                <div className="text-sm text-gray-500">
                  {e.enrolled_at && new Date(e.enrolled_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
    </main>
  )
    }
