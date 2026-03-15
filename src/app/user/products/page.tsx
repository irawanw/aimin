'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Package, Search, ChevronLeft, ChevronRight,
  Trash2, RefreshCw, X, CheckCircle, AlertCircle,
  FileSpreadsheet, Tag, ShoppingCart, BarChart2,
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColumnMapping {
  name: string | null;
  sku: string | null;
  category: string | null;
  price: string | null;
  price_max: string | null;
  description: string | null;
  stock_qty: string | null;
  stock_status: string | null;
  image_url: string | null;
  specs: string[];
}

interface ParseResult {
  temp_id: string;
  filename: string;
  row_count: number;
  headers: string[];
  sample_rows: any[][];
  mapping: ColumnMapping;
}

interface Product {
  id: number;
  sku: string | null;
  name: string;
  category: string | null;
  price: number | null;
  price_max: number | null;
  currency: string;
  description: string | null;
  stock_status: 'in_stock' | 'out_of_stock' | 'preorder';
  stock_qty: number | null;
  specs: Record<string, string> | null;
  is_active: number;
}

type Stage = 'loading' | 'catalog' | 'parsing' | 'mapping' | 'importing' | 'done';

function formatPrice(price: number | null, currency = 'IDR'): string {
  if (price === null) return '—';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
}

