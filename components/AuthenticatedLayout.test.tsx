import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthenticatedLayout } from './AuthenticatedLayout'
import { AuthProvider } from '@/lib/auth-context'
import { CourseProvider } from '@/lib/course-context'

// Mock the dependencies
vi.mock('@/lib/auth-context', () => ({
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
    useAuth: () => ({
        user: { id: '1', username: 'testuser', name: 'Test User' },
        loading: false,
        isAuthenticated: true,
        refreshUser: vi.fn(),
    }),
}))

vi.mock('@/lib/course-context', () => ({
    CourseProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="course-provider">{children}</div>,
    useCourse: () => ({
        selectedCourseOffering: null,
        setSelectedCourseOffering: vi.fn(),
        courseOfferings: [],
        loading: false,
        refreshCourseOfferings: vi.fn(),
    }),
}))

vi.mock('./Navbar', () => ({
    Navbar: () => <div data-testid="navbar">Navbar</div>,
}))

vi.mock('./InstructorTabs', () => ({
    InstructorTabs: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="instructor-tabs">{children}</div>
    ),
}))

vi.mock('@mantine/core', async () => {
    const actual = await vi.importActual('@mantine/core')
    const AppShellComponent = ({ children }: { children: React.ReactNode }) => (
        <div data-testid="app-shell">{children}</div>
    )
    AppShellComponent.displayName = 'AppShell'
    const AppShellMain = ({ children }: { children: React.ReactNode }) => (
        <div data-testid="app-shell-main">{children}</div>
    )
    AppShellMain.displayName = 'AppShell.Main'
    AppShellComponent.Main = AppShellMain
    return {
        ...actual,
        AppShell: AppShellComponent,
    }
})

describe('AuthenticatedLayout', () => {
    it('renders children correctly', () => {
        const testContent = <div data-testid="test-content">Test Content</div>

        render(
            <AuthProvider>
                <CourseProvider>
                    <AuthenticatedLayout>{testContent}</AuthenticatedLayout>
                </CourseProvider>
            </AuthProvider>
        )

        expect(screen.getByTestId('test-content')).toBeInTheDocument()
        expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('renders Navbar component', () => {
        render(
            <AuthProvider>
                <CourseProvider>
                    <AuthenticatedLayout>
                        <div>Content</div>
                    </AuthenticatedLayout>
                </CourseProvider>
            </AuthProvider>
        )

        expect(screen.getByTestId('navbar')).toBeInTheDocument()
    })

    it('renders InstructorTabs component', () => {
        render(
            <AuthProvider>
                <CourseProvider>
                    <AuthenticatedLayout>
                        <div>Content</div>
                    </AuthenticatedLayout>
                </CourseProvider>
            </AuthProvider>
        )

        expect(screen.getByTestId('instructor-tabs')).toBeInTheDocument()
    })

    it('wraps children in CourseProvider', () => {
        render(
            <AuthProvider>
                <CourseProvider>
                    <AuthenticatedLayout>
                        <div data-testid="child">Child Content</div>
                    </AuthenticatedLayout>
                </CourseProvider>
            </AuthProvider>
        )

        expect(screen.getByTestId('child')).toBeInTheDocument()
    })
})

