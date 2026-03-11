'use client'

import { usePathname } from 'next/navigation'
import {
    AppShell,
    Stack,
    Text,
    Anchor,
    Divider,
} from '@mantine/core'

interface NavLink {
    label: string
    href: string
}

interface AdminNavbarProps {
    links: NavLink[]
}

export const AdminNavbar = ({ links }: AdminNavbarProps) => {
    const pathname = usePathname()

    return (
        <AppShell.Navbar p="md">
            <Text size="xs" fw={700} tt="uppercase" mb="xs">
                Admin
            </Text>
            <Divider mb="sm" />
            <Stack gap={4}>
                {links.map((link) => {
                    const isActive = pathname === link.href

                    return (
                        <Anchor
                            key={link.href}
                            href={link.href}
                            fw={isActive ? 600 : 400}
                            underline="never"
                            c={'dark'}
                            px="sm"
                            py={6}
                            style={{
                                borderRadius: 6,
                                backgroundColor: isActive ? 'var(--mantine-color-blue-0)' : 'transparent',
                                transition: 'background-color 150ms ease',
                                display: 'block',
                            }}
                        >
                            {link.label}
                        </Anchor>
                    )
                })}
            </Stack>
        </AppShell.Navbar>
    )
}
