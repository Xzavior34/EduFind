import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('firebaseToken') || ''
    fetch('/api/users/me/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setEnrollments(data.enrollments || [])
        setLoading(false)
      })
  }, [])

  return (
    <main className="max-w-content mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-4xl font-semibold mb-4">My Dashboard</h1>
      {loading
        ? <div>Loading...</div>
        : enrollments.length === 0
          ? <div>No enrollments yet.</div>
          : (
            <ul className="space-y-4">
              {enrollments.map((e: any) => (
                <li key={e.course_id} className="bg-white rounded-md p-4 shadow-sm">
                  <div className="font-semibold">{e.course_title}</div>
                  <div className="text-sm text-gray-500">{e.enrolled_at && new Date(e.enrolled_at).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
    </main>
  )
}
