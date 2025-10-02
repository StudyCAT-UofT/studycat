'use client'

export interface User {
  id: string
  username: string
  role: string
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
  } catch (error) {
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
  } catch (error) {
    return { error: 'Network error' }
  }
}

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await fetch('/api/auth/session')
    const data = await response.json()

    if (!response.ok || !data.user) {
      return null
    }

    return data.user
  } catch (error) {
    return null
  }
}
