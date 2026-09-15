import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Calendar,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  FileText,
  Users,
  Package,
  IndianRupee,
  FileCheck,
  Building,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { excelService, ExcelImportResult } from '../../services/excelService';

interface ExcelHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'export' | 'import';
}

export const ExcelHubModal: React.FC<ExcelHubModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'export',
}) => {
  const {
    customers,
    products,
    milkEntries,
    challans,
    purchases,
    payments,
    expenses,
    bills,
    customerBalances,
    bankCashSessions,
    saveCustomer,
    saveProduct,
    showToast,
    refreshAllData,
    theme,
  } = useApp();

  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'export' | 'import'>(defaultTab);

  // Export Filter State
  const [selectedExportModule, setSelectedExportModule] = useState<string>('MASTER');
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<string>(
    customers[0]?.id || ''
  );
  const [isExporting, setIsExporting] = useState(false);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle Date Shortcuts
  const setQuickRange = (type: 'all' | 'today' | 'month') => {
    const today = new Date().toISOString().slice(0, 10);
    if (type === 'all') {
      setExportStartDate('');
      setExportEndDate('');
    } else if (type === 'today') {
      setExportStartDate(today);
      setExportEndDate(today);
    } else if (type === 'month') {
      const firstDay = `${today.slice(0, 7)}-01`;
      setExportStartDate(firstDay);
      setExportEndDate(today);
    }
  };

  // Run Real Export
  const handleRunExport = async () => {
    setIsExporting(true);
    try {
      const start = exportStartDate || undefined;
      const end = exportEndDate || undefined;

      switch (selectedExportModule) {
        case 'MASTER':
          excelService.exportComprehensiveMasterWorkbook(
            customers,
            products,
            milkEntries,
            challans,
            purchases,
            payments,
            expenses,
            bills,
            customerBalances,
            start,
            end
          );
          showToast('Master Excel Workbook Generated & Downloaded!', 'success');
          break;

        case 'OUTSTANDING':
          excelService.exportOutstandingDues(customers, customerBalances);
          showToast('Outstanding Dues Excel Downloaded!', 'success');
          break;

        case 'CUSTOMERS':
          excelService.exportCustomers(customers);
          showToast('Customers List Excel Downloaded!', 'success');
          break;

        case 'PRODUCTS':
          excelService.exportProducts(products);
          showToast('Products Catalog Excel Downloaded!', 'success');
          break;

        case 'CUSTOMER_RATES':
          excelService.exportCustomerRates(customers, products);
          showToast('Customer Rates Excel Downloaded!', 'success');
          break;

        case 'MILK_ENTRIES':
          excelService.exportMilkEntries(milkEntries, start, end);
          showToast('Milk Entries Excel Downloaded!', 'success');
          break;

        case 'LEDGER': {
          const cust = customers.find((c) => c.id === selectedCustomerForLedger) || customers[0];
          if (!cust) {
            showToast('Please select a customer for ledger export', 'warning');
            return;
          }
          excelService.exportCustomerLedger(cust, milkEntries, payments, bills, start, end);
          showToast(`Ledger for ${cust.name} Downloaded!`, 'success');
          break;
        }

        case 'PAYMENTS':
          excelService.exportPayments(payments, start, end);
          showToast('Payments Excel Downloaded!', 'success');
          break;

        case 'PURCHASES':
          excelService.exportPurchases(purchases, start, end);
          showToast('Purchases Excel Downloaded!', 'success');
          break;

        case 'EXPENSES':
          excelService.exportExpenses(expenses, start, end);
          showToast('Expenses Excel Downloaded!', 'success');
          break;

        case 'STOCK': {
          // Calculate current stock breakdown
          const stockCalc: Record<string, { opening: number; inQty: number; outQty: number; currentQty: number; crates: number }> = {};
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
            stockCalc[p.id] = {
              opening: 0,
              inQty,
              outQty,
              currentQty,
              crates: currentQty / pouches,
            };
          });
          excelService.exportStock(products, stockCalc);
          showToast('Live Stock Excel Downloaded!', 'success');
          break;
        }

        case 'CHALLANS':
          excelService.exportChallans(challans, start, end);
          showToast('Challans Excel Downloaded!', 'success');
          break;

        case 'PARTY_SUMMARY':
          excelService.exportPartySummary(challans);
          showToast('Party Summary Excel Downloaded!', 'success');
          break;

        case 'BANK_CASH':
          excelService.exportBankCash(bankCashSessions, start, end);
          showToast('Bank & Cash Excel Downloaded!', 'success');
          break;

        case 'BILLS':
          excelService.exportBills(bills, start, end);
          showToast('Bills Excel Downloaded!', 'success');
          break;

        default:
          excelService.exportCustomers(customers);
      }
    } catch (err) {
      console.error(err);
      showToast('Export failed. Please check date range or data.', 'warning');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Selection for Import
  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsValidating(true);
    setImportResult(null);

    try {
      const res = await excelService.parseAndValidateExcel(file, customers, products);
      setImportResult(res);
      showToast(`Excel File Verified: ${res.type} (${res.validRows.length} valid records)`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to parse Excel file format', 'warning');
      setImportResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Confirm and Execute Import
  const handleExecuteImport = async () => {
    if (!importResult || importResult.validRows.length === 0) return;
    setIsImporting(true);

    try {
      if (importResult.type === 'CUSTOMERS') {
        for (const row of importResult.validRows) {
          const custData = {
            id: (row.id as string) || `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: (row.name as string) || 'Unnamed Customer',
            phone: (row.phone as string) || '',
            address: (row.address as string) || '',
            route: (row.route as string) || 'General Route',
            openingBalance: Number(row.openingBalance) || 0,
            customRates: {},
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          await saveCustomer(custData);
        }
      } else if (importResult.type === 'PRODUCTS') {
        for (const row of importResult.validRows) {
          const prodData = {
            id: (row.id as string) || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            code: (row.code as string) || 'AM',
            name: (row.name as string) || 'Amul Product',
            packSize: (row.packSize as string) || '500ml',
            category: (row.category as any) || 'MILK',
            unit: (row.unit as any) || 'pouch',
            pouchesPerCrate: Number(row.pouchesPerCrate) || 24,
            unitsPerCrate: Number(row.pouchesPerCrate) || 24,
            defaultWholesaleRate: Number(row.defaultWholesaleRate) || 0,
            defaultRate: Number(row.defaultWholesaleRate) || 0,
            mrp: Number(row.mrp) || Number(row.defaultWholesaleRate) || 0,
            isActive: true,
          };
          await saveProduct(prodData);
        }
      } else if (importResult.type === 'CUSTOMER_RATES') {
        for (const row of importResult.validRows) {
          const custId = row.customerId as string;
          const prodId = row.productId as string;
          const rate = Number(row.rate);
          const targetCust = customers.find((c) => c.id === custId);
          if (targetCust) {
            const updatedRates = { ...(targetCust.customRates || {}), [prodId]: rate };
            await saveCustomer({
              ...targetCust,
              customRates: updatedRates,
            });
          }
        }
      }

      await refreshAllData();
      showToast(
        `Import Completed! (${importResult.summary.imported} Added, ${importResult.summary.updated} Updated)`,
        'success'
      );
      // Reset
      setImportFile(null);
      setImportResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast('Import failed. Please try again.', 'warning');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#101D36] border-blue-900/60 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400">
                Excel Data Center
              </h2>
              <p className="text-xs text-slate-400">
                Real .xlsx spreadsheets with date filters & safe bulk imports
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 p-1 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'export'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>EXPORT TO EXCEL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'import'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>IMPORT FROM EXCEL</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'export' ? (
            /* EXPORT VIEW */
            <div className="space-y-4">
              {/* Module Picker */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                  Select Data Module to Export
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'MASTER', label: '⭐ Complete Master Backup', count: 'All Sheets' },
                    { id: 'OUTSTANDING', label: 'Customer Dues & Balances', count: `${customers.length} records` },
                    { id: 'MILK_ENTRIES', label: 'Milk Entries (Sales)', count: `${milkEntries.length} records` },
                    { id: 'LEDGER', label: 'Customer Ledger Statement', count: 'Selected Customer' },
                    { id: 'CHALLANS', label: 'Delivery Challans', count: `${challans.length} records` },
                    { id: 'PARTY_SUMMARY', label: 'Party Challan Summary', count: 'Grouped' },
                    { id: 'PURCHASES', label: 'Purchases (Stock In)', count: `${purchases.length} records` },
                    { id: 'STOCK', label: 'Live Stock & Crates', count: `${products.length} products` },
                    { id: 'PAYMENTS', label: 'Payments Received', count: `${payments.length} records` },
                    { id: 'EXPENSES', label: 'Expenses Daybook', count: `${expenses.length} records` },
                    { id: 'BILLS', label: 'Bills Issued', count: `${bills.length} records` },
                    { id: 'CUSTOMERS', label: 'Customer Directory', count: `${customers.length} records` },
                    { id: 'PRODUCTS', label: 'Product Catalog', count: `${products.length} products` },
                    { id: 'CUSTOMER_RATES', label: 'Customer Special Rates', count: 'Matrix' },
                    { id: 'BANK_CASH', label: 'Bank & Cash Sessions', count: `${bankCashSessions.length} records` },
                  ].map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setSelectedExportModule(mod.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedExportModule === mod.id
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold'
                          : isDark
                          ? 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs truncate">{mod.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{mod.count}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Selector for Ledger */}
              {selectedExportModule === 'LEDGER' && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-400">
                    Choose Customer for Ledger:
                  </label>
                  <select
                    value={selectedCustomerForLedger}
                    onChange={(e) => setSelectedCustomerForLedger(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 outline-none"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.route}) - Bal: ₹{customerBalances[c.id] || c.openingBalance}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Range Filtering */}
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    Date Range Filter (Optional)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuickRange('today')}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickRange('month')}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickRange('all')}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      All Time
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400">From Date:</span>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">To Date:</span>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Primary Export Button */}
              <div className="pt-2">
                <button
                  id="btn-confirm-export-excel"
                  type="button"
                  onClick={handleRunExport}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg active:scale-98 disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Generating Excel File...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>EXPORT TO EXCEL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* IMPORT VIEW */
            <div className="space-y-4">
              {/* Instructions & Template Download */}
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4" />
                    Download Blank Sample Templates:
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  You can bulk import Customers, Products, or Custom Rates. Fill one of our verified templates or upload your own spreadsheet:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => excelService.generateSampleTemplate('CUSTOMERS')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700 text-xs font-semibold hover:bg-slate-800 text-slate-200"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    Customers Template
                  </button>
                  <button
                    type="button"
                    onClick={() => excelService.generateSampleTemplate('PRODUCTS')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700 text-xs font-semibold hover:bg-slate-800 text-slate-200"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    Products Template
                  </button>
                  <button
                    type="button"
                    onClick={() => excelService.generateSampleTemplate('CUSTOMER_RATES')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700 text-xs font-semibold hover:bg-slate-800 text-slate-200"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    Customer Rates Template
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl cursor-pointer bg-slate-900/40 transition-all">
                <Upload className="w-8 h-8 text-emerald-400 mb-2" />
                <span className="text-xs font-bold text-slate-200">
                  {importFile ? importFile.name : 'Click or Drag Excel File to Upload (.xlsx, .xls, .csv)'}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  System automatically auto-detects Customers, Products, or Rates
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFilePicked}
                  className="hidden"
                />
              </label>

              {/* Validation Status / Spinner */}
              {isValidating && (
                <div className="flex items-center justify-center gap-2 p-4 text-xs text-emerald-400 font-bold">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating Excel columns and inspecting rows...</span>
                </div>
              )}

              {/* Validation Preview & Summary */}
              {importResult && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-slate-800/70 border border-slate-700">
                      <div className="text-[10px] uppercase text-slate-400 font-bold">Type</div>
                      <div className="text-xs font-black text-emerald-400 truncate">{importResult.type}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-800/70 border border-slate-700">
                      <div className="text-[10px] uppercase text-slate-400 font-bold">New Import</div>
                      <div className="text-xs font-black text-emerald-400">{importResult.summary.imported}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-800/70 border border-slate-700">
                      <div className="text-[10px] uppercase text-slate-400 font-bold">Updated</div>
                      <div className="text-xs font-black text-amber-400">{importResult.summary.updated}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-800/70 border border-slate-700">
                      <div className="text-[10px] uppercase text-slate-400 font-bold">Errors</div>
                      <div className="text-xs font-black text-rose-400">{importResult.summary.errors}</div>
                    </div>
                  </div>

                  {/* Errors display if any */}
                  {importResult.errors.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-300 space-y-1.5 max-h-36 overflow-y-auto">
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Validation Issues ({importResult.errors.length}):</span>
                      </div>
                      {importResult.errors.map((err, i) => (
                        <div key={i} className="text-[11px] text-rose-300/90 font-mono">
                          Row {err.row}: [{err.field}] {err.message}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Safety note */}
                  <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-emerald-300 text-[11px] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Safety Guaranteed: Historical milk transactions, ledger history, and stock records are 100% preserved.</span>
                  </div>

                  {/* Confirm Button */}
                  <button
                    id="btn-confirm-import-excel"
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={isImporting || importResult.validRows.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg active:scale-98 disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Importing Records into Database...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          CONFIRM IMPORT ({importResult.validRows.length} VALID RECORDS)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
