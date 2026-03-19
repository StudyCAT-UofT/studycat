'use client'

import { Card, Stack, Text, Badge, Group, Title } from '@mantine/core'
import { CourseOffering } from '@/lib/client-auth'

interface CourseCardProps {
    courseOffering: CourseOffering
    onClick: () => void
}

/**
 * Get badge color based on user role
 */
const getRoleBadgeColor = (role: string): string => {
    switch (role.toUpperCase()) {
        case 'INSTRUCTOR':
            return 'blue'
        case 'TA':
            return 'teal'
        case 'STUDENT':
            return 'gray'
        default:
            return 'gray'
    }
}

/**
 * Format role for display (capitalize first letter, lowercase rest)
 */
const formatRole = (role: string): string => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
}

/**
 * Course selection card in MarkUs style
 *
 * Displays:
 * - Course code prominently (from display field)
 * - Course title below
 * - Role badge in top-right corner
 */
export const CourseCard = ({ courseOffering, onClick }: CourseCardProps) => {
    const { course, role, display } = courseOffering

    return (
        <Card
            withBorder
            padding="xl"
            radius="md"
            shadow="sm"
            onClick={onClick}
            style={{ cursor: 'pointer', transition: 'box-shadow 0.2s ease, transform 0.2s ease', minHeight: 180 }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = ''
                e.currentTarget.style.transform = ''
            }}
        >
            <Stack gap="md">
                {/* Top row: Role badge positioned to the right */}
                <Group justify="flex-end">
                    <Badge
                        variant="light"
                        color={getRoleBadgeColor(role)}
                        size="sm"
                    >
                        {formatRole(role)}
                    </Badge>
                </Group>

                {/* Course code - large and prominent */}
                <Title order={2} size="1.5rem" fw={700} c="blue">
                    {display}
                </Title>

                {/* Course title */}
                <Text size="lg" lineClamp={2}>
                    {course.title}
                </Text>
            </Stack>
        </Card>
    )
}

export default CourseCard
