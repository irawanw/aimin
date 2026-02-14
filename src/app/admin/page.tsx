'use client';

const stats = [
  { label: 'Total Users', value: '1,247', change: '+18%' },
  { label: 'Active Subscriptions', value: '892', change: '+12%' },
  { label: 'Revenue (MTD)', value: 'Rp 142M', change: '+24%' },
  { label: 'AI Messages', value: '2.4M', change: '+31%' },
];

const recentUsers = [
  { name: 'Budi Santoso', email: 'budi@gmail.com', plan: 'pro', status: 'active' },
  { name: 'Siti Rahayu', email: 'siti@gmail.com', plan: 'lite', status: 'active' },
  { name: 'Ahmad Dani', email: 'ahmad@gmail.com', plan: 'lite', status: 'suspended' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-dark rounded-2xl p-5">
            <div className="text-sm text-gray-400">{s.label}</div>
            <div className="mt-1 text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-green-400 font-medium">{s.change}</div>
          </div>
        ))}
      </div>
      <div className="glass-dark rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Recent Users</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-500 border-b border-gray-800"><th className="text-left pb-2">Name</th><th className="text-left pb-2">Email</th><th className="text-left pb-2">Plan</th><th className="text-left pb-2">Status</th></tr></thead>
          <tbody className="divide-y divide-gray-800">
            {recentUsers.map((u) => (
              <tr key={u.email}>
                <td className="py-3 text-gray-200">{u.name}</td>
                <td className="py-3 text-gray-400 font-mono text-xs">{u.email}</td>
                <td className="py-3"><span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full uppercase">{u.plan}</span></td>
                <td className="py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{u.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
