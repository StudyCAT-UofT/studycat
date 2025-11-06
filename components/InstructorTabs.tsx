'use client'

import { Tabs } from '@mantine/core'
import { useRouter, usePathname } from 'next/navigation'
import { useCourse } from '@/lib/course-context'

interface InstructorTabsProps {
    children: React.ReactNode
}

interface TabConfig {
    value: string
    label: string
    route: string
}

/**
 * Tab configuration for instructor/TA interface
 * 
 * To add a new tab, simply add a new entry to this array with:
 * - value: unique identifier for the tab
 * - label: display name shown in the UI
 * - pathPattern: string pattern to match in pathname (e.g., '/question-bank')
 * - route: route to navigate to when tab is clicked
 */
const TAB_CONFIGS: TabConfig[] = [
    {
        value: 'dashboard',
        label: 'Dashboard',
        route: '/'
    },
    {
        value: 'question-bank',
        label: 'Question Bank',
        route: '/question-bank'
    },
    {
        value: 'quizzes',
        label: 'Quizzes',
        route: '/quizzes'
    },
    {
        value: 'students',
        label: 'Students',
        route: '/students'
    }
]

/**
 * Navigation tabs component for instructor/TA interface
 * 
 * Provides tabbed navigation between Dashboard, Question Bank, Quizzes, and Students.
 * Only renders for users with instructor or TA roles for the selected course.
 * 
 * The tabs are configured via the TAB_CONFIGS array, making it easy to add or modify tabs.
 */
export const InstructorTabs = ({ children }: InstructorTabsProps) => {
    const router = useRouter()
    const pathname = usePathname()
    const { selectedCourseOffering, loading } = useCourse()

    // Check if current user has instructor or TA role for the selected course offering
    const isInstructorOrTA = selectedCourseOffering?.role === 'INSTRUCTOR' || selectedCourseOffering?.role === 'TA'

    // Don't render tabs if user is not instructor/TA or no course is selected
    // Hide tabs by default to prevent UI flashing, only show when confirmed instructor/TA
    if (loading || !isInstructorOrTA || !selectedCourseOffering) {
        return <>{children}</>
    }

    /**
     * Determines the current active tab based on the current pathname
     * Checks each tab config's pathPattern to find a match
     * @returns The tab value that should be active
     */
    const getCurrentTab = (): string => {
        // Special case: if pathname is exactly '/', return dashboard
        if (pathname === '/') {
            return TAB_CONFIGS[0]?.value || 'dashboard'
        }

        // Find the first tab config that matches the current pathname
        // Check all tabs except dashboard (index 0) first to avoid false matches
        const nonDashboardTabs = TAB_CONFIGS.slice(1)
        const matchingTab = nonDashboardTabs.find(tab => pathname.includes(tab.route))

        // If a non-dashboard tab matches, return it
        if (matchingTab) {
            return matchingTab.value
        }

        // Default to dashboard if no other match
        return TAB_CONFIGS[0]?.value || 'dashboard'
    }

    /**
     * Handles tab change events and navigates to the appropriate route
     * Uses the tab config to find the corresponding route
     * @param value - The tab value that was selected
     */
    const handleTabChange = (value: string | null) => {
        if (!value) return

        // Find the tab config for the selected value
        const selectedTab = TAB_CONFIGS.find(tab => tab.value === value)

        if (selectedTab) {
            router.push(selectedTab.route)
        } else {
            // Fallback to dashboard if tab not found
            router.push('/')
        }
    }

    const currentTab = getCurrentTab()

    return (
        <Tabs value={currentTab} onChange={handleTabChange}>
            <Tabs.List>
                {TAB_CONFIGS.map(tab => (
                    <Tabs.Tab key={tab.value} value={tab.value}>
                        {tab.label}
                    </Tabs.Tab>
                ))}
            </Tabs.List>
            <Tabs.Panel value={currentTab} pt="md">
                {children}
            </Tabs.Panel>
        </Tabs>
    )
}
