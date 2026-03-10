'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, User } from './client-auth'

interface AuthContextType {
    user: User | null
    loading: boolean
    isAuthenticated: boolean
    isAdmin: boolean | null // null while loading
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
    children: ReactNode
    requireAuth?: boolean
}

export const AuthProvider = ({ children, requireAuth = false }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null)
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null) // null = loading
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const refreshUser = useCallback(async () => {
        setLoading(true)
        try {
            const currentUser = await getCurrentUser()
            setUser(currentUser)

            // Fetch admin status
            let admin = false
            if (currentUser) {
                try {
                    const res = await fetch('/api/admin/status')
                    if (!res.ok) throw new Error('Failed to fetch admin status')
                    const data = await res.json()
                    admin = !!data.admin
                } catch (err) {
                    console.error('Failed to get admin status:', err)
                }
            }
            setIsAdmin(admin)

            // Redirect if auth is required
            if (requireAuth && !currentUser) {
                router.push('/login')
            }
        } catch (error) {
            console.error('Error refreshing user:', error)
            setUser(null)
            setIsAdmin(false)
            if (requireAuth) {
                router.push('/login')
            }
        } finally {
            setLoading(false)
        }
    }, [requireAuth, router])

    useEffect(() => {
        refreshUser()
    }, [refreshUser])

    const value: AuthContextType = {
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin,
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
