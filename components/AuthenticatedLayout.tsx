'use client'

import { AppShell } from '@mantine/core'
import { Navbar } from './Navbar'
import { User } from '@/lib/client-auth'

interface AuthenticatedLayoutProps {
    children: React.ReactNode
    user: User
}

export const AuthenticatedLayout = ({ children, user }: AuthenticatedLayoutProps) => {
    return (
        <AppShell
            header={{ height: 60 }}
            padding="md"
        >
            <Navbar user={user} />
            <AppShell.Main>
                {children}
            </AppShell.Main>
        </AppShell>
    )
}
