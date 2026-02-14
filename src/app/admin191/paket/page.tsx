'use client';

import { useEffect, useState, useCallback } from 'react';
import Modal from '@/components/admin191/Modal';

const emptyForm = {
  pkt_name: '', pkt_description: '', pkt_price: 0, pkt_discount: 0, pkt_length: 0,
  pkt_pict_num: 0, pkt_kb_length: 0, pkt_prompt: '', pkt_token_length: 0, pkt_temp: 0.7, pkt_active: 1,
};

export default function PaketPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/admin191/api/paket').then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const isEdit = modal === 'edit';
    const url = isEdit ? `/admin191/api/paket/${selectedId}` : '/admin191/api/paket';
    const method = isEdit ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(null);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this paket?')) return;
    await fetch(`/admin191/api/paket/${id}`, { method: 'DELETE' });
    load();
  };

  const openEdit = (row: any) => {
    setForm({ ...row });
    setSelectedId(row.pkt_id);
    setModal('edit');
  };

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Paket</h2>
        <button onClick={() => { setForm({ ...emptyForm }); setModal('create'); }} className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-xl">+ Tambah</button>
      </div>

      {loading ? <div className="text-gray-400">Loading...</div> : (
        <div className="overflow-x-auto glass-dark rounded-2xl">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left p-3">ID</th><th className="text-left p-3">Nama</th><th className="text-left p-3">Harga</th>
              <th className="text-left p-3">Durasi</th><th className="text-left p-3">Status</th><th className="p-3">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-800">
              {data.map((p: any) => (
                <tr key={p.pkt_id}>
                  <td className="p-3 text-gray-400">{p.pkt_id}</td>
                  <td className="p-3 text-gray-200">{p.pkt_name}</td>
                  <td className="p-3 text-gray-400">Rp {Number(p.pkt_price).toLocaleString('id-ID')}</td>
                  <td className="p-3 text-gray-400">{p.pkt_length} hari</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.pkt_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{p.pkt_active ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td className="p-3 text-center space-x-2">
                    <button onClick={() => openEdit(p)} className="text-xs text-brand-400 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(p.pkt_id)} className="text-xs text-red-400 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit Paket' : 'Tambah Paket'}>
        <div className="space-y-3">
          <div><label className="block text-xs text-gray-400 mb-1">Nama</label><input value={form.pkt_name} onChange={e => setForm({ ...form, pkt_name: e.target.value })} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-400 mb-1">Deskripsi</label><textarea value={form.pkt_description} onChange={e => setForm({ ...form, pkt_description: e.target.value })} className={inputCls} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-400 mb-1">Harga</label><input type="number" value={form.pkt_price} onChange={e => setForm({ ...form, pkt_price: Number(e.target.value) })} className={inputCls} /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Diskon (%)</label><input type="number" value={form.pkt_discount} onChange={e => setForm({ ...form, pkt_discount: Number(e.target.value) })} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs text-gray-400 mb-1">Durasi (hari)</label><input type="number" value={form.pkt_length} onChange={e => setForm({ ...form, pkt_length: Number(e.target.value) })} className={inputCls} /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Jml Gambar</label><input type="number" value={form.pkt_pict_num} onChange={e => setForm({ ...form, pkt_pict_num: Number(e.target.value) })} className={inputCls} /></div>
            <div><label className="block text-xs text-gray-400 mb-1">KB Length</label><input type="number" value={form.pkt_kb_length} onChange={e => setForm({ ...form, pkt_kb_length: Number(e.target.value) })} className={inputCls} /></div>
          </div>
          <div><label className="block text-xs text-gray-400 mb-1">Prompt</label><textarea value={form.pkt_prompt} onChange={e => setForm({ ...form, pkt_prompt: e.target.value })} className={inputCls} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-400 mb-1">Token Length</label><input type="number" value={form.pkt_token_length} onChange={e => setForm({ ...form, pkt_token_length: Number(e.target.value) })} className={inputCls} /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Temperature</label><input type="number" step="0.01" value={form.pkt_temp} onChange={e => setForm({ ...form, pkt_temp: Number(e.target.value) })} className={inputCls} /></div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={!!form.pkt_active} onChange={e => setForm({ ...form, pkt_active: e.target.checked ? 1 : 0 })} />
            <label className="text-sm text-gray-400">Aktif</label>
          </div>
          <button onClick={handleSave} className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-2.5 text-sm font-medium">Simpan</button>
        </div>
      </Modal>
    </div>
  );
}
