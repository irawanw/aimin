'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, CheckCircle, AlertCircle, GripVertical } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

// ── Fulfillment method options (per store type) ─────────────────────────────
const FULFILLMENT_KEYS = {
  store: [
    { key: 'edit.fulfillmentDelivery', value: 'delivery' },
    { key: 'edit.fulfillmentPickup', value: 'pickup' },
  ],
  services: [
    { key: 'edit.fulfillmentMeeting', value: 'meeting_schedule' },
    { key: 'edit.fulfillmentBookDate', value: 'book_date' },
    { key: 'edit.fulfillmentBookRange', value: 'book_date_range' },
    { key: 'edit.fulfillmentVisitLocation', value: 'visit_location' },
    { key: 'edit.fulfillmentCustomerVisit', value: 'customer_visit' },
  ],
  others: [] as { key: string; value: string }[],
};

// ── Checkout fields catalog ──────────────────────────────────────────────────
export interface CheckoutField {
  field: string;       // English variable name used by the bot
  label: string;       // Display name in Indonesian
  hint: string;        // Short description
  required: boolean;
  enabled: boolean;
}

const FIELD_CATALOG: Omit<CheckoutField, 'required' | 'enabled'>[] = [
  { field: 'name',           label: 'Nama',                hint: 'Nama lengkap pelanggan' },
  { field: 'phone',          label: 'No. HP',              hint: 'Nomor telepon / WhatsApp' },
  { field: 'email',          label: 'Email',               hint: 'Alamat email pelanggan' },
  { field: 'address',        label: 'Alamat',              hint: 'Alamat pengiriman atau lokasi' },
  { field: 'datetime',       label: 'Tanggal & Waktu',     hint: 'Waktu kunjungan atau reservasi' },
  { field: 'visitor_count',  label: 'Jumlah Tamu',         hint: 'Jumlah orang / pengunjung' },
  { field: 'order',          label: 'Pesanan',             hint: 'Menu atau item yang dipesan' },
  { field: 'venue',          label: 'Tempat / Lokasi',     hint: 'Nama tempat atau area acara' },
  { field: 'occasion',       label: 'Jenis Acara',         hint: 'Misal: ulang tahun, anniversary, meeting' },
  { field: 'duration',       label: 'Durasi',              hint: 'Lama kunjungan atau sewa tempat' },
  { field: 'table_pref',     label: 'Preferensi Tempat',   hint: 'Indoor/outdoor, smoking/non-smoking' },
  { field: 'dietary',        label: 'Pantangan Makanan',   hint: 'Alergi atau preferensi diet' },
  { field: 'notes',          label: 'Catatan Khusus',      hint: 'Permintaan tambahan / special request' },
  { field: 'promo_code',     label: 'Kode Promo',          hint: 'Kode diskon atau voucher' },
  { field: 'payment_method', label: 'Metode Pembayaran',   hint: 'Transfer, tunai, QRIS, dll' },
];

const DEFAULT_FIELDS: CheckoutField[] = [
  { field: 'name',          label: 'Nama',             hint: 'Nama lengkap pelanggan',               required: true,  enabled: true },
  { field: 'phone',         label: 'No. HP',           hint: 'Nomor telepon / WhatsApp',             required: true,  enabled: true },
  { field: 'email',         label: 'Email',            hint: 'Alamat email pelanggan',               required: false, enabled: true },
  { field: 'address',       label: 'Alamat',           hint: 'Alamat pengiriman atau lokasi',        required: false, enabled: true },
  { field: 'venue',         label: 'Tempat / Lokasi',  hint: 'Nama tempat atau area acara',          required: false, enabled: true },
  { field: 'order',         label: 'Pesanan',          hint: 'Menu atau item yang dipesan',          required: true,  enabled: true },
  { field: 'datetime',      label: 'Tanggal & Waktu',  hint: 'Waktu kunjungan atau reservasi',       required: false, enabled: true },
  { field: 'visitor_count', label: 'Jumlah Tamu',      hint: 'Jumlah orang / pengunjung',            required: false, enabled: true },
  { field: 'notes',         label: 'Catatan Khusus',   hint: 'Permintaan tambahan / special request',required: false, enabled: false },
];

function buildInitialFields(saved: CheckoutField[] | null): CheckoutField[] {
  if (!saved || saved.length === 0) return DEFAULT_FIELDS;
  // Merge saved with catalog — add any new catalog items not yet in saved
  const savedKeys = new Set(saved.map(f => f.field));
  const extra = FIELD_CATALOG
    .filter(c => !savedKeys.has(c.field))
    .map(c => ({ ...c, required: false, enabled: false }));
  return [...saved, ...extra];
}

