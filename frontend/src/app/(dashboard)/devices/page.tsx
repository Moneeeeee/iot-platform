export default function DevicesPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Devices</h1>
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Device Management</h2>
            <p className="text-gray-600">Manage and monitor your IoT devices</p>
            <div className="mt-6">
              <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Add Device
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}