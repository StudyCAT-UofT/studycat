'use client'

import { AppShell } from '@mantine/core'
import { Navbar } from './Navbar'
import { InstructorTabs } from './InstructorTabs'
import { CourseProvider } from '@/lib/course-context'

interface AuthenticatedLayoutProps {
    children: React.ReactNode
}

export const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
    return (
        <CourseProvider>
            <AppShell
                header={{ height: 60 }}
                padding="md"
            >
                <Navbar />
                <AppShell.Main>
                    <InstructorTabs>
                        {children}
                    </InstructorTabs>
                </AppShell.Main>
            </AppShell>
        </CourseProvider>
    )
}
