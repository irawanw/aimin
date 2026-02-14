'use client';

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">System Analytics</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ l: 'API Calls (24h)', v: '45,231' }, { l: 'Avg Latency', v: '89ms' }, { l: 'Error Rate', v: '0.02%' }, { l: 'Active Sessions', v: '234' }].map((s) => (
          <div key={s.l} className="glass-dark rounded-2xl p-5"><div className="text-sm text-gray-400">{s.l}</div><div className="mt-1 text-2xl font-bold text-white font-mono">{s.v}</div></div>
        ))}
      </div>
      <div className="glass-dark rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">System Health</h3>
        <div className="space-y-3">
          {[{ name: 'API Server', status: 'healthy', uptime: '99.99%' }, { name: 'vLLM Backend', status: 'healthy', uptime: '99.95%' }, { name: 'Database', status: 'healthy', uptime: '99.99%' }, { name: 'WhatsApp Gateway', status: 'degraded', uptime: '98.5%' }].map((s) => (
            <div key={s.name} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${s.status === 'healthy' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                <span className="text-gray-200">{s.name}</span>
              </div>
              <span className="text-sm text-gray-400 font-mono">{s.uptime}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
