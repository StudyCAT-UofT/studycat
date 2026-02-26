'use client'

import { useEffect, useState } from 'react'

type User = {
  id: string
  username: string
  givenName: string
  familyName: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [username, setUsername] = useState('')
  const [givenName, setGivenName] = useState('')
  const [familyName, setFamilyName] = useState('')

  async function fetchUsers() {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setUsers(data.users)
  }

  async function createUser() {
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, givenName, familyName }),
    })

    setUsername('')
    setGivenName('')
    setFamilyName('')
    fetchUsers()
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Manage Users</h1>

      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="font-semibold mb-4">Create User</h2>

        <div className="space-y-3">
          <input
            className="border p-2 rounded w-full"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="border p-2 rounded w-full"
            placeholder="Given Name"
            value={givenName}
            onChange={(e) => setGivenName(e.target.value)}
          />
          <input
            className="border p-2 rounded w-full"
            placeholder="Family Name"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
          />

          <button
            onClick={createUser}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Create
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-semibold mb-4">All Users</h2>

        <ul className="space-y-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="border p-3 rounded flex justify-between"
            >
              <span>
                {user.username} — {user.givenName} {user.familyName}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}