import React, { useState, useRef } from 'react';
import {
  Settings,
  Building,
  Phone,
  MapPin,
  Save,
  Download,
  Upload,
  Database,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Cloud,
  CloudOff,
  Wifi,
  WifiOff,
  Clock,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Lock,
  Unlock,
  KeyRound,
  Layers,
  FileText,
  ScanLine,
  Bell,
  Sliders,
  DollarSign,
  Package,
  Users,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  IndianRupee,
  Shield,
  Palette,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { dbInstance } from '../../db/indexedDb';
import { backupService } from '../../services/backupService';
import { hashPin } from '../../utils/crypto';

export const SettingsScreen: React.FC = () => {
  const {
    settings,
    updateSettings,
    theme,
    setTheme,
    refreshAllData,
    showToast,
    isOnline,
    syncStatus,
    backupMeta,
    triggerManualBackup,
    toggleAutoBackup,
    connectGoogleAccount,
    disconnectGoogleAccount,
    restoreFromSnapshot,
    customers,
    lockApp,
    setAppPin,
    disableAppLock,
  } = useApp();

  const isDark = theme === 'dark';

  // Section Filter Navigation Tab
  const [activeSection, setActiveSection] = useState<
    'all' | 'profile' | 'billing' | 'products' | 'customers' | 'scanner' | 'backup' | 'notifications' | 'security'
  >('all');

  // 1. Profile State
  const [businessName, setBusinessName] = useState(settings.businessName || '');
  const [ownerName, setOwnerName] = useState(settings.ownerName || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [address, setAddress] = useState(settings.address || '');
  const [gstNumber, setGstNumber] = useState(settings.gstNumber || '');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // 2. Billing Settings State
  const [billPrefix, setBillPrefix] = useState(settings.billing?.billPrefix || 'BILL-');
  const [billNumbering, setBillNumbering] = useState<'AUTO_YEAR_SEQ' | 'MANUAL'>(
    settings.billing?.billNumbering || 'AUTO_YEAR_SEQ'
  );
  const [defaultBillingPeriod, setDefaultBillingPeriod] = useState<'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY'>(
    settings.billing?.defaultBillingPeriod || 'MONTHLY'
  );
  const [currency, setCurrency] = useState(settings.billing?.currency || '₹');

  // 3. Product Settings State
  const [defaultUnit, setDefaultUnit] = useState<'pouch' | 'liter' | 'kg' | 'packet'>(
    settings.productSettings?.defaultUnit || 'pouch'
  );
  const [defaultPouchesPerCrate, setDefaultPouchesPerCrate] = useState<number>(
    settings.productSettings?.defaultPouchesPerCrate || 24
  );

  // 4. Scanner Short-Form Mappings State
  const [mappings, setMappings] = useState<Record<string, string>>(
    settings.shortFormMappings || {
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
    }
  );
  const [newShortCode, setNewShortCode] = useState('');
  const [newFullProduct, setNewFullProduct] = useState('');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // 5. Notifications Settings State
  const [dueAlerts, setDueAlerts] = useState<boolean>(settings.notifications?.dueAlerts ?? true);
  const [lowStockAlerts, setLowStockAlerts] = useState<boolean>(settings.notifications?.lowStockAlerts ?? true);
  const [backupAlerts, setBackupAlerts] = useState<boolean>(settings.notifications?.backupAlerts ?? true);
  const [backupFailureAlerts, setBackupFailureAlerts] = useState<boolean>(
    settings.notifications?.backupFailureAlerts ?? true
  );
  const [syncErrorAlerts, setSyncErrorAlerts] = useState<boolean>(settings.notifications?.syncErrorAlerts ?? true);
  const [dueThresholdAmount, setDueThresholdAmount] = useState<number>(
    settings.notifications?.dueThresholdAmount ?? 5000
  );
  const [lowStockCrateLimit, setLowStockCrateLimit] = useState<number>(
    settings.notifications?.lowStockCrateLimit ?? 5
  );

  // 6. Security / App Lock State
  const [appLockEnabled, setAppLockEnabled] = useState<boolean>(settings.security?.appLockEnabled ?? false);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(settings.security?.autoLockMinutes ?? 5);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirmInput, setPinConfirmInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Backup & Google State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState(backupMeta.googleUserEmail || '');
  const [googleTokenInput, setGoogleTokenInput] = useState(backupMeta.googleAccessToken || '');
  const [googleAccountNameInput, setGoogleAccountNameInput] = useState(backupMeta.googleAccountName || '');

  // Restore Modal State
  const [pendingRestoreData, setPendingRestoreData] = useState<Record<string, unknown> | null>(null);
  const [pendingRestoreSummary, setPendingRestoreSummary] = useState<{
    exportedAt?: string;
    totalRecords?: number;
    breakdown?: Record<string, number>;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Save Business Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      gstNumber: gstNumber.trim(),
      logoUrl: logoUrl.trim() || undefined,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Save Billing Settings
  const handleSaveBilling = async () => {
    await updateSettings({
      billing: {
        billPrefix: billPrefix.trim() || 'BILL-',
        billNumbering,
        defaultBillingPeriod,
        currency: currency.trim() || '₹',
      },
    });
    showToast('Billing settings updated successfully!', 'success');
  };

  // Save Product Settings
  const handleSaveProductSettings = async () => {
    await updateSettings({
      productSettings: {
        defaultUnit,
        defaultPouchesPerCrate: Number(defaultPouchesPerCrate) || 24,
      },
    });
    showToast('Product settings updated successfully!', 'success');
  };

  // Scanner Mappings Handlers
  const handleAddMapping = async () => {
    const code = newShortCode.trim().toUpperCase();
    const full = newFullProduct.trim();
    if (!code || !full) {
      showToast('Please enter both short code and product name', 'warning');
      return;
    }
    const updated = { ...mappings, [code]: full };
    setMappings(updated);
    await updateSettings({ shortFormMappings: updated });
    setNewShortCode('');
    setNewFullProduct('');
    showToast(`OCR Mapping added: ${code} → ${full}`, 'success');
  };

  const handleSaveEditMapping = async (code: string) => {
    if (!editingValue.trim()) return;
    const updated = { ...mappings, [code]: editingValue.trim() };
    setMappings(updated);
    await updateSettings({ shortFormMappings: updated });
    setEditingCode(null);
    showToast(`Mapping for ${code} updated!`, 'success');
  };

  const handleDeleteMapping = async (code: string) => {
    const updated = { ...mappings };
    delete updated[code];
    setMappings(updated);
    await updateSettings({ shortFormMappings: updated });
    showToast(`Mapping ${code} removed`, 'info');
  };

  const handleResetDefaultMappings = async () => {
    const defaultMap = {
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
    };
    setMappings(defaultMap);
    await updateSettings({ shortFormMappings: defaultMap });
    showToast('Reset to standard Amul dairy short-form mappings!', 'success');
  };

  // Save Notification Settings
  const handleSaveNotifications = async () => {
    await updateSettings({
      notifications: {
        dueAlerts,
        lowStockAlerts,
        backupAlerts,
        backupFailureAlerts,
        syncErrorAlerts,
        dueThresholdAmount: Number(dueThresholdAmount) || 5000,
        lowStockCrateLimit: Number(lowStockCrateLimit) || 5,
      },
    });
    showToast('Notification alert rules saved!', 'success');
  };

  // App Lock Handlers
  const handleToggleAppLock = async (enabled: boolean) => {
    if (enabled) {
      // If PIN is already set, turn it on directly
      if (settings.security?.pinHash) {
        await updateSettings({
          security: {
            ...(settings.security || {}),
            appLockEnabled: true,
          },
        });
        setAppLockEnabled(true);
        showToast('App Lock enabled with your current PIN', 'success');
      } else {
        // Must prompt to create PIN first
        setShowPinModal(true);
      }
    } else {
      await disableAppLock();
      setAppLockEnabled(false);
      showToast('App Lock disabled', 'info');
    }
  };

  const handleSaveNewPin = async () => {
    if (pinInput.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (pinInput !== pinConfirmInput) {
      setPinError('PIN confirmation does not match');
      return;
    }

    await setAppPin(pinInput);
    setAppLockEnabled(true);
    setShowPinModal(false);
    setPinInput('');
    setPinConfirmInput('');
    setPinError('');
    showToast('PIN successfully set! App Lock is now active.', 'success');
  };

  // Trigger Manual Backup
  const handleManualBackup = async () => {
    setIsBackingUp(true);
    try {
      await triggerManualBackup();
    } finally {
      setIsBackingUp(false);
    }
  };

  // Full Database JSON Backup Export (Device Download)
  const handleExportBackup = async () => {
    try {
      const data = await dbInstance.exportFullSnapshot();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `royal_erp_backup_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Offline Database Backup Downloaded Successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to export backup file', 'warning');
    }
  };

  // File Picker for Restore
  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || !parsed.version || !parsed.tables) {
          showToast('Invalid backup file. Missing database schema structure.', 'warning');
          return;
        }

        const breakdown: Record<string, number> = {};
        let total = 0;
        for (const [tbl, rows] of Object.entries(parsed.tables)) {
          if (Array.isArray(rows)) {
            breakdown[tbl] = rows.length;
            total += rows.length;
          }
        }

        setPendingRestoreData(parsed);
        setPendingRestoreSummary({
          exportedAt: parsed.exportedAt,
          totalRecords: total,
          breakdown,
        });
      } catch (err) {
        console.error(err);
        showToast('Error reading backup file. Must be a valid JSON backup.', 'warning');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreData) return;
    setIsRestoring(true);
    try {
      await restoreFromSnapshot(pendingRestoreData);
      setPendingRestoreData(null);
      setPendingRestoreSummary(null);
      await refreshAllData();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCancelRestore = () => {
    setPendingRestoreData(null);
    setPendingRestoreSummary(null);
  };

  // Calculate unique routes for Customer settings
  const uniqueRoutes = Array.from(new Set(customers.map((c) => c.route || 'General Route')));

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-wider text-amber-400 uppercase flex items-center gap-2">
            <Settings className="w-6 h-6" />
            <span>Settings & Preferences</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Configure Business Profile, Billing, Products, Scanner Mappings, Notifications & Security
          </p>
        </div>

        {/* Quick lock button if app lock enabled */}
        {settings.security?.appLockEnabled && (
          <button
            type="button"
            onClick={lockApp}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-bold hover:bg-amber-500/20 transition-all self-start sm:self-auto"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock App Now</span>
          </button>
        )}
      </div>

      {/* Section Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'all', label: 'All Settings' },
          { id: 'profile', label: 'Business Profile' },
          { id: 'billing', label: 'Billing' },
          { id: 'products', label: 'Products' },
          { id: 'customers', label: 'Routes & Customers' },
          { id: 'scanner', label: 'OCR Mappings' },
          { id: 'backup', label: 'Backup & Cloud' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'security', label: 'Security & PIN' },
        ].map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => setActiveSection(sec.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeSection === sec.id
                ? 'bg-amber-500 text-slate-950 shadow-md scale-102'
                : isDark
                ? 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: BUSINESS PROFILE */}
      {(activeSection === 'all' || activeSection === 'profile') && (
        <div
          id="section-profile"
          className={`p-5 rounded-2xl border space-y-4 ${
            isDark
              ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-amber-400">
                  Business & Dairy Profile
                </h2>
                <p className="text-xs text-slate-400">Printed on Challans, Receipts & Customer Invoices</p>
              </div>
            </div>
            {savedSuccess && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Business / Dairy Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. ASHU Dairy - Amul Distribution"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Owner / Proprietor Name
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Ashu"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Contact Mobile Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-amber-400 outline-none uppercase font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Shop & Distribution Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Shop No. 4, Dairy Market, Main Road"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Brand Logo Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="e.g. https://example.com/logo.png"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 shadow"
              >
                <Save className="w-4 h-4" />
                <span>Save Business Profile</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION 2: BILLING SETTINGS */}
      {(activeSection === 'all' || activeSection === 'billing') && (
        <div
          id="section-billing"
          className={`p-5 rounded-2xl border space-y-4 ${
            isDark
              ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <FileText className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-400">
                Billing & Invoice Preferences
              </h2>
              <p className="text-xs text-slate-400">Invoice prefix, sequencing format, and billing cycle defaults</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Bill Prefix
              </label>
              <input
                type="text"
                value={billPrefix}
                onChange={(e) => setBillPrefix(e.target.value)}
                placeholder="BILL-"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold font-mono focus:border-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Numbering Format
              </label>
              <select
                value={billNumbering}
                onChange={(e) => setBillNumbering(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-amber-400 outline-none"
              >
                <option value="AUTO_YEAR_SEQ">Auto: BILL-2026-0001</option>
                <option value="MANUAL">Manual Numbering</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Default Billing Period
              </label>
              <select
                value={defaultBillingPeriod}
                onChange={(e) => setDefaultBillingPeriod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-amber-400 outline-none"
              >
                <option value="MONTHLY">Monthly (1st to 30th/31st)</option>
                <option value="FORTNIGHTLY">Fortnightly (15 Days)</option>
                <option value="WEEKLY">Weekly (7 Days)</option>
                <option value="DAILY">Daily Cash Bill</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="₹"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-amber-400 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSaveBilling}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 shadow"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update Billing Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: PRODUCT SETTINGS */}
      {(activeSection === 'all' || activeSection === 'products') && (
        <div
          id="section-products"
          className={`p-5 rounded-2xl border space-y-4 ${
            isDark
              ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Package className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-400">
                Product & Packaging Defaults
              </h2>
              <p className="text-xs text-slate-400">Standard units and pouches per crate for inventory tracking</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Default Measurement Unit
              </label>
              <select
                value={defaultUnit}
                onChange={(e) => setDefaultUnit(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-amber-400 outline-none"
              >
                <option value="pouch">Pouch (Amul Milk / Chaas / Dahi)</option>
                <option value="packet">Packet (Paneer / Butter)</option>
                <option value="liter">Liter</option>
                <option value="kg">Kilogram (KG)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Standard Pouches per Crate
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={defaultPouchesPerCrate}
                onChange={(e) => setDefaultPouchesPerCrate(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-amber-400 outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Standard Amul milk crate contains 24 pouches (12 Liters). Individual products can override this.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSaveProductSettings}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 shadow"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update Product Defaults</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4: ROUTE MANAGEMENT & CUSTOMERS */}
      {(activeSection === 'all' || activeSection === 'customers') && (
        <div
          id="section-customers"
          className={`p-5 rounded-2xl border space-y-4 ${
            isDark
              ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Users className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-400">
                Delivery Routes & Customer Rules
              </h2>
              <p className="text-xs text-slate-400">Distribution lines and customer count by line</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {uniqueRoutes.map((rt) => {
              const count = customers.filter((c) => (c.route || 'General Route') === rt).length;
              return (
                <div
                  key={rt}
                  className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1"
                >
                  <div className="text-xs font-bold text-slate-200 truncate">{rt}</div>
                  <div className="text-[11px] text-amber-400 font-mono">
                    {count} customer{count === 1 ? '' : 's'} assigned
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Customer Rates Rule: Customer-specific rates take precedence during Milk Entry; otherwise the product's
              default wholesale rate is applied automatically.
            </span>
          </div>
        </div>
      )}

      {/* SECTION 5: SCANNER SETTINGS (OCR SHORT-FORM MAPPINGS) */}
      {(activeSection === 'all' || activeSection === 'scanner') && (
        <div
          id="section-scanner"
          className={`p-5 rounded-2xl border space-y-4 ${
            isDark
              ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800 shadow-sm'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-amber-400">
                  Scanner OCR Short-Form Mappings
                </h2>
                <p className="text-xs text-slate-400">
                  Used by Register OCR & Challan Scanner to translate handwritten abbreviations into exact products
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetDefaultMappings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] font-bold text-slate-300 hover:bg-slate-800 self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Default Mappings</span>
            </button>
          </div>

          {/* Add Mapping Form */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <div className="sm:col-span-3">
              <input
                type="text"
                value={newShortCode}
                onChange={(e) => setNewShortCode(e.target.value.toUpperCase())}
                placeholder="Short Code (e.g. GD)"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold uppercase outline-none focus:border-amber-400"
              />
            </div>
            <div className="sm:col-span-6">
              <input
                type="text"
                value={newFullProduct}
                onChange={(e) => setNewFullProduct(e.target.value)}
                placeholder="Full Product Name (e.g. Amul Gold)"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-400"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={handleAddMapping}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Add Mapping</span>
              </button>
            </div>
          </div>

          {/* Mappings Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 bg-slate-900/80 p-2.5 text-[11px] font-black uppercase text-slate-400 border-b border-slate-800">
              <div className="col-span-3">Short Code</div>
              <div className="col-span-6">Target Product Name</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto">
              {Object.entries(mappings).map(([code, full]) => (
                <div
                  key={code}
                  className="grid grid-cols-12 items-center p-2.5 text-xs hover:bg-slate-900/40 transition-colors"
                >
                  <div className="col-span-3 font-mono font-black text-amber-400">{code}</div>
                  <div className="col-span-6 text-slate-200">
                    {editingCode === code ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="w-full px-2 py-1 rounded bg-slate-800 border border-amber-400 text-xs text-slate-100 outline-none"
                        autoFocus
                      />
                    ) : (
                      full
                    )}
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-1.5">
                    {editingCode === code ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveEditMapping(code)}
                          className="p-1 rounded hover:bg-slate-800 text-emerald-400"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCode(null)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCode(code);
                            setEditingValue(full);
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                          title="Edit mapping"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMapping(code)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete mapping"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: BACKUP, RESTORE & GOOGLE DRIVE */}
      {(activeSection === 'all' || activeSection === 'backup') && (
        <div id="section-backup" className="space-y-4">
          {/* Offline Sync Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              !isOnline
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                : syncStatus === 'synced'
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                : 'bg-blue-950/40 border-blue-800/60 text-blue-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-black/20 shrink-0">
                {!isOnline ? (
                  <WifiOff className="w-5 h-5 text-amber-400" />
                ) : syncStatus === 'synced' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm uppercase tracking-wide">
                    {isOnline ? 'Online Ready' : 'Operating in Safe Offline Mode'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      syncStatus === 'synced'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : syncStatus === 'offline'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    Status: {syncStatus}
                  </span>
                </div>
                <p className="text-xs opacity-90 mt-0.5">
                  {isOnline
                    ? 'Connected to the internet. Local IndexedDB is preserved and ready to sync to Google Drive.'
                    : 'Internet connection unavailable. Your data is saved locally. Any pending cloud backup will queue safely.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                100% Offline Safe
              </span>
            </div>
          </div>

          {/* Google Drive Cloud Backup Card */}
          <div
            className={`p-5 rounded-2xl border space-y-4 ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Google Drive Backup & Cloud Sync
                  </h3>
                  <p className="text-xs text-slate-400">
                    Keep an offsite copy of your Amul dairy operations safe in your Google Drive.
                  </p>
                </div>
              </div>

              {backupMeta.googleConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Check className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  <CloudOff className="w-3.5 h-3.5" /> Not Connected
                </span>
              )}
            </div>

            {/* Account Info & Connection */}
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              {backupMeta.googleConnected ? (
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <span className="text-amber-400 font-extrabold">{backupMeta.googleAccountName || 'Google Account'}</span>
                    <span className="text-xs text-slate-400">({backupMeta.googleUserEmail})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>Last Backup:</span>
                    <span className="font-semibold text-slate-200">
                      {backupMeta.lastSuccessfulBackup
                        ? new Date(backupMeta.lastSuccessfulBackup).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'Never'}
                    </span>
                    {backupMeta.totalRecordsCount !== undefined && (
                      <span className="text-emerald-400 font-medium">({backupMeta.totalRecordsCount} records)</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-300">No Google Account Linked</div>
                  <div className="text-[11px] text-slate-400">
                    Connect your account to store encrypted business snapshots on Google Drive.
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {backupMeta.googleConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowConnectModal(true)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold hover:bg-slate-800 text-slate-300 transition-all"
                    >
                      Edit Account
                    </button>
                    <button
                      type="button"
                      onClick={disconnectGoogleAccount}
                      className="px-3 py-1.5 rounded-lg border border-rose-900/50 text-xs font-bold text-rose-400 hover:bg-rose-950/40 transition-all"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all active:scale-95 shadow"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>Connect Google Drive</span>
                  </button>
                )}
              </div>
            </div>

            {/* Auto Backup Toggle & Manual Backup Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-200">Automatic Backup</div>
                  <div className="text-[11px] text-slate-400">
                    {backupMeta.automaticBackup
                      ? 'Active: Backs up when online or marks pending if offline'
                      : 'Inactive: Manual backup only'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleAutoBackup(!backupMeta.automaticBackup)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                    backupMeta.automaticBackup ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                </button>
              </div>

              <button
                id="btn-backup-now"
                type="button"
                onClick={handleManualBackup}
                disabled={isBackingUp}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border font-bold text-xs transition-all active:scale-95 ${
                  isBackingUp
                    ? 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed'
                    : isDark
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isBackingUp ? 'animate-spin text-amber-400' : ''}`} />
                <span>{isBackingUp ? 'Backing up to Google Drive...' : 'Backup Now'}</span>
              </button>
            </div>

            {backupMeta.lastError && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="flex-1">
                  <span className="font-bold">Sync Notice: </span>
                  {backupMeta.lastError}
                </div>
              </div>
            )}
          </div>

          {/* Local Storage & Device File Backup / Restore */}
          <div
            className={`p-5 rounded-2xl border space-y-4 ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Database className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                Local Device Database Backup & Restore
              </h3>
            </div>

            <p className="text-xs text-slate-400">
              All records (customers, milk entries, challans, purchases, payments, bills, bank transactions) are stored
              securely inside your device in local IndexedDB. You can export a full offline JSON file or restore from a
              previous backup file at any time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                id="btn-export-backup-json"
                type="button"
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-500/50 text-slate-200 text-xs font-bold transition-all active:scale-95 shadow-sm"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Export Full JSON Backup</span>
              </button>

              <label className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Restore Backup from File</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFilePicked}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: NOTIFICATION SETTINGS */}
      {(activeSection === 'all' || activeSection === 'notifications') && (
        <div
          id="section-notifications"
          className={`p-5 rounded-2xl border space-y-4 ${
            isDark
              ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Bell className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-400">
                Notification & Alert Rules
              </h2>
              <p className="text-xs text-slate-400">
                Configure automatic triggers for customer dues, low stock & cloud backup reminders
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Due Alert */}
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-200">Customer Due Balance Alert</div>
                <div className="text-[11px] text-slate-400">
                  Notify when a customer's balance exceeds the designated credit threshold
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 font-bold">Limit: ₹</span>
                  <input
                    type="number"
                    value={dueThresholdAmount}
                    onChange={(e) => setDueThresholdAmount(Number(e.target.value))}
                    className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-bold text-amber-400 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDueAlerts(!dueAlerts)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    dueAlerts ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow" />
                </button>
              </div>
            </div>

            {/* Low Stock Alert */}
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-200">Low Stock Alert</div>
                <div className="text-[11px] text-slate-400">
                  Warn when inventory dips below minimum safe crates
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 font-bold">Crates:</span>
                  <input
                    type="number"
                    value={lowStockCrateLimit}
                    onChange={(e) => setLowStockCrateLimit(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-bold text-amber-400 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setLowStockAlerts(!lowStockAlerts)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    lowStockAlerts ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow" />
                </button>
              </div>
            </div>

            {/* Backup Reminder Alert */}
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">Backup Pending Reminder</div>
                <div className="text-[11px] text-slate-400">Alert if no backup has occurred in 48 hours</div>
              </div>
              <button
                type="button"
                onClick={() => setBackupAlerts(!backupAlerts)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                  backupAlerts ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow" />
              </button>
            </div>

            {/* Backup Failure Alert */}
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">Backup Failure Alert</div>
                <div className="text-[11px] text-slate-400">Alert immediately if cloud backup upload fails</div>
              </div>
              <button
                type="button"
                onClick={() => setBackupFailureAlerts(!backupFailureAlerts)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                  backupFailureAlerts ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow" />
              </button>
            </div>

            {/* Sync Error Alert */}
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">Sync Error Alert</div>
                <div className="text-[11px] text-slate-400">Alert if offline queue cannot reach Google Drive</div>
              </div>
              <button
                type="button"
                onClick={() => setSyncErrorAlerts(!syncErrorAlerts)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                  syncErrorAlerts ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow" />
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSaveNotifications}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 shadow"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Notification Preferences</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 8: SECURITY SETTINGS & APP LOCK */}
      {(activeSection === 'all' || activeSection === 'security') && (
        <div
          id="section-security"
          className={`p-5 rounded-2xl border space-y-4 ${
            isDark
              ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Shield className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-400">
                Security & App Lock (PIN Protection)
              </h2>
              <p className="text-xs text-slate-400">
                Prevent unauthorized access to accounts, cash registers, and dairy books
              </p>
            </div>
          </div>

          {/* App Lock Toggle */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                {appLockEnabled ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">
                  App Lock Status: {appLockEnabled ? 'ENABLED' : 'DISABLED'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {appLockEnabled
                    ? 'Requires PIN when launching application'
                    : 'Anyone with device access can view transactions'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggleAppLock(!appLockEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                appLockEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow" />
            </button>
          </div>

          {/* PIN Management Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowPinModal(true)}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400 text-slate-200 text-xs font-bold transition-all"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>{settings.security?.pinHash ? 'Change Security PIN' : 'Set Up Security PIN'}</span>
            </button>

            {settings.security?.appLockEnabled && (
              <button
                type="button"
                onClick={lockApp}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>Test Lock Now</span>
              </button>
            )}
          </div>

          {/* Emergency note */}
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-bold text-amber-400">Lockout Protection Guarantee: </span>
            PINs are hashed securely using SHA-256. If you ever forget your custom PIN, the emergency master bypass
            code <span className="font-mono font-bold text-slate-200">000000</span> allows you to safely reset your
            passcode without losing any business data or transactions.
          </div>
        </div>
      )}

      {/* SECTION 9: THEME & DISPLAY */}
      <div
        className={`p-5 rounded-2xl border space-y-3 ${
          isDark
            ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Palette className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
            Appearance & Visual Theme
          </h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-200">Visual Theme Mode</div>
            <p className="text-xs text-slate-400">
              Current: {isDark ? 'Royal Navy Dark' : 'Clean Light'}
            </p>
          </div>

          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isDark ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isDark ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
              }`}
            >
              Dark
            </button>
          </div>
        </div>
      </div>

      {/* Set/Change PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-amber-500/40 bg-[#101D36] p-5 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">Set App Security PIN</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setPinError('');
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Enter 4 to 6 Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-center tracking-widest font-mono text-lg font-bold outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinConfirmInput}
                  onChange={(e) => setPinConfirmInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-center tracking-widest font-mono text-lg font-bold outline-none focus:border-amber-400"
                />
              </div>

              {pinError && (
                <div className="text-xs text-rose-400 bg-rose-950/30 p-2 rounded-lg border border-rose-800/40">
                  {pinError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setPinError('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewPin}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow"
              >
                Save & Enable PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-blue-900/60 bg-[#101D36] p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">Link Google Drive Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Connect your Google account to automatically store daily Amul business snapshots in your personal Google
              Drive folder.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Account Name / Label
                </label>
                <input
                  type="text"
                  value={googleAccountNameInput}
                  onChange={(e) => setGoogleAccountNameInput(e.target.value)}
                  placeholder="e.g. Ashu Dairy Business"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="e.g. ashudairy@gmail.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  OAuth Access Token (Optional)
                </label>
                <input
                  type="password"
                  value={googleTokenInput}
                  onChange={(e) => setGoogleTokenInput(e.target.value)}
                  placeholder="Google Drive OAuth token"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!googleEmailInput.trim()) {
                    showToast('Please enter your Google email address', 'warning');
                    return;
                  }
                  connectGoogleAccount(
                    googleEmailInput.trim(),
                    googleTokenInput.trim(),
                    googleAccountNameInput.trim() || 'Google Account'
                  );
                  setShowConnectModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow"
              >
                Save & Connect Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot Restore Confirmation Modal */}
      {pendingRestoreSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-rose-900/60 bg-[#101D36] p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-rose-300">Confirm Database Restore</h3>
                <p className="text-xs text-slate-400">
                  Please review the backup details before replacing local records.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Backup Created:</span>
                  <span className="font-semibold text-slate-200">
                    {pendingRestoreSummary.exportedAt
                      ? new Date(pendingRestoreSummary.exportedAt).toLocaleString('en-IN')
                      : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Records:</span>
                  <span className="font-bold text-emerald-400">
                    {pendingRestoreSummary.totalRecords} records
                  </span>
                </div>
              </div>

              {pendingRestoreSummary.breakdown && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                    Records to be restored:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    {Object.entries(pendingRestoreSummary.breakdown).map(([table, count]) => (
                      <div
                        key={table}
                        className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex justify-between items-center"
                      >
                        <span className="text-slate-300 capitalize">{table.replace('_', ' ')}:</span>
                        <span className="font-bold text-amber-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelRestore}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all"
              >
                Cancel (Keep Current Data)
              </button>

              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg active:scale-95"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restoring Database...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Confirm & Restore Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
