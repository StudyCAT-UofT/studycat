'use client'

import { useEffect, useState } from 'react'

type Term = {
  id: string
  name: string
}

export default function TermsPage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [name, setName] = useState('')

  async function fetchTerms() {
    const res = await fetch('/api/admin/terms')
    const data = await res.json()
    setTerms(data.terms)
  }

  async function createTerm() {
    await fetch('/api/admin/terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setName('')
    fetchTerms()
  }

  useEffect(() => {
    fetchTerms()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Terms</h1>

      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <input
          className="border p-2 rounded w-full mb-3"
          placeholder="Term Name (e.g. Fall 2026)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={createTerm}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create Term
        </button>
      </div>

      <ul className="space-y-2">
        {terms.map((term) => (
          <li key={term.id} className="border p-3 rounded">
            {term.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
