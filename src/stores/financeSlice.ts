import type { StateCreator } from 'zustand';
import type { FinanceTransaction } from '../types';
import type { AppState } from '../store/useAppStore';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { logAuditAction } from '../lib/audit';

export interface FinanceSlice {
  financeTransactions: FinanceTransaction[];
  setFinanceTransactions: (transactions: FinanceTransaction[]) => void;
  addFinanceTransaction: (transaction: FinanceTransaction) => Promise<void>;
  deleteFinanceTransaction: (transactionId: string) => Promise<void>;
}

export const createFinanceSlice: StateCreator<AppState, [], [], FinanceSlice> = (set, get) => ({
  financeTransactions: [],
  setFinanceTransactions: (financeTransactions) => set({ financeTransactions }),

  addFinanceTransaction: async (transaction) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try {
      const payload: Record<string, unknown> = {
        ...transaction,
        organizationId: orgId,
        createdAt: new Date().toISOString()
      };
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) delete payload[key];
      });
      await setDoc(doc(db, 'finances', transaction.id), payload);
      toast.success('Transaksi keuangan berhasil dicatat');
      if (user) {
        logAuditAction(orgId, user, 'CREATE', 'Finance', transaction.id, `Mencatat keuangan: ${transaction.title} (Rp ${transaction.amount})`);
      }
    } catch (err) {
      const e = err as Error;
      console.error('Firestore finances error:', e);
      toast.error(e.message || 'Gagal menyimpan transaksi keuangan');
      throw e;
    }
  },

  deleteFinanceTransaction: async (transactionId) => {
    const user = get().currentUser;
    const orgId = user?.organizationId || get().currentOrgId;
    try {
      await deleteDoc(doc(db, 'finances', transactionId));
      toast.success('Transaksi berhasil dihapus');
      if (user) {
        logAuditAction(orgId, user, 'DELETE', 'Finance', transactionId, `Menghapus transaksi keuangan: ${transactionId}`);
      }
    } catch (err) {
      const e = err as Error;
      console.error('Firestore finances error:', e);
      toast.error(e.message || 'Gagal menghapus transaksi keuangan');
      throw e;
    }
  }
});
