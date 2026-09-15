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
} from '../types';

const DB_NAME = 'RoyalDairyERP_DB';
const DB_VERSION = 3;

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_gd_500',
    code: 'GD',
    name: 'Amul Gold 500ml',
    packSize: '500ml',
    category: 'MILK',
    unit: 'pouch',
    pouchesPerCrate: 24,
    unitsPerCrate: 24,
    defaultWholesaleRate: 33.0,
    defaultRate: 33.0,
    mrp: 34.0,
    isActive: true,
  },
  {
    id: 'prod_tm_500',
    code: 'TM',
    name: 'Amul Taaza / Toned 500ml',
    packSize: '500ml',
    category: 'MILK',
    unit: 'pouch',
    pouchesPerCrate: 24,
    unitsPerCrate: 24,
    defaultWholesaleRate: 26.5,
    defaultRate: 26.5,
    mrp: 27.0,
    isActive: true,
  },
  {
    id: 'prod_cm_500',
    code: 'CM',
    name: 'Amul Cow Milk 500ml',
    packSize: '500ml',
    category: 'MILK',
    unit: 'pouch',
    pouchesPerCrate: 24,
    unitsPerCrate: 24,
    defaultWholesaleRate: 27.5,
    defaultRate: 27.5,
    mrp: 28.5,
    isActive: true,
  },
  {
    id: 'prod_bm_500',
    code: 'BM',
    name: 'Amul Buffalo Milk 500ml',
    packSize: '500ml',
    category: 'MILK',
    unit: 'pouch',
    pouchesPerCrate: 24,
    unitsPerCrate: 24,
    defaultWholesaleRate: 34.5,
    defaultRate: 34.5,
    mrp: 36.0,
    isActive: true,
  },
  {
    id: 'prod_dt_500',
    code: 'DT',
    name: 'Amul DTM / Slim & Trim 500ml',
    packSize: '500ml',
    category: 'MILK',
    unit: 'pouch',
    pouchesPerCrate: 24,
    unitsPerCrate: 24,
    defaultWholesaleRate: 24.0,
    defaultRate: 24.0,
    mrp: 25.0,
    isActive: true,
  },
  {
    id: 'prod_mt_450',
    code: 'MT',
    name: 'Amul Moti Pouch 450ml',
    packSize: '450ml',
    category: 'MILK',
    unit: 'pouch',
    pouchesPerCrate: 30,
    unitsPerCrate: 30,
    defaultWholesaleRate: 16.0,
    defaultRate: 16.0,
    mrp: 17.0,
    isActive: true,
  },
  {
    id: 'prod_chaas_500',
    code: 'CH',
    name: 'Amul Buttermilk / Chaas 500ml',
    packSize: '500ml',
    category: 'BEVERAGE',
    unit: 'pouch',
    pouchesPerCrate: 24,
    unitsPerCrate: 24,
    defaultWholesaleRate: 15.0,
    defaultRate: 15.0,
    mrp: 16.0,
    isActive: true,
  },
  {
    id: 'prod_dahi_400',
    code: 'DHI',
    name: 'Amul Masti Dahi 400g',
    packSize: '400g',
    category: 'CURD',
    unit: 'packet',
    pouchesPerCrate: 16,
    unitsPerCrate: 16,
    defaultWholesaleRate: 34.0,
    defaultRate: 34.0,
    mrp: 36.0,
    isActive: true,
  },
  {
    id: 'prod_pnr_200',
    code: 'PNR',
    name: 'Amul Fresh Paneer 200g',
    packSize: '200g',
    category: 'PANEER',
    unit: 'packet',
    pouchesPerCrate: 10,
    unitsPerCrate: 10,
    defaultWholesaleRate: 85.0,
    defaultRate: 85.0,
    mrp: 92.0,
    isActive: true,
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust_test_customer',
    name: 'Test Customer',
    phone: '9876543210',
    address: 'Amul Depot Route 1, Sector 14',
    route: 'Route 1 - Main Line',
    openingBalance: 0,
    customRates: {
      prod_gd_500: 33.0,
      prod_tm_500: 26.5,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust_sharma_dairy',
    name: 'Sharma Dairy & Sweets',
    phone: '9811223344',
    address: 'Shop 12, Subhash Chowk',
    route: 'Route 1 - Main Line',
    openingBalance: 1250,
    customRates: {
      prod_gd_500: 32.5,
      prod_tm_500: 26.0,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust_gupta_tea',
    name: 'Gupta Chai & Bakery',
    phone: '9899112233',
    address: 'Near Metro Pillar 42',
    route: 'Route 2 - Station Line',
    openingBalance: 450,
    customRates: {
      prod_gd_500: 33.0,
      prod_tm_500: 26.5,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust_krishna_parlour',
    name: 'Krishna Amul Parlour',
    phone: '9711556677',
    address: 'Plot 5, Huda Complex',
    route: 'Route 2 - Station Line',
    openingBalance: -300,
    customRates: {
      prod_gd_500: 32.0,
      prod_tm_500: 25.5,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  businessName: 'ASHU Dairy - Amul Distribution',
  ownerName: 'Ashu',
  phone: '9876543210',
  address: 'Shop No. 4, Dairy Market, Main Road',
  gstNumber: '07AAAAA0000A1Z5',
  theme: 'dark',
  defaultShift: 'AM',
  shortFormMappings: {
    FC: 'Full Cream',
    GD: 'Amul Gold',
    TM: 'Amul Taaza',
    DT: 'Amul DTM',
    CM: 'Cow Milk',
    BM: 'Buffalo Milk',
    MT: 'Amul Moti',
    CH: 'Amul Chaas',
    DHI: 'Amul Dahi',
    PNR: 'Amul Paneer',
  },
  billing: {
    billPrefix: 'BILL-',
    billNumbering: 'AUTO_YEAR_SEQ',
    defaultBillingPeriod: 'MONTHLY',
    currency: '₹',
  },
  productSettings: {
    defaultUnit: 'pouch',
    defaultPouchesPerCrate: 24,
  },
  notifications: {
    dueAlerts: true,
    lowStockAlerts: true,
    backupAlerts: true,
    backupFailureAlerts: true,
    syncErrorAlerts: true,
    dueThresholdAmount: 5000,
    lowStockCrateLimit: 5,
  },
  security: {
    appLockEnabled: false,
    autoLockMinutes: 5,
  },
};

export class DairyDatabase {
  private db: IDBDatabase | null = null;
  private isInitializing = false;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.isInitializing) {
      // Wait for existing initialization
      await new Promise((r) => setTimeout(r, 100));
      if (this.db) return this.db;
    }

    this.isInitializing = true;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('products')) {
          const store = db.createObjectStore('products', { keyPath: 'id' });
          store.createIndex('code', 'code', { unique: false });
        }

        if (!db.objectStoreNames.contains('customers')) {
          const store = db.createObjectStore('customers', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('route', 'route', { unique: false });
        }

        if (!db.objectStoreNames.contains('milk_entries')) {
          const store = db.createObjectStore('milk_entries', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('shift', 'shift', { unique: false });
          store.createIndex('customerId', 'customerId', { unique: false });
          store.createIndex('date_shift', ['date', 'shift'], { unique: false });
        }

        if (!db.objectStoreNames.contains('challans')) {
          const store = db.createObjectStore('challans', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('partyName', 'partyName', { unique: false });
          store.createIndex('shift', 'shift', { unique: false });
        }

        if (!db.objectStoreNames.contains('purchases')) {
          const store = db.createObjectStore('purchases', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains('payments')) {
          const store = db.createObjectStore('payments', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('customerId', 'customerId', { unique: false });
        }

        if (!db.objectStoreNames.contains('expenses')) {
          const store = db.createObjectStore('expenses', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('bank_cash')) {
          const store = db.createObjectStore('bank_cash', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains('bills')) {
          const store = db.createObjectStore('bills', { keyPath: 'id' });
          store.createIndex('billNumber', 'billNumber', { unique: true });
          store.createIndex('customerId', 'customerId', { unique: false });
          store.createIndex('billDate', 'billDate', { unique: false });
        }

        if (!db.objectStoreNames.contains('bank_transactions')) {
          const store = db.createObjectStore('bank_transactions', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('mode', 'mode', { unique: false });
        }

        if (!db.objectStoreNames.contains('settlements')) {
          const store = db.createObjectStore('settlements', { keyPath: 'id' });
          store.createIndex('partyName', 'partyName', { unique: false });
          store.createIndex('depositDate', 'depositDate', { unique: false });
        }

        if (!db.objectStoreNames.contains('khali_crate_transport')) {
          const store = db.createObjectStore('khali_crate_transport', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isInitializing = false;
        await this.seedInitialDataIfEmpty();
        resolve(this.db);
      };

      request.onerror = (event) => {
        this.isInitializing = false;
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private async seedInitialDataIfEmpty() {
    const products = await this.getAll<Product>('products');
    if (products.length === 0) {
      for (const prod of INITIAL_PRODUCTS) {
        await this.put('products', prod);
      }
    }

    const customers = await this.getAll<Customer>('customers');
    if (customers.length === 0) {
      for (const cust of INITIAL_CUSTOMERS) {
        await this.put('customers', cust);
      }
    }

    const settings = await this.getSettings();
    if (!settings) {
      await this.saveSettings(DEFAULT_SETTINGS);
    }
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | undefined> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  async put<T>(storeName: string, item: T): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getSettings(): Promise<AppSettings | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get('app_settings');
      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve(req.result.data as AppSettings);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key: 'app_settings', data: settings });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Validate snapshot structure before restore
  validateSnapshot(data: unknown): {
    isValid: boolean;
    error?: string;
    counts?: Record<string, number>;
    totalRecords?: number;
    exportedAt?: string;
  } {
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Invalid file format. Expected a JSON object.' };
    }
    const d = data as Record<string, unknown>;
    const stores = [
      'products',
      'customers',
      'milk_entries',
      'challans',
      'purchases',
      'payments',
      'expenses',
      'bank_cash',
      'bills',
      'bank_transactions',
      'settlements',
      'khali_crate_transport',
    ];

    let total = 0;
    const counts: Record<string, number> = {};
    for (const s of stores) {
      if (Array.isArray(d[s])) {
        counts[s] = (d[s] as unknown[]).length;
        total += counts[s];
      } else {
        counts[s] = 0;
      }
    }

    // Must have at least customers, products, or some valid dairy business tables
    if (total === 0 && !d.settings) {
      return { isValid: false, error: 'Backup does not contain any valid dairy records or configuration.' };
    }

    return {
      isValid: true,
      counts,
      totalRecords: total,
      exportedAt: typeof d.exportedAt === 'string' ? d.exportedAt : undefined,
    };
  }

  // Export full database snapshot for backups
  async exportFullSnapshot(): Promise<Record<string, unknown>> {
    const stores = [
      'products',
      'customers',
      'milk_entries',
      'challans',
      'purchases',
      'payments',
      'expenses',
      'bank_cash',
      'bills',
      'bank_transactions',
      'settlements',
      'khali_crate_transport',
    ];

    const counts: Record<string, number> = {};
    let totalRecords = 0;
    const snapshot: Record<string, unknown> = {
      version: DB_VERSION,
      appName: 'ROYAL_ERP',
      exportedAt: new Date().toISOString(),
      settings: await this.getSettings(),
    };

    for (const storeName of stores) {
      const records = await this.getAll(storeName);
      snapshot[storeName] = records;
      counts[storeName] = records.length;
      totalRecords += records.length;
    }

    snapshot.summary = counts;
    snapshot.totalRecords = totalRecords;
    return snapshot;
  }

  async exportFullDatabase(): Promise<Record<string, unknown>> {
    return this.exportFullSnapshot();
  }

  // Restore database snapshot
  async importSnapshot(data: Record<string, unknown>): Promise<{
    success: boolean;
    counts: Record<string, number>;
    totalRestored: number;
    error?: string;
  }> {
    const validation = this.validateSnapshot(data);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid backup structure');
    }

    const stores = [
      'products',
      'customers',
      'milk_entries',
      'challans',
      'purchases',
      'payments',
      'expenses',
      'bank_cash',
      'bills',
      'bank_transactions',
      'settlements',
      'khali_crate_transport',
    ];

    const restoredCounts: Record<string, number> = {};
    let totalRestored = 0;

    for (const storeName of stores) {
      if (Array.isArray(data[storeName])) {
        await this.clear(storeName);
        const list = data[storeName] as unknown[];
        for (const item of list) {
          await this.put(storeName, item);
        }
        restoredCounts[storeName] = list.length;
        totalRestored += list.length;
      }
    }

    if (data.settings && typeof data.settings === 'object') {
      await this.saveSettings(data.settings as AppSettings);
    }

    return {
      success: true,
      counts: restoredCounts,
      totalRestored,
    };
  }
}

export const dbInstance = new DairyDatabase();
