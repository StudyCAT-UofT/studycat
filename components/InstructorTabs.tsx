'use client'

import { Tabs } from '@mantine/core'
import { useRouter, usePathname } from 'next/navigation'
import { useCourse } from '@/lib/course-context'

interface InstructorTabsProps {
    children: React.ReactNode
}

export const InstructorTabs = ({ children }: InstructorTabsProps) => {
    const router = useRouter()
    const pathname = usePathname()
    const { selectedCourseOffering, loading } = useCourse()

    // Check if current user is instructor or TA for the selected course offering
    const isInstructorOrTA = selectedCourseOffering?.role === 'INSTRUCTOR' || selectedCourseOffering?.role === 'TA'

    // Don't render tabs if user is not instructor/TA or no course is selected
    // But only after loading is complete to prevent flashing
    if (!loading && (!isInstructorOrTA || !selectedCourseOffering)) {
        return <>{children}</>
    }

    // Determine current tab based on pathname
    const getCurrentTab = () => {
        if (pathname.includes('/question-bank')) {
            return 'question-bank'
        }
        return 'dashboard'
    }

    const handleTabChange = (value: string | null) => {
        if (value === 'question-bank') {
            router.push('/question-bank')
        } else {
            router.push('/')
        }
    }

    return (
        <Tabs value={getCurrentTab()} onChange={handleTabChange}>
            <Tabs.List>
                <Tabs.Tab value="dashboard">Dashboard</Tabs.Tab>
                <Tabs.Tab value="question-bank">Question Bank</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value={getCurrentTab()} pt="md">
                {children}
            </Tabs.Panel>
        </Tabs>
    )
}
