import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  Product,
  Customer,
  MilkEntry,
  Challan,
  Purchase,
  Payment,
  Expense,
  BankCashSession,
  AppSettings,
  AppScreen,
  Shift,
  Bill,
  ChallanSettlement,
  BankCashTransaction,
  SyncStatusType,
  BackupMeta,
  KhaliCrateTransport,
} from '../types';
import { dbInstance, DEFAULT_SETTINGS, INITIAL_CUSTOMERS } from '../db/indexedDb';
import { backupService } from '../services/backupService';
import { hashPin } from '../utils/crypto';

export interface RecentActivityItem {
  id: string;
  type: 'MILK_ENTRY' | 'PURCHASE' | 'PAYMENT' | 'EXPENSE' | 'BILL' | 'CHALLAN' | 'SETTLEMENT';
  title: string;
  subtitle: string;
  amount?: number;
  qty?: number;
  date: string;
  time?: string;
  createdAt: string;
}

export interface AppContextType {
  // Navigation & Screen Stack
  activeScreen: AppScreen;
  screenStack: AppScreen[];
  navigateTo: (screen: AppScreen) => void;
  setActiveScreen: (screen: AppScreen) => void;
  goBack: () => void;
  canGoBack: boolean;

  // Theme & App State
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  activeShift: Shift;
  setActiveShift: (shift: Shift) => void;

  // Data
  products: Product[];
  customers: Customer[];
  milkEntries: MilkEntry[];
  challans: Challan[];
  purchases: Purchase[];
  payments: Payment[];
  expenses: Expense[];
  bankCashSessions: BankCashSession[];
  bills: Bill[];
  bankTransactions: BankCashTransaction[];
  challanSettlements: ChallanSettlement[];
  settings: AppSettings;
  isLoading: boolean;
  isRefreshing: boolean;

  // Balances
  cashBalance: number;
  bankBalance: number;
  upiBalance: number;
  totalAvailableBalance: number;
  customerBalances: Record<string, number>;

  // Security & App Lock
  isAppLocked: boolean;
  unlockApp: () => void;
  lockApp: () => void;
  setAppPin: (pin: string) => Promise<void>;
  disableAppLock: () => Promise<void>;

  // Excel & Notifications Center Modals
  isExcelModalOpen: boolean;
  excelModalTab: 'export' | 'import';
  openExcelModal: (tab?: 'export' | 'import') => void;
  closeExcelModal: () => void;
  isNotificationsModalOpen: boolean;
  openNotificationsModal: () => void;
  closeNotificationsModal: () => void;
  activeAlertsCount: number;

  // Actions
  refreshAllData: () => Promise<void>;
  saveCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  saveProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveMilkEntry: (entry: MilkEntry) => Promise<void>;
  deleteMilkEntry: (id: string) => Promise<void>;
  saveChallan: (challan: Challan) => Promise<void>;
  deleteChallan: (id: string) => Promise<void>;
  savePurchase: (purchase: Purchase) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  savePayment: (payment: Payment) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  saveExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  saveBankCashSession: (session: BankCashSession) => Promise<void>;
  saveBill: (bill: Bill) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  generateNextBillNumber: () => string;
  saveBankTransaction: (tx: BankCashTransaction) => Promise<void>;
  deleteBankTransaction: (id: string) => Promise<void>;
  saveChallanSettlement: (settlement: ChallanSettlement) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;

  // Khali Crate Module
  crateTransports: KhaliCrateTransport[];
  saveCrateTransport: (entry: KhaliCrateTransport) => Promise<void>;
  deleteCrateTransport: (id: string) => Promise<void>;
  khaliCrateMetrics: {
    totalReceived: number;
    totalTransportGiven: number;
    balance: number;
  };

  // Calculations
  getCustomerBalance: (customerId: string) => number;
  getCustomerSummary: (customerId: string) => {
    opening: number;
    totalBilled: number;
    totalPaid: number;
    balance: number;
    amQty: number;
    pmQty: number;
    totalMilkQty: number;
  };
  getStockForDate: (date: string, shiftFilter?: Shift | 'ALL') => Array<{
    product: Product;
    receivedQty: number;
    receivedCrates: number;
    distributedQty: number;
    distributedAM: number;
    distributedPM: number;
    balanceQty: number;
  }>;
  dashboardMetrics: {
    todayReceivedPouches: number;
    todayReceivedCrates: number;
    todayDistributedPouches: number;
    todayRemainingPouches: number;
    todaySalesAmount: number;
    todayCashCollected: number;
    todayUpiCollected: number;
    todayBankCollected: number;
    todayTotalCollected: number;
    todayExpensesAmount: number;
    totalOutstandingAmount: number;
  };

  // Toast / Status banner
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  toast: { message: string; type: 'success' | 'info' | 'warning' } | null;

