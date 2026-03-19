'use client'

import { useEffect, useState } from 'react'
import { Title, TextInput, Button, Paper, Stack, Group, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'

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
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, givenName, familyName }),
    })
    if (res.ok) {
      notifications.show({
        title: 'User created',
        message: `${username} was added successfully.`,
        color: 'green',
      })
      setUsername('')
      setGivenName('')
      setFamilyName('')
      fetchUsers()
    } else {
      const data = await res.json()
      notifications.show({
        title: 'Failed to create user',
        message: data.error || 'Something went wrong.',
        color: 'red',
      })
    }
  }

  useEffect(() => { fetchUsers() }, [])

  return (
    <div>
      <Title order={1} mb="lg">Manage Users</Title>

      <Paper withBorder p="lg" radius="md" mb="xl">
        <Title order={2} mb="md">Create User</Title>
        <Stack>
          <TextInput
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            label="Username"
          />
          <TextInput
            placeholder="Given Name"
            value={givenName}
            onChange={(e) => setGivenName(e.target.value)}
            label="Given Name"
          />
          <TextInput
            placeholder="Family Name"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            label="Family Name"
          />
          <Button onClick={createUser} w="fit-content" color="dark">Create</Button>
        </Stack>
      </Paper>

      <Paper withBorder p="lg" radius="md">
        <Title order={2} mb="md">All Users</Title>
        <Stack gap="sm">
          {users.map((user) => (
            <Paper key={user.id} withBorder p="sm" radius="md">
              <Group>
                <Text fw={600}>{user.username}</Text>
                <Text>—</Text>
                <Text>{user.givenName} {user.familyName}</Text>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </div>
  )
}
