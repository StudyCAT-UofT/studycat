'use client'

import { ReactNode } from 'react'
import { AppShell } from '@mantine/core'
import { Navbar } from '../Navbar'
import { AdminNavbar } from './AdminNavbar'

interface NavLink {
    label: string
    href: string
}

interface AdminShellProps {
    children: ReactNode
    links: NavLink[]
}

export const AdminShell = ({ children, links }: AdminShellProps) => {
    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{ width: 200, breakpoint: 'sm' }}
            padding="xl"
        >
            <Navbar />
            <AdminNavbar links={links} />
            <AppShell.Main bg="gray.1">
                {children}
            </AppShell.Main>
        </AppShell>
    )
}
