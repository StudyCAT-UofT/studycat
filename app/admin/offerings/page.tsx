'use client'

import { useEffect, useState } from 'react'

type Course = { id: string; code: string }
type Term = { id: string; name: string }
type Offering = {
  id: string
  display: string
  course: { code: string }
  term: { name: string }
}

export default function OfferingsPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [offerings, setOfferings] = useState<Offering[]>([])

  const [courseId, setCourseId] = useState('')
  const [termId, setTermId] = useState('')
  const [display, setDisplay] = useState('')

  async function fetchAll() {
    const [coursesRes, termsRes, offeringsRes] = await Promise.all([
      fetch('/api/admin/courses'),
      fetch('/api/admin/terms'),
      fetch('/api/admin/offerings'),
    ])

    setCourses((await coursesRes.json()).courses)
    setTerms((await termsRes.json()).terms)
    setOfferings((await offeringsRes.json()).offerings)
  }

  async function createOffering() {
    await fetch('/api/admin/offerings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, termId, display }),
    })

    setDisplay('')
    fetchAll()
  }

  useEffect(() => {
    fetchAll()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Course Offerings</h1>

      <div className="bg-white p-6 rounded-xl shadow mb-8 space-y-3">
        <select
          className="border p-2 rounded w-full"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          <option value="">Select Course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded w-full"
          value={termId}
          onChange={(e) => setTermId(e.target.value)}
        >
          <option value="">Select Term</option>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <input
          className="border p-2 rounded w-full"
          placeholder="Display Name"
          value={display}
          onChange={(e) => setDisplay(e.target.value)}
        />

        <button
          onClick={createOffering}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create Offering
        </button>
      </div>

      <ul className="space-y-2">
        {offerings.map((o) => (
          <li key={o.id} className="border p-3 rounded">
            {o.display} — {o.course.code} ({o.term.name})
          </li>
        ))}
      </ul>
    </div>
  )
}
