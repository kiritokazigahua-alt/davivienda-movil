import { create } from 'zustand';
import { User, Account, Transaction, Beneficiary } from '@/types';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  account: Account | null;
  transactions: Transaction[];
  beneficiaries: Beneficiary[];
  
  // Data fetching
  getAccount: () => Promise<Account>;
  getTransactions: () => Promise<Transaction[]>;
  getBeneficiaries: () => Promise<Beneficiary[]>;
  
  // Auth actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  
  // Account actions
  setAccount: (account: Account) => void;
  
  // Transaction actions
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  
  // Beneficiary actions
  setBeneficiaries: (beneficiaries: Beneficiary[]) => void;
  addBeneficiary: (beneficiary: Beneficiary) => void;
  
  // Modal states
  isReceiveMoneyModalOpen: boolean;
  isAddMoneyModalOpen: boolean;
  isWithdrawMoneyModalOpen: boolean;
  setReceiveMoneyModalOpen: (isOpen: boolean) => void;
  setAddMoneyModalOpen: (isOpen: boolean) => void;
  setWithdrawMoneyModalOpen: (isOpen: boolean) => void;
}

export const useStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  account: null,
  transactions: [],
  beneficiaries: [],
  
  // Modal states
  isReceiveMoneyModalOpen: false,
  isAddMoneyModalOpen: false,
  isWithdrawMoneyModalOpen: false,
  
  // Data fetching
  getAccount: async () => {
    try {
      const res = await apiRequest('GET', '/api/account');
      const account = await res.json();
      set({ account });
      return account;
    } catch (error) {
      throw error;
    }
  },
  
  getTransactions: async () => {
    try {
      const res = await apiRequest('GET', '/api/transactions');
      const transactions = await res.json();
      set({ transactions });
      return transactions;
    } catch (error) {
      throw error;
    }
  },
  
  getBeneficiaries: async () => {
    try {
      const res = await apiRequest('GET', '/api/beneficiaries');
      const beneficiaries = await res.json();
      set({ beneficiaries });
      return beneficiaries;
    } catch (error) {
      throw error;
    }
  },
  
  // Auth actions
  login: async (username: string, password: string) => {
    try {
      const res = await apiRequest('POST', '/api/auth/login', { username, password });
      const data = await res.json();
      
      set({ 
        isAuthenticated: true,
        user: data.user,
      });
      
      // Invalidate queries to fetch fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/beneficiaries'] });
    } catch (error) {
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      
      set({ 
        isAuthenticated: false,
        user: null,
        account: null,
        transactions: [],
        beneficiaries: []
      });
      
      // Clear queryClient cache
      queryClient.clear();
    } catch (error) {
      // If we couldn't connect to the server, we should still logout the user locally
      set({ 
        isAuthenticated: false,
        user: null,
        account: null,
        transactions: [],
        beneficiaries: []
      });
      
      queryClient.clear();
    }
  },
  
  setUser: (user) => set({ user }),
  
  // Account actions
  setAccount: (account) => set({ account }),
  
  // Transaction actions
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) => set(state => ({ 
    transactions: [transaction, ...state.transactions]
  })),
  
  // Beneficiary actions
  setBeneficiaries: (beneficiaries) => set({ beneficiaries }),
  addBeneficiary: (beneficiary) => set(state => ({
    beneficiaries: [...state.beneficiaries, beneficiary]
  })),
  
  // Modal actions
  setReceiveMoneyModalOpen: (isOpen) => set({ isReceiveMoneyModalOpen: isOpen }),
  setAddMoneyModalOpen: (isOpen) => set({ isAddMoneyModalOpen: isOpen }),
  setWithdrawMoneyModalOpen: (isOpen) => set({ isWithdrawMoneyModalOpen: isOpen }),
}));
