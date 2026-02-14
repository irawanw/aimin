'use client';

const logs = [
  { time: '2024-01-15 14:32:01', level: 'INFO', message: 'User budi@gmail.com logged in', source: 'auth' },
  { time: '2024-01-15 14:31:45', level: 'WARN', message: 'vLLM response latency > 2s', source: 'ai' },
  { time: '2024-01-15 14:30:12', level: 'INFO', message: 'New subscription: siti@gmail.com -> Lite', source: 'billing' },
  { time: '2024-01-15 14:28:33', level: 'ERROR', message: 'WhatsApp gateway timeout', source: 'wa' },
  { time: '2024-01-15 14:25:01', level: 'INFO', message: 'System health check passed', source: 'system' },
];

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">System Logs</h2>
        <select className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500">
          <option>All Levels</option><option>ERROR</option><option>WARN</option><option>INFO</option>
        </select>
      </div>
      <div className="glass-dark rounded-2xl p-4 font-mono text-xs space-y-1">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3 py-1.5 border-b border-gray-800/50 last:border-0">
            <span className="text-gray-500 shrink-0">{log.time}</span>
            <span className={`shrink-0 w-12 ${log.level === 'ERROR' ? 'text-red-400' : log.level === 'WARN' ? 'text-yellow-400' : 'text-green-400'}`}>{log.level}</span>
            <span className="text-gray-500 shrink-0">[{log.source}]</span>
            <span className="text-gray-300">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
