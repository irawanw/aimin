'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Modal from '@/components/admin191/Modal';

const emptyForm = {
  store_whatsapp_jid: '', store_name: '', store_admin: '', store_tagline: '',
  store_feature: '', store_knowledge_base: '',
};

type PairingState = 'idle' | 'loading' | 'scanning' | 'success' | 'failed';

export default function StoreConfigPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [selected, setSelected] = useState<string>('');

  // Pairing state
  const [pairModal, setPairModal] = useState(false);
  const [pairJid, setPairJid] = useState('');
  const [pairState, setPairState] = useState<PairingState>('idle');
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [pairMsg, setPairMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Pairing helpers
  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const startPoll = useCallback((phone: string) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/admin191/api/pairing?phone=${encodeURIComponent(phone)}`);
        const d = await res.json();
        if (d.qrImage) setQrImage(d.qrImage);
        if (d.status === 'success') {
          stopPoll();
          setPairState('success');
          setPairMsg(d.message || 'WhatsApp berhasil terhubung!');
        } else if (d.status === 'failed') {
          stopPoll();
          setPairState('failed');
          setPairMsg(d.message || 'Koneksi gagal. Coba lagi.');
        }
      } catch { /* silent retry */ }
    }, 5000);
  }, [stopPoll]);

  const openPair = (jid: string) => {
    stopPoll();
    setPairJid(jid);
    setPairState('idle');
    setQrImage(null);
    setPairMsg('');
    setPairModal(true);
  };

  const closePairModal = () => {
    stopPoll();
    setPairModal(false);
  };

  const initiatePairing = async () => {
    setPairState('loading');
    setQrImage(null);
    setPairMsg('');
    stopPoll();

    try {
      const res = await fetch('/admin191/api/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid: pairJid }),
      });
      const d = await res.json();
      if (!res.ok) { setPairState('failed'); setPairMsg(d.error || 'Gagal menghubungi server.'); return; }
      if ((d.isQR || d.isPairing) && d.qrImage && d.pairingPhone) {
        setQrImage(d.qrImage);
        setPairState('scanning');
        startPoll(d.pairingPhone);
      } else {
        setPairState('failed');
        setPairMsg(d.replyText || d.error || 'Respons tidak terduga dari bot server.');
      }
    } catch {
      setPairState('failed');
      setPairMsg('Tidak dapat terhubung ke server.');
    }
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
              <th className="hidden sm:table-cell text-left p-3">JID</th>
              <th className="text-left p-3">Nama</th>
              <th className="hidden md:table-cell text-left p-3">Admin</th>
              <th className="hidden lg:table-cell text-left p-3">Tagline</th>
              <th className="p-3 text-center">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-800">
              {data.map((s: any) => (
                <tr key={s.store_whatsapp_jid}>
                  <td className="hidden sm:table-cell p-3 text-gray-400 font-mono text-xs">{s.store_whatsapp_jid}</td>
                  <td className="p-3 text-gray-200">{s.store_name}</td>
                  <td className="hidden md:table-cell p-3 text-gray-400">{s.store_admin}</td>
                  <td className="hidden lg:table-cell p-3 text-gray-400 truncate max-w-[200px]">{s.store_tagline}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
                      <button onClick={() => openEdit(s)} className="text-xs text-brand-400 hover:underline">Edit</button>
                      <button onClick={() => openPair(s.store_whatsapp_jid)} className="text-xs text-green-400 hover:underline">Pair QR</button>
                      <button onClick={() => handleDelete(s.store_whatsapp_jid)} className="text-xs text-red-400 hover:underline">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Create Modal */}
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

      {/* Pairing QR Modal */}
      <Modal open={pairModal} onClose={closePairModal} title="Pair WhatsApp">
        <div className="flex flex-col items-center gap-4">
          <p className="text-xs text-gray-400 font-mono break-all">{pairJid}</p>

          {/* QR area */}
          <div className="flex items-center justify-center">
            {pairState === 'scanning' && qrImage ? (
              <div className="bg-white p-3 rounded-xl shadow-lg">
                <img src={qrImage} alt="QR WhatsApp" width={220} height={220} className="block rounded" />
              </div>
            ) : pairState === 'success' ? (
              <div className="w-48 h-48 rounded-xl bg-green-500/10 border border-green-500/20 flex flex-col items-center justify-center gap-3">
                <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="text-sm font-medium text-green-400">Terhubung</span>
              </div>
            ) : pairState === 'failed' ? (
              <div className="w-48 h-48 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center gap-3">
                <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                <span className="text-sm font-medium text-red-400">Gagal</span>
              </div>
            ) : pairState === 'loading' ? (
              <div className="w-48 h-48 rounded-xl bg-gray-800 border border-gray-700 flex flex-col items-center justify-center gap-3">
                <svg className="w-8 h-8 text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                <span className="text-sm text-gray-400">Memuat QR...</span>
              </div>
            ) : (
              <div className="w-48 h-48 rounded-xl bg-gray-800 border border-gray-700 flex flex-col items-center justify-center gap-3">
                <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m0 14v1M4 12h1m14 0h1m-2.636-7.364-.707.707M6.343 17.657l-.707.707m0-12.728.707.707M17.657 17.657l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                <span className="text-xs text-gray-500 text-center px-4">Tekan tombol untuk mulai</span>
              </div>
            )}
          </div>

          {pairState === 'scanning' && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Menunggu scan QR... (auto-refresh 5 detik)
            </div>
          )}
          {pairState === 'success' && <p className="text-sm text-green-400 font-medium">{pairMsg}</p>}
          {pairState === 'failed' && <p className="text-sm text-red-400">{pairMsg}</p>}

          {(pairState === 'idle' || pairState === 'failed') && (
            <button onClick={initiatePairing} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-medium">
              {pairState === 'failed' ? 'Coba Lagi' : 'Mulai Pairing'}
            </button>
          )}
          {pairState === 'success' && (
            <button onClick={initiatePairing} className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-xl py-2.5 text-sm font-medium">
              Pair Ulang
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
