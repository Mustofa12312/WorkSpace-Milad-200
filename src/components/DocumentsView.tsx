import { useState } from 'react';
import { Search, Filter, FileText, FileSpreadsheet, FileIcon, Download, MoreVertical, Upload } from 'lucide-react';

import { useAppStore } from '../store/useAppStore';

export default function DocumentsView() {
  const { documents, addDocument } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName || newDocName.trim() === '') return;
    
    // Auto-detect type for icon
    let type = 'doc';
    if (newDocName.toLowerCase().endsWith('.pdf')) type = 'pdf';
    if (newDocName.toLowerCase().endsWith('.xlsx') || newDocName.toLowerCase().endsWith('.csv')) type = 'sheet';

    addDocument({
      id: `doc-${Date.now()}`,
      name: newDocName,
      type,
      size: '120 KB', // dummy size
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      owner: 'Mustofa' // Should be currentUser.name ideally
    });
    
    setIsModalOpen(false);
    setNewDocName('');
  };
  const getIcon = (type: string) => {
    switch(type) {
      case 'pdf': return <FileIcon className="text-red-500" size={24} />;
      case 'sheet': return <FileSpreadsheet className="text-emerald-500" size={24} />;
      case 'doc': return <FileText className="text-blue-500" size={24} />;
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
        <div className="bg-white p-4 rounded-t-2xl border border-slate-200 border-b-0 flex justify-between items-center">
          <div className="flex items-center bg-slate-50 rounded-xl px-4 py-2 w-80 border border-slate-200 focus-within:ring-2 focus-within:ring-primary-500/20 transition-shadow">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              className="bg-transparent border-none outline-none ml-2 w-full text-sm placeholder-slate-400"
            />
          </div>
          <div className="flex gap-2">
            <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2">
              <Filter size={16} />
              Filter
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-slate-200 rounded-b-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
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
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        {getIcon(doc.type)}
                      </div>
                      <span className="font-semibold text-slate-800 text-sm group-hover:text-primary-600 transition-colors">{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-600 font-medium">
                    {doc.owner}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-500 font-medium">
                    {doc.date}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-500 font-medium">
                    {doc.size}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-slate-400 hover:text-primary-600 p-2 rounded-lg hover:bg-primary-50 transition-colors">
                        <Download size={18} />
                      </button>
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

      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Upload Document</h3>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Document Name</label>
                <input type="text" required value={newDocName} onChange={e => setNewDocName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g., Q3 Report.pdf" />
                <p className="text-xs text-slate-500 mt-2">
                  Tip: End the name with .pdf or .xlsx to get the correct icon automatically!
                </p>
              </div>
              
              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-primary-500/30">Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
