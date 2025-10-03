'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { CourseOffering, getEnrollments, getCurrentUser, User } from './client-auth'

interface CourseContextType {
    selectedCourseOffering: CourseOffering | null
    setSelectedCourseOffering: (offering: CourseOffering | null) => void
    courseOfferings: CourseOffering[]
    loading: boolean
}

const CourseContext = createContext<CourseContextType | undefined>(undefined)

const SELECTED_COURSE_KEY = 'selectedCourseOffering'

export const CourseProvider = ({ children }: { children: ReactNode }) => {
    const [selectedCourseOffering, setSelectedCourseOfferingState] = useState<CourseOffering | null>(null)
    const [courseOfferings, setCourseOfferings] = useState<CourseOffering[]>([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<User | null>(null)

    // First check if user is authenticated
    useEffect(() => {
        const checkUser = async () => {
            try {
                const currentUser = await getCurrentUser()
                setUser(currentUser)
            } catch (error) {
                console.error('Error checking user:', error)
                setUser(null)
            }
        }
        checkUser()
    }, [])

    // Load course offerings when user is available
    useEffect(() => {
        if (!user) {
            setLoading(false)
            return
        }

        const loadCourseOfferings = async () => {
            try {
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
            }
        }

        loadCourseOfferings()
    }, [user])

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
