'use client';

import { useEffect, useState, useCallback } from 'react';
import Modal from '@/components/admin191/Modal';

const emptyForm = {
  store_whatsapp_jid: '', store_name: '', store_admin: '', store_address: '',
  store_tagline: '', store_status: 'AKTIF', store_type: 'Toko', store_folder: '',
  store_paket: '', store_expired_at: '', store_admin_number: '', store_bot_always_on: 0,
};

export default function PelangganPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | 'password' | 'token' | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [selected, setSelected] = useState<string>('');
  const [password, setPassword] = useState('');
  const [tokenResult, setTokenResult] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/admin191/api/pelanggan').then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const isEdit = modal === 'edit';
    const url = isEdit ? `/admin191/api/pelanggan/${encodeURIComponent(selected)}` : '/admin191/api/pelanggan';
    const method = isEdit ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(null);
    load();
  };

  const handleDelete = async (jid: string) => {
    if (!confirm('Delete this pelanggan?')) return;
    await fetch(`/admin191/api/pelanggan/${encodeURIComponent(jid)}`, { method: 'DELETE' });
    load();
  };

  const handleSetPassword = async () => {
    await fetch(`/admin191/api/pelanggan/${encodeURIComponent(selected)}/password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
    });
    setModal(null);
    setPassword('');
  };

  const handleGenToken = async () => {
    const res = await fetch(`/admin191/api/pelanggan/${encodeURIComponent(selected)}/token`, { method: 'POST' });
    const data = await res.json();
    setTokenResult(data.token || data.error);
  };

  const openEdit = (row: any) => {
    setForm({ ...row });
    setSelected(row.store_whatsapp_jid);
    setModal('edit');
  };

  const filtered = data.filter((p: any) =>
    !search || p.store_name?.toLowerCase().includes(search.toLowerCase()) || p.store_whatsapp_jid?.includes(search)
  );

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Pelanggan</h2>
        <button onClick={() => { setForm({ ...emptyForm }); setModal('create'); }} className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-xl">+ Tambah</button>
      </div>

      <input placeholder="Cari nama atau JID..." value={search} onChange={e => setSearch(e.target.value)} className={inputCls + ' max-w-sm'} />

      {loading ? <div className="text-gray-400">Loading...</div> : (
        <div className="overflow-x-auto glass-dark rounded-2xl">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left p-3">Nama</th><th className="text-left p-3">JID</th><th className="text-left p-3">Admin</th>
              <th className="text-left p-3">Type</th><th className="text-left p-3">Status</th><th className="text-left p-3">Expired</th><th className="p-3">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((p: any) => (
                <tr key={p.store_whatsapp_jid}>
                  <td className="p-3 text-gray-200">{p.store_name}</td>
                  <td className="p-3 text-gray-400 font-mono text-xs">{p.store_whatsapp_jid}</td>
                  <td className="p-3 text-gray-400">{p.store_admin}</td>
                  <td className="p-3 text-gray-400">{p.store_type}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.store_status === 'AKTIF' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{p.store_status}</span></td>
                  <td className="p-3 text-gray-400 text-xs">{p.store_expired_at ? new Date(p.store_expired_at).toLocaleDateString('id-ID') : '-'}</td>
                  <td className="p-3 text-center space-x-1">
                    <button onClick={() => openEdit(p)} className="text-xs text-brand-400 hover:underline">Edit</button>
                    <button onClick={() => { setSelected(p.store_whatsapp_jid); setPassword(''); setModal('password'); }} className="text-xs text-yellow-400 hover:underline">Pass</button>
                    <button onClick={() => { setSelected(p.store_whatsapp_jid); setTokenResult(''); setModal('token'); }} className="text-xs text-cyan-400 hover:underline">Token</button>
                    <button onClick={() => handleDelete(p.store_whatsapp_jid)} className="text-xs text-red-400 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit Pelanggan' : 'Tambah Pelanggan'}>
        <div className="space-y-3">
          {modal === 'create' && (
            <div><label className="block text-xs text-gray-400 mb-1">WhatsApp JID</label><input value={form.store_whatsapp_jid} onChange={e => setForm({ ...form, store_whatsapp_jid: e.target.value })} className={inputCls} placeholder="628xxx@s.whatsapp.net" /></div>
          )}
          <div><label className="block text-xs text-gray-400 mb-1">Nama Toko</label><input value={form.store_name} onChange={e => setForm({ ...form, store_name: e.target.value })} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-400 mb-1">Admin</label><input value={form.store_admin} onChange={e => setForm({ ...form, store_admin: e.target.value })} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-400 mb-1">Alamat</label><input value={form.store_address} onChange={e => setForm({ ...form, store_address: e.target.value })} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-400 mb-1">Tagline</label><input value={form.store_tagline} onChange={e => setForm({ ...form, store_tagline: e.target.value })} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-400 mb-1">Status</label>
              <select value={form.store_status} onChange={e => setForm({ ...form, store_status: e.target.value })} className={inputCls}>
                <option value="AKTIF">AKTIF</option><option value="NONAKTIF">NONAKTIF</option>
              </select>
            </div>
            <div><label className="block text-xs text-gray-400 mb-1">Type</label>
              <select value={form.store_type} onChange={e => setForm({ ...form, store_type: e.target.value })} className={inputCls}>
                {['Toko','Jasa','Perusahaan','Kantor Pemerintahan','Lainnya'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-400 mb-1">Folder</label><input value={form.store_folder} onChange={e => setForm({ ...form, store_folder: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Paket ID</label><input type="number" value={form.store_paket} onChange={e => setForm({ ...form, store_paket: e.target.value })} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-400 mb-1">Expired At</label><input type="datetime-local" value={form.store_expired_at ? form.store_expired_at.slice(0, 16) : ''} onChange={e => setForm({ ...form, store_expired_at: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Admin Number</label><input value={form.store_admin_number} onChange={e => setForm({ ...form, store_admin_number: e.target.value })} className={inputCls} /></div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={!!form.store_bot_always_on} onChange={e => setForm({ ...form, store_bot_always_on: e.target.checked ? 1 : 0 })} />
            <label className="text-sm text-gray-400">Bot Always On</label>
          </div>
          <div><label className="block text-xs text-gray-400 mb-1">Special Prompts</label><textarea value={form.store_special_prompts || ''} onChange={e => setForm({ ...form, store_special_prompts: e.target.value })} className={inputCls} rows={4} placeholder="Instruksi khusus untuk AI chatbot toko ini..." /></div>
          <button onClick={handleSave} className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-2.5 text-sm font-medium">Simpan</button>
        </div>
      </Modal>

      <Modal open={modal === 'password'} onClose={() => setModal(null)} title="Set Password">
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-mono">{selected}</p>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className={inputCls} />
          <button onClick={handleSetPassword} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl py-2.5 text-sm font-medium">Set Password</button>
        </div>
      </Modal>

      <Modal open={modal === 'token'} onClose={() => setModal(null)} title="Generate Login Token">
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-mono">{selected}</p>
          {tokenResult && (
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Login URL (klik untuk buka):</p>
              <a
                href={`/user?token=${tokenResult}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 font-mono break-all hover:text-cyan-300 underline"
              >
                {typeof window !== 'undefined' ? window.location.origin : ''}/user?token={tokenResult}
              </a>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/user?token=${tokenResult}`;
                  navigator.clipboard.writeText(url);
                }}
                className="mt-2 w-full bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg py-1.5"
              >
                Copy URL
              </button>
            </div>
          )}
          <button onClick={handleGenToken} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl py-2.5 text-sm font-medium">Generate Token</button>
        </div>
      </Modal>
    </div>
  );
}
