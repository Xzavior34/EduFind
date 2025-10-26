import Head from 'next/head'
import CourseCard from '../components/CourseCard'
import { useEffect, useState } from 'react'

export default function Home() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/courses?sort=featured&per_page=8')
      .then((res) => res.json())
      .then((data) => {
        setCourses(data.results || [])
        setLoading(false)
      })
  }, [])

  return (
    <>
      <Head>
        <title>Lovable Learning Platform</title>
        <meta name="description" content="Free & paid AI/ML courses. Enroll instantly." />
      </Head>
      <main className="bg-neutralBg min-h-screen">
        <section className="max-w-content mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-4xl font-semibold mb-4">Find your next AI/ML course</h1>
          {/* SearchBar would go here */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-white h-60 rounded-md"></div>
                ))
              : courses.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        </section>
      </main>
    </>
  )
}
