'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UpgradeGate from '@/components/user/UpgradeGate';

interface Review {
  id: number;
  reviewer_name: string;
  reviewer_photo_keyword: string;
  rating: number;
  review_text: string;
  created_at: string;
}

type ReviewForm = {
  reviewer_name: string;
  reviewer_photo_keyword: string;
  rating: number;
  review_text: string;
};

const emptyForm: ReviewForm = { reviewer_name: '', reviewer_photo_keyword: '', rating: 5, review_text: '' };

export default function ReviewsPage() {
  return <UpgradeGate><ReviewsContent /></UpgradeGate>;
}

function ReviewsContent() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [form, setForm] = useState<ReviewForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/user/reviews');
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch {
      setError('Gagal memuat ulasan');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Clear error after 4s
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  function openAddModal() {
    setEditingReview(null);
    setForm(emptyForm);
    setModalError('');
    setModalOpen(true);
  }

  function openEditReview(review: Review) {
    setEditingReview(review);
    setForm({
      reviewer_name: review.reviewer_name,
      reviewer_photo_keyword: review.reviewer_photo_keyword,
      rating: review.rating,
      review_text: review.review_text,
    });
    setModalError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingReview(null);
    setForm(emptyForm);
    setModalError('');
  }

  async function handleGenerateAiReviews() {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/user/reviews/generate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setReviews(data.reviews);
        setError('');
      } else {
        setError(data.error || 'Gagal membuat ulasan AI');
      }
    } catch {
      setError('Gagal menghubungi server');
    }
    setGenerating(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.reviewer_name.trim() || !form.review_text.trim()) return;
    setSaving(true);
    setModalError('');

    if (editingReview) {
      // Optimistic update
      const prev = [...reviews];
      const updated: Review = {
        ...editingReview,
        reviewer_name: form.reviewer_name,
        reviewer_photo_keyword: form.reviewer_photo_keyword,
        rating: form.rating,
        review_text: form.review_text,
      };
      setReviews((r) => r.map((x) => (x.id === editingReview.id ? updated : x)));
      closeModal();

      try {
        const res = await fetch('/api/user/reviews', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingReview.id, ...form }),
        });
        const data = await res.json();
        if (data.success) {
          fetchReviews();
        } else {
          setReviews(prev);
          setError(data.error || 'Gagal mengubah ulasan');
        }
      } catch {
        setReviews(prev);
        setError('Gagal menghubungi server');
      }
    } else {
      // Optimistic add with temp id
      const tempId = -Date.now();
      const newReview: Review = {
        id: tempId,
        reviewer_name: form.reviewer_name,
        reviewer_photo_keyword: form.reviewer_photo_keyword,
        rating: form.rating,
        review_text: form.review_text,
        created_at: new Date().toISOString(),
      };
      setReviews((r) => [...r, newReview]);
      closeModal();

      try {
        const res = await fetch('/api/user/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (data.success) {
          setReviews((r) => r.map((x) => (x.id === tempId ? { ...x, id: data.id } : x)));
        } else {
          setReviews((r) => r.filter((x) => x.id !== tempId));
          setError(data.error || 'Gagal menambah ulasan');
        }
      } catch {
        setReviews((r) => r.filter((x) => x.id !== tempId));
        setError('Gagal menghubungi server');
      }
    }

    setSaving(false);
  }

  async function handleDelete(id: number) {
    setDeletingId(id);

    // Optimistic delete
    const prev = [...reviews];
    setReviews((r) => r.filter((x) => x.id !== id));
    setConfirmDeleteId(null);

    try {
      const res = await fetch(`/api/user/reviews?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setReviews(prev);
        setError(data.error || 'Gagal menghapus ulasan');
      }
    } catch {
      setReviews(prev);
      setError('Gagal menghubungi server');
    }

    setDeletingId(null);
  }

  // Close modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalOpen) closeModal();
        if (confirmDeleteId !== null) setConfirmDeleteId(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-mint-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 flex items-center justify-between"
          >
            <span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 ml-3">&times;</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-[--text-primary]">Ulasan Pelanggan</h2>
          {reviews.length > 0 && (
            <span className="text-xs bg-mint-500/20 text-mint-400 px-2 py-0.5 rounded-full font-medium">
              {reviews.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateAiReviews}
            disabled={generating}
            className="btn-primary text-sm !py-2.5 !px-5 flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {generating ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
            Generate AI
          </button>
          <button
            onClick={openAddModal}
            className="btn-primary text-sm !py-2.5 !px-5 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Ulasan
          </button>
        </div>
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="glass-dark rounded-2xl p-12 text-center">
          <svg className="w-16 h-16 text-[--text-muted] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <h3 className="text-[--text-muted] font-medium mb-1">Belum ada ulasan</h3>
          <p className="text-[--text-muted] text-sm mb-5">Buat ulasan AI atau tambahkan testimonial pelanggan.</p>
          <button onClick={handleGenerateAiReviews} disabled={generating} className="btn-primary text-sm !py-2.5 !px-5 inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50">
            {generating ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
            Generate AI Reviews
          </button>
        </div>
      ) : (
        <motion.div layout className="space-y-4">
          <AnimatePresence mode="popLayout">
            {reviews.map((review) => (
              <motion.div
                key={review.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="glass-dark rounded-2xl p-5"
              >
                {confirmDeleteId === review.id ? (
                  // Delete confirmation
                  <div className="text-center py-4">
                    <p className="text-[--text-secondary] text-sm font-medium mb-1">Hapus ulasan ini?</p>
                    <div className="flex justify-center gap-2 mt-4">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-4 py-2 rounded-xl text-sm text-[--text-muted] hover:text-[--text-primary] bg-[--surface-3] hover:bg-[--surface-2] transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleDelete(review.id)}
                        disabled={deletingId === review.id}
                        className="px-4 py-2 rounded-xl text-sm text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {deletingId === review.id && (
                          <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full inline-block" />
                        )}
                        Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  // Review content
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-mint-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {review.reviewer_name.charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[--text-primary] font-medium text-sm">{review.reviewer_name}</h4>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-[--text-muted]'}>★</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-[--text-muted] text-sm mt-2 leading-relaxed">{review.review_text}</p>
                      <p className="text-[--text-muted] text-xs mt-2">Photo keyword: {review.reviewer_photo_keyword || 'default'}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditReview(review)}
                        className="p-1.5 text-[--text-muted] hover:text-mint-400 hover:bg-mint-500/10 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(review.id)}
                        className="p-1.5 text-[--text-muted] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-[--surface-1] border border-[--border] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 border-b border-[--border]">
                <h3 className="text-lg font-semibold text-[--text-primary]">
                  {editingReview ? 'Edit Ulasan' : 'Tambah Ulasan'}
                </h3>
                <button onClick={closeModal} className="text-[--text-muted] hover:text-[--text-secondary] text-xl leading-none">&times;</button>
              </div>

              {/* Modal body */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {modalError && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 text-sm">
                    {modalError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">Nama Reviewer <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Budi Santoso"
                    value={form.reviewer_name}
                    onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">Keyword Foto (opsional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="man1, woman1, dll"
                    value={form.reviewer_photo_keyword}
                    onChange={(e) => setForm({ ...form, reviewer_photo_keyword: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">Rating</label>
                  <select
                    className="form-select"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} Bintang</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">Ulasan <span className="text-red-400">*</span></label>
                  <textarea
                    rows={4}
                    className="form-textarea"
                    placeholder="Tulis ulasan pengalaman pelanggan..."
                    value={form.review_text}
                    onChange={(e) => setForm({ ...form, review_text: e.target.value })}
                    required
                  />
                </div>

                {/* Modal footer */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2.5 rounded-xl text-sm text-[--text-muted] hover:text-[--text-primary] bg-[--surface-3] hover:bg-[--surface-2] transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !form.reviewer_name.trim() || !form.review_text.trim()}
                    className="btn-primary text-sm !py-2.5 !px-6 flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving && (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                    )}
                    {editingReview ? 'Simpan' : 'Tambah'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
