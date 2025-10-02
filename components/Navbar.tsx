'use client'

import { useRouter } from 'next/navigation'
import {
    AppShell,
    Group,
    Text,
    Menu,
    UnstyledButton,
    Avatar,
} from '@mantine/core'
import { logout, User } from '@/lib/client-auth'

interface NavbarProps {
    user: User
}

export const Navbar = ({ user }: NavbarProps) => {
    const router = useRouter()

    const handleLogout = async () => {
        const result = await logout()
        if ('success' in result) {
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

                {/* Right side - User menu */}
                <Menu
                    width={200}
                    position="bottom-end"
                    transitionProps={{ transition: 'pop-top-right' }}
                    withinPortal
                >
                    <Menu.Target>
                        <UnstyledButton>
                            <Group gap="xs">
                                <Avatar size="sm" name={user.username} color="initials" />
                                <Text size="sm" fw={500}>
                                    {user.username}
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
        </AppShell.Header>
    )
}
