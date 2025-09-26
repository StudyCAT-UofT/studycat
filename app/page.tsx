'use client'

import { useEffect, useState } from 'react'
import { Button, Container, Group, Stack, Text, TextInput, Title, Card } from '@mantine/core'

type User = { id: string; email: string; name?: string | null; createdAt: string }

export default function HomePage() {
    const [users, setUsers] = useState<User[]>([])
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')

    const fetchUsers = async () => {
        const res = await fetch('/api/users', { cache: 'no-store' })
        const data = await res.json()
        setUsers(data.users ?? [])
    }

    const createUser = async () => {
        const res = await fetch('/api/users', {
            method: 'POST',
            body: JSON.stringify({ email, name }),
            headers: { 'Content-Type': 'application/json' },
        })
        if (res.ok) {
            setEmail('')
            setName('')
            fetchUsers()
        } else {
            alert('Failed to create user')
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    return (
        <Container size="sm" py="xl">
            <Stack gap="lg">
                <Title order={2}>StudyCAT</Title>
                <Card withBorder padding="lg" radius="md">
                    <Stack>
                        <TextInput label="Email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
                        <TextInput label="Name" placeholder="Enter your name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
                        <Group>
                            <Button onClick={createUser}>Create user</Button>
                            <Button variant="light" onClick={fetchUsers}>Refresh</Button>
                        </Group>
                    </Stack>
                </Card>

                <Stack gap="sm">
                    <Text fw={600}>Users</Text>
                    {users.length === 0 && <Text c="dimmed">No users yet.</Text>}
                    {users.map((u) => (
                        <Card key={u.id} withBorder padding="md" radius="md">
                            <Group justify="space-between">
                                <Text>{u.name ?? 'Unnamed'}</Text>
                                <Text c="dimmed">{u.email}</Text>
                            </Group>
                        </Card>
                    ))}
                </Stack>
            </Stack>
        </Container>
    )
}
