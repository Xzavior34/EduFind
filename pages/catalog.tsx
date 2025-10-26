import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import CourseCard from '../components/CourseCard'

export default function Catalog() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/courses?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => {
        setCourses(data.results || [])
        setLoading(false)
      })
  }, [query])

  return (
    <main className="bg-neutralBg min-h-screen">
      <div className="max-w-content mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-4xl font-semibold mb-4">Course Catalog</h1>
        {/* TODO: search/filter UI */}
        <input
          type="search"
          placeholder="Search courses..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md mb-6"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search courses"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white h-60 rounded-md"></div>
              ))
            : (courses.length > 0
                ? courses.map((c) => <CourseCard key={c.id} course={c} />)
                : <div className="col-span-full text-center py-12">No results — try these popular courses.</div>
              )}
        </div>
      </div>
    </main>
  )
}
