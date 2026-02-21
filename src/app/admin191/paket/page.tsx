'use client';

import { useEffect, useState, useCallback } from 'react';
import Modal from '@/components/admin191/Modal';

const emptyForm = {
  pkt_name: '', pkt_description: '', pkt_price: 0, pkt_discount: 0, pkt_length: 0,
  pkt_pict_num: 0, pkt_kb_length: 0, pkt_product_num: 0, pkt_prompt: '', pkt_token_length: 0, pkt_temp: 0.7, pkt_active: 1,
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

  const inputCls = 'w-full bg-[--surface-3] border border-[--border] rounded-xl px-3.5 py-2.5 text-[--text-primary] text-sm focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 transition-colors placeholder:text-[--text-muted]';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[--text-primary]">Paket</h2>
          {data.length > 0 && (
            <p className="text-xs text-[--text-muted] mt-0.5">{data.length} paket tersedia</p>
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
                  <th className="hidden sm:table-cell text-left px-4 py-3 font-medium">ID</th>
                  <th className="text-left px-4 py-3 font-medium">Nama</th>
                  <th className="text-left px-4 py-3 font-medium">Harga</th>
                  <th className="hidden sm:table-cell text-left px-4 py-3 font-medium">Durasi</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {data.map((p: any) => (
                  <tr key={p.pkt_id} className="hover:bg-[--surface-3]/50 transition-colors">
                    <td className="hidden sm:table-cell px-4 py-3 text-[--text-muted] text-xs">{p.pkt_id}</td>
                    <td className="px-4 py-3 text-[--text-secondary] font-medium">{p.pkt_name}</td>
                    <td className="px-4 py-3 text-[--text-muted]">Rp {Number(p.pkt_price).toLocaleString('id-ID')}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-[--text-muted]">{p.pkt_length} hari</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.pkt_active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                        {p.pkt_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
                        <button onClick={() => openEdit(p)} className="text-xs text-mint-400 hover:text-mint-300 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(p.pkt_id)} className="text-xs text-red-400 hover:text-red-300 hover:underline">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-[--text-muted]">Belum ada paket</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit Paket' : 'Tambah Paket'}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-[--text-muted] mb-1.5">Nama</label>
            <input value={form.pkt_name} onChange={e => setForm({ ...form, pkt_name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm text-[--text-muted] mb-1.5">Deskripsi</label>
            <textarea value={form.pkt_description} onChange={e => setForm({ ...form, pkt_description: e.target.value })} className={inputCls} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">Harga</label>
              <input type="number" value={form.pkt_price} onChange={e => setForm({ ...form, pkt_price: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">Diskon (%)</label>
              <input type="number" value={form.pkt_discount} onChange={e => setForm({ ...form, pkt_discount: Number(e.target.value) })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">Durasi (hari)</label>
              <input type="number" value={form.pkt_length} onChange={e => setForm({ ...form, pkt_length: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">Jml Gambar</label>
              <input type="number" value={form.pkt_pict_num} onChange={e => setForm({ ...form, pkt_pict_num: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">Jml Produk/Layanan</label>
              <input type="number" value={form.pkt_product_num} onChange={e => setForm({ ...form, pkt_product_num: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">KB Length (char)</label>
              <input type="number" value={form.pkt_kb_length} onChange={e => setForm({ ...form, pkt_kb_length: Number(e.target.value) })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[--text-muted] mb-1.5">Prompt</label>
            <textarea value={form.pkt_prompt} onChange={e => setForm({ ...form, pkt_prompt: e.target.value })} className={inputCls} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">Token Length</label>
              <input type="number" value={form.pkt_token_length} onChange={e => setForm({ ...form, pkt_token_length: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-[--text-muted] mb-1.5">Temperature</label>
              <input type="number" step="0.01" value={form.pkt_temp} onChange={e => setForm({ ...form, pkt_temp: Number(e.target.value) })} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only peer" checked={!!form.pkt_active} onChange={e => setForm({ ...form, pkt_active: e.target.checked ? 1 : 0 })} />
              <div className="w-10 h-5 bg-[--surface-3] border border-[--border] peer-focus:ring-2 peer-focus:ring-mint-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-mint-600 peer-checked:border-mint-600"></div>
            </div>
            <span className="text-sm text-[--text-muted]">Aktif</span>
          </label>
          <div className="flex items-center justify-end gap-3 pt-1">
            <button onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl text-sm text-[--text-muted] hover:text-[--text-primary] bg-[--surface-3] hover:bg-[--surface-2] transition-colors border border-[--border]">
              Batal
            </button>
            <button onClick={handleSave} className="btn-primary text-sm !py-2.5 !px-5">Simpan</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
