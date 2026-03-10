'use client'

import { useRouter, usePathname } from 'next/navigation'
import {
    AppShell,
    Group,
    Text,
    Menu,
    UnstyledButton,
    Avatar,
    Select,
    Skeleton,
    Button,
} from '@mantine/core'
import { logout } from '@/lib/client-auth'
import { useCourse } from '@/lib/course-context'
import { useAuth } from '@/lib/auth-context'
import { useState, useEffect } from 'react'

export const Navbar = () => {
    const router = useRouter()
    const pathname = usePathname()
    const { user, refreshUser } = useAuth()
    const { selectedCourseOffering, setSelectedCourseOffering, courseOfferings, loading } = useCourse()

    // Hide course picker on dashboard (course selection page)
    const showCoursePicker = pathname !== '/' && !pathname.startsWith('/admin')

    // Admin status state
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

    // Fetch admin status on mount
    useEffect(() => {
        async function fetchAdminStatus() {
            try {
                const res = await fetch('/api/admin/status')
                if (!res.ok) throw new Error('Failed to fetch admin status')
                const data = await res.json()
                setIsAdmin(data.admin)
            } catch (err) {
                console.error('Failed to fetch admin status:', err)
                setIsAdmin(false)
            }
        }
        fetchAdminStatus()
    }, [])

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
                {/* Left side - StudyCAT branding (clickable to go to dashboard) */}
                <Group>
                    <Text
                        size="xl"
                        fw={700}
                        style={{ cursor: 'pointer' }}
                        onClick={() => router.push('/')}
                    >
                        StudyCAT
                    </Text>
                </Group>

                {/* Right side - Course offering selector, Admin button, User menu */}
                <Group gap="md">
                    {/* Course offering selector (hidden on dashboard) */}
                    {showCoursePicker && (
                        loading ? (
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
                        )
                    )}

                    {/* Admin button */}
                    {isAdmin && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push('/admin')}
                        >
                            Admin Dashboard
                        </Button>
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
