'use client';

const users = [
  { id: '1', name: 'Admin', email: 'admin@aiminassist.com', role: 'admin', plan: 'pro', status: 'active' },
  { id: '2', name: 'Demo User', email: 'user@aiminassist.com', role: 'user', plan: 'lite', status: 'active' },
  { id: '3', name: 'Budi Santoso', email: 'budi@gmail.com', role: 'user', plan: 'pro', status: 'active' },
  { id: '4', name: 'Siti Rahayu', email: 'siti@gmail.com', role: 'user', plan: 'lite', status: 'suspended' },
];

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">User Management</h2>
        <input placeholder="Search users..." className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500" />
      </div>
      <div className="glass-dark rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-gray-500 border-b border-gray-800"><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Plan</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Actions</th></tr></thead>
          <tbody className="divide-y divide-gray-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 text-gray-200 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{u.email}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-gray-600/40 text-gray-300'}`}>{u.role}</span></td>
                <td className="px-4 py-3"><span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full uppercase">{u.plan}</span></td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{u.status}</span></td>
                <td className="px-4 py-3"><div className="flex gap-2"><button className="text-xs text-brand-400 hover:underline">Edit</button><button className="text-xs text-yellow-400 hover:underline">Suspend</button><button className="text-xs text-red-400 hover:underline">Delete</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
