'use client'

import { useEffect, useState } from 'react'
import { Title, TextInput, Button, Paper, Stack, Group, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'

type Course = { id: string; code: string; title: string }

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [invalidCode, setInvalidCode] = useState('')

  async function fetchCourses() {
    const res = await fetch('/api/admin/courses')
    const data = await res.json()
    setCourses(data.courses)
  }

  async function createCourse() {
    const res = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, title }),
    })
    if (res.ok) {
      notifications.show({
        title: 'Course created',
        message: `${code} — ${title} was added successfully.`,
        color: 'green',
      })
      setCode('')
      setTitle('')
      fetchCourses()
    } else {
      const data = await res.json()
      notifications.show({
        title: 'Failed to create course',
        message: data.error || 'Something went wrong.',
        color: 'red',
      })
    }
  }

  useEffect(() => { fetchCourses() }, [])

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCode(value);

    if (value && !/^[a-zA-Z0-9]+$/.test(value)) {
        setInvalidCode("Course code can only contain letters and numbers.");
    } else {
        setInvalidCode(""); // Clear the error if it's valid
    }
  }

  return (
    <div>
      <Title order={1} mb="lg">Courses</Title>

      <Paper withBorder p="lg" radius="md" mb="xl">
        <Stack>
          <TextInput
            label="Course Code"
            placeholder="Course Code (e.g. CSC309)"
            value={code}
            onChange={handleCodeChange}
            error={invalidCode}
          />
          <TextInput
            label="Course Title"
            placeholder="Course Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button onClick={createCourse} disabled={!!invalidCode} w="fit-content" color='dark'>Create Course</Button>
        </Stack>
      </Paper>

      <Stack gap="sm">
        {courses.map((course) => (
          <Paper key={course.id} withBorder p="sm" radius="md">
            <Group>
              <Text fw={600}>{course.code}</Text>
              <Text>—</Text>
              <Text>{course.title}</Text>
            </Group>
          </Paper>
        ))}
      </Stack>
    </div>
  )
}
