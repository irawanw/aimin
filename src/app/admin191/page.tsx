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

  if (!stats) return <div className="text-gray-400">Loading...</div>;

  const cards = [
    { label: 'Total Pelanggan', value: stats.totalPelanggan },
    { label: 'Pelanggan Aktif', value: stats.activePelanggan },
    { label: 'Total Paket', value: stats.totalPaket },
    { label: 'Paket Aktif', value: stats.activePaket },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="glass-dark rounded-2xl p-5">
            <div className="text-sm text-gray-400">{c.label}</div>
            <div className="mt-1 text-2xl font-bold text-white">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-dark rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Pelanggan Terbaru</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-500 border-b border-gray-800"><th className="text-left pb-2">Nama</th><th className="text-left pb-2">JID</th><th className="text-left pb-2">Type</th><th className="text-left pb-2">Status</th></tr></thead>
          <tbody className="divide-y divide-gray-800">
            {recentPelanggan.map((p: any) => (
              <tr key={p.store_whatsapp_jid}>
                <td className="py-3 text-gray-200">{p.store_name}</td>
                <td className="py-3 text-gray-400 font-mono text-xs">{p.store_whatsapp_jid}</td>
                <td className="py-3 text-gray-400">{p.store_type}</td>
                <td className="py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.store_status === 'AKTIF' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{p.store_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-dark rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Paket Terbaru</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-500 border-b border-gray-800"><th className="text-left pb-2">Nama</th><th className="text-left pb-2">Harga</th><th className="text-left pb-2">Status</th></tr></thead>
          <tbody className="divide-y divide-gray-800">
            {recentPaket.map((p: any) => (
              <tr key={p.pkt_id}>
                <td className="py-3 text-gray-200">{p.pkt_name}</td>
                <td className="py-3 text-gray-400">Rp {Number(p.pkt_price).toLocaleString('id-ID')}</td>
                <td className="py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.pkt_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{p.pkt_active ? 'Aktif' : 'Nonaktif'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
