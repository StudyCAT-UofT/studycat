'use client'

export interface User {
  userId: string
  username: string
}

export const login = async (username: string): Promise<{ user: User } | { error: string }> => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Login failed' }
    }

    return { user: data.user }
  } catch {
    return { error: 'Network error' }
  }
}

export const logout = async (): Promise<{ success: boolean } | { error: string }> => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Logout failed' }
    }

    return { success: true }
  } catch {
    return { error: 'Network error' }
  }
}

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include'
    })
    const data = await response.json()

    if (!response.ok || !data.user) {
      return null
    }

    return data.user
  } catch {
    return null
  }
}

export interface CourseOffering {
  id: string
  display: string
  course: {
    id: string
    code: string
    title: string
  }
  term: {
    id: string
    name: string
  }
  role: string
}

export const getEnrollments = async (): Promise<CourseOffering[]> => {
  try {
    const response = await fetch('/api/enrollments', {
      credentials: 'include'
    })
    const data = await response.json()

    if (!response.ok) {
      console.error('Enrollments API error:', data)
      return []
    }

    return data.courseOfferings || []
  } catch (error) {
    console.error('Enrollments fetch error:', error)
    return []
  }
}
