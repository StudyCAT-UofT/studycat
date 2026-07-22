'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useCourse } from '@/lib/course-context'
import { useRouter } from 'next/navigation'
import { notifications } from '@mantine/notifications'

export default function CourseLayout({ children }: { children: React.ReactNode }) {
    const params = useParams<{ courseCode: string; term: string }>()
    const courseCode = params.courseCode
    const term = params.term ? params.term.replace(/-/g, ' ') : params.term
    const { courseOfferings, setSelectedCourseOffering } = useCourse()
    const router = useRouter()

    useEffect(() => {
        if (!courseCode || !courseOfferings.length) return

        const match = courseOfferings.find(offering => offering.course.code === courseCode && offering.term.name === term)

        if (match) {
            setSelectedCourseOffering(match)
        } else {
            notifications.show({
                title: 'Course not found',
                message: `Course "${courseCode}" not found for ${term}.`,
                color: 'red',
            })
                
            router.replace('/')
        }
    }, [courseCode, term, courseOfferings, router, setSelectedCourseOffering])

    return <>{children}</>

}
