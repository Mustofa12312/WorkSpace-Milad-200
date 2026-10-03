import { useState, useCallback } from 'react';
import { Search, Filter, FileText, FileSpreadsheet, FileIcon, Download, MoreVertical, Upload, X, FileUp } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

import { useAppStore, type Document as DocType } from '../store/useAppStore';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/** Must match the limit in storage.rules. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export default function DocumentsView() {
  const { documents, addDocument, currentUser, currentOrgId } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Preview State
  const [previewDoc, setPreviewDoc] = useState<DocType | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error('Ukuran file maksimal 25 MB.');
        return;
      }
      setSelectedFile(file);
      setNewDocName(file.name);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxSize: MAX_UPLOAD_BYTES,
    multiple: false 
  });

  const handleUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDocName || newDocName.trim() === '' || !selectedFile) {
      toast.error('Mohon lengkapi nama dokumen dan pilih berkas.');
      return;
    }
    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      toast.error('Ukuran file maksimal 25 MB.');
      return;
    }
    
    setIsUploading(true);
    let type = 'doc';
    if (newDocName.toLowerCase().endsWith('.pdf') || selectedFile.name.endsWith('.pdf')) type = 'pdf';
    if (newDocName.toLowerCase().endsWith('.xlsx') || newDocName.toLowerCase().endsWith('.csv') || selectedFile.name.endsWith('.xlsx')) type = 'sheet';
    if (selectedFile.type.startsWith('image/')) type = 'image';

    const uploadToast = toast.loading('Mengunggah dokumen...');

    try {
      const storageRef = ref(storage, `orgs/${currentOrgId}/documents/${Date.now()}_${selectedFile.name}`);
      await uploadBytes(storageRef, selectedFile, { contentType: selectedFile.type || undefined });
      const downloadUrl = await getDownloadURL(storageRef);
      
      const fileSizeKB = Math.round(selectedFile.size / 1024);
      
      addDocument({
        id: `doc-${Date.now()}`,
        name: newDocName,
        type,
        size: `${fileSizeKB} KB`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        owner: currentUser?.name || 'Unknown',
        url: downloadUrl
      });
      
      setIsModalOpen(false);
      setNewDocName('');
      setSelectedFile(null);
      toast.success('Dokumen berhasil diunggah', { id: uploadToast });
    } catch (err) {
      console.error("Upload failed", err);
      toast.error("Gagal mengunggah dokumen", { id: uploadToast });
    } finally {
      setIsUploading(false);
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'pdf': return <FileIcon className="text-red-500" size={24} />;
      case 'sheet': return <FileSpreadsheet className="text-emerald-500" size={24} />;
      case 'doc': return <FileText className="text-blue-500" size={24} />;
      case 'image': return <FileIcon className="text-purple-500" size={24} />;
      default: return <FileIcon className="text-slate-500" size={24} />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Documents</h2>
            <p className="text-slate-500 mt-1">Manage proposals, reports, and meeting minutes.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <Upload size={18} />
            Upload File
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-white p-4 rounded-t-2xl border border-slate-200 border-b-0 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center bg-slate-50 rounded-xl px-4 py-2 w-full md:w-80 border border-slate-200 focus-within:ring-2 focus-within:ring-primary-500/20 transition-shadow">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              className="bg-transparent border-none outline-none ml-2 w-full text-sm placeholder-slate-400"
            />
          </div>
          <div className="flex gap-2 self-end md:self-auto">
            <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2">
              <Filter size={16} />
              Filter
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-slate-200 rounded-b-2xl overflow-hidden shadow-sm min-h-[300px]">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-4">
                <FileUp size={32} className="text-primary-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Belum Ada Dokumen</h3>
              <p className="text-slate-500 max-w-sm mb-6">Mulai kolaborasi dengan mengunggah dokumen pertama untuk tim Anda.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-primary-50 text-primary-600 hover:bg-primary-100 font-medium px-6 py-2.5 rounded-xl transition-colors"
              >
                Unggah Dokumen
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Owner</th>
                    <th className="py-4 px-6">Date Modified</th>
                    <th className="py-4 px-6">Size</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc) => (
                    <tr 
                      key={doc.id} 
                      onClick={() => setPreviewDoc(doc)}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            {getIcon(doc.type)}
                          </div>
                          <span className="font-semibold text-slate-800 text-sm group-hover:text-primary-600 transition-colors line-clamp-1">{doc.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-600 font-medium whitespace-nowrap">
                        {doc.owner}
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-500 font-medium whitespace-nowrap">
                        {doc.date}
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-500 font-medium whitespace-nowrap">
                        {doc.size}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <a 
                            href={doc.url} 
                            download 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-primary-600 p-2 rounded-lg hover:bg-primary-50 transition-colors flex items-center justify-center"
                          >
                            <Download size={18} />
                          </a>
                          <button className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors">
                            <MoreVertical size={18} />
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

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Upload Document</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-5">
              
              {/* Dropzone Area */}
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-3">
                  <FileUp size={24} className={isDragActive ? 'text-primary-600' : 'text-slate-400'} />
                </div>
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-700">Tarik dan lepas file di sini, atau klik</p>
                    <p className="text-xs text-slate-500 mt-1">Maksimal 25 MB</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Dokumen</label>
                <input 
                  type="text" 
                  required 
                  value={newDocName} 
                  onChange={e => setNewDocName(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" 
                  placeholder="Misalnya: Q3 Report.pdf" 
                />
              </div>
              
              <div className="pt-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
                <button type="submit" disabled={isUploading || !selectedFile} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-primary-500/30 disabled:opacity-50">
                  {isUploading ? 'Mengunggah...' : 'Unggah File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 md:p-10"
          onClick={() => setPreviewDoc(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full h-full max-w-5xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                {getIcon(previewDoc.type)}
                <div>
                  <h3 className="font-bold text-slate-800">{previewDoc.name}</h3>
                  <p className="text-xs text-slate-500">{previewDoc.size} • Diunggah oleh {previewDoc.owner}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {previewDoc.url && (
                  <a 
                    href={previewDoc.url} 
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    <Download size={16} />
                    Unduh
                  </a>
                )}
                <button 
                  onClick={() => setPreviewDoc(null)} 
                  className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 overflow-auto p-4 flex items-center justify-center relative">
              {!previewDoc.url ? (
                <div className="text-center text-slate-500">
                  <FileIcon size={48} className="mx-auto mb-3 opacity-20" />
                  <p>URL Pratinjau tidak tersedia untuk dokumen ini.</p>
                </div>
              ) : previewDoc.type === 'pdf' ? (
                <iframe src={previewDoc.url} className="w-full h-full rounded shadow-sm bg-white" title="PDF Preview" />
              ) : previewDoc.type === 'image' ? (
                <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-full object-contain rounded shadow-sm" />
              ) : (
                <div className="text-center text-slate-500">
                  <FileIcon size={48} className="mx-auto mb-3 opacity-20" />
                  <p>Format dokumen ini tidak dapat dipratinjau.</p>
                  <a href={previewDoc.url} download target="_blank" rel="noopener noreferrer" className="text-primary-600 font-medium mt-2 inline-block">
                    Unduh untuk melihat
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
