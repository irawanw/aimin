'use client';

import { useEffect, useState } from 'react';

interface Stats {
  totalPelanggan: number;
  activePelanggan: number;
  totalPaket: number;
  activePaket: number;
}

export default function Admin191Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPelanggan, setRecentPelanggan] = useState<any[]>([]);
  const [recentPaket, setRecentPaket] = useState<any[]>([]);

  useEffect(() => {
    fetch('/admin191/api/dashboard').then(r => r.json()).then(data => {
      setStats(data.stats);
      setRecentPelanggan(data.recentPelanggan || []);
      setRecentPaket(data.recentPaket || []);
    });
  }, []);

  if (!stats) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-mint-600 border-t-transparent rounded-full" />
    </div>
  );

  const cards = [
    { label: 'Total Pelanggan', value: stats.totalPelanggan, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197' },
    { label: 'Pelanggan Aktif', value: stats.activePelanggan, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Total Paket', value: stats.totalPaket, icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { label: 'Paket Aktif', value: stats.activePaket, icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[--text-primary]">Dashboard</h2>
        <p className="text-sm text-[--text-muted] mt-0.5">Overview aktivitas platform</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {cards.map(c => (
          <div key={c.label} className="glass-dark rounded-2xl p-4 lg:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-mint-500/15 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-mint-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={c.icon} />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-[--text-primary]">{c.value}</div>
            <div className="text-xs text-[--text-muted] mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-dark rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[--border]">
          <h3 className="text-sm font-semibold text-[--text-primary]">Pelanggan Terbaru</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[--text-muted] border-b border-[--border] text-xs">
                <th className="text-left px-5 py-3 font-medium">Nama</th>
                <th className="hidden sm:table-cell text-left px-5 py-3 font-medium">JID</th>
                <th className="hidden sm:table-cell text-left px-5 py-3 font-medium">Type</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--border]">
              {recentPelanggan.map((p: any) => (
                <tr key={p.store_whatsapp_jid} className="hover:bg-[--surface-3]/50 transition-colors">
                  <td className="px-5 py-3 text-[--text-secondary] font-medium">{p.store_name}</td>
                  <td className="hidden sm:table-cell px-5 py-3 text-[--text-muted] font-mono text-xs">{p.store_whatsapp_jid}</td>
                  <td className="hidden sm:table-cell px-5 py-3 text-[--text-muted]">{p.store_type}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.store_status === 'AKTIF' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                      {p.store_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-dark rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[--border]">
          <h3 className="text-sm font-semibold text-[--text-primary]">Paket Terbaru</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[--text-muted] border-b border-[--border] text-xs">
                <th className="text-left px-5 py-3 font-medium">Nama</th>
                <th className="text-left px-5 py-3 font-medium">Harga</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--border]">
              {recentPaket.map((p: any) => (
                <tr key={p.pkt_id} className="hover:bg-[--surface-3]/50 transition-colors">
                  <td className="px-5 py-3 text-[--text-secondary] font-medium">{p.pkt_name}</td>
                  <td className="px-5 py-3 text-[--text-muted]">Rp {Number(p.pkt_price).toLocaleString('id-ID')}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.pkt_active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                      {p.pkt_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
