'use client'

import { useEffect, useState } from 'react'
import {
  Title, Select, TextInput, Button, Paper, Stack, Group, Text
} from '@mantine/core'

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
  const [courseId, setCourseId] = useState<string | null>(null)
  const [termId, setTermId] = useState<string | null>(null)
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

  useEffect(() => { fetchAll() }, [])

  return (
    <div>
      <Title order={2} mb="lg">Course Offerings</Title>

      <Paper withBorder p="lg" radius="md" mb="xl">
        <Stack>
          <Select
            placeholder="Select Course"
            value={courseId}
            onChange={setCourseId}
            data={courses.map((c) => ({ value: c.id, label: c.code }))}
          />
          <Select
            placeholder="Select Term"
            value={termId}
            onChange={setTermId}
            data={terms.map((t) => ({ value: t.id, label: t.name }))}
          />
          <TextInput
            placeholder="Display Name"
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
          />
          <Button onClick={createOffering} w="fit-content">
            Create Offering
          </Button>
        </Stack>
      </Paper>

      <Stack gap="sm">
        {offerings.map((o) => (
          <Paper key={o.id} withBorder p="sm" radius="md">
            <Group>
              <Text fw={600}>{o.display}</Text>
              <Text c="dimmed">—</Text>
              <Text>{o.course.code}</Text>
              <Text c="dimmed">({o.term.name})</Text>
            </Group>
          </Paper>
        ))}
      </Stack>
    </div>
  )
}