'use client';

const logs = [
  { id: 1, customer: '+62812xxx', preview: 'Halo, saya mau tanya soal produk...', time: '2 min ago', status: 'resolved' },
  { id: 2, customer: '+62813xxx', preview: 'Apakah bisa COD?', time: '15 min ago', status: 'active' },
  { id: 3, customer: '+62857xxx', preview: 'Berapa harga untuk wholesale?', time: '1 hour ago', status: 'resolved' },
  { id: 4, customer: '+62878xxx', preview: 'Kapan barang sampai?', time: '2 hours ago', status: 'escalated' },
];

export default function ChatLogsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Chat Logs</h2>
      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Message</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Time</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{log.customer}</td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-xs">{log.preview}</td>
                <td className="px-4 py-3 text-gray-500">{log.time}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${log.status === 'resolved' ? 'bg-green-100 text-green-700' : log.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{log.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
