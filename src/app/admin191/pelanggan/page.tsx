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

  const pelangganKey = (p: any) => p.store_whatsapp_jid || p.store_folder;

  const openEdit = (row: any) => {
    setForm({ ...row });
    setSelected(pelangganKey(row));
    setModal('edit');
  };

  const filtered = data.filter((p: any) =>
    !search || p.store_name?.toLowerCase().includes(search.toLowerCase()) || p.store_whatsapp_jid?.includes(search)
  );

  const inputCls = 'w-full bg-[--surface-3] border border-[--border] rounded-xl px-3.5 py-2.5 text-[--text-primary] text-sm focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 transition-colors placeholder:text-[--text-muted]';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[--text-primary]">Pelanggan</h2>
          {data.length > 0 && (
            <p className="text-xs text-[--text-muted] mt-0.5">{data.length} total</p>
          )}
        </div>
        <button
          onClick={() => { setForm({ ...emptyForm }); setModal('create'); }}
          className="btn-primary text-sm !py-2 !px-4 flex items-center gap-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah
        </button>
      </div>

      <input
        placeholder="Cari nama atau JID..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className={inputCls + ' max-w-sm'}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-7 h-7 border-4 border-mint-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="glass-dark rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[--text-muted] border-b border-[--border] text-xs">
                  <th className="text-left px-4 py-3 font-medium">Nama</th>
                  <th className="hidden md:table-cell text-left px-4 py-3 font-medium">JID</th>
                  <th className="hidden lg:table-cell text-left px-4 py-3 font-medium">Admin</th>
                  <th className="hidden lg:table-cell text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="hidden md:table-cell text-left px-4 py-3 font-medium">Expired</th>
                  <th className="px-4 py-3 font-medium text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {filtered.map((p: any) => (
                  <tr key={pelangganKey(p)} className="hover:bg-[--surface-3]/50 transition-colors">
                    <td className="px-4 py-3 text-[--text-secondary] font-medium">{p.store_name}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-[--text-muted] font-mono text-xs">{p.store_whatsapp_jid}</td>
                    <td className="hidden lg:table-cell px-4 py-3 text-[--text-muted]">{p.store_admin}</td>
                    <td className="hidden lg:table-cell px-4 py-3 text-[--text-muted]">{p.store_type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.store_status === 'AKTIF' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                        {p.store_status}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-[--text-muted] text-xs">
                      {p.store_expired_at ? new Date(p.store_expired_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
                        <button onClick={() => openEdit(p)} className="text-xs text-mint-400 hover:text-mint-300 hover:underline">Edit</button>
                        <button onClick={() => { setSelected(pelangganKey(p)); setPassword(''); setModal('password'); }} className="text-xs text-yellow-400 hover:text-yellow-300 hover:underline">Pass</button>
                        <button onClick={() => { setSelected(pelangganKey(p)); setTokenResult(''); setModal('token'); }} className="text-xs text-[--text-muted] hover:text-[--text-secondary] hover:underline">Token</button>
                        <button onClick={() => handleDelete(pelangganKey(p))} className="text-xs text-red-400 hover:text-red-300 hover:underline">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-[--text-muted]">
                      {search ? 'Tidak ada hasil untuk pencarian ini' : 'Belum ada pelanggan'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit Pelanggan' : 'Tambah Pelanggan'}>
        <div className="space-y-3">
          {modal === 'create' && (
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">WhatsApp JID</label>
              <input value={form.store_whatsapp_jid} onChange={e => setForm({ ...form, store_whatsapp_jid: e.target.value })} className={inputCls} placeholder="628xxx@s.whatsapp.net" />
            </div>
          )}
          <div>
            <label className="block text-sm text-[--text-muted] mb-1.5">Nama Toko</label>
            <input value={form.store_name} onChange={e => setForm({ ...form, store_name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm text-[--text-muted] mb-1.5">Admin</label>
            <input value={form.store_admin} onChange={e => setForm({ ...form, store_admin: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm text-[--text-muted] mb-1.5">Alamat</label>
            <input value={form.store_address} onChange={e => setForm({ ...form, store_address: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm text-[--text-muted] mb-1.5">Tagline</label>
            <input value={form.store_tagline} onChange={e => setForm({ ...form, store_tagline: e.target.value })} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">Status</label>
              <select value={form.store_status} onChange={e => setForm({ ...form, store_status: e.target.value })} className={inputCls}>
                <option value="AKTIF">AKTIF</option>
                <option value="NONAKTIF">NONAKTIF</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">Type</label>
              <select value={form.store_type} onChange={e => setForm({ ...form, store_type: e.target.value })} className={inputCls}>
                {['Toko', 'Jasa', 'Perusahaan', 'Kantor Pemerintahan', 'Lainnya'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">Folder</label>
              <input value={form.store_folder} onChange={e => setForm({ ...form, store_folder: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">Paket ID</label>
              <input type="number" value={form.store_paket} onChange={e => setForm({ ...form, store_paket: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">Expired At</label>
              <input type="datetime-local" value={form.store_expired_at ? form.store_expired_at.slice(0, 16) : ''} onChange={e => setForm({ ...form, store_expired_at: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">Admin Number</label>
              <input value={form.store_admin_number} onChange={e => setForm({ ...form, store_admin_number: e.target.value })} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only peer" checked={!!form.store_bot_always_on} onChange={e => setForm({ ...form, store_bot_always_on: e.target.checked ? 1 : 0 })} />
              <div className="w-10 h-5 bg-[--surface-3] border border-[--border] peer-focus:ring-2 peer-focus:ring-mint-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-mint-600 peer-checked:border-mint-600"></div>
            </div>
            <span className="text-sm text-[--text-muted]">Bot Always On</span>
          </label>
          <div>
            <label className="block text-sm text-[--text-muted] mb-1.5">Special Prompts</label>
            <textarea value={form.store_special_prompts || ''} onChange={e => setForm({ ...form, store_special_prompts: e.target.value })} className={inputCls} rows={4} placeholder="Instruksi khusus untuk AI chatbot toko ini..." />
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <button onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl text-sm text-[--text-muted] hover:text-[--text-primary] bg-[--surface-3] hover:bg-[--surface-2] transition-colors border border-[--border]">
              Batal
            </button>
            <button onClick={handleSave} className="btn-primary text-sm !py-2.5 !px-5">Simpan</button>
          </div>
        </div>
      </Modal>

      {/* Password Modal */}
      <Modal open={modal === 'password'} onClose={() => setModal(null)} title="Set Password">
        <div className="space-y-3">
          <p className="text-xs text-[--text-muted] font-mono bg-[--surface-3] px-3 py-2 rounded-lg border border-[--border]">{selected}</p>
          <div>
            <label className="block text-sm text-[--text-muted] mb-1.5">Password Baru</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className={inputCls} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <button onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl text-sm text-[--text-muted] hover:text-[--text-primary] bg-[--surface-3] hover:bg-[--surface-2] transition-colors border border-[--border]">
              Batal
            </button>
            <button onClick={handleSetPassword} className="px-5 py-2.5 rounded-xl text-sm text-white bg-yellow-600 hover:bg-yellow-700 font-semibold transition-colors">Set Password</button>
          </div>
        </div>
      </Modal>

      {/* Token Modal */}
      <Modal open={modal === 'token'} onClose={() => setModal(null)} title="Generate Login Token">
        <div className="space-y-3">
          <p className="text-xs text-[--text-muted] font-mono bg-[--surface-3] px-3 py-2 rounded-lg border border-[--border]">{selected}</p>
          {tokenResult && (
            <div className="bg-[--surface-3] border border-[--border] rounded-xl p-4 space-y-2">
              <p className="text-xs text-[--text-muted] mb-1">Login URL (klik untuk buka):</p>
              <a
                href={`/user?token=${tokenResult}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-mint-400 font-mono break-all hover:text-mint-300 underline"
              >
                {typeof window !== 'undefined' ? window.location.origin : ''}/user?token={tokenResult}
              </a>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/user?token=${tokenResult}`;
                  navigator.clipboard.writeText(url);
                }}
                className="w-full bg-[--surface-2] hover:bg-[--surface-1] border border-[--border] text-[--text-secondary] text-xs rounded-lg py-2 transition-colors"
              >
                Copy URL
              </button>
            </div>
          )}
          <button onClick={handleGenToken} className="btn-primary text-sm !py-2.5 w-full">Generate Token</button>
        </div>
      </Modal>
    </div>
  );
}