function StockBadge({ status, qty, outLabel, preOrderLabel, stockLabel, availLabel }: {
  status: string;
  qty: number | null;
  outLabel: string;
  preOrderLabel: string;
  stockLabel: (qty: number) => string;
  availLabel: string;
}) {
  if (status === 'out_of_stock') return (
    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-500/15 text-red-400">{outLabel}</span>
  );
  if (status === 'preorder') return (
    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/15 text-amber-400">{preOrderLabel}</span>
  );
  return (
    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-400">
      {qty !== null ? stockLabel(qty) : availLabel}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { t } = useLanguage();
  const [stage, setStage] = useState<Stage>('loading');
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCat, setFilterCat] = useState('');
  const [stats, setStats] = useState({ active: 0, inactive: 0 });
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [colMapping, setColMapping] = useState<Record<string, string>>({}); // col → field type
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const FIELD_OPTIONS = [
    { value: 'name', label: t('products.fieldName') },
    { value: 'sku', label: t('products.fieldSku') },
    { value: 'category', label: t('products.fieldCategory') },
    { value: 'price', label: t('products.fieldPrice') },
    { value: 'price_max', label: t('products.fieldMaxPrice') },
    { value: 'description', label: t('products.fieldDesc') },
    { value: 'stock_qty', label: t('products.fieldStock') },
    { value: 'stock_status', label: t('products.fieldStockStatus') },
    { value: 'image_url', label: t('products.fieldImage') },
    { value: 'spec', label: t('products.fieldAttr') },
    { value: 'ignore', label: t('products.fieldIgnore') },
  ];

  // ── Fetch products ────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (p = 1, q = '', cat = '') => {
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (q) params.set('search', q);
      if (cat) params.set('category', cat);
      const res = await fetch(`/api/user/products?${params}`);
      const data = await res.json();
      if (data.error) { setStage('catalog'); return; }
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setCategories(data.categories || []);
      setStats(data.stats || { active: 0, inactive: 0 });
      setStage('catalog');
    } catch {
      setStage('catalog');
    }
  }, []);

  useEffect(() => {
    fetchProducts(1, '', '');
  }, [fetchProducts]);

  // ── Search debounce ───────────────────────────────────────────────────────

  const handleSearch = (q: string) => {
    setSearch(q);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setPage(1); fetchProducts(1, q, filterCat); }, 350);
  };

  const handleCatFilter = (cat: string) => {
    setFilterCat(cat);
    setPage(1);
    fetchProducts(1, search, cat);
  };

  const handlePage = (p: number) => {
    setPage(p);
    fetchProducts(p, search, filterCat);
  };

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    setError('');
    setStage('parsing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/user/products/parse', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || t('common.errorLoad')); setStage('catalog'); return; }
      // Build initial column mapping state from LLM result
      const initial: Record<string, string> = {};
      const m: ColumnMapping = data.mapping;
      for (const header of data.headers) {
        if (header === m.name) { initial[header] = 'name'; continue; }
        if (header === m.sku) { initial[header] = 'sku'; continue; }
        if (header === m.category) { initial[header] = 'category'; continue; }
        if (header === m.price) { initial[header] = 'price'; continue; }
        if (header === m.price_max) { initial[header] = 'price_max'; continue; }
        if (header === m.description) { initial[header] = 'description'; continue; }
        if (header === m.stock_qty) { initial[header] = 'stock_qty'; continue; }
        if (header === m.stock_status) { initial[header] = 'stock_status'; continue; }
        if (header === m.image_url) { initial[header] = 'image_url'; continue; }
        if (m.specs.includes(header)) { initial[header] = 'spec'; continue; }
        initial[header] = 'ignore';
      }
      setColMapping(initial);
      setParseResult(data);
      setStage('mapping');
    } catch (e: any) {
      setError(e.message || t('common.errorLoad'));
      setStage('catalog');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // ── Build ColumnMapping from user's column-level selections ───────────────

  const buildMappingFromState = (): ColumnMapping => {
    const mapping: ColumnMapping = {
      name: null, sku: null, category: null, price: null, price_max: null,
      description: null, stock_qty: null, stock_status: null, image_url: null,
      specs: [],
    };
    for (const [col, field] of Object.entries(colMapping)) {
      if (field === 'spec') { mapping.specs.push(col); continue; }
      if (field === 'ignore') continue;
      if (field in mapping && field !== 'specs') {
        (mapping as any)[field] = col;
      }
    }
    return mapping;
  };

  // ── Import (SSE) ──────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!parseResult) return;
    const confirmed = buildMappingFromState();
    if (!confirmed.name) { setError(t('products.nameRequired')); return; }
    setError('');
    setStage('importing');
    setProgress(0);
    setProgressMsg(t('products.importing'));

    try {
      const res = await fetch('/api/user/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_id: parseResult.temp_id, mapping: confirmed }),
      });
      if (!res.body) throw new Error('No stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        let evt = '';
        for (const line of lines) {
          if (line.startsWith('event:')) { evt = line.slice(6).trim(); }
          else if (line.startsWith('data:')) {
            try {
              const d = JSON.parse(line.slice(5).trim());
              if (evt === 'progress') { setProgress(d.pct); setProgressMsg(d.message); }
              else if (evt === 'done') { setProgress(100); setImportResult(d); setStage('done'); fetchProducts(1, '', ''); }
              else if (evt === 'error') { setError(d.message); setStage('catalog'); }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      setError(e.message || t('common.errorLoad'));
      setStage('catalog');
    }
  };

  // ── Clear catalog ─────────────────────────────────────────────────────────

  const handleClear = async () => {
    setShowClearConfirm(false);
    try {
      await fetch('/api/user/products', { method: 'DELETE' });
      setProducts([]);
      setTotal(0);
      setStats({ active: 0, inactive: 0 });
    } catch {}
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (stage === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-mint-500/30 border-t-mint-500 animate-spin" />
      </div>
    );
  }

  // ── Parsing stage ─────────────────────────────────────────────────────────
  if (stage === 'parsing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-mint-500/30 border-t-mint-500 animate-spin" />
        <p className="text-sm text-[--text-secondary]">{t('products.analyzing')}</p>
      </div>
    );
  }

  // ── Mapping review stage ──────────────────────────────────────────────────
  if (stage === 'mapping' && parseResult) {
    const nameAssigned = Object.values(colMapping).includes('name');
    return (
      <div className="max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStage('catalog')} className="p-1.5 rounded-lg hover:bg-[--surface-3] text-[--text-muted] transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-semibold text-[--text-primary]">{t('products.mappingTitle')}</h2>
            <p className="text-xs text-[--text-muted]">
              {t('products.mappingInfo', { filename: parseResult.filename, rows: parseResult.row_count })}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Mapping table */}
        <div className="bg-[--surface-2] border border-[--border] rounded-2xl overflow-hidden mb-5">
          <div className="grid grid-cols-3 gap-0 px-4 py-2.5 border-b border-[--border] bg-[--surface-3]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">{t('products.colCsv')}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">{t('products.colMapped')}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">{t('products.colExample')}</span>
          </div>
          <div className="divide-y divide-[--border]">
            {parseResult.headers.map((header) => {
              const sampleVals = parseResult.sample_rows
                .map((r) => r[parseResult.headers.indexOf(header)])
                .filter((v) => v !== '' && v !== null && v !== undefined)
                .slice(0, 2);
              return (
                <div key={header} className="grid grid-cols-3 gap-4 px-4 py-3 items-center hover:bg-[--surface-3]/40 transition-colors">
                  <span className="text-sm font-medium text-[--text-primary] truncate" title={header}>{header}</span>
                  <select
                    value={colMapping[header] || 'ignore'}
                    onChange={(e) => setColMapping((prev) => ({ ...prev, [header]: e.target.value }))}
                    className="px-2.5 py-1.5 bg-[--surface-3] border border-[--border] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 cursor-pointer"
                  >
                    {FIELD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="flex gap-1.5 flex-wrap">
                    {sampleVals.map((v, i) => (
                      <span key={i} className="text-xs text-[--text-muted] bg-[--surface-3] px-2 py-0.5 rounded-md truncate max-w-[140px]" title={String(v)}>
                        {String(v)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 text-xs text-[--text-muted] bg-[--surface-2] border border-[--border] rounded-xl px-4 py-3 mb-5">
          <Tag className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-mint-500" />
          <p>{t('products.attrNote')}</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button onClick={() => setStage('catalog')} className="px-4 py-2 text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--surface-3] rounded-xl transition-colors">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleImport}
            disabled={!nameAssigned}
            className="px-5 py-2 bg-mint-600 hover:bg-mint-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-mint-500/20"
          >
            {t('products.confirmImport')}
          </button>
        </div>
      </div>
    );
  }

  // ── Importing stage (SSE progress) ────────────────────────────────────────
  if (stage === 'importing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 max-w-sm mx-auto text-center">
        <div className="w-14 h-14 rounded-2xl bg-mint-500/10 flex items-center justify-center">
          <ShoppingCart className="w-7 h-7 text-mint-500" />
        </div>
        <div className="w-full">
          <div className="flex justify-between text-xs text-[--text-muted] mb-2">
            <span>{progressMsg}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-[--surface-3] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-mint-600 to-mint-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-[--text-muted]">{t('products.importWarning')}</p>
      </div>
    );
  }

  // ── Done stage ────────────────────────────────────────────────────────────
  if (stage === 'done' && importResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-5 max-w-sm mx-auto text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[--text-primary] mb-1">{t('products.successTitle')}</h3>
          <p className="text-sm text-[--text-muted]">{t('products.successDesc')}</p>
        </div>
        <div className="w-full grid grid-cols-2 gap-3">
          {[
            { label: t('products.added'), value: importResult.inserted, color: 'text-emerald-400' },
            { label: t('products.updated'), value: importResult.updated, color: 'text-mint-400' },
            { label: t('products.deactivated'), value: importResult.deactivated, color: 'text-amber-400' },
            { label: t('products.totalIndexed'), value: importResult.indexed, color: 'text-[--text-primary]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[--surface-2] border border-[--border] rounded-xl p-3">
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-[11px] text-[--text-muted]">{label}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => { setImportResult(null); setStage('catalog'); }}
          className="px-5 py-2.5 bg-mint-600 hover:bg-mint-500 text-white text-sm font-semibold rounded-xl transition-all w-full"
        >
          {t('products.viewCatalog')}
        </button>
      </div>
    );
  }

  // ── Catalog stage (main view) ─────────────────────────────────────────────

  const isEmpty = stats.active === 0 && stats.inactive === 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-[--text-primary] flex items-center gap-2">
            <Package className="w-5 h-5 text-mint-500" />
            {t('products.title')}
          </h1>
          <p className="text-xs text-[--text-muted] mt-0.5">
            {t('products.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('products.deleteAll')}
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-mint-600 hover:bg-mint-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-mint-500/20"
          >
            <Upload className="w-4 h-4" />
            {isEmpty ? t('products.uploadBtn') : t('products.uploadNewBtn')}
          </button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />

      {error && (
        <div className="mb-4 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Stats */}
      {!isEmpty && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { icon: ShoppingCart, label: t('products.colProduct') + ' Aktif', value: stats.active, color: 'text-emerald-400' },
            { icon: BarChart2, label: 'Non-aktif', value: stats.inactive, color: 'text-amber-400' },
            { icon: Tag, label: t('products.fieldCategory'), value: categories.length, color: 'text-mint-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-[--surface-2] border border-[--border] rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[--surface-3] flex items-center justify-center flex-shrink-0">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <div className={`text-lg font-bold ${color}`}>{value}</div>
                <div className="text-[11px] text-[--text-muted]">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state with upload zone */}
      {isEmpty ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all ${
            isDragging
              ? 'border-mint-500 bg-mint-500/5'
              : 'border-[--border] hover:border-mint-500/50 hover:bg-[--surface-2]'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-[--surface-2] flex items-center justify-center">
            <FileSpreadsheet className="w-8 h-8 text-mint-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[--text-primary]">{t('products.dropTitle')}</p>
            <p className="text-xs text-[--text-muted] mt-1">{t('products.dropHint')}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-[--text-muted]">
            {['Nama', 'Kategori', 'Harga', 'Stok', 'Warna', 'Ukuran', 'RAM', '...'].map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-[--surface-3] rounded-md">{tag}</span>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Search & filter */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
              <input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('products.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 bg-[--surface-2] border border-[--border] rounded-xl text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={filterCat}
                onChange={(e) => handleCatFilter(e.target.value)}
                className="px-3 py-2 bg-[--surface-2] border border-[--border] rounded-xl text-sm text-[--text-primary] focus:outline-none focus:border-mint-500/60 cursor-pointer"
              >
                <option value="">{t('products.allCategories')}</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              title={t('products.uploadNewBtn')}
              className="p-2 bg-[--surface-2] border border-[--border] hover:border-mint-500/50 rounded-xl text-[--text-muted] hover:text-mint-400 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Product table */}
          <div className="bg-[--surface-2] border border-[--border] rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-[--border] bg-[--surface-3]">
              <span className="col-span-4 text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">{t('products.colProduct')}</span>
              <span className="col-span-2 text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">{t('products.colCategory')}</span>
              <span className="col-span-2 text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">{t('products.colPrice')}</span>
              <span className="col-span-2 text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">{t('products.colStock')}</span>
              <span className="col-span-2 text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">{t('products.colVariant')}</span>
            </div>

            {products.length === 0 ? (
              <div className="py-12 text-center text-sm text-[--text-muted]">{t('products.noProducts')}</div>
            ) : (
              <div className="divide-y divide-[--border]">
                {products.map((p) => (
                  <div key={p.id} className={`grid md:grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-[--surface-3]/40 transition-colors ${!p.is_active ? 'opacity-50' : ''}`}>
                    {/* Name + SKU */}
                    <div className="md:col-span-4">
                      <p className="text-sm font-medium text-[--text-primary] truncate">{p.name}</p>
                      {p.sku && <p className="text-[11px] text-[--text-muted]">SKU: {p.sku}</p>}
                    </div>
                    {/* Category */}
                    <div className="md:col-span-2">
                      <span className="text-xs text-[--text-secondary]">{p.category || '—'}</span>
                    </div>
                    {/* Price */}
                    <div className="md:col-span-2">
                      <span className="text-sm text-[--text-primary]">{formatPrice(p.price, p.currency)}</span>
                      {p.price_max && <p className="text-[11px] text-[--text-muted]">s/d {formatPrice(p.price_max, p.currency)}</p>}
                    </div>
                    {/* Stock */}
                    <div className="md:col-span-2">
                      <StockBadge
                        status={p.stock_status}
                        qty={p.stock_qty}
                        outLabel={t('products.outOfStock')}
                        preOrderLabel={t('products.preOrder')}
                        stockLabel={(qty) => t('products.stockQty', { qty })}
                        availLabel={t('products.available')}
                      />
                    </div>
                    {/* Specs */}
                    <div className="md:col-span-2 flex flex-wrap gap-1">
                      {p.specs && Object.entries(p.specs).slice(0, 3).map(([k, v]) => (
                        <span key={k} className="text-[10px] px-1.5 py-0.5 bg-[--surface-3] rounded text-[--text-muted]">
                          {v}
                        </span>
                      ))}
                      {p.specs && Object.keys(p.specs).length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-[--surface-3] rounded text-[--text-muted]">
                          +{Object.keys(p.specs).length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-[--text-muted]">{t('products.total', { total })}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePage(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg hover:bg-[--surface-3] text-[--text-muted] disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                  const p = Math.max(1, Math.min(pages - 4, page - 2)) + i;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePage(p)}
                      className={`w-7 h-7 text-xs rounded-lg transition-colors ${p === page ? 'bg-mint-600 text-white' : 'hover:bg-[--surface-3] text-[--text-muted]'}`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePage(page + 1)}
                  disabled={page >= pages}
                  className="p-1.5 rounded-lg hover:bg-[--surface-3] text-[--text-muted] disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Clear confirm modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[--surface-2] border border-[--border] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-semibold text-[--text-primary] mb-2">{t('products.deleteConfirmTitle')}</h3>
            <p className="text-sm text-[--text-muted] mb-5">{t('products.deleteConfirmDesc')}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2 text-sm text-[--text-secondary] hover:text-[--text-primary] border border-[--border] rounded-xl transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleClear} className="flex-1 py-2 bg-red-500 hover:bg-red-400 text-white text-sm font-semibold rounded-xl transition-colors">
                {t('products.deleteConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
