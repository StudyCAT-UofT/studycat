'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { CourseOffering, getEnrollments } from './client-auth'
import { useAuth } from './auth-context'

interface CourseContextType {
    selectedCourseOffering: CourseOffering | null
    setSelectedCourseOffering: (offering: CourseOffering | null) => void
    courseOfferings: CourseOffering[]
    loading: boolean
    refreshCourseOfferings: () => Promise<void>
}

const CourseContext = createContext<CourseContextType | undefined>(undefined)

const SELECTED_COURSE_KEY = 'selectedCourseOffering'

export const CourseProvider = ({ children }: { children: ReactNode }) => {
    const [selectedCourseOffering, setSelectedCourseOfferingState] = useState<CourseOffering | null>(null)
    const [courseOfferings, setCourseOfferings] = useState<CourseOffering[]>([])
    const [loading, setLoading] = useState(true)
    const [hasLoaded, setHasLoaded] = useState(false)
    const { user, isAuthenticated } = useAuth()

    const loadCourseOfferings = useCallback(async () => {
        if (!isAuthenticated || !user) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const offerings = await getEnrollments()
            setCourseOfferings(offerings)

            // Try to restore selected course from localStorage
            const savedCourseId = localStorage.getItem(SELECTED_COURSE_KEY)
            if (savedCourseId && offerings.length > 0) {
                const savedOffering = offerings.find(offering => offering.id === savedCourseId)
                if (savedOffering) {
                    setSelectedCourseOfferingState(savedOffering)
                } else {
                    // If saved course is not found, select the first one
                    setSelectedCourseOfferingState(offerings[0])
                    localStorage.setItem(SELECTED_COURSE_KEY, offerings[0].id)
                }
            } else if (offerings.length > 0) {
                // If no saved course, select the first one
                setSelectedCourseOfferingState(offerings[0])
                localStorage.setItem(SELECTED_COURSE_KEY, offerings[0].id)
            }
        } catch (error) {
            console.error('Error loading course offerings:', error)
        } finally {
            setLoading(false)
            setHasLoaded(true)
        }
    }, [isAuthenticated, user])

    // Load course offerings when user is available (only once)
    useEffect(() => {
        if (!hasLoaded && isAuthenticated && user) {
            loadCourseOfferings()
        } else if (!isAuthenticated) {
            setLoading(false)
        }
    }, [user, isAuthenticated, hasLoaded, loadCourseOfferings])

    const refreshCourseOfferings = async () => {
        await loadCourseOfferings()
    }

    const setSelectedCourseOffering = (offering: CourseOffering | null) => {
        setSelectedCourseOfferingState(offering)
        if (offering) {
            localStorage.setItem(SELECTED_COURSE_KEY, offering.id)
        } else {
            localStorage.removeItem(SELECTED_COURSE_KEY)
        }
    }

    return (
        <CourseContext.Provider
            value={{
                selectedCourseOffering,
                setSelectedCourseOffering,
                courseOfferings,
                loading,
                refreshCourseOfferings,
            }}
        >
            {children}
        </CourseContext.Provider>
    )
}

export const useCourse = () => {
    const context = useContext(CourseContext)
    if (context === undefined) {
        throw new Error('useCourse must be used within a CourseProvider')
    }
    return context
}
