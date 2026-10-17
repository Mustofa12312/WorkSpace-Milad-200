import { useState, useCallback } from 'react';
import {
  Search,
  FileText,
  FileSpreadsheet,
  FileIcon,
  Download,
  Trash2,
  Upload,
  X,
  FileUp,
  AlertCircle,
  ExternalLink,
  Link as LinkIcon,
  Pencil,
  Eye,
  Check,
  Presentation,
  Image as ImageIcon,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

import { useAppStore, type Document as DocType } from '../store/useAppStore';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/** Must match the limit in storage.rules (25 MB). */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
/** Fallback to inline Base64 storage if Firebase Storage fails on small files. */
const MAX_INLINE_BYTES = 1 * 1024 * 1024;

function detectFileType(name: string, mime?: string, url?: string): 'pdf' | 'sheet' | 'doc' | 'image' | 'presentation' | 'link' {
  const n = (name || '').toLowerCase();
  const m = (mime || '').toLowerCase();
  const u = (url || '').toLowerCase();

  if (u.includes('docs.google.com/spreadsheets') || n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.csv') || m.includes('sheet') || m.includes('excel') || m.includes('csv')) {
    return 'sheet';
  }
  if (u.includes('docs.google.com/presentation') || n.endsWith('.pptx') || n.endsWith('.ppt') || m.includes('presentation') || m.includes('powerpoint')) {
    return 'presentation';
  }
  if (n.endsWith('.pdf') || m.includes('pdf')) {
    return 'pdf';
  }
  if (m.startsWith('image/') || n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.webp') || n.endsWith('.svg') || n.endsWith('.gif')) {
    return 'image';
  }
  if (u.includes('docs.google.com') || u.includes('drive.google.com') || u.startsWith('http://') || u.startsWith('https://')) {
    if (n.endsWith('.docx') || n.endsWith('.doc')) return 'doc';
    return 'link';
  }
  return 'doc';
}

export default function DocumentsView() {
  const { documents, addDocument, updateDocument, deleteDocument, currentUser, currentOrgId } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'upload' | 'link'>('upload');
  const [newDocName, setNewDocName] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Edit State
  const [editingDoc, setEditingDoc] = useState<DocType | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');

  // Preview State
  const [previewDoc, setPreviewDoc] = useState<DocType | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<DocType | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  const filteredDocuments = documents.filter(doc => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (doc.name || '').toLowerCase().includes(query) || (doc.owner || '').toLowerCase().includes(query);
    const matchesType = selectedType === 'All' || doc.type === selectedType;
    return matchesSearch && matchesType;
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error('Ukuran file maksimal 25 MB.');
        return;
      }
      setSelectedFile(file);
      if (!newDocName) {
        setNewDocName(file.name);
      }
    }
  }, [newDocName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_UPLOAD_BYTES,
    multiple: false,
  });

  const handleUploadOrAddLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!newDocName.trim()) {
      toast.error('Mohon isi nama dokumen.');
      return;
    }

    const orgId = currentUser?.organizationId || currentOrgId || 'default-org';
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    // ─── Mode: Tautan Online ───
    if (modalMode === 'link') {
      if (!newDocUrl.trim()) {
        toast.error('Mohon masukkan URL tautan dokumen (misal Google Drive atau Docs).');
        return;
      }

      let formattedUrl = newDocUrl.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
      }

      setIsUploading(true);
      try {
        const type = detectFileType(newDocName, undefined, formattedUrl);
        await addDocument({
          id: `doc-${Date.now()}`,
          name: newDocName.trim(),
          type,
          size: 'Tautan Web',
          date: todayStr,
          owner: currentUser?.name || 'Admin',
          url: formattedUrl,
          organizationId: orgId,
        });

        setIsModalOpen(false);
        setNewDocName('');
        setNewDocUrl('');
      } catch (err) {
        console.error('Failed to add document link:', err);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // ─── Mode: Unggah Berkas ───
    if (!selectedFile) {
      toast.error('Silakan pilih berkas yang ingin diunggah.');
      return;
    }

    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      toast.error('Ukuran file maksimal 25 MB.');
      return;
    }

    setIsUploading(true);
    const type = detectFileType(selectedFile.name, selectedFile.type);
    const fileSizeKB = Math.round(selectedFile.size / 1024);
    const sizeStr = fileSizeKB >= 1024 ? `${(fileSizeKB / 1024).toFixed(1)} MB` : `${fileSizeKB} KB`;

    const uploadToast = toast.loading('Mengunggah dokumen...');

    try {
      let downloadUrl = '';

      // Try uploading to Firebase Storage
      try {
        const storageRef = ref(storage, `orgs/${orgId}/documents/${Date.now()}_${selectedFile.name}`);
        await uploadBytes(storageRef, selectedFile, { contentType: selectedFile.type || undefined });
        downloadUrl = await getDownloadURL(storageRef);
      } catch (storageErr) {
        console.warn('Firebase Storage upload failed, trying inline fallback:', storageErr);

        // Resilient fallback for small files (< 1MB)
        if (selectedFile.size <= MAX_INLINE_BYTES) {
          downloadUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile);
          });
          toast('Disimpan secara offline/lokal ke basis data', { icon: 'ℹ️' });
        } else {
          throw storageErr;
        }
      }

      await addDocument({
        id: `doc-${Date.now()}`,
        name: newDocName.trim(),
        type,
        size: sizeStr,
        date: todayStr,
        owner: currentUser?.name || 'Admin',
        url: downloadUrl,
        organizationId: orgId,
      });

      setIsModalOpen(false);
      setNewDocName('');
      setSelectedFile(null);
      toast.dismiss(uploadToast);
    } catch (err) {
      const e = err as Error;
      console.error('Upload failed', e);
      toast.error(e.message || 'Gagal mengunggah dokumen ke penyimpanan cloud', { id: uploadToast });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editName.trim()) {
      toast.error('Nama dokumen tidak boleh kosong');
      return;
    }

    try {
      const type = detectFileType(editName, undefined, editUrl);
      await updateDocument(editingDoc.id, {
        name: editName.trim(),
        url: editUrl.trim() || editingDoc.url,
        type,
      });

      // Update in preview if open
      if (previewDoc && previewDoc.id === editingDoc.id) {
        setPreviewDoc({
          ...previewDoc,
          name: editName.trim(),
          url: editUrl.trim() || editingDoc.url,
          type,
        });
      }

      setEditingDoc(null);
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileIcon className="text-red-500" size={22} />;
      case 'sheet':
        return <FileSpreadsheet className="text-emerald-500" size={22} />;
      case 'presentation':
        return <Presentation className="text-amber-500" size={22} />;
      case 'image':
        return <ImageIcon className="text-purple-500" size={22} />;
      case 'link':
        return <ExternalLink className="text-sky-500" size={22} />;
      case 'doc':
      default:
        return <FileText className="text-blue-500" size={22} />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Dokumen</h2>
            <p className="text-slate-500 mt-1 text-sm md:text-base">
              Kelola proposal, laporan, arsip surat, notulen rapat, dan berkas kepanitiaan.
            </p>
          </div>
          <button
            onClick={() => {
              setModalMode('upload');
              setNewDocName('');
              setNewDocUrl('');
              setSelectedFile(null);
              setIsModalOpen(true);
            }}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-sm shadow-primary-500/20 transition-all hover:shadow-md hover:-translate-y-0.5 self-start sm:self-auto cursor-pointer text-sm"
          >
            <Upload size={17} />
            Tambah Dokumen
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center bg-slate-50 rounded-xl px-3.5 py-2 w-full sm:w-80 border border-slate-200 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:bg-white transition-all">
            <Search size={16} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama dokumen atau pemilik..."
              className="bg-transparent border-none outline-none ml-2 w-full text-sm placeholder-slate-400 text-slate-700"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto items-center justify-end">
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-white transition-colors outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer w-full sm:w-auto"
            >
              <option value="All">Semua Tipe Dokumen</option>
              <option value="pdf">PDF</option>
              <option value="sheet">Spreadsheet / Excel</option>
              <option value="doc">Dokumen / Word</option>
              <option value="presentation">Presentasi / Slide</option>
              <option value="image">Gambar / Foto</option>
              <option value="link">Tautan Online</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs min-h-[300px]">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-4 text-primary-600">
                <FileUp size={30} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Belum Ada Dokumen</h3>
              <p className="text-slate-500 max-w-sm mb-6 text-sm">
                Mulai kolaborasi dengan mengunggah berkas proposal, surat, atau tautan Google Drive untuk tim Anda.
              </p>
              <button
                onClick={() => {
                  setModalMode('upload');
                  setIsModalOpen(true);
                }}
                className="bg-primary-600 text-white hover:bg-primary-700 font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm text-sm flex items-center gap-2 cursor-pointer"
              >
                <Upload size={16} /> Unggah Dokumen Pertama
              </button>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <AlertCircle size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Tidak ada dokumen yang sesuai pencarian</p>
              <p className="text-xs text-slate-400 mt-1">Coba kata kunci lain atau ubah filter tipe dokumen.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="py-3.5 px-6">Nama Dokumen</th>
                    <th className="py-3.5 px-6">Pemilik</th>
                    <th className="py-3.5 px-6">Tanggal</th>
                    <th className="py-3.5 px-6">Ukuran</th>
                    <th className="py-3.5 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocuments.map(doc => (
                    <tr
                      key={doc.id}
                      onClick={() => setPreviewDoc(doc)}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    >
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex-shrink-0 group-hover:scale-105 transition-transform">
                            {getIcon(doc.type)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800 text-sm group-hover:text-primary-600 transition-colors line-clamp-1">
                              {doc.name}
                            </span>
                            {doc.url && doc.url.startsWith('http') && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 line-clamp-1">
                                <LinkIcon size={10} /> {new URL(doc.url).hostname}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-600 font-medium whitespace-nowrap">
                        {doc.owner}
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-500 font-medium whitespace-nowrap">
                        {doc.date}
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-500 font-medium whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-md font-semibold">
                          {doc.size || 'Berkas'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        {/* Always visible on mobile, reveal on hover for desktop */}
                        <div
                          className="flex justify-end items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="text-slate-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                            title="Pratinjau"
                          >
                            <Eye size={17} />
                          </button>

                          {doc.url && (
                            <a
                              href={doc.url}
                              download={doc.type !== 'link'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center"
                              title={doc.type === 'link' ? 'Buka Tautan' : 'Unduh'}
                            >
                              {doc.type === 'link' ? <ExternalLink size={17} /> : <Download size={17} />}
                            </a>
                          )}

                          <button
                            onClick={() => {
                              setEditingDoc(doc);
                              setEditName(doc.name);
                              setEditUrl(doc.url || '');
                            }}
                            className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                            title="Ganti Nama"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            onClick={() => setConfirmDeleteDoc(doc)}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Hapus Dokumen"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal Unggah & Tambah Tautan ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                  <FileUp size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-800">Tambah Dokumen</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors cursor-pointer"
              >
                <X size={19} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="p-5 pb-0">
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModalMode('upload')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    modalMode === 'upload' ? 'bg-white text-primary-700 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Unggah Berkas
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('link')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    modalMode === 'link' ? 'bg-white text-primary-700 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Tautan / Google Drive
                </button>
              </div>
            </div>

            <form onSubmit={handleUploadOrAddLink} className="p-5 space-y-4">
              {modalMode === 'upload' ? (
                /* Dropzone Area */
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-primary-500 bg-primary-50/50'
                      : 'border-slate-300 hover:border-primary-400 bg-slate-50/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="w-12 h-12 bg-white rounded-xl shadow-xs border border-slate-100 flex items-center justify-center mx-auto mb-2.5">
                    <FileUp size={22} className={isDragActive ? 'text-primary-600' : 'text-slate-400'} />
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-bold text-slate-800 truncate max-w-[280px] mx-auto">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-primary-600 font-semibold mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Klik untuk ganti
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Tarik berkas ke sini atau klik</p>
                      <p className="text-xs text-slate-400 mt-1">Mendukung PDF, Word, Excel, Slide, Gambar (Maks 25 MB)</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Online Link Input */
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    URL / Tautan Dokumen <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:bg-white transition-all">
                    <LinkIcon size={16} className="text-slate-400 mr-2 flex-shrink-0" />
                    <input
                      type="url"
                      required
                      value={newDocUrl}
                      onChange={e => {
                        setNewDocUrl(e.target.value);
                        if (!newDocName && e.target.value) {
                          if (e.target.value.includes('docs.google.com/document')) setNewDocName('Google Docs Dokumen');
                          else if (e.target.value.includes('docs.google.com/spreadsheets')) setNewDocName('Google Sheets Anggaran');
                          else if (e.target.value.includes('drive.google.com')) setNewDocName('Google Drive Berkas');
                        }
                      }}
                      className="w-full bg-transparent border-none outline-none text-sm text-slate-700 placeholder-slate-400"
                      placeholder="https://docs.google.com/document/d/..."
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Bisa tautan Google Docs, Google Sheets, Canva, atau tautan Drive publik.
                  </p>
                </div>
              )}

              {/* Nama Dokumen */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Dokumen <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-slate-800"
                  placeholder="Contoh: Proposal Milad ke-20 Final.pdf"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading || (modalMode === 'upload' && !selectedFile)}
                  className="px-5 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? 'Menyimpan...' : modalMode === 'upload' ? 'Unggah Berkas' : 'Simpan Tautan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal Ganti Nama / Edit Dokumen ─── */}
      {editingDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Pencil size={16} />
                </div>
                <h3 className="text-base font-bold text-slate-800">Edit Dokumen</h3>
              </div>
              <button
                onClick={() => setEditingDoc(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors cursor-pointer"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Dokumen
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-slate-800"
                />
              </div>

              {editingDoc.type === 'link' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    URL Tautan
                  </label>
                  <input
                    type="url"
                    value={editUrl}
                    onChange={e => setEditUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-slate-800"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Check size={16} /> Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Preview Modal ─── */}
      {previewDoc && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-[60] flex items-center justify-center p-3 md:p-8 animate-in fade-in duration-150"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl w-full h-full max-w-5xl flex flex-col overflow-hidden shadow-2xl border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs flex-shrink-0">
                  {getIcon(previewDoc.type)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm md:text-base truncate">{previewDoc.name}</h3>
                  <p className="text-xs text-slate-500 truncate">
                    {previewDoc.size} • Diunggah oleh {previewDoc.owner} ({previewDoc.date})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {previewDoc.url && (
                  <a
                    href={previewDoc.url}
                    download={previewDoc.type !== 'link'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs md:text-sm font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    {previewDoc.type === 'link' ? <ExternalLink size={15} /> : <Download size={15} />}
                    <span className="hidden sm:inline">{previewDoc.type === 'link' ? 'Buka Tautan' : 'Unduh'}</span>
                  </a>
                )}

                <button
                  onClick={() => {
                    setEditingDoc(previewDoc);
                    setEditName(previewDoc.name);
                    setEditUrl(previewDoc.url || '');
                  }}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                  title="Ganti Nama"
                >
                  <Pencil size={18} />
                </button>

                <button
                  onClick={() => {
                    const toDelete = previewDoc;
                    setPreviewDoc(null);
                    setConfirmDeleteDoc(toDelete);
                  }}
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  title="Hapus"
                >
                  <Trash2 size={18} />
                </button>

                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 bg-slate-100 overflow-auto p-4 flex items-center justify-center relative">
              {!previewDoc.url ? (
                <div className="text-center text-slate-500 p-8">
                  <FileIcon size={48} className="mx-auto mb-3 opacity-20" />
                  <p className="font-semibold text-slate-700">URL Pratinjau tidak tersedia untuk dokumen ini.</p>
                </div>
              ) : previewDoc.type === 'pdf' ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-full rounded-xl shadow-xs bg-white border border-slate-200"
                  title="PDF Preview"
                />
              ) : previewDoc.type === 'image' ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-xs bg-white"
                />
              ) : previewDoc.type === 'link' ? (
                <div className="text-center bg-white p-8 rounded-2xl shadow-xs border border-slate-200 max-w-md mx-auto">
                  <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ExternalLink size={26} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">{previewDoc.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 break-all line-clamp-2">{previewDoc.url}</p>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shadow-xs"
                  >
                    <ExternalLink size={16} /> Buka Dokumen di Tab Baru
                  </a>
                </div>
              ) : (
                <div className="text-center bg-white p-8 rounded-2xl shadow-xs border border-slate-200 max-w-md mx-auto">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <FileIcon size={28} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">{previewDoc.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Format berkas ini ({previewDoc.type.toUpperCase()}) paling optimal dibuka langsung di aplikasi pembaca perangkat Anda.
                  </p>
                  <a
                    href={previewDoc.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shadow-xs"
                  >
                    <Download size={16} /> Unduh Berkas Sekarang
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-3 text-red-600">
              <AlertCircle size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-800">Hapus Dokumen?</h4>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong className="text-slate-700 font-semibold">"{confirmDeleteDoc.name}"</strong>?
              Dokumen ini akan dihapus dari daftar ruang kerja organisasi.
            </p>
            <div className="mt-5 flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirmDeleteDoc) {
                    await deleteDocument(confirmDeleteDoc.id);
                    setConfirmDeleteDoc(null);
                  }
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors text-sm shadow-xs cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