  // Scanner reprocess data
  reprocessChallanData: Challan | null;
  setReprocessChallanData: (c: Challan | null) => void;

  // Offline & Backup Sync
  isOnline: boolean;
  syncStatus: SyncStatusType;
  backupMeta: BackupMeta;
  triggerManualBackup: () => Promise<{
    success: boolean;
    error?: string;
    timestamp?: string;
    recordsCount?: number;
  }>;
  toggleAutoBackup: (enabled: boolean) => void;
  connectGoogleAccount: (email: string, token: string, name?: string) => void;
  disconnectGoogleAccount: () => void;
  restoreFromSnapshot: (data: Record<string, unknown>) => Promise<{
    success: boolean;
    counts: Record<string, number>;
    totalRestored: number;
    error?: string;
  }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDefaultShift = (): Shift => {
  const hour = new Date().getHours();
  // Morning shift typically before 1:00 PM (13:00)
  return hour < 13 ? 'AM' : 'PM';
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeScreen, setActiveScreen] = useState<AppScreen>('dashboard');
  const [screenStack, setScreenStack] = useState<AppScreen[]>(['dashboard']);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [activeShift, setActiveShift] = useState<Shift>(getDefaultShift());

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [milkEntries, setMilkEntries] = useState<MilkEntry[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankCashSessions, setBankCashSessions] = useState<BankCashSession[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankCashTransaction[]>([]);
  const [challanSettlements, setChallanSettlements] = useState<ChallanSettlement[]>([]);
  const [crateTransports, setCrateTransports] = useState<KhaliCrateTransport[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [reprocessChallanData, setReprocessChallanData] = useState<Challan | null>(null);

  // App Lock State
  const [isAppLocked, setIsAppLocked] = useState<boolean>(false);

  // Excel Modal State
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelModalTab, setExcelModalTab] = useState<'export' | 'import'>('export');
  const openExcelModal = useCallback((tab: 'export' | 'import' = 'export') => {
    setExcelModalTab(tab);
    setIsExcelModalOpen(true);
  }, []);
  const closeExcelModal = useCallback(() => {
    setIsExcelModalOpen(false);
  }, []);

  // Notifications Modal State
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const openNotificationsModal = useCallback(() => {
    setIsNotificationsModalOpen(true);
  }, []);
  const closeNotificationsModal = useCallback(() => {
    setIsNotificationsModalOpen(false);
  }, []);

  // Data Safety, Offline Detection & Sync State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [backupMeta, setBackupMeta] = useState<BackupMeta>(() => backupService.getMeta());
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
    const current = backupService.getMeta();
    if (current.backupStatus === 'pending') return 'pending';
    if (current.backupStatus === 'in_progress') return 'syncing';
    if (current.backupStatus === 'failed') return 'error';
    return 'synced';
  });

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3000);
  }, []);

  // Listen to network changes and backup service notifications
  useEffect(() => {
    const unsub = backupService.subscribe((meta) => {
      setBackupMeta(meta);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncStatus('offline');
      } else if (meta.backupStatus === 'in_progress') {
        setSyncStatus('syncing');
      } else if (meta.backupStatus === 'pending') {
        setSyncStatus('pending');
      } else if (meta.backupStatus === 'failed') {
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
      }
    });

    const handleOnline = async () => {
      setIsOnline(true);
      showToast('Internet connection restored. Synchronizing...', 'info');
      const current = backupService.getMeta();
      if (current.automaticBackup && current.backupStatus === 'pending') {
        setSyncStatus('syncing');
        await backupService.performBackup(true);
      } else {
        setSyncStatus(current.backupStatus === 'failed' ? 'error' : 'synced');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
      const current = backupService.getMeta();
      if (current.automaticBackup) {
        backupService.saveMeta({
          backupStatus: 'pending',
          lastError: 'Device is offline. Local records safely preserved. Backup Pending until internet is restored.',
        });
      }
      showToast('Internet connection unavailable. Your data is saved locally.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Fetch all entities from IndexedDB
  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await dbInstance.init();
      const [
        prods,
        custs,
        entries,
        challs,
        purchs,
        pymts,
        exps,
        cashSess,
        savedBills,
        savedBankTxs,
        savedSettlements,
        savedCrateTransports,
        savedSettings,
      ] = await Promise.all([
        dbInstance.getAll<Product>('products'),
        dbInstance.getAll<Customer>('customers'),
        dbInstance.getAll<MilkEntry>('milk_entries'),
        dbInstance.getAll<Challan>('challans'),
        dbInstance.getAll<Purchase>('purchases'),
        dbInstance.getAll<Payment>('payments'),
        dbInstance.getAll<Expense>('expenses'),
        dbInstance.getAll<BankCashSession>('bank_cash'),
        dbInstance.getAll<Bill>('bills'),
        dbInstance.getAll<BankCashTransaction>('bank_transactions'),
        dbInstance.getAll<ChallanSettlement>('settlements'),
        dbInstance.getAll<KhaliCrateTransport>('khali_crate_transport'),
        dbInstance.getSettings(),
      ]);

      let activeCusts = custs;
      if (activeCusts.length === 0) {
        for (const cust of INITIAL_CUSTOMERS) {
          await dbInstance.put('customers', cust);
        }
        activeCusts = await dbInstance.getAll<Customer>('customers');
      }

      setProducts(prods);
      setCustomers(activeCusts);
      setMilkEntries(entries);
      setChallans(challs);
      setPurchases(purchs);
      setPayments(pymts);
      setExpenses(exps);
      setBankCashSessions(cashSess);
      setBills(savedBills);
      setBankTransactions(savedBankTxs);
      setChallanSettlements(savedSettlements);
      setCrateTransports(savedCrateTransports);

      if (savedSettings) {
        setSettings(savedSettings);
        setTheme(savedSettings.theme || 'dark');
      }
    } catch (err) {
      console.error('Error loading data from local database:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Handle Android Hardware Back Button via browser History API
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.screen) {
        setActiveScreen(event.state.screen);
        setScreenStack((prev) => {
          const idx = prev.lastIndexOf(event.state.screen);
          if (idx !== -1) {
            return prev.slice(0, idx + 1);
          }
          return [...prev, event.state.screen];
        });
      } else {
        // Fallback to dashboard
        setActiveScreen('dashboard');
        setScreenStack(['dashboard']);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation functions
  const navigateTo = useCallback(
    (screen: AppScreen) => {
      if (screen === activeScreen) return;
      setScreenStack((prev) => [...prev, screen]);
      setActiveScreen(screen);
      window.history.pushState({ screen }, '', `#${screen}`);
    },
    [activeScreen]
  );

  const goBack = useCallback(() => {
    if (screenStack.length > 1) {
      const nextStack = [...screenStack];
      nextStack.pop();
      const previousScreen = nextStack[nextStack.length - 1];
      setScreenStack(nextStack);
      setActiveScreen(previousScreen);
      window.history.replaceState({ screen: previousScreen }, '', `#${previousScreen}`);
    } else {
      setActiveScreen('dashboard');
      setScreenStack(['dashboard']);
      window.history.replaceState({ screen: 'dashboard' }, '', '#dashboard');
    }
  }, [screenStack]);

  const canGoBack = activeScreen !== 'dashboard';

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      const updated = { ...settings, theme: nextTheme };
      setSettings(updated);
      dbInstance.saveSettings(updated).catch(console.error);
      return nextTheme;
    });
  }, [settings]);

  // Helper to trigger pending auto backup after saving any entity
  const handlePostMutationSync = useCallback(() => {
    const meta = backupService.getMeta();
    if (meta.automaticBackup) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        backupService.saveMeta({
          backupStatus: 'pending',
          lastError: 'Offline: Data preserved locally. Backup Pending until internet is restored.',
        });
        setSyncStatus('pending');
      } else if (meta.googleConnected) {
        // Attempt background backup without interrupting UI
        backupService.performBackup(true).catch(console.error);
      }
    }
  }, []);

  // Customer Actions
  const saveCustomer = async (cust: Customer) => {
    const now = new Date().toISOString();
    const safeRecord: Customer = {
      ...cust,
      id: cust.id || `cust_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: cust.createdAt || now,
      updatedAt: now,
    };
    await dbInstance.put('customers', safeRecord);
    await refreshAllData();
    handlePostMutationSync();
    showToast(`Customer ${safeRecord.name} saved`);
  };

  const deleteCustomer = async (id: string) => {
    await dbInstance.delete('customers', id);
    await refreshAllData();
    handlePostMutationSync();
    showToast('Customer deleted', 'info');
  };

  // Product Actions
  const saveProduct = async (prod: Product) => {
    const now = new Date().toISOString();
    const safeRecord: Product = {
      ...prod,
      id: prod.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: prod.createdAt || now,
      updatedAt: now,
    };
    await dbInstance.put('products', safeRecord);
    await refreshAllData();
    handlePostMutationSync();
    showToast(`Product ${safeRecord.name} saved`);
  };

  const deleteProduct = async (id: string) => {
    await dbInstance.delete('products', id);
    await refreshAllData();
    handlePostMutationSync();
    showToast('Product removed', 'info');
  };

  // Milk Entry Actions
  const saveMilkEntry = async (entry: MilkEntry) => {
    const now = new Date().toISOString();
    const safeRecord: MilkEntry = {
      ...entry,
      id: entry.id || `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: entry.createdAt || now,
      updatedAt: now,
    };
    await dbInstance.put('milk_entries', safeRecord);
    await refreshAllData();
    handlePostMutationSync();
    showToast(`Milk entry for ${safeRecord.customerName} (${safeRecord.shift}) saved`);
  };

  const deleteMilkEntry = async (id: string) => {
    await dbInstance.delete('milk_entries', id);
    await refreshAllData();
    handlePostMutationSync();
    showToast('Milk entry removed', 'info');
  };

  // Challan Actions
  const saveChallan = async (challan: Challan) => {
    const now = new Date().toISOString();
    const safeRecord: Challan = {
      ...challan,
      id: challan.id || `challan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: challan.createdAt || now,
      updatedAt: now,
    };
    await dbInstance.put('challans', safeRecord);
    await refreshAllData();
    handlePostMutationSync();
    showToast(`Challan #${safeRecord.challanNumber} saved`);
  };

  const deleteChallan = async (id: string) => {
    await dbInstance.delete('challans', id);
    await refreshAllData();
    handlePostMutationSync();
    showToast('Challan removed', 'info');
  };

  // Purchase Actions
  const savePurchase = async (purchase: Purchase) => {
    const now = new Date().toISOString();
    const safeRecord: Purchase = {
      ...purchase,
      id: purchase.id || `pur_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: purchase.createdAt || now,
      updatedAt: now,
    };
    await dbInstance.put('purchases', safeRecord);
    await refreshAllData();
    handlePostMutationSync();
    showToast(`Purchase from ${safeRecord.supplierName} saved`);
  };

  const deletePurchase = async (id: string) => {
    await dbInstance.delete('purchases', id);
    await refreshAllData();
    handlePostMutationSync();
    showToast('Purchase removed', 'info');
  };

  // Payment Actions
  const savePayment = async (payment: Payment) => {
    const now = new Date().toISOString();
    const safeRecord: Payment = {
      ...payment,
      id: payment.id || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: payment.createdAt || now,
      updatedAt: now,
    };
    await dbInstance.put('payments', safeRecord);
    await refreshAllData();
    handlePostMutationSync();
    showToast(`Payment of ₹${safeRecord.amount} recorded`);
  };

  const deletePayment = async (id: string) => {
    await dbInstance.delete('payments', id);
    await refreshAllData();
    handlePostMutationSync();
    showToast('Payment deleted', 'info');
  };

  // Expense Actions
  const saveExpense = async (expense: Expense) => {
    const now = new Date().toISOString();
    const safeRecord: Expense = {
      ...expense,
      id: expense.id || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: expense.createdAt || now,
      updatedAt: now,
    };
    await dbInstance.put('expenses', safeRecord);
    await refreshAllData();
    handlePostMutationSync();
    showToast(`Expense ₹${safeRecord.amount} saved`);
  };

  const deleteExpense = async (id: string) => {
    await dbInstance.delete('expenses', id);
    await refreshAllData();
    handlePostMutationSync();
    showToast('Expense removed', 'info');
  };

  // Bank & Cash Session
  const saveBankCashSession = async (session: BankCashSession) => {
    const now = new Date().toISOString();
    const safeRecord: BankCashSession = {
      ...session,
      id: session.id || `session_${session.date}`,
      createdAt: session.createdAt || now,
      updatedAt: now,
    };
    await dbInstance.put('bank_cash', safeRecord);
    await refreshAllData();
    handlePostMutationSync();
    showToast(`Cash session for ${safeRecord.date} saved`);
  };

  // Bill Actions
  const saveBill = async (bill: Bill) => {
    const now = new Date().toISOString();
    const safeRecord: Bill = {
      ...bill,
      id: bill.id || `bill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: bill.createdAt || now,
      updatedAt: now,
    };
    await dbInstance.put('bills', safeRecord);
    await refreshAllData();
    handlePostMutationSync();
    showToast(`Bill #${safeRecord.billNumber} saved successfully`);
  };

  const deleteBill = async (id: string) => {
    await dbInstance.delete('bills', id);
    await refreshAllData();
    handlePostMutationSync();
    showToast('Bill deleted', 'info');
  };

  const generateNextBillNumber = useCallback(() => {
    const currentYear = new Date().getFullYear();
    const prefix = `BILL-${currentYear}-`;
    const matching = bills
      .map((b) => b.billNumber)
      .filter((num) => num && num.startsWith(prefix));
    let maxSeq = 0;
    for (const num of matching) {
      const seqStr = num.replace(prefix, '');
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    return `${prefix}${nextSeq}`;
  }, [bills]);

  // Bank Transaction Actions
  const saveBankTransaction = async (tx: BankCashTransaction) => {
    const now = new Date().toISOString();
    const safeRecord: BankCashTransaction = {
      ...tx,
      id: tx.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: tx.createdAt || now,
      updatedAt: now,
    };
    await dbInstance.put('bank_transactions', safeRecord);
    await refreshAllData();
    handlePostMutationSync();
    showToast(`Transaction of ₹${safeRecord.amount.toLocaleString()} saved`);
  };

  const deleteBankTransaction = async (id: string) => {
    await dbInstance.delete('bank_transactions', id);
    await refreshAllData();
    handlePostMutationSync();
    showToast('Transaction removed', 'info');
  };

  // Dedicated Party-Wise Challan Bank Settlement
  const saveChallanSettlement = async (settlement: ChallanSettlement) => {
    const now = new Date().toISOString();
    const safeSettlement: ChallanSettlement = {
      ...settlement,
      id: settlement.id || `set_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: settlement.createdAt || now,
      updatedAt: now,
    };
    await dbInstance.put('settlements', safeSettlement);
    // Mark all chosen challans as settled
    for (const chId of safeSettlement.challanIds) {
      const ch = challans.find((c) => c.id === chId);
      if (ch) {
        const updatedCh = {
          ...ch,
          isSettled: true,
          settlementId: safeSettlement.id,
          settledAt: safeSettlement.depositDate,
          updatedAt: now,
        };
        await dbInstance.put('challans', updatedCh);
      }
    }
    // Record Bank Deposit transaction
    const bankTx: BankCashTransaction = {
      id: `tx_${safeSettlement.id}`,
      date: safeSettlement.depositDate,
      type: 'MONEY_IN',
      amount: safeSettlement.totalAmount,
      mode: 'BANK',
      sourceOrParty: safeSettlement.partyName,
      reference: safeSettlement.utrNumber,
      category: 'Challan Settlement',
      note: safeSettlement.notes || `Challans: ${safeSettlement.challanNumbers.join(', ')}`,
      createdAt: now,
      updatedAt: now,
    };
    await dbInstance.put('bank_transactions', bankTx);
    await refreshAllData();
    handlePostMutationSync();
    showToast(`Bank Deposit of ₹${safeSettlement.totalAmount.toLocaleString()} confirmed for ${safeSettlement.partyName}`);
  };

  // Khali Crate Module Actions
  const saveCrateTransport = async (entry: KhaliCrateTransport) => {
    const now = new Date().toISOString();
    const safeRecord: KhaliCrateTransport = {
      ...entry,
      id: entry.id || `kct_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: entry.createdAt || now,
      updatedAt: now,
    };
    await dbInstance.put('khali_crate_transport', safeRecord);
    await refreshAllData();
    handlePostMutationSync();
    showToast(`Recorded ${safeRecord.quantity} empty crates returned to ${safeRecord.transportPerson}`);
  };

  const deleteCrateTransport = async (id: string) => {
    await dbInstance.delete('khali_crate_transport', id);
    await refreshAllData();
    handlePostMutationSync();
    showToast('Transport crate entry removed', 'info');
  };

  // Update Settings
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await dbInstance.saveSettings(updated);
    showToast('Settings updated');
  };

  // Backup and Restore Actions
  const triggerManualBackup = async () => {
    setSyncStatus('syncing');
    const result = await backupService.performBackup(false);
    if (result.success) {
      setSyncStatus('synced');
      showToast(`Backup created successfully (${result.recordsCount || 0} records)`, 'success');
    } else {
      if (result.isOffline) {
        setSyncStatus('offline');
        showToast('Internet connection unavailable. Your data is saved locally.', 'warning');
      } else {
        setSyncStatus('error');
        showToast(result.error || 'Backup failed. Please try again.', 'warning');
      }
    }
    return result;
  };

  const toggleAutoBackup = (enabled: boolean) => {
    const updated = backupService.setAutomaticBackup(enabled);
    setBackupMeta(updated);
    showToast(`Automatic Backup turned ${enabled ? 'ON' : 'OFF'}`);
  };

  const connectGoogleAccount = (email: string, token: string, name?: string) => {
    const updated = backupService.connectGoogleAccount(email, token, name);
    setBackupMeta(updated);
    showToast(`Google account ${email} connected for Drive Backup`, 'success');
  };

  const disconnectGoogleAccount = () => {
    const updated = backupService.disconnectGoogleAccount();
    setBackupMeta(updated);
    showToast('Google account disconnected', 'info');
  };

  const restoreFromSnapshot = async (data: Record<string, unknown>) => {
    try {
      const res = await dbInstance.importSnapshot(data);
      await refreshAllData();
      showToast(
        `Database restored successfully! Verified: ${res.totalRestored} records across all tables.`,
        'success'
      );
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Restore error';
      showToast('Restore failed. Your current data has not been changed.', 'warning');
      throw err;
    }
  };

  // Calculations: Customer balance & milk stats
  const getCustomerSummary = useCallback(
    (customerId: string) => {
      const cust = customers.find((c) => c.id === customerId);
      const opening = cust ? cust.openingBalance || 0 : 0;

      const customerEntries = milkEntries.filter((e) => e.customerId === customerId);
      let amQty = 0;
      let pmQty = 0;
      let totalBilled = 0;

      customerEntries.forEach((e) => {
        totalBilled += e.totalAmount || 0;
        e.items.forEach((item) => {
          if (e.shift === 'AM') {
            amQty += item.quantity || 0;
          } else {
            pmQty += item.quantity || 0;
          }
        });
      });

      const totalMilkQty = amQty + pmQty;

      const customerPayments = payments.filter((p) => p.customerId === customerId);
      const totalPaid = customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Formula: Closing Balance = Opening Balance + Milk Amount - Payments
      const balance = opening + totalBilled - totalPaid;
      return { opening, totalBilled, totalPaid, balance, amQty, pmQty, totalMilkQty };
    },
    [customers, milkEntries, payments]
  );

  const getCustomerBalance = useCallback(
    (customerId: string): number => {
      return getCustomerSummary(customerId).balance;
    },
    [getCustomerSummary]
  );

  // Memoized Customer Balances Map across all customers
  const customerBalances = useMemo(() => {
    const map: Record<string, number> = {};
    customers.forEach((c) => {
      map[c.id] = getCustomerBalance(c.id);
    });
    return map;
  }, [customers, getCustomerBalance]);

  // App Lock Logic
  useEffect(() => {
    if (settings.security?.appLockEnabled && settings.security?.pinHash) {
      setIsAppLocked(true);
    }
  }, [settings.security?.appLockEnabled, settings.security?.pinHash]);

  const unlockApp = useCallback(() => {
    setIsAppLocked(false);
  }, []);

  const lockApp = useCallback(() => {
    if (settings.security?.appLockEnabled) {
      setIsAppLocked(true);
    }
  }, [settings.security?.appLockEnabled]);

  const setAppPin = useCallback(
    async (pin: string) => {
      const hash = await hashPin(pin);
      const updatedSec = {
        ...(settings.security || { appLockEnabled: true }),
        appLockEnabled: true,
        pinHash: hash,
      };
      await updateSettings({ security: updatedSec });
    },
    [settings.security, updateSettings]
  );

  const disableAppLock = useCallback(async () => {
    const updatedSec = {
      ...(settings.security || { appLockEnabled: false }),
      appLockEnabled: false,
      pinHash: undefined,
    };
    await updateSettings({ security: updatedSec });
    setIsAppLocked(false);
  }, [settings.security, updateSettings]);

  // Auto-lock inactivity & visibility handling
  useEffect(() => {
    if (!settings.security?.appLockEnabled || !settings.security?.pinHash) return;
    const minutes = settings.security?.autoLockMinutes || 5;
    if (minutes <= 0) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsAppLocked(true);
      }, minutes * 60 * 1000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden && settings.security?.appLockEnabled) {
        setIsAppLocked(true);
      }
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings.security?.appLockEnabled, settings.security?.pinHash, settings.security?.autoLockMinutes]);

  // Khali Crate Calculation
  // CRITICAL RULE: In the challan, the field named TOTAL QTY is the Khali Crate quantity for this module.
  // DO NOT use Net Issued Qty, Net Weight, Gross Weight, milk quantity, Net Invoice Amount, Total Crates Issue or any other field.
  // When a challan is saved: Khali Crate Received += Challan TOTAL QTY
  const khaliCrateMetrics = useMemo(() => {
    const totalReceived = challans.reduce((sum, c) => sum + (Number(c.totalQuantity) || 0), 0);
    const totalTransportGiven = crateTransports.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
    const balance = totalReceived - totalTransportGiven;
    return {
      totalReceived,
      totalTransportGiven,
      balance,
    };
  }, [challans, crateTransports]);

  // Active Alerts Count for Notifications Badge
  const activeAlertsCount = useMemo(() => {
    const notif = settings.notifications || {
      dueAlerts: true,
      lowStockAlerts: true,
      backupAlerts: true,
      backupFailureAlerts: true,
      syncErrorAlerts: true,
      dueThresholdAmount: 5000,
      lowStockCrateLimit: 5,
    };
    let count = 0;
    if (notif.dueAlerts) {
      const threshold = notif.dueThresholdAmount || 5000;
      customers.forEach((c) => {
        const bal = customerBalances[c.id] !== undefined ? customerBalances[c.id] : c.openingBalance || 0;
        if (bal >= threshold) count++;
      });
    }
    if (notif.lowStockAlerts) {
      const crateLimit = notif.lowStockCrateLimit || 5;
      products.forEach((p) => {
        const inQty = purchases.reduce(
          (acc, pur) =>
            acc + (pur.items?.filter((it) => it.productId === p.id).reduce((s, it) => s + it.quantity, 0) || 0),
          0
        );
        const outQty = milkEntries.reduce(
          (acc, e) =>
            acc + (e.items?.filter((it) => it.productId === p.id).reduce((s, it) => s + it.quantity, 0) || 0),
          0
        );
        const currentQty = inQty - outQty;
        const pouches = p.pouchesPerCrate || p.unitsPerCrate || 24;
        if (currentQty / pouches <= crateLimit) count++;
      });
    }
    if (notif.backupAlerts && !backupMeta.lastSuccessfulBackup) {
      count++;
    }
    if (notif.backupFailureAlerts && backupMeta.lastError) {
      count++;
    }
    if (notif.syncErrorAlerts && syncStatus === 'error') {
      count++;
    }
    return count;
  }, [settings.notifications, customers, customerBalances, products, purchases, milkEntries, backupMeta, syncStatus]);

  // Stock calculation for selected date
  const getStockForDate = useCallback(
    (date: string, shiftFilter: Shift | 'ALL' = 'ALL') => {
      return products.map((prod) => {
        // Challans received on date
        const dateChallans = challans.filter(
          (c) => c.date === date && (shiftFilter === 'ALL' || c.shift === shiftFilter)
        );
        let receivedQty = 0;
        let receivedCrates = 0;
        dateChallans.forEach((c) => {
          c.items.forEach((item) => {
            if (item.productId === prod.id || item.productCode === prod.code) {
              receivedQty += item.totalQuantity || 0;
              receivedCrates += item.crates || 0;
            }
          });
        });

        // Purchases on date
        const datePurchases = purchases.filter((p) => p.date === date);
        datePurchases.forEach((p) => {
          p.items.forEach((item) => {
            if (item.productId === prod.id || item.productCode === prod.code) {
              receivedQty += item.quantity || 0;
            }
          });
        });

        // Distributed via Milk Entries on date
        const dateEntries = milkEntries.filter((e) => e.date === date);
        let distributedAM = 0;
        let distributedPM = 0;

        dateEntries.forEach((entry) => {
          entry.items.forEach((item) => {
            if (item.productId === prod.id || item.productCode === prod.code) {
              if (entry.shift === 'AM') {
                distributedAM += item.quantity || 0;
              } else {
                distributedPM += item.quantity || 0;
              }
            }
          });
        });

        const distributedQty =
          shiftFilter === 'AM'
            ? distributedAM
            : shiftFilter === 'PM'
            ? distributedPM
            : distributedAM + distributedPM;

        const balanceQty = receivedQty - distributedQty;
        const perCrate = prod.pouchesPerCrate || prod.unitsPerCrate || 24;
        const balanceCrates = Math.floor(balanceQty / perCrate);

        return {
          product: prod,
          receivedQty,
          receivedCrates,
          distributedQty,
          distributedAM,
          distributedPM,
          balanceQty,
          balanceCrates,
          isLowStock: balanceQty < 15,
        };
      });
    },
    [products, challans, purchases, milkEntries]
  );

  // Real-time Bank, Cash & UPI Balances
  const { cashBalance, bankBalance, upiBalance, totalAvailableBalance } = useMemo(() => {
    let cash = 0;
    let bank = 0;
    let upi = 0;

    // 1. Inward from Customer Payments
    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      if (p.mode === 'CASH') cash += amt;
      else if (p.mode === 'UPI') upi += amt;
      else bank += amt; // BANK or CHEQUE
    });

    // 2. Outward from Business Expenses
    expenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      const mode = e.paymentMode || e.mode || 'CASH';
      if (mode === 'CASH') cash -= amt;
      else if (mode === 'UPI') upi -= amt;
      else bank -= amt;
    });

    // 3. Outward from Purchases (if marked PAID)
    purchases.forEach((p) => {
      if (p.paymentStatus === 'PAID') {
        const amt = Number(p.totalAmount) || 0;
        const mode = p.paymentMode || 'CASH';
        if (mode === 'CASH') cash -= amt;
        else if (mode === 'UPI') upi -= amt;
        else bank -= amt;
      }
    });

    // 4. Bank & Cash Transactions (Transfers, deposits, withdrawals, challan settlements)
    bankTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'MONEY_IN') {
        if (tx.mode === 'CASH') cash += amt;
        else if (tx.mode === 'UPI') upi += amt;
        else bank += amt;
      } else {
        if (tx.mode === 'CASH') cash -= amt;
        else if (tx.mode === 'UPI') upi -= amt;
        else bank -= amt;
      }
    });

    return {
      cashBalance: cash,
      bankBalance: bank,
      upiBalance: upi,
      totalAvailableBalance: cash + bank + upi,
    };
  }, [payments, expenses, purchases, bankTransactions]);

  // Dashboard Metrics
  const dashboardMetrics = useMemo(() => {
    // Today's Challans
    const todayChallans = challans.filter((c) => c.date === selectedDate);
    const todayPurchases = purchases.filter((p) => p.date === selectedDate);

    let todayReceivedPouches = 0;
    let todayReceivedCrates = 0;

    todayChallans.forEach((c) => {
      todayReceivedCrates += c.totalCrates || 0;
      c.items.forEach((i) => {
        todayReceivedPouches += i.totalQuantity || 0;
      });
    });

    todayPurchases.forEach((p) => {
      p.items.forEach((i) => {
        todayReceivedPouches += i.quantity || 0;
      });
    });

    // Today's Distributed & Sales
    const todayEntries = milkEntries.filter((e) => e.date === selectedDate);
    let todayDistributedPouches = 0;
    let todaySalesAmount = 0;

    todayEntries.forEach((e) => {
      todaySalesAmount += e.totalAmount || 0;
      e.items.forEach((i) => {
        todayDistributedPouches += i.quantity || 0;
      });
    });

    const todayRemainingPouches = todayReceivedPouches - todayDistributedPouches;

    // Collections
    const todayPayments = payments.filter((p) => p.date === selectedDate);
    let todayCashCollected = 0;
    let todayUpiCollected = 0;
    let todayBankCollected = 0;

    todayPayments.forEach((p) => {
      if (p.mode === 'CASH') todayCashCollected += p.amount;
      else if (p.mode === 'UPI') todayUpiCollected += p.amount;
      else todayBankCollected += p.amount;
    });

    const todayTotalCollected = todayCashCollected + todayUpiCollected + todayBankCollected;

    // Expenses
    const todayExpenses = expenses.filter((e) => e.date === selectedDate);
    const todayExpensesAmount = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Total outstanding across all customers
    let totalOutstandingAmount = 0;
    customers.forEach((c) => {
      const { balance } = getCustomerSummary(c.id);
      if (balance > 0) {
        totalOutstandingAmount += balance;
      }
    });

    // Stock totals
    const currentStock = getStockForDate(selectedDate, 'ALL');
    const currentStockTotal = currentStock.reduce((sum, s) => sum + s.balanceQty, 0);
    const lowStockCount = currentStock.filter((s) => s.balanceQty < 15).length;

    return {
      todayReceivedPouches,
      todayReceivedCrates,
      todayDistributedPouches,
      todayRemainingPouches,
      todaySalesAmount,
      todayCashCollected,
      todayUpiCollected,
      todayBankCollected,
      todayTotalCollected,
      todayExpensesAmount,
      totalOutstandingAmount,
      cashBalance,
      bankBalance,
      upiBalance,
      totalAvailableBalance,
      currentStockTotal,
      lowStockCount,
    };
  }, [
    challans,
    purchases,
    milkEntries,
    payments,
    expenses,
    customers,
    selectedDate,
    getCustomerSummary,
    getStockForDate,
    cashBalance,
    bankBalance,
    upiBalance,
    totalAvailableBalance,
  ]);

  return (
    <AppContext.Provider
      value={{
        activeScreen,
        screenStack,
        navigateTo,
        setActiveScreen,
        goBack,
        canGoBack,
        theme,
        setTheme,
        toggleTheme,
        selectedDate,
        setSelectedDate,
        activeShift,
        setActiveShift,
        products,
        customers,
        milkEntries,
        challans,
        purchases,
        payments,
        expenses,
        bankCashSessions,
        bills,
        bankTransactions,
        challanSettlements,
        settings,
        isLoading,
        isRefreshing,
        cashBalance,
        bankBalance,
        upiBalance,
        totalAvailableBalance,
        customerBalances,
        isAppLocked,
        unlockApp,
        lockApp,
        setAppPin,
        disableAppLock,
        isExcelModalOpen,
        excelModalTab,
        openExcelModal,
        closeExcelModal,
        isNotificationsModalOpen,
        openNotificationsModal,
        closeNotificationsModal,
        activeAlertsCount,
        refreshAllData,
        saveCustomer,
        deleteCustomer,
        saveProduct,
        deleteProduct,
        saveMilkEntry,
        deleteMilkEntry,
        saveChallan,
        deleteChallan,
        savePurchase,
        deletePurchase,
        savePayment,
        deletePayment,
        saveExpense,
        deleteExpense,
        saveBankCashSession,
        saveBill,
        deleteBill,
        generateNextBillNumber,
        saveBankTransaction,
        deleteBankTransaction,
        saveChallanSettlement,
        updateSettings,
        crateTransports,
        saveCrateTransport,
        deleteCrateTransport,
        khaliCrateMetrics,
        getCustomerBalance,
        getCustomerSummary,
        getStockForDate,
        dashboardMetrics,
        showToast,
        toast,
        reprocessChallanData,
        setReprocessChallanData,
        isOnline,
        syncStatus,
        backupMeta,
        triggerManualBackup,
        toggleAutoBackup,
        connectGoogleAccount,
        disconnectGoogleAccount,
        restoreFromSnapshot,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
