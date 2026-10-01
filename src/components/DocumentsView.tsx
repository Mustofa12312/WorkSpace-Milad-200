import { Search, Plus, Filter, FileText, FileSpreadsheet, FileIcon, Download, MoreVertical, Upload } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MOCK_DOCS = [
  { id: '1', name: 'Proposal Milad 200 Final.pdf', type: 'pdf', size: '2.4 MB', date: 'Sep 28, 2026', owner: 'Mustofa' },
  { id: '2', name: 'RAB Kegiatan (Revisi).xlsx', type: 'sheet', size: '156 KB', date: 'Sep 25, 2026', owner: 'Ahmad F.' },
  { id: '3', name: 'Notula Rapat Pleno I.docx', type: 'doc', size: '42 KB', date: 'Sep 20, 2026', owner: 'Hasan S.' },
  { id: '4', name: 'Surat Undangan Pembicara.pdf', type: 'pdf', size: '1.1 MB', date: 'Sep 15, 2026', owner: 'Fatimah Z.' },
];

export default function DocumentsView() {
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
          <button className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 shadow-sm shadow-primary-500/30 transition-all hover:shadow-md hover:-translate-y-0.5">
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
              {MOCK_DOCS.map((doc) => (
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
    </div>
  );
}
