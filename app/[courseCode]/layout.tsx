'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useCourse } from '@/lib/course-context'
import { useRouter } from 'next/navigation'
import { notifications } from '@mantine/notifications'

export default function CourseLayout({ children }: { children: React.ReactNode }) {
    const { courseCode } = useParams<{ courseCode: string }>()
    const { courseOfferings, setSelectedCourseOffering } = useCourse()
    const router = useRouter()

    useEffect(() => {
        if (!courseCode || !courseOfferings.length) return

        const match = courseOfferings.find(offering => offering.course.code === courseCode)

        if (match) {
            setSelectedCourseOffering(match)
        } else {
            notifications.show({
                title: 'Course not found',
                message: `"${courseCode}" is not a valid course code.`,
                color: 'red',
            })
                
            router.replace('/')
        }
    }, [courseCode, courseOfferings])

    return <>{children}</>

}