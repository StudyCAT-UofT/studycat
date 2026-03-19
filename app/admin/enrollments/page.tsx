'use client'

import { useEffect, useState } from 'react'
import { Title, Select, Button, Paper, Stack, Group, Text, Loader } from '@mantine/core'
import { notifications } from '@mantine/notifications'

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
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(false)
  const [newUserId, setNewUserId] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<string | null>('STUDENT')

  async function fetchData() {
    const [offeringsRes, usersRes] = await Promise.all([
      fetch('/api/admin/offerings'),
      fetch('/api/admin/users'),
    ])
    setOfferings((await offeringsRes.json()).offerings || [])
    setUsers((await usersRes.json()).users || [])
  }

  async function fetchEnrollments() {
    if (!selectedOfferingId) return
    setLoading(true)
    const res = await fetch(`/api/admin/enrollments?offeringId=${selectedOfferingId}`)
    const data = await res.json()
    if (res.ok) {
      setEnrollments(data.enrollments)
    } else {
      notifications.show({
        title: 'Failed to load enrollments',
        message: data.error || 'Something went wrong.',
        color: 'red',
      })
    }
    setLoading(false)
  }

  async function createEnrollment() {
    if (!selectedOfferingId || !newUserId) {
      notifications.show({
        title: 'Missing fields',
        message: 'Please select both an offering and a user.',
        color: 'yellow',
      })
      return
    }
    const res = await fetch('/api/admin/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: newUserId, offeringId: selectedOfferingId, offeringRole: newRole }),
    })
    const data = await res.json()
    if (res.ok) {
      const enrolledUser = users.find((u) => u.id === newUserId)
      notifications.show({
        title: 'Enrollment created',
        message: `${enrolledUser?.username} was enrolled as ${newRole}.`,
        color: 'green',
      })
      setNewUserId(null)
      setNewRole('STUDENT')
      fetchEnrollments()
    } else {
      notifications.show({
        title: 'Failed to create enrollment',
        message: data.error || 'Something went wrong.',
        color: 'red',
      })
    }
  }

  async function deleteEnrollment(userId: string) {
    const res = await fetch('/api/admin/enrollments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, offeringId: selectedOfferingId }),
    })
    const data = await res.json()
    if (res.ok) {
      notifications.show({
        title: 'Enrollment removed',
        message: 'The user has been unenrolled.',
        color: 'orange',
      })
      fetchEnrollments()
    } else {
      notifications.show({
        title: 'Failed to remove enrollment',
        message: data.error || 'Something went wrong.',
        color: 'red',
      })
    }
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div>
      <Title order={1} mb="lg">Manage Enrollments</Title>

      <Paper withBorder p="lg" radius="md" mb="lg">
        <Stack>
          <Select
            placeholder="Select Course Offering"
            value={selectedOfferingId}
            onChange={setSelectedOfferingId}
            data={offerings.map((o) => ({ value: o.id, label: o.display }))}
            label="Select Course Offering"
          />
          <Button onClick={fetchEnrollments} w="fit-content" color="dark">Load Enrollments</Button>
        </Stack>
      </Paper>

      {selectedOfferingId && (
        <Paper withBorder p="lg" radius="md" mb="xl">
          <Title order={2} mb="md">Add Enrollment</Title>
          <Stack>
            <Select
              placeholder="Select User"
              value={newUserId}
              onChange={setNewUserId}
              data={users.map((u) => ({ value: u.id, label: u.username }))}
              searchable
              label="Select User"
            />
            <Select
              value={newRole}
              onChange={setNewRole}
              data={['STUDENT', 'INSTRUCTOR', 'TA']}
              label="Select Role"
            />
            <Button onClick={createEnrollment} color="green" variant="light" w="fit-content">Assign</Button>
          </Stack>
        </Paper>
      )}

      {loading && <Loader size="sm" />}

      {!loading && enrollments.length > 0 && (
        <Stack gap="sm">
          {enrollments.map((e) => (
            <Paper key={e.userId} withBorder p="sm" radius="md">
              <Group justify="space-between">
                <Text>
                  {e.user.username}{' '}
                  <Text span>({e.offeringRole})</Text>
                </Text>
                <Button color="red" variant="light" size="xs" onClick={() => deleteEnrollment(e.userId)}>
                  Remove
                </Button>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}

      {!loading && selectedOfferingId && enrollments.length === 0 && (
        <Text>No enrollments found for this offering.</Text>
      )}
    </div>
  )
}
