import { describe, it, expect, vi, beforeEach } from 'vitest'
import { redirect } from 'next/navigation'
import AdminLayout from './layout'

vi.mock('next/navigation', () => ({
    redirect: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
    getSession: vi.fn(),
    requireAdmin: vi.fn(),
}))

vi.mock('@/components/Admin/AdminShell', () => ({
    AdminShell: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="admin-shell">{children}</div>
    ),
}))

const { getSession, requireAdmin } = await import('@/lib/auth')

describe('AdminLayout', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('redirects to /login when there is no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        await AdminLayout({ children: <div>Content</div> })

        expect(vi.mocked(redirect).mock.calls[0][0]).toBe('/login')
    })

    it('redirects to / when user is not an admin', async () => {
        vi.mocked(getSession).mockResolvedValue({ userId: 'user', username: 'user' })
        vi.mocked(requireAdmin).mockRejectedValue(new Error('Forbidden'))

        await AdminLayout({ children: <div>Content</div> })

        expect(redirect).toHaveBeenCalledWith('/')
        expect(redirect).not.toHaveBeenCalledWith('/login')
    })

    it('renders children for authenticated admin users', async () => {
        vi.mocked(getSession).mockResolvedValue({ userId: 'admin', username: 'admin' })
        vi.mocked(requireAdmin).mockResolvedValue(undefined)

        const result = await AdminLayout({ children: <div data-testid="page-content">Dashboard</div> })

        expect(result).not.toBeNull()
        expect(redirect).not.toHaveBeenCalled()
    })

    it('calls requireAdmin with the correct userId', async () => {
        vi.mocked(getSession).mockResolvedValue({ userId: 'admin', username: 'admin' })
        vi.mocked(requireAdmin).mockResolvedValue(undefined)

        await AdminLayout({ children: <div>Content</div> })

        expect(requireAdmin).toHaveBeenCalledWith('admin')
    })

    it('does not call requireAdmin when there is no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)

        await AdminLayout({ children: <div>Content</div> })

        expect(requireAdmin).not.toHaveBeenCalled()
    })
})
