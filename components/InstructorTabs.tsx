'use client'

import { Tabs } from '@mantine/core'
import { useRouter, usePathname } from 'next/navigation'
import { useCourse } from '@/lib/course-context'

interface InstructorTabsProps {
    children: React.ReactNode
}

/**
 * Navigation tabs component for instructor/TA interface
 * 
 * Provides tabbed navigation between Dashboard, Question Bank, and Quizzes.
 * Only renders for users with instructor or TA roles for the selected course.
 */
export const InstructorTabs = ({ children }: InstructorTabsProps) => {
    const router = useRouter()
    const pathname = usePathname()
    const { selectedCourseOffering, loading } = useCourse()

    // Check if current user has instructor or TA role for the selected course offering
    const isInstructorOrTA = selectedCourseOffering?.role === 'INSTRUCTOR' || selectedCourseOffering?.role === 'TA'

    // Don't render tabs if user is not instructor/TA or no course is selected
    // Wait for loading to complete to prevent UI flashing
    if (!loading && (!isInstructorOrTA || !selectedCourseOffering)) {
        return <>{children}</>
    }

    /**
     * Determines the current active tab based on the current pathname
     * @returns The tab value that should be active
     */
    const getCurrentTab = () => {
        if (pathname.includes('/question-bank')) {
            return 'question-bank'
        }
        if (pathname.includes('/quizzes')) {
            return 'quizzes'
        }
        return 'dashboard'
    }

    /**
     * Handles tab change events and navigates to the appropriate route
     * @param value - The tab value that was selected
     */
    const handleTabChange = (value: string | null) => {
        if (value === 'question-bank') {
            router.push('/question-bank')
        } else if (value === 'quizzes') {
            router.push('/quizzes')
        } else {
            router.push('/')
        }
    }

    return (
        <Tabs value={getCurrentTab()} onChange={handleTabChange}>
            <Tabs.List>
                <Tabs.Tab value="dashboard">Dashboard</Tabs.Tab>
                <Tabs.Tab value="question-bank">Question Bank</Tabs.Tab>
                <Tabs.Tab value="quizzes">Quizzes</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value={getCurrentTab()} pt="md">
                {children}
            </Tabs.Panel>
        </Tabs>
    )
}
