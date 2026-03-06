import { prisma } from '@/lib/prisma'
import { Title, SimpleGrid, Paper, Text } from '@mantine/core'

export default async function AdminDashboard() {
  const [userCount, offeringCount] = await Promise.all([
    prisma.user.count(),
    prisma.courseOffering.count(),
  ])

  return (
    <div>
      <Title order={2} mb="xl">Admin Dashboard</Title>

      <SimpleGrid cols={2}>
        <Paper withBorder p="xl" radius="md">
          <Text fw={600} size="lg">Total Users</Text>
          <Text size="3rem" fw={700} mt="md">{userCount}</Text>
        </Paper>

        <Paper withBorder p="xl" radius="md">
          <Text fw={600} size="lg">Course Offerings</Text>
          <Text size="3rem" fw={700} mt="md">{offeringCount}</Text>
        </Paper>
      </SimpleGrid>
    </div>
  )
}