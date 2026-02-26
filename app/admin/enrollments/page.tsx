'use client'

import { useEffect, useState } from 'react'

type User = { id: string; username: string }
type Offering = { id: string; display: string }

export default function EnrollmentPage() {
  const [users, setUsers] = useState<User[]>([])
  const [offerings, setOfferings] = useState<Offering[]>([])

  const [userId, setUserId] = useState('')
  const [offeringId, setOfferingId] = useState('')
  const [role, setRole] = useState('STUDENT')

  async function fetchData() {
    const [uRes, oRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/offerings'),
    ])

    setUsers((await uRes.json()).users)
    setOfferings((await oRes.json()).offerings)
  }

  async function assign() {
    if (!userId || !offeringId) {
        alert('Please select a user and an offering')
        return
    }

    const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, offeringId, offeringRole: role }) // <-- use offeringRole
    })

    const data = await res.json()

    if (!res.ok) {
        alert(data.error || 'Failed to assign user')
        return
    }

    alert('Assigned successfully')
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Assign User to Offering</h1>

      <div className="bg-white p-6 rounded-xl shadow space-y-3">
        <select
          className="border p-2 rounded w-full"
          onChange={(e) => setUserId(e.target.value)}
        >
          <option value="">Select User</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded w-full"
          onChange={(e) => setOfferingId(e.target.value)}
        >
          <option value="">Select Offering</option>
          {offerings.map((o) => (
            <option key={o.id} value={o.id}>
              {o.display}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded w-full"
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="STUDENT">STUDENT</option>
          <option value="INSTRUCTOR">INSTRUCTOR</option>
          <option value="TA">TA</option>
        </select>

        <button
          onClick={assign}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Assign
        </button>
      </div>
    </div>
  )
}