export default function FulfillmentPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [storeType, setStoreType] = useState('store');
  const [fulfillment, setFulfillment] = useState<string[]>([]);
  const [fields, setFields] = useState<CheckoutField[]>(DEFAULT_FIELDS);

  useEffect(() => {
    fetch('/api/user/store')
      .then(r => { if (r.status === 401) { router.push('/user'); return null; } return r.json(); })
      .then(data => {
        if (!data || data.error) return;
        setStoreType(data.store_type || 'store');
        // Parse fulfillment
        try {
          const f = data.store_fulfillment;
          setFulfillment(Array.isArray(f) ? f : (f ? JSON.parse(f) : []));
        } catch { setFulfillment([]); }
        // Parse checkout fields
        try {
          const cf = data.store_checkout_fields ? JSON.parse(data.store_checkout_fields) : null;
          setFields(buildInitialFields(cf));
        } catch { setFields(DEFAULT_FIELDS); }
        setLoading(false);
      })
      .catch(() => { setError(t('common.errorLoad')); setLoading(false); });
  }, [router, t]);

  useEffect(() => {
    if (success) { const timer = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(timer); }
  }, [success]);

  function toggleFulfillment(val: string) {
    setFulfillment(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }

  function toggleField(field: string, key: 'enabled' | 'required') {
    setFields(prev => prev.map(f => {
      if (f.field !== field) return f;
      if (key === 'enabled') {
        const enabled = !f.enabled;
        return { ...f, enabled, required: enabled ? f.required : false };
      }
      return { ...f, required: !f.required, enabled: true }; // required implies enabled
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/user/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_fulfillment: JSON.stringify(fulfillment),
          store_checkout_fields: JSON.stringify(fields),
        }),
      });
      const data = await res.json();
      if (data.success) setSuccess(t('common.save'));
      else setError(data.error || t('common.errorLoad'));
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  const normalizedStoreType = ['Jasa', 'Layanan', 'Service', 'services'].includes(storeType)
    ? 'services'
    : storeType === 'others'
    ? 'others'
    : 'store';
  const fulfillmentOpts = FULFILLMENT_KEYS[normalizedStoreType as keyof typeof FULFILLMENT_KEYS] || [];

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-5 h-5 border-2 border-mint-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[--accent-dim] flex items-center justify-center">
          <ClipboardList className="w-4.5 h-4.5 text-mint-400" style={{width:'18px',height:'18px'}} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-[--text-primary]">{t('fulfillment.title')}</h1>
          <p className="text-xs text-[--text-muted]">{t('fulfillment.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* ── Fulfillment method ─────────────────────────────────────────── */}
        {fulfillmentOpts.length > 0 && (
          <div className="page-card p-5 space-y-3">
            <div>
              <p className="text-sm font-medium text-[--text-primary]">
                {normalizedStoreType === 'store' ? t('fulfillment.deliveryMethod') : t('fulfillment.serviceMethod')}
              </p>
              <p className="text-xs text-[--text-muted] mt-0.5">
                {normalizedStoreType === 'store' ? t('fulfillment.deliveryMethodDesc') : t('fulfillment.serviceMethodDesc')}
              </p>
            </div>
            <div className="space-y-2">
              {fulfillmentOpts.map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer group py-0.5">
                  <div
                    className={`w-4.5 h-4.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${fulfillment.includes(opt.value) ? 'bg-mint-600 border-mint-600' : 'bg-[--surface-3] border-[--border] group-hover:border-mint-500/50'}`}
                    style={{width:'18px',height:'18px'}}
                  >
                    <input type="checkbox" className="sr-only" checked={fulfillment.includes(opt.value)} onChange={() => toggleFulfillment(opt.value)} />
                    {fulfillment.includes(opt.value) && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="2 6 5 9 10 3" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-[--text-secondary]">{t(opt.key)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Checkout fields ────────────────────────────────────────────── */}
        <div className="page-card p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-[--text-primary]">{t('fulfillment.checkoutData')}</p>
            <p className="text-xs text-[--text-muted] mt-0.5">{t('fulfillment.checkoutDataDesc')}</p>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-1 pb-1 border-b border-[--border]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[--text-muted]">Field</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[--text-muted] text-center w-14">{t('fulfillment.colActive')}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[--text-muted] text-center w-16">{t('fulfillment.colRequired')}</span>
          </div>

          {/* Field rows */}
          <div className="space-y-1">
            {fields.map(f => (
              <div
                key={f.field}
                className={`grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-2 py-2.5 rounded-lg transition-colors ${f.enabled ? 'bg-[--surface-3]/60' : 'opacity-50'}`}
              >
                {/* Label + variable + hint */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[--text-primary] leading-none">
                      {t(`fulfillment.field_${f.field}_label` as any) || f.label}
                    </span>
                    <code className="text-[10px] text-[--text-muted] bg-[--surface-3] border border-[--border] px-1.5 py-0.5 rounded font-mono">{f.field}</code>
                  </div>
                  <p className="text-xs text-[--text-muted] mt-0.5 truncate">
                    {t(`fulfillment.field_${f.field}_hint` as any) || f.hint}
                  </p>
                </div>

                {/* Enabled toggle */}
                <div className="flex justify-center w-14">
                  <button
                    type="button"
                    onClick={() => toggleField(f.field, 'enabled')}
                    className={`relative inline-flex items-center rounded-full transition-colors flex-shrink-0 ${f.enabled ? 'bg-mint-600' : 'bg-[--border]'}`}
                    style={{width:'36px',height:'20px'}}
                  >
                    <span
                      className={`inline-block rounded-full bg-white transition-transform shadow-sm`}
                      style={{width:'14px',height:'14px',transform: f.enabled ? 'translateX(19px)' : 'translateX(3px)'}}
                    />
                  </button>
                </div>

                {/* Required toggle */}
                <div className="flex justify-center w-16">
                  <button
                    type="button"
                    disabled={!f.enabled}
                    onClick={() => toggleField(f.field, 'required')}
                    className={`relative inline-flex items-center rounded-full transition-colors flex-shrink-0 disabled:opacity-30 ${f.required ? 'bg-amber-500' : 'bg-[--border]'}`}
                    style={{width:'36px',height:'20px'}}
                  >
                    <span
                      className="inline-block rounded-full bg-white transition-transform shadow-sm"
                      style={{width:'14px',height:'14px',transform: f.required ? 'translateX(19px)' : 'translateX(3px)'}}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-[--text-muted]">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-mint-600 mr-1 align-middle" /> {t('fulfillment.legendActive')} &nbsp;·&nbsp;
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-1 align-middle" /> {t('fulfillment.legendRequired')}
          </p>
        </div>

        {/* Messages */}
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary text-sm !py-2.5 !px-6 disabled:opacity-60">
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
