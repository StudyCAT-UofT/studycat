'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, User } from './client-auth'

interface AuthContextType {
    user: User | null
    loading: boolean
    isAuthenticated: boolean
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
    children: ReactNode
    requireAuth?: boolean
}

export const AuthProvider = ({ children, requireAuth = false }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const refreshUser = async () => {
        try {
            const currentUser = await getCurrentUser()
            setUser(currentUser)

            // If authentication is required and no user is found, redirect to login
            if (requireAuth && !currentUser) {
                router.push('/login')
            }
        } catch (error) {
            console.error('Error refreshing user:', error)
            setUser(null)

            if (requireAuth) {
                router.push('/login')
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refreshUser()
    }, [])

    const value: AuthContextType = {
        user,
        loading,
        isAuthenticated: !!user,
        refreshUser,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
