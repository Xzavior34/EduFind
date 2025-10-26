import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import StickyEnrollCTA from '../../components/StickyEnrollCTA'

export default function CourseDetail() {
  const router = useRouter()
  const { slug } = router.query
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [enrolled, setEnrolled] = useState(false)
  const [ctaLoading, setCtaLoading] = useState(false)
  const [ctaSuccess, setCtaSuccess] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`/api/courses/${slug}`)
      .then((res) => res.json())
      .then(setCourse)
      .finally(() => setLoading(false))
  }, [slug])

  const handleEnroll = async () => {
    setCtaLoading(true)
    const token = localStorage.getItem('firebaseToken') || ''
    const res = await fetch('/api/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ course_id: course.id })
    })
    if (res.ok) {
      setEnrolled(true)
      setCtaSuccess(true)
    }
    setCtaLoading(false)
  }

  // Skeleton/loading state
  if (loading) return (
    <main className="max-w-content mx-auto px-4 py-8">
      <div className="animate-pulse bg-white h-64 w-full rounded-md mb-6"></div>
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-4 bg-gray-100 rounded w-2/3"></div>
    </main>
  )

  if (!course) return <main className="text-center py-16">Course not found.</main>

  return (
    <main>
      <div id="course-hero" className="max-w-content mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        <img src={course.thumbnail_url} alt={course.title} className="rounded-md object-cover aspect-[3/2] w-full md:max-w-md" />
        <div>
          <h1 className="text-2xl md:text-4xl font-semibold">{course.title}</h1>
          <p className="mt-2 text-gray-700">{course.short_description}</p>
          <div className="mt-4">
            <span className="text-sm bg-green-50 rounded px-2 py-1">{course.is_free ? "Free" : `$${course.price}`}</span>
          </div>
          <div className="mt-6">
            <h2 className="font-semibold text-lg mb-2">Syllabus</h2>
            <ul className="list-disc ml-6">
              {course.syllabus?.map((s: any, i: number) => (
                <li key={i}>
                  {s.title}
                  <ul className="list-disc ml-4">
                    {s.lessons?.map((l: any, j: number) => (
                      <li key={j}>{l.title} <span className="text-xs text-gray-400">({l.duration} min)</span></li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <StickyEnrollCTA
        isFree={course.is_free}
        price={course.price}
        onEnroll={handleEnroll}
        enrolled={enrolled}
      />
      {ctaSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-md shadow-lg text-center">
            <h3 className="text-xl font-semibold mb-2">Enrolled!</h3>
            <p>You are now enrolled in <b>{course.title}</b>.</p>
            <button className="mt-4 bg-cta text-white rounded-md px-4 py-2 font-medium" onClick={() => setCtaSuccess(false)}>Close</button>
          </div>
        </div>
      )}
    </main>
  )
}
