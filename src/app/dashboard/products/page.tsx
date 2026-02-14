'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@/lib/user-context';

interface ImageEntry {
  filename: string;
  product: string | null;
  url: string;
}

interface ProductSummary {
  folder: string;
  name: string;
  image_count: number;
}

interface StoreData {
  folder: string;
  total_images: number;
  max_images: number;
  images: ImageEntry[];
  products: ProductSummary[];
}

export default function ProductsPage() {
  const { user } = useUser();
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [taggingFile, setTaggingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/images');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load images');
      }
      const data: StoreData = await res.json();
      setStoreData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Clear messages after 4s
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!storeData) return;

    const remaining = storeData.max_images - storeData.total_images;
    const limited = files.slice(0, remaining);
    setSelectedFiles(limited);

    // Generate previews
    const newPreviews: string[] = [];
    limited.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newPreviews.push(ev.target?.result as string);
        if (newPreviews.length === limited.length) {
          setPreviews([...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (limited.length === 0) {
      setPreviews([]);
    }
  };

  const removePreview = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);

    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);

    // Update file input
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      newFiles.forEach((f) => dt.items.add(f));
      fileInputRef.current.files = dt.files;
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setError('');

    try {
      const base64Images = await Promise.all(
        selectedFiles.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            })
        )
      );

      const res = await fetch('/api/dashboard/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: base64Images }),
      });

      const result = await res.json();

      if (result.success) {
        setSuccess(`${result.uploaded} image(s) uploaded successfully`);
        setSelectedFiles([]);
        setPreviews([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchImages();
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete image ${filename}?`)) return;
    setDeletingFile(filename);
    setError('');

    try {
      const res = await fetch(
        `/api/dashboard/images?filename=${encodeURIComponent(filename)}`,
        { method: 'DELETE' }
      );
      const result = await res.json();

      if (result.success) {
        setSuccess(`Image ${filename} deleted`);
        await fetchImages();
      } else {
        setError(result.error || 'Delete failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingFile(null);
    }
  };

  const handleTagChange = async (filename: string, product: string) => {
    setTaggingFile(filename);

    try {
      const res = await fetch(
        `/api/dashboard/images?filename=${encodeURIComponent(filename)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product }),
        }
      );
      const result = await res.json();

      if (result.success) {
        // Update local state
        setStoreData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            images: prev.images.map((img) =>
              img.filename === filename
                ? { ...img, product: product === '' ? null : product }
                : img
            ),
            products: prev.products.map((p) => ({
              ...p,
              image_count: prev.images.filter((img) => {
                const imgProduct = img.filename === filename
                  ? (product === '' ? null : product)
                  : img.product;
                return imgProduct === p.folder;
              }).length,
            })),
          };
        });
      } else {
        setError(result.error || 'Failed to update tag');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTaggingFile(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Product Images</h2>
        <div className="card text-center py-12">
          <p className="text-gray-500">No store linked to your account. Please contact admin.</p>
        </div>
      </div>
    );
  }

  const { images, products, total_images, max_images, folder } = storeData;
  const canUpload = total_images < max_images;
  const remaining = max_images - total_images;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Product Images</h2>
        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {total_images} / {max_images}
        </span>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600 ml-2">&times;</button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-2">&times;</button>
        </div>
      )}

      {/* Product Summary */}
      {products.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {products.map((p) => (
            <span
              key={p.folder}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full"
            >
              {p.name}
              <span className="bg-brand-200 text-brand-800 px-1.5 py-0.5 rounded-full text-[10px]">
                {p.image_count}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.filename} className="card !p-3 group">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/uploads/${folder}/images/${img.filename}`}
                  alt={img.filename}
                  className="w-full h-32 object-cover rounded-xl"
                  loading="lazy"
                />
                <button
                  onClick={() => handleDelete(img.filename)}
                  disabled={deletingFile === img.filename}
                  className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  title="Delete"
                >
                  {deletingFile === img.filename ? (
                    <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full inline-block" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="mt-2 text-xs text-gray-400 truncate">{img.filename}</div>

              {/* Product Tag Dropdown */}
              {products.length > 0 && (
                <select
                  value={img.product || ''}
                  onChange={(e) => handleTagChange(img.filename, e.target.value)}
                  disabled={taggingFile === img.filename}
                  className="mt-1.5 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none bg-white disabled:opacity-50 transition-colors"
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.folder} value={p.folder}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">No product images yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload images below to get started</p>
        </div>
      )}

      {/* Upload Section */}
      {canUpload ? (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload New Images
          </h3>

          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-brand-300 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="cursor-pointer">
              <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="text-sm text-gray-600">Click to select images</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WebP. Up to {remaining} more image{remaining !== 1 ? 's' : ''}.</p>
            </label>
          </div>

          {/* Preview Area */}
          {previews.length > 0 && (
            <div className="mt-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Preview ${i + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => removePreview(i)}
                      className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="mt-4 btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload {selectedFiles.length} Image{selectedFiles.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-700 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Maximum {max_images} images reached. Delete some images to upload new ones.
            {user?.plan === 'lite' && (
              <a href="/dashboard/upgrade" className="ml-1 font-semibold underline">Upgrade to Pro for 20 images</a>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
