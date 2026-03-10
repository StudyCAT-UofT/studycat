'use client'

import { useEffect, useState } from 'react'
import { Title, TextInput, Button, Paper, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'

type Term = { id: string; name: string }

export default function TermsPage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [name, setName] = useState('')

  async function fetchTerms() {
    const res = await fetch('/api/admin/terms')
    const data = await res.json()
    setTerms(data.terms)
  }

  async function createTerm() {
    const res = await fetch('/api/admin/terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      notifications.show({
        title: 'Term created',
        message: `${name} was added successfully.`,
        color: 'green',
      })
      setName('')
      fetchTerms()
    } else {
      const data = await res.json()
      notifications.show({
        title: 'Failed to create term',
        message: data.error || 'Something went wrong.',
        color: 'red',
      })
    }
  }

  useEffect(() => { fetchTerms() }, [])

  return (
    <div>
      <Title order={2} mb="lg">Terms</Title>

      <Paper withBorder p="lg" radius="md" mb="xl">
        <Stack>
          <TextInput
            placeholder="Term Name (e.g. Fall 2026)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button onClick={createTerm} w="fit-content">Create Term</Button>
        </Stack>
      </Paper>

      <Stack gap="sm">
        {terms.map((term) => (
          <Paper key={term.id} withBorder p="sm" radius="md">
            <Text>{term.name}</Text>
          </Paper>
        ))}
      </Stack>
    </div>
  )
}
