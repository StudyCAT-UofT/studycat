import { prisma } from '@/lib/prisma'

export default async function AdminDashboard() {
  const [userCount, offeringCount] = await Promise.all([
    prisma.user.count(),
    prisma.courseOffering.count(),
  ])

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-lg font-semibold">Total Users</h2>
          <p className="text-3xl mt-4">{userCount}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-lg font-semibold">Course Offerings</h2>
          <p className="text-3xl mt-4">{offeringCount}</p>
        </div>
      </div>
    </div>
  )
}