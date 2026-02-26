import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getSession, requireAdmin } from '@/lib/auth'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  try {
    await requireAdmin(session.userId)
  } catch {
    redirect('/')
  }

  const links = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Terms', href: '/admin/terms' },
    { label: 'Courses', href: '/admin/courses' },
    { label: 'Offerings', href: '/admin/offerings' },
    { label: 'Enrollments', href: '/admin/enrollments' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Full-Width Sticky Navbar */}
      <header className="w-full bg-blue-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold">Admin Panel</div>
          <nav className="flex space-x-6">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-gray-200 transition font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  )
}