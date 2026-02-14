'use client';

import { useEffect, useState, useCallback } from 'react';
import Modal from '@/components/admin191/Modal';

const emptyForm = {
  store_whatsapp_jid: '', store_name: '', store_admin: '', store_tagline: '',
  store_feature: '', store_knowledge_base: '',
};

export default function StoreConfigPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [selected, setSelected] = useState<string>('');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/admin191/api/store-config').then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const isEdit = modal === 'edit';
    const url = isEdit ? `/admin191/api/store-config/${encodeURIComponent(selected)}` : '/admin191/api/store-config';
    const method = isEdit ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(null);
    load();
  };

  const handleDelete = async (jid: string) => {
    if (!confirm('Delete this store config?')) return;
    await fetch(`/admin191/api/store-config/${encodeURIComponent(jid)}`, { method: 'DELETE' });
    load();
  };

  const openEdit = (row: any) => {
    setForm({ ...row });
    setSelected(row.store_whatsapp_jid);
    setModal('edit');
  };

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Store Config</h2>
        <button onClick={() => { setForm({ ...emptyForm }); setModal('create'); }} className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-xl">+ Tambah</button>
      </div>

      {loading ? <div className="text-gray-400">Loading...</div> : (
        <div className="overflow-x-auto glass-dark rounded-2xl">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left p-3">JID</th><th className="text-left p-3">Nama</th><th className="text-left p-3">Admin</th>
              <th className="text-left p-3">Tagline</th><th className="p-3">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-800">
              {data.map((s: any) => (
                <tr key={s.store_whatsapp_jid}>
                  <td className="p-3 text-gray-400 font-mono text-xs">{s.store_whatsapp_jid}</td>
                  <td className="p-3 text-gray-200">{s.store_name}</td>
                  <td className="p-3 text-gray-400">{s.store_admin}</td>
                  <td className="p-3 text-gray-400 truncate max-w-[200px]">{s.store_tagline}</td>
                  <td className="p-3 text-center space-x-2">
                    <button onClick={() => openEdit(s)} className="text-xs text-brand-400 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(s.store_whatsapp_jid)} className="text-xs text-red-400 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit Store Config' : 'Tambah Store Config'}>
        <div className="space-y-3">
          {modal === 'create' && (
            <div><label className="block text-xs text-gray-400 mb-1">WhatsApp JID</label><input value={form.store_whatsapp_jid} onChange={e => setForm({ ...form, store_whatsapp_jid: e.target.value })} className={inputCls} placeholder="628xxx@s.whatsapp.net" /></div>
          )}
          <div><label className="block text-xs text-gray-400 mb-1">Nama</label><input value={form.store_name} onChange={e => setForm({ ...form, store_name: e.target.value })} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-400 mb-1">Admin</label><input value={form.store_admin} onChange={e => setForm({ ...form, store_admin: e.target.value })} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-400 mb-1">Tagline</label><input value={form.store_tagline} onChange={e => setForm({ ...form, store_tagline: e.target.value })} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-400 mb-1">Feature</label><textarea value={form.store_feature} onChange={e => setForm({ ...form, store_feature: e.target.value })} className={inputCls} rows={3} /></div>
          <div><label className="block text-xs text-gray-400 mb-1">Knowledge Base</label><textarea value={form.store_knowledge_base} onChange={e => setForm({ ...form, store_knowledge_base: e.target.value })} className={inputCls} rows={4} /></div>
          <button onClick={handleSave} className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-2.5 text-sm font-medium">Simpan</button>
        </div>
      </Modal>
    </div>
  );
}
