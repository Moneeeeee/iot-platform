export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          IoT Platform
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Welcome to the IoT Platform Dashboard
        </p>
        <div className="space-x-4">
          <a 
            href="/login" 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Login
          </a>
          <a 
            href="/dashboard" 
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
