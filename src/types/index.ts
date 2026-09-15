export type Shift = 'AM' | 'PM';

export type PaymentMode = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';

export type ExpenseCategory =
  | 'FUEL'
  | 'VEHICLE'
  | 'MAINTENANCE'
  | 'VEHICLE_MAINTENANCE'
  | 'STAFF'
  | 'LABOUR'
  | 'LABOR'
  | 'LOADING_UNLOADING'
  | 'FOOD'
  | 'MOBILE_INTERNET'
  | 'OFFICE'
  | 'PACKAGING'
  | 'ICE_COLD_STORAGE'
  | 'TEA_REFRESHMENTS'
  | 'DEPOT_CHARGES'
  | 'RENT'
  | 'ELECTRICITY'
  | 'FREIGHT'
  | 'MISC'
  | 'OTHER'
  | string;

export interface Product {
  id: string;
  code: string; // e.g. 'GD', 'TM', 'CM', 'BM', 'DT'
  name: string; // e.g. 'Amul Gold 500ml'
  packSize?: string; // e.g. '500ml', '1L', '200g'
  category: 'MILK' | 'CURD' | 'PANEER' | 'BEVERAGE' | 'OTHER';
  unit: 'pouch' | 'liter' | 'kg' | 'packet';
  pouchesPerCrate: number; // usually 24 for 500ml milk
  unitsPerCrate?: number; // alias for pouchesPerCrate
  defaultWholesaleRate: number; // default distributor/supply rate to customer
  defaultRate?: number; // alias for defaultWholesaleRate
  mrp: number; // Maximum Retail Price
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  code?: string;
  name: string;
  phone: string;
  address: string;
  route: string; // delivery route/area e.g. "Main Market", "Sector 4", "Morning Line 1"
  openingBalance: number; // positive = customer owes us money (due), negative = advance
  customRates: Record<string, number>; // productId -> custom rate override
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MilkEntryItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number; // pouch or unit count
  rate: number;
  amount: number;
}

export interface MilkEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  shift: Shift; // 'AM' | 'PM'
  customerId: string;
  customerName: string;
  items: MilkEntryItem[];
  totalQuantity: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChallanItem {
  srNo?: number;
  hsnSac?: string;
  productId: string;
  productCode: string;
  productName: string;
  crates: number;
  pouches: number; // loose pouches
  totalQuantity: number; // total units / pouches
  rate: number;
  amount: number;
}

export interface Challan {
  id: string;
  challanNumber: string; // D.C. No.
  partyName: string; // Party / Ship To
  gccmp?: string; // GCCM/P
  routeDemandFpo?: string; // Route / Demand FPO
  pan?: string; // PAN
  gstin?: string; // GSTIN
  purDocRefNo?: string; // Pur. Doc. Ref. No.
  orderDate?: string; // Order Date
  dispatchDate?: string; // Dispatch Date
  dispatchTime?: string; // Dispatch Time
  vehicleNumber?: string; // Vehicle No.
  internalRefNo?: string; // Internal Ref. No.
  tssanNumber?: string; // TSSAN Number
  date: string; // YYYY-MM-DD
  shift: Shift;
  items: ChallanItem[];
  totalCrates: number;
  totalQuantity: number;
  netIssuedQty?: number;
  cbxQty?: number;
  netWeight?: number;
  grossWeight?: number;
  basicAmount?: number;
  taxAmount?: number;
  freightSubsidy?: number;
  freight: number;
  otherCharges?: number;
  netAmount: number;
  totalCratesIssue?: number;
  totalOutstanding?: number;
  deviation?: number;
  customerClosingBalance?: number;
  imageUri?: string; // photo captured or picked
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
  unrecognizedFields?: string[];
  isSettled?: boolean; // Challan Bank Settlement flag
  settlementId?: string;
  settledAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  crates?: number;
  purchaseRate: number;
  amount: number;
}

