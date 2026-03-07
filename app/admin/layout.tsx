import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getSession, requireAdmin } from '@/lib/auth'
import { AdminShell } from '@/components/Admin/AdminShell'

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
    { label: 'StudyCAT Home', href: '/' },
    { label: 'Dashboard', href: '/admin' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Terms', href: '/admin/terms' },
    { label: 'Courses', href: '/admin/courses' },
    { label: 'Offerings', href: '/admin/offerings' },
    { label: 'Enrollments', href: '/admin/enrollments' },
  ]

  return (
    <AdminShell links={links}>
      {children}
    </AdminShell>
  )
}