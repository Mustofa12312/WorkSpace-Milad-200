import { useState, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Download, 
  Printer, 
  X, 
  Check, 
  ExternalLink,
  FileCheck2,
  DollarSign
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';
import { useAppStore, type FinanceTransaction, type TransactionType, type FinanceCategory } from '../store/useAppStore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES: FinanceCategory[] = [
  'Sponsorship',
  'Donasi',
  'Kas Organisasi',
  'Konsumsi',
  'Perlengkapan',
  'Acara & Panggung',
  'Humas & Publikasi',
  'Kesekretariatan',
  'Lain-lain',
];

export default function FinanceView() {
  const { financeTransactions, addFinanceTransaction, deleteFinanceTransaction, currentUser } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState<FinanceCategory>('Konsumsi');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');
  const [formReceiptUrl, setFormReceiptUrl] = useState('');

  // Calculations
  const totalIncome = useMemo(() => {
    return financeTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [financeTransactions]);

  const totalExpense = useMemo(() => {
    return financeTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [financeTransactions]);

  const netBalance = totalIncome - totalExpense;
  const expensePercentage = totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0;

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return financeTransactions.filter(t => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        (t.title || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.recordedBy || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q);
      const matchesType = filterType === 'All' || t.type === filterType;
      const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
      return matchesSearch && matchesType && matchesCategory;
    }).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [financeTransactions, searchTerm, filterType, filterCategory]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleOpenCreate = () => {
    setFormTitle('');
    setFormType('expense');
    setFormAmount('');
    setFormCategory('Konsumsi');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setFormReceiptUrl('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount.replace(/[^0-9]/g, ''));
    if (!formTitle.trim()) {
      toast.error('Keterangan transaksi harus diisi');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Jumlah nominal harus lebih dari 0');
      return;
    }

    setIsSaving(true);
    try {
      const newTx: FinanceTransaction = {
        id: `fin-${Date.now()}`,
        title: formTitle.trim(),
        type: formType,
        amount: amountNum,
        category: formCategory,
        date: formDate || new Date().toISOString().split('T')[0],
        recordedBy: currentUser?.name || 'Panitia',
        notes: formNotes.trim() || undefined,
        receiptUrl: formReceiptUrl.trim() || undefined,
      };

      await addFinanceTransaction(newTx);
      setIsModalOpen(false);
    } catch {
      // toast is handled in slice
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Hapus catatan transaksi: "${title}"?`)) return;
    await deleteFinanceTransaction(id);
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('Belum ada transaksi untuk diekspor');
      return;
    }

    const headers = ['No', 'Judul Transaksi', 'Tipe', 'Kategori', 'Nominal (Rp)', 'Tanggal', 'Dicatat Oleh', 'Catatan'];
    const rows = filteredTransactions.map((t, idx) => [
      `"${idx + 1}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}"`,
      `"${t.category || ''}"`,
      `"${t.amount}"`,
      `"${t.date || ''}"`,
      `"${(t.recordedBy || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Keuangan_Milad200_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Berhasil mengekspor ${filteredTransactions.length} transaksi`);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Wallet className="text-emerald-600" /> Anggaran & Keuangan (RAB)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Catatan transparansi dana masuk, belanja divisi, dan saldo kas operasional Panitia Milad 200.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              title="Cetak Berita Acara Rekapitulasi Keuangan Resmi"
            >
              <Printer size={16} className="text-slate-600" /> Cetak Laporan
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              title="Unduh rekap data dalam format spreadsheet CSV"
            >
              <Download size={16} className="text-slate-600" /> Export CSV
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <Plus size={16} /> Catat Transaksi
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sisa Saldo Kas */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Saldo Kas Bersih</span>
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center font-bold", netBalance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                <Wallet size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className={cn("text-2xl font-black tracking-tight", netBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {formatRupiah(netBalance)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Sisa dana riil panitia</p>
            </div>
          </div>

          {/* Total Pemasukan */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Pemasukan</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-slate-800 tracking-tight">
                {formatRupiah(totalIncome)}
              </div>
              <p className="text-xs text-blue-600 font-medium mt-1">Dari sponsor, kas & donasi</p>
            </div>
          </div>

          {/* Total Pengeluaran */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Pengeluaran</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <TrendingDown size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-slate-800 tracking-tight">
                {formatRupiah(totalExpense)}
              </div>
              <p className="text-xs text-rose-600 font-medium mt-1">Belanja divisi & operasional</p>
            </div>
          </div>

          {/* Rasio Anggaran */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Realisasi Anggaran</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-2xl font-black text-slate-800 tracking-tight">{expensePercentage}%</span>
                <span className="text-xs text-slate-400">terpakai</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-500", expensePercentage > 90 ? "bg-rose-500" : expensePercentage > 75 ? "bg-amber-500" : "bg-primary-500")}
                  style={{ width: `${expensePercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 bg-white p-2 rounded-xl shadow-xs border border-slate-200">
          <div className="flex-1 flex items-center gap-2 px-3 border-b sm:border-b-0 sm:border-r border-slate-100">
            <Search size={16} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Cari transaksi, divisi, atau pencatat..."
              className="w-full bg-transparent border-none outline-none text-sm py-2 text-slate-700"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-3 border-b sm:border-b-0 sm:border-r border-slate-100">
            <Filter size={16} className="text-slate-400 flex-shrink-0" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-700 font-medium cursor-pointer py-2 w-full sm:w-auto"
            >
              <option value="All">Semua Jenis</option>
              <option value="income">Pemasukan (+)</option>
              <option value="expense">Pengeluaran (-)</option>
            </select>
          </div>
          <div className="flex items-center gap-2 px-3">
            <span className="text-xs font-semibold text-slate-400">Kategori:</span>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-700 font-medium cursor-pointer py-2 w-full sm:w-auto"
            >
              <option value="All">Semua Kategori</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <Wallet size={44} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">Belum Ada Transaksi Keuangan</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              Catat pemasukan dana sponsorship, donasi, atau belanja kebutuhan divisi kepanitiaan Anda.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-4 py-2 rounded-xl hover:bg-primary-100 transition-colors cursor-pointer"
            >
              <Plus size={16} /> Catat Transaksi Baru
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3 w-1/3">Keterangan Transaksi</th>
                    <th className="px-5 py-3">Kategori Divisi</th>
                    <th className="px-5 py-3">Tanggal</th>
                    <th className="px-5 py-3 text-right">Nominal (Rp)</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-start gap-2.5">
                          <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", tx.type === 'income' ? "bg-emerald-500" : "bg-rose-500")} />
                          <div>
                            <p className="font-semibold text-slate-800">{tx.title}</p>
                            {tx.notes && <p className="text-xs text-slate-500 mt-0.5">{tx.notes}</p>}
                            <p className="text-[11px] text-slate-400 mt-1">Dicatat oleh: {tx.recordedBy}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top whitespace-nowrap">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top whitespace-nowrap text-xs text-slate-600">
                        {tx.date}
                      </td>
                      <td className="px-5 py-4 align-top text-right whitespace-nowrap">
                        <span className={cn("font-bold text-sm", tx.type === 'income' ? "text-emerald-600" : "text-rose-600")}>
                          {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                        </span>
                        {tx.receiptUrl && (
                          <div className="mt-1">
                            <a
                              href={tx.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-primary-600 hover:underline"
                            >
                              <ExternalLink size={11} /> Bukti Nota
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(tx.id, tx.title)}
                          title="Hapus transaksi"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Modal Catat Transaksi Baru ─── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Wallet size={17} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Catat Transaksi Keuangan</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                {/* Tipe Transaksi: Income / Expense */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jenis Transaksi <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setFormType('income'); if (formCategory === 'Konsumsi') setFormCategory('Sponsorship'); }}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        formType === 'income' ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <TrendingUp size={15} /> Pemasukan Dana (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFormType('expense'); if (formCategory === 'Sponsorship') setFormCategory('Konsumsi'); }}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        formType === 'expense' ? "bg-rose-50 border-rose-300 text-rose-700 shadow-2xs" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <TrendingDown size={15} /> Pengeluaran Belanja (-)
                    </button>
                  </div>
                </div>

                {/* Judul Transaksi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama / Keterangan Transaksi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder={formType === 'income' ? "cth. Dana Sponsor dari Mitra Utama" : "cth. Pembelian Konsumsi Rapat Pleno #2"}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                  />
                </div>

                {/* Nominal & Kategori */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Jumlah Nominal (Rp) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={formAmount}
                      onChange={e => setFormAmount(e.target.value)}
                      placeholder="cth. 500000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Kategori Divisi
                    </label>
                    <select
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value as FinanceCategory)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tanggal & Bukti Link */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tanggal Transaksi
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Link Bukti / Kwitansi (Opsional)
                    </label>
                    <input
                      type="url"
                      value={formReceiptUrl}
                      onChange={e => setFormReceiptUrl(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>

                {/* Catatan Tambahan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Catatan Rincian
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Catatan tambahan, rincian barang, toko belanja..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Check size={16} />
                    {isSaving ? 'Menyimpan...' : 'Simpan Transaksi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── Modal Cetak Laporan Keuangan Resmi (Kop Surat) ─── */}
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
              {/* Header Toolbar (screen only) */}
              <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="text-primary-600" size={18} />
                  <h3 className="text-sm font-bold text-slate-800">
                    Pratinjau Laporan Keuangan & RAB Resmi
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    <Printer size={14} /> Cetak / Unduh PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Printable Document Sheet */}
              <div className="p-6 md:p-10 overflow-y-auto bg-slate-100/50 print:p-0 print:bg-white">
                <div className="bg-white p-8 md:p-12 rounded-xl shadow-xs border border-slate-200 max-w-3xl mx-auto print:border-none print:shadow-none print:p-0">
                  {/* Kop Surat Organisasi */}
                  <div className="text-center pb-4 border-b-2 border-slate-900">
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">
                      PANITIA PERINGATAN MILAD 200 TAHUN
                    </p>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-wide uppercase">
                      LAPORAN REKAPITULASI REALISASI ANGGARAN & KEUANGAN
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      Bidang Keuangan & Bendahara Bersama • Audit Transparansi Dana Kepanitiaan
                    </p>
                  </div>
                  <div className="h-[2px] bg-slate-900 mt-1 mb-6" />

                  {/* Ringkasan Finansial Cetak */}
                  <div className="grid grid-cols-3 text-xs text-slate-700 mb-6 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <div>
                      <p className="text-slate-500">Total Pemasukan</p>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{formatRupiah(totalIncome)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Total Pengeluaran</p>
                      <p className="font-bold text-rose-600 text-sm mt-0.5">{formatRupiah(totalExpense)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Sisa Kas Bersih</p>
                      <p className="font-bold text-emerald-600 text-sm mt-0.5">{formatRupiah(netBalance)}</p>
                    </div>
                  </div>

                  {/* Tabel Transaksi */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden mb-8">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                          <th className="py-2.5 px-3 w-8 text-center border-r border-slate-300">No.</th>
                          <th className="py-2.5 px-3 border-r border-slate-300">Keterangan</th>
                          <th className="py-2.5 px-3 w-32 border-r border-slate-300">Kategori</th>
                          <th className="py-2.5 px-3 w-24 border-r border-slate-300">Tanggal</th>
                          <th className="py-2.5 px-3 w-32 text-right">Nominal (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredTransactions.map((tx, idx) => (
                          <tr key={tx.id} className="align-top">
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 font-semibold text-slate-600">{idx + 1}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-medium text-slate-900 leading-relaxed">
                              {tx.title}
                              {tx.notes && <p className="text-[10px] text-slate-500 italic mt-0.5">{tx.notes}</p>}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 text-slate-700">{tx.category}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 text-slate-600 whitespace-nowrap">{tx.date}</td>
                            <td className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                              <span className={tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}>
                                {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pengesahan Tanda Tangan */}
                  <div className="grid grid-cols-2 gap-8 text-xs text-center mt-10 pt-4">
                    <div>
                      <p className="text-slate-500 mb-16">Bendahara Panitia,</p>
                      <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-[160px]">
                        Bendahara Pelaksana
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-16">Ketua Panitia Milad 200,</p>
                      <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-[160px]">
                        {currentUser?.name || 'Ketua Panitia'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