export interface Purchase {
  id: string;
  supplierName: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  shift?: Shift;
  items: PurchaseItem[];
  totalQuantity?: number;
  totalCrates?: number;
  totalAmount: number;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  paymentMode?: PaymentMode;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChallanSettlement {
  id: string;
  partyName: string;
  challanIds: string[];
  challanNumbers: string[];
  totalAmount: number;
  bankAccount: string;
  depositDate: string;
  utrNumber: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type TransactionType = 'MONEY_IN' | 'MONEY_OUT';
export type BankCashMode = 'CASH' | 'BANK' | 'UPI';

export interface BankCashTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number;
  mode: BankCashMode;
  sourceOrParty: string;
  reference?: string;
  category?: string; // e.g., 'Customer Payment', 'Expense', 'Bank Deposit', 'Bank Withdrawal', 'Challan Settlement', 'Other'
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BillItem {
  productId: string;
  productCode: string;
  productName: string;
  amQty?: number;
  pmQty?: number;
  quantity?: number;
  totalQty: number;
  rate: number;
  amount: number;
}

export interface Bill {
  id: string;
  billNumber: string; // e.g. BILL-2026-0001
  customerId: string;
  customerName: string;
  customerCode?: string;
  customerPhone?: string;
  customerRoute?: string;
  billDate: string; // YYYY-MM-DD
  billType?: string;
  fromDate: string;
  toDate: string;
  items: BillItem[];
  milkTotal: number;
  totalMilkAmount?: number;
  previousBalance: number;
  paymentsReceived: number;
  currentDue: number;
  netPayable?: number;
  notes?: string;
  status: 'GENERATED' | 'PAID' | 'PARTIAL' | 'UNPAID';
  createdAt: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  date: string; // YYYY-MM-DD
  amount: number;
  mode: PaymentMode;
  referenceNumber?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMode: PaymentMode;
  mode?: PaymentMode;
  note?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CashDenomination {
  500: number;
  200: number;
  100: number;
  50: number;
  20: number;
  10: number;
  coins: number;
}

export interface BankCashSession {
  id: string;
  date: string; // YYYY-MM-DD
  denominations: CashDenomination;
  totalCashPhysical: number;
  cashCollected: number;
  upiCollected: number;
  bankDeposited: number;
  cashExpenses: number;
  difference: number; // shortage or excess
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BillingSettings {
  billPrefix: string;
  billNumbering: 'AUTO_YEAR_SEQ' | 'MANUAL';
  defaultBillingPeriod: 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';
  currency: string;
}

export interface ProductSettings {
  defaultUnit: 'pouch' | 'liter' | 'kg' | 'packet';
  defaultPouchesPerCrate: number;
}

export interface NotificationSettings {
  dueAlerts: boolean;
  lowStockAlerts: boolean;
  backupAlerts: boolean;
  backupFailureAlerts: boolean;
  syncErrorAlerts: boolean;
  dueThresholdAmount: number;
  lowStockCrateLimit: number;
}

export interface SecuritySettings {
  appLockEnabled: boolean;
  pinHash?: string;
  autoLockMinutes?: number;
}

export interface AppSettings {
  businessName: string;
  ownerName: string;
  phone: string;
  address: string;
  gstNumber?: string;
  logoUrl?: string;
  theme: 'dark' | 'light';
  defaultShift: Shift;
  shortFormMappings: Record<string, string>;
  automaticBackup?: boolean;
  billing?: BillingSettings;
  productSettings?: ProductSettings;
  notifications?: NotificationSettings;
  security?: SecuritySettings;
}

export type SyncStatusType = 'synced' | 'syncing' | 'offline' | 'pending' | 'error';

export interface BackupMeta {
  lastBackupAttempt?: string;
  lastSuccessfulBackup?: string;
  backupStatus: 'idle' | 'in_progress' | 'success' | 'failed' | 'pending';
  lastError?: string;
  automaticBackup: boolean;
  googleConnected: boolean;
  googleUserEmail?: string;
  googleAccountName?: string;
  googleAccessToken?: string;
  googleExpiresAt?: number;
  totalRecordsCount?: number;
  cachedLatestBackup?: Record<string, unknown>;
}

export interface KhaliCrateTransport {
  id: string;
  date: string; // YYYY-MM-DD
  transportPerson: string; // Transport or driver name
  quantity: number; // Empty crates returned to transport
  vehicleNumber?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export type AppScreen =
  | 'dashboard'
  | 'customers'
  | 'fast_entry'
  | 'challans'
  | 'challan_scanner'
  | 'register_scanner'
  | 'party_summary'
  | 'stock'
  | 'purchase'
  | 'products'
  | 'billing'
  | 'payments'
  | 'bank_cash'
  | 'expenses'
  | 'reports'
  | 'settings'
  | 'khali_crate';
