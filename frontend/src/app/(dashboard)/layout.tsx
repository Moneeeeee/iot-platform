export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">IoT Platform</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-gray-700 hover:text-gray-900">Dashboard</a>
              <a href="/devices" className="text-gray-700 hover:text-gray-900">Devices</a>
              <a href="/login" className="text-gray-700 hover:text-gray-900">Logout</a>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}