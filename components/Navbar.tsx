'use client'

import { useRouter } from 'next/navigation'
import {
    AppShell,
    Group,
    Text,
    Menu,
    UnstyledButton,
    Avatar,
    Select,
    Skeleton,
} from '@mantine/core'
import { logout } from '@/lib/client-auth'
import { useCourse } from '@/lib/course-context'
import { useAuth } from '@/lib/auth-context'

export const Navbar = () => {
    const router = useRouter()
    const { user, refreshUser } = useAuth()
    const { selectedCourseOffering, setSelectedCourseOffering, courseOfferings, loading } = useCourse()

    const handleLogout = async () => {
        const result = await logout()
        if ('success' in result) {
            await refreshUser()
            router.push('/login')
        }
    }

    return (
        <AppShell.Header>
            <Group h="100%" px="md" justify="space-between">
                {/* Left side - StudyCAT branding */}
                <Group>
                    <Text size="xl" fw={700}>
                        StudyCAT
                    </Text>
                </Group>

                {/* Right side - Course offering selector and User menu */}
                <Group gap="md">
                    {/* Course offering selector */}
                    {loading ? (
                        <Skeleton height={36} width={300} radius="sm" />
                    ) : courseOfferings.length > 0 ? (
                        <Select
                            value={selectedCourseOffering?.id || null}
                            onChange={(value) => {
                                const offering = courseOfferings.find(o => o.id === value)
                                setSelectedCourseOffering(offering || null)
                            }}
                            data={courseOfferings.map(offering => ({
                                value: offering.id,
                                label: offering.display,
                            }))}
                            placeholder="Select course"
                            size="sm"
                            w={300}
                            searchable
                        />
                    ) : (
                        <Text size="sm" c="dimmed">
                            No courses available
                        </Text>
                    )}

                    {/* User menu */}
                    <Menu
                        width={200}
                        position="bottom-end"
                        transitionProps={{ transition: 'pop-top-right' }}
                        withinPortal
                    >
                        <Menu.Target>
                            <UnstyledButton>
                                <Group gap="xs">
                                    <Avatar size="sm" name={user?.username} color="initials" />
                                    <Text size="sm" fw={500}>
                                        {user?.username}
                                    </Text>
                                </Group>
                            </UnstyledButton>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item onClick={handleLogout}>
                                Logout
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Group>
        </AppShell.Header>
    )
}
