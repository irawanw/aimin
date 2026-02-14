'use client';

const subs = [
  { user: 'Budi Santoso', plan: 'pro', amount: 'Rp 199.000', date: '2024-01-15', status: 'active' },
  { user: 'Siti Rahayu', plan: 'lite', amount: 'Rp 99.000', date: '2024-01-12', status: 'active' },
  { user: 'Ahmad Dani', plan: 'lite', amount: 'Rp 99.000', date: '2024-01-01', status: 'expired' },
];

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Subscription Management</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {[{ l: 'Active Subs', v: '892' }, { l: 'MRR', v: 'Rp 142M' }, { l: 'Churn Rate', v: '3.2%' }].map((s) => (
          <div key={s.l} className="glass-dark rounded-2xl p-5 text-center"><div className="text-2xl font-bold text-white">{s.v}</div><div className="text-sm text-gray-400">{s.l}</div></div>
        ))}
      </div>
      <div className="glass-dark rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-gray-500 border-b border-gray-800"><th className="text-left px-4 py-3">User</th><th className="text-left px-4 py-3">Plan</th><th className="text-left px-4 py-3">Amount</th><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-gray-800">
            {subs.map((s, i) => (
              <tr key={i} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 text-gray-200">{s.user}</td>
                <td className="px-4 py-3"><span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full uppercase">{s.plan}</span></td>
                <td className="px-4 py-3 text-gray-300 font-mono">{s.amount}</td>
                <td className="px-4 py-3 text-gray-400">{s.date}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
