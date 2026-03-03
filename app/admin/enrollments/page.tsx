'use client'

import { useEffect, useState } from 'react'

type User = { id: string; username: string }
type Offering = { id: string; display: string }

type Enrollment = {
  userId: string
  offeringId: string
  offeringRole: string
  user: { username: string }
}

export default function EnrollmentPage() {
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedOfferingId, setSelectedOfferingId] = useState('')
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(false)

  // New enrollment fields
  const [newUserId, setNewUserId] = useState('')
  const [newRole, setNewRole] = useState('STUDENT')

  // Fetch all course offerings and users
  async function fetchData() {
    const [offeringsRes, usersRes] = await Promise.all([
      fetch('/api/admin/offerings'),
      fetch('/api/admin/users'),
    ])
    setOfferings((await offeringsRes.json()).offerings || [])
    setUsers((await usersRes.json()).users || [])
  }

  // Fetch enrollments for selected offering
  async function fetchEnrollments() {
    if (!selectedOfferingId) return
    setLoading(true)
    const res = await fetch(
      `/api/admin/enrollments?offeringId=${selectedOfferingId}`
    )
    const data = await res.json()
    if (res.ok) {
      setEnrollments(data.enrollments)
    } else {
      alert(data.error || 'Failed to fetch enrollments')
    }
    setLoading(false)
  }

  // Create new enrollment
  async function createEnrollment() {
    if (!selectedOfferingId || !newUserId) {
      alert('Select an offering and a user')
      return
    }

    const res = await fetch('/api/admin/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: newUserId,
        offeringId: selectedOfferingId,
        offeringRole: newRole,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      alert(data.error || 'Failed to create enrollment')
      return
    }

    // Reset form and reload enrollments
    setNewUserId('')
    setNewRole('STUDENT')
    fetchEnrollments()
  }

  // Delete enrollment
  async function deleteEnrollment(userId: string) {
    const res = await fetch('/api/admin/enrollments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        offeringId: selectedOfferingId,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || 'Failed to delete enrollment')
      return
    }
    fetchEnrollments()
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Manage Enrollments</h1>

      {/* Select Offering */}
      <div className="bg-white p-6 rounded-xl shadow mb-6 space-y-4">
        <select
          className="border p-2 rounded w-full"
          value={selectedOfferingId}
          onChange={(e) => setSelectedOfferingId(e.target.value)}
        >
          <option value="">Select Course Offering</option>
          {offerings.map((o) => (
            <option key={o.id} value={o.id}>
              {o.display}
            </option>
          ))}
        </select>

        <button
          onClick={fetchEnrollments}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
        >
          Load Enrollments
        </button>
      </div>

      {/* Add Enrollment */}
      {selectedOfferingId && (
        <div className="bg-white p-6 rounded-xl shadow mb-8 space-y-4">
          <h2 className="font-semibold text-lg">Add Enrollment</h2>

          <select
            className="border p-2 rounded w-full"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
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
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          >
            <option value="STUDENT">STUDENT</option>
            <option value="INSTRUCTOR">INSTRUCTOR</option>
            <option value="TA">TA</option>
          </select>

          <button
            onClick={createEnrollment}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
          >
            Assign
          </button>
        </div>
      )}

      {/* Enrollment List */}
      {loading && <p>Loading...</p>}

      {!loading && enrollments.length > 0 && (
        <div className="space-y-2">
          {enrollments.map((e) => (
            <div
              key={e.userId}
              className="bg-white p-4 rounded shadow flex justify-between items-center"
            >
              <div>
                {e.user.username} ({e.offeringRole})
              </div>

              <button
                onClick={() => deleteEnrollment(e.userId)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading &&
        selectedOfferingId &&
        enrollments.length === 0 && (
          <p className="text-gray-500">
            No enrollments found for this offering.
          </p>
        )}
    </div>
  )
}
