'use client'

import { useEffect, useState } from 'react'

type Course = {
  id: string
  code: string
  title: string
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')

  async function fetchCourses() {
    const res = await fetch('/api/admin/courses')
    const data = await res.json()
    setCourses(data.courses)
  }

  async function createCourse() {
    await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, title }),
    })

    setCode('')
    setTitle('')
    fetchCourses()
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Courses</h1>

      <div className="bg-white p-6 rounded-xl shadow mb-8 space-y-3">
        <input
          className="border p-2 rounded w-full"
          placeholder="Course Code (CSC309)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <input
          className="border p-2 rounded w-full"
          placeholder="Course Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          onClick={createCourse}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create Course
        </button>
      </div>

      <ul className="space-y-2">
        {courses.map((course) => (
          <li key={course.id} className="border p-3 rounded">
            {course.code} — {course.title}
          </li>
        ))}
      </ul>
    </div>
  )
}