import React, { useState, useMemo } from 'react';
import {
  FileText,
  Send,
  Printer,
  CheckCircle2,
  Calendar,
  DollarSign,
  User,
  ArrowRight,
  Clock,
  Trash2,
  Eye,
  Plus,
  Search,
  CheckSquare,
  X,
  CreditCard,
  Building2,
  Phone,
  Share2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Bill, BillItem, Customer } from '../../types';

export const BillingScreen: React.FC = () => {
  const {
    customers,
    products,
    milkEntries,
    payments,
    bills,
    saveBill,
    deleteBill,
    savePayment,
    generateNextBillNumber,
    settings,
    selectedDate,
    getCustomerSummary,
    theme,
    showToast,
  } = useApp();

  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'GENERATE' | 'HISTORY'>('GENERATE');

  // Selected Customer & Date Range
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [fromDate, setFromDate] = useState<string>(() => {
    // Default to 1st of current month
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(selectedDate);
  const [billTypePreset, setBillTypePreset] = useState<string>('MONTHLY');

  // Currently viewing bill modal
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);
  const [billToMarkPaid, setBillToMarkPaid] = useState<Bill | null>(null);

  // History search and filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID' | 'PARTIAL'>('ALL');

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || customers[0];
  }, [customers, selectedCustomerId]);

  // Date range presets
  const applyPreset = (preset: 'TODAY' | 'WEEKLY' | '10_DAYS' | '15_DAYS' | 'MONTHLY') => {
    setBillTypePreset(preset);
    const todayObj = new Date(selectedDate);
    const year = todayObj.getFullYear();
    const month = todayObj.getMonth();
    const dateNum = todayObj.getDate();

    if (preset === 'TODAY') {
      setFromDate(selectedDate);
      setToDate(selectedDate);
    } else if (preset === 'WEEKLY') {
      const past = new Date(todayObj);
      past.setDate(past.getDate() - 6);
      setFromDate(past.toISOString().split('T')[0]);
      setToDate(selectedDate);
    } else if (preset === '10_DAYS') {
      // 1-10, 11-20, or 21-end
      if (dateNum <= 10) {
        setFromDate(new Date(year, month, 1).toISOString().split('T')[0]);
        setToDate(new Date(year, month, 10).toISOString().split('T')[0]);
      } else if (dateNum <= 20) {
        setFromDate(new Date(year, month, 11).toISOString().split('T')[0]);
        setToDate(new Date(year, month, 20).toISOString().split('T')[0]);
      } else {
        setFromDate(new Date(year, month, 21).toISOString().split('T')[0]);
        setToDate(new Date(year, month + 1, 0).toISOString().split('T')[0]);
      }
    } else if (preset === '15_DAYS') {
      if (dateNum <= 15) {
        setFromDate(new Date(year, month, 1).toISOString().split('T')[0]);
        setToDate(new Date(year, month, 15).toISOString().split('T')[0]);
      } else {
        setFromDate(new Date(year, month, 16).toISOString().split('T')[0]);
        setToDate(new Date(year, month + 1, 0).toISOString().split('T')[0]);
      }
    } else if (preset === 'MONTHLY') {
      setFromDate(new Date(year, month, 1).toISOString().split('T')[0]);
      setToDate(new Date(year, month + 1, 0).toISOString().split('T')[0]);
    }
  };

  // Filter milk entries for customer within [fromDate, toDate]
  const periodEntries = useMemo(() => {
    if (!selectedCustomer) return [];
    return milkEntries.filter(
      (e) =>
        e.customerId === selectedCustomer.id &&
        e.date >= fromDate &&
        e.date <= toDate
    );
  }, [milkEntries, selectedCustomer, fromDate, toDate]);

  // Filter customer payments within [fromDate, toDate]
  const periodPayments = useMemo(() => {
    if (!selectedCustomer) return [];
    return payments.filter(
      (p) =>
        p.customerId === selectedCustomer.id &&
        p.date >= fromDate &&
        p.date <= toDate
    );
  }, [payments, selectedCustomer, fromDate, toDate]);

  // Previous Balance: Total customer balance before fromDate
  const previousBalance = useMemo(() => {
    if (!selectedCustomer) return 0;
    const initialOpening = selectedCustomer.openingBalance || 0;

    // Prior entries
    const priorEntriesAmount = milkEntries
      .filter((e) => e.customerId === selectedCustomer.id && e.date < fromDate)
      .reduce((sum, e) => sum + (e.totalAmount || 0), 0);

    // Prior payments
    const priorPaymentsAmount = payments
      .filter((p) => p.customerId === selectedCustomer.id && p.date < fromDate)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return initialOpening + priorEntriesAmount - priorPaymentsAmount;
  }, [selectedCustomer, fromDate, milkEntries, payments]);

  // Product-wise summary for period
  const productSummary = useMemo(() => {
    const summaryMap: Record<
      string,
      {
        productName: string;
        productCode: string;
        quantity: number;
        rate: number;
        amount: number;
      }
    > = {};

    periodEntries.forEach((entry) => {
      entry.items.forEach((item) => {
        const key = item.productId || item.productCode;
        if (!summaryMap[key]) {
          summaryMap[key] = {
            productName: item.productName,
            productCode: item.productCode,
            quantity: 0,
            rate: item.rate,
            amount: 0,
          };
        }
        summaryMap[key].quantity += item.quantity || 0;
        summaryMap[key].amount += (item.quantity || 0) * (item.rate || 0);
      });
    });

    return Object.values(summaryMap);
  }, [periodEntries]);

  // Detailed daily items flat list
  const detailedDailyItems = useMemo(() => {
    const rows: Array<{
      date: string;
      shift: string;
      productName: string;
      quantity: number;
      rate: number;
      amount: number;
    }> = [];

    periodEntries.forEach((entry) => {
      entry.items.forEach((item) => {
        rows.push({
          date: entry.date,
          shift: entry.shift,
          productName: item.productName,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount || item.quantity * item.rate,
        });
      });
    });

    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [periodEntries]);

  const currentMilkTotal = useMemo(() => {
    return periodEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  }, [periodEntries]);

  const paymentsReceived = useMemo(() => {
    return periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [periodPayments]);

  const netPayableAmount = useMemo(() => {
    return currentMilkTotal + previousBalance - paymentsReceived;
  }, [currentMilkTotal, previousBalance, paymentsReceived]);

  // Save Bill Handler
  const handleSaveBill = async () => {
    if (!selectedCustomer) return;

    const nextBillNo = generateNextBillNumber();
    const formattedBillItems: BillItem[] = productSummary.map((ps) => ({
      productId: ps.productCode,
      productCode: ps.productCode,
      productName: ps.productName,
      quantity: ps.quantity,
      totalQty: ps.quantity,
      amQty: 0,
      pmQty: 0,
      rate: ps.rate,
      amount: ps.amount,
    }));

    const newBill: Bill = {
      id: `bill_${Date.now()}`,
      billNumber: nextBillNo,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerCode: selectedCustomer.code || selectedCustomer.route,
      customerPhone: selectedCustomer.phone,
      customerRoute: selectedCustomer.route,
      billDate: selectedDate,
      billType: billTypePreset,
      fromDate,
      toDate,
      items: formattedBillItems,
      milkTotal: currentMilkTotal,
      totalMilkAmount: currentMilkTotal,
      previousBalance,
      paymentsReceived,
      currentDue: netPayableAmount,
      netPayable: netPayableAmount,
      status: netPayableAmount <= 0 ? 'PAID' : paymentsReceived > 0 ? 'PARTIAL' : 'UNPAID',
      notes: `Generated on ${new Date().toLocaleDateString('en-IN')}`,
      createdAt: new Date().toISOString(),
    };

    await saveBill(newBill);
    setViewingBill(newBill);
    showToast(`Bill ${nextBillNo} generated & saved successfully!`, 'success');
  };

  // Real WhatsApp Share Generator
  const generateWhatsAppMessage = (billData: {
    billNumber: string;
    customerName: string;
    customerCode?: string;
    fromDate: string;
    toDate: string;
    items: Array<{ productName: string; quantity: number; rate: number; amount: number }>;
    totalMilkAmount: number;
    previousBalance: number;
    paymentsReceived: number;
    netPayable: number;
  }) => {
    const dairyName = (settings.businessName || 'ASHU DAIRY ERP').toUpperCase();
    const itemsLines = billData.items
      .map(
        (it) =>
          `• ${it.productName}: ${it.quantity} Pouches @ ₹${it.rate} = ₹${it.amount.toLocaleString('en-IN')}`
      )
      .join('\n');

    return [
      `🏪 *${dairyName}*`,
      `📄 Bill No: ${billData.billNumber}`,
      `👤 Customer: ${billData.customerName} (${billData.customerCode || 'CUST'})`,
      `📅 Period: ${billData.fromDate} to ${billData.toDate}`,
      `---------------------------------`,
      `Milk Delivered:`,
      itemsLines || '• Regular deliveries recorded',
      `---------------------------------`,
      `Current Milk: ₹${billData.totalMilkAmount.toLocaleString('en-IN')}`,
      `Previous Balance: ₹${billData.previousBalance.toLocaleString('en-IN')}`,
      `Payments Received: ₹${billData.paymentsReceived.toLocaleString('en-IN')}`,
      `---------------------------------`,
      `*Total Net Due: ₹${billData.netPayable.toLocaleString('en-IN')}*`,
      `---------------------------------`,
      `Please clear your dues.`,
      `Thank you for your business!`,
      `Payment via UPI / Cash accepted.`,
    ].join('\n');
  };

  const handleShareWhatsApp = (bill: Bill | null, cust: Customer | undefined) => {
    if (!bill) return;
    const itemsList = bill.items.map((it) => ({
      productName: it.productName,
      quantity: it.totalQty || it.quantity || 0,
      rate: it.rate,
      amount: it.amount,
    }));

    const msg = generateWhatsAppMessage({
      billNumber: bill.billNumber,
      customerName: bill.customerName,
      customerCode: bill.customerCode,
      fromDate: bill.fromDate,
      toDate: bill.toDate,
      items: itemsList,
      totalMilkAmount: bill.totalMilkAmount ?? bill.milkTotal,
      previousBalance: bill.previousBalance,
      paymentsReceived: bill.paymentsReceived,
      netPayable: bill.netPayable ?? bill.currentDue,
    });

    const rawPhone = cust?.phone || bill.customerPhone || '';
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const encodedText = encodeURIComponent(msg);
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(url, '_blank');
  };

  const handleAndroidShare = async (bill: Bill | null, cust: Customer | undefined) => {
    if (!bill) return;
    const itemsList = bill.items.map((it) => ({
      productName: it.productName,
      quantity: it.totalQty || it.quantity || 0,
      rate: it.rate,
      amount: it.amount,
    }));

    const msg = generateWhatsAppMessage({
      billNumber: bill.billNumber,
      customerName: bill.customerName,
      customerCode: bill.customerCode,
      fromDate: bill.fromDate,
      toDate: bill.toDate,
      items: itemsList,
      totalMilkAmount: bill.totalMilkAmount ?? bill.milkTotal,
      previousBalance: bill.previousBalance,
      paymentsReceived: bill.paymentsReceived,
      netPayable: bill.netPayable ?? bill.currentDue,
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bill ${bill.billNumber} - ${bill.customerName}`,
          text: msg,
        });
        showToast('Bill shared via Android system share!', 'success');
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          console.warn('Native share failed, falling back:', err);
        }
      }
    }

    // Fallback if native share is not available or rejected
    try {
      await navigator.clipboard.writeText(msg);
      showToast('Bill text copied to clipboard for sharing!', 'info');
    } catch {
      handleShareWhatsApp(bill, cust);
    }
  };

  // Filtered Bill History
  const filteredHistory = useMemo(() => {
    return bills
      .filter((b) => {
        const matchesQuery =
          b.customerName.toLowerCase().includes(historySearch.toLowerCase()) ||
          b.billNumber.toLowerCase().includes(historySearch.toLowerCase()) ||
          (b.customerRoute || '').toLowerCase().includes(historySearch.toLowerCase());
        const matchesStatus = historyStatusFilter === 'ALL' || b.status === historyStatusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bills, historySearch, historyStatusFilter]);

  // Mark Bill as Paid
  const executeMarkBillAsPaid = async (b: Bill) => {
    const due = b.netPayable ?? b.currentDue;
    const updated: Bill = {
      ...b,
      status: 'PAID',
      paymentsReceived: b.paymentsReceived + due,
      currentDue: 0,
      netPayable: 0,
    };
    await saveBill(updated);

    // Also record payment entry
    await savePayment({
      id: `pay_bill_${Date.now()}`,
      customerId: b.customerId,
      customerName: b.customerName,
      amount: due,
      date: selectedDate,
      mode: 'CASH',
      notes: `Settlement for Bill #${b.billNumber}`,
      createdAt: new Date().toISOString(),
    });

    showToast(`Bill #${b.billNumber} marked as PAID`, 'success');
    if (viewingBill?.id === b.id) {
      setViewingBill(updated);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          isDark
            ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight">Customer Billing & Invoices</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Generate periodic statements, auto-calculate net dues, send real WhatsApp bills.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-black/30 p-1.5 rounded-xl border border-white/10 text-xs font-bold self-start sm:self-auto">
            <button
              id="tab-generate-bill"
              onClick={() => setActiveTab('GENERATE')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'GENERATE'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Bill</span>
            </button>

            <button
              id="tab-bill-history"
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'HISTORY'
                  ? 'bg-indigo-500 text-white font-extrabold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Bill History ({bills.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GENERATE BILL                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'GENERATE' && (
        <div className="space-y-4">
          {/* Controls: Customer & Presets */}
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                1. Select Customer & Period
              </span>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                {[
                  { key: 'TODAY', label: 'Daily' },
                  { key: 'WEEKLY', label: 'Weekly' },
                  { key: '10_DAYS', label: '10-Days' },
                  { key: '15_DAYS', label: '15-Days' },
                  { key: 'MONTHLY', label: 'Monthly' },
                ].map((pr) => (
                  <button
                    key={pr.key}
                    type="button"
                    onClick={() => applyPreset(pr.key as any)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      billTypePreset === pr.key
                        ? 'bg-amber-500 text-slate-950 font-black shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {pr.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Customer *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.route} - {c.code || 'CUST'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  From Date *
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setBillTypePreset('CUSTOM');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  To Date *
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setBillTypePreset('CUSTOM');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none font-bold"
                />
              </div>
            </div>
          </div>

          {/* Generated Bill Interactive Preview */}
          {selectedCustomer && (
            <div
              className={`p-6 rounded-3xl border shadow-xl space-y-5 ${
                isDark
                  ? 'bg-[#0B1528] border-blue-900/40 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-900 shadow-md'
              }`}
            >
              {/* Header Letterhead */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-800 pb-4 gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Dairy Sales Invoice
                  </span>
                  <h2 className="text-xl font-black text-amber-400 mt-1">
                    {settings.businessName || 'ASHU DAIRY ERP'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {settings.address || 'Milk Supply Hub'} • Phone: {settings.phone || '9876543210'}
                  </p>
                  {settings.gstNumber && (
                    <p className="text-[11px] text-slate-500 font-mono">
                      GSTIN: {settings.gstNumber}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400">Invoice Reference</span>
                  <div className="text-sm font-black text-amber-400">
                    Preview (Auto #{generateNextBillNumber()})
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {fromDate} <ArrowRight className="inline w-3 h-3 mx-0.5" /> {toDate}
                  </div>
                </div>
              </div>

              {/* Customer Info Card */}
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Billed To:</span>
                  <div className="font-extrabold text-sm text-slate-100">
                    {selectedCustomer.name}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Route: <strong>{selectedCustomer.route}</strong> • Code:{' '}
                    <strong>{selectedCustomer.code || 'CUST'}</strong> • Phone:{' '}
                    <strong>{selectedCustomer.phone || 'N/A'}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Deliveries in Period:
                  </span>
                  <span className="font-black text-slate-200">
                    {periodEntries.length} daily entries recorded
                  </span>
                </div>
              </div>

              {/* Product Summary Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Milk Delivered Breakup
                </span>

                <div className="rounded-2xl border border-slate-800 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-slate-400 text-[11px]">
                      <tr>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5 text-center">Total Quantity</th>
                        <th className="p-2.5 text-right">Rate</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {productSummary.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-500 italic">
                            No milk delivered between {fromDate} and {toDate}.
                          </td>
                        </tr>
                      ) : (
                        productSummary.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/30">
                            <td className="p-2.5 font-bold text-slate-200">{p.productName}</td>
                            <td className="p-2.5 text-center font-bold text-amber-400">
                              {p.quantity} pouches
                            </td>
                            <td className="p-2.5 text-right text-slate-300">₹{p.rate}</td>
                            <td className="p-2.5 text-right font-black text-slate-100">
                              ₹{p.amount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-900/80 font-black text-slate-100">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right text-amber-400">
                          Current Milk Total:
                        </td>
                        <td className="p-2.5 text-right text-amber-400 text-sm">
                          ₹{currentMilkTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Detailed Daily Breakdown Table (Expandable) */}
              {detailedDailyItems.length > 0 && (
                <details className="text-xs group border border-slate-800 rounded-2xl p-3 bg-slate-900/30">
                  <summary className="cursor-pointer font-bold text-slate-400 hover:text-amber-400 flex items-center justify-between">
                    <span>
                      View Detailed Day-by-Day Delivery Log ({detailedDailyItems.length} rows)
                    </span>
                    <span className="text-[10px] text-slate-500 underline">Toggle details</span>
                  </summary>

                  <div className="mt-3 max-h-48 overflow-y-auto border-t border-slate-800 pt-2">
                    <table className="w-full text-left text-[11px]">
                      <thead className="text-slate-500">
                        <tr>
                          <th className="p-1">Date</th>
                          <th className="p-1">Shift</th>
                          <th className="p-1">Product</th>
                          <th className="p-1 text-center">Qty</th>
                          <th className="p-1 text-right">Rate</th>
                          <th className="p-1 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {detailedDailyItems.map((r, i) => (
                          <tr key={i}>
                            <td className="p-1 text-slate-300">{r.date}</td>
                            <td className="p-1 font-bold text-amber-400">{r.shift}</td>
                            <td className="p-1 text-slate-300">{r.productName}</td>
                            <td className="p-1 text-center font-bold text-slate-200">{r.quantity}</td>
                            <td className="p-1 text-right text-slate-400">₹{r.rate}</td>
                            <td className="p-1 text-right font-bold text-slate-200">₹{r.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}

              {/* Financial Calculation Statement */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 divide-y divide-slate-800 text-xs space-y-2">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400 font-semibold">
                    Previous Balance (Opening before {fromDate})
                  </span>
                  <span className="font-bold text-slate-200">
                    ₹{previousBalance.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 text-amber-400 font-bold">
                  <span>+ Total Milk Delivered in this Period</span>
                  <span>₹{currentMilkTotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between items-center py-1 text-emerald-400 font-bold">
                  <span>- Payments Received in this Period</span>
                  <span>- ₹{paymentsReceived.toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-2 flex justify-between items-center text-base font-black">
                  <span className="text-slate-100">Net Closing Payable Due:</span>
                  <span
                    className={
                      netPayableAmount > 0 ? 'text-rose-400 text-lg' : 'text-emerald-400 text-lg'
                    }
                  >
                    ₹{netPayableAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  Save bill to permanently retain invoice records and history.
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print</span>
                  </button>

                  <button
                    id="btn-save-bill"
                    type="button"
                    onClick={handleSaveBill}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 active:scale-95 transition-all shadow-lg"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>SAVE BILL & VIEW</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BILL HISTORY                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div
                className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search bill #, customer name, route..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5 text-xs font-bold">
                {(['ALL', 'UNPAID', 'PARTIAL', 'PAID'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setHistoryStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      historyStatusFilter === st
                        ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                        : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-black'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bills Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredHistory.length === 0 ? (
              <div className="col-span-full py-16 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs font-bold text-slate-400">No saved bills found.</p>
                <p className="text-[11px] text-slate-500">
                  Switch to &quot;Generate Bill&quot; tab to create your first customer statement.
                </p>
              </div>
            ) : (
              filteredHistory.map((b) => (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                    isDark
                      ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                      : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-100">{b.customerName}</h4>
                      <div className="text-xs text-amber-400 font-bold">Bill #{b.billNumber}</div>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        b.status === 'PAID'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : b.status === 'PARTIAL'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Period:</span>
                      <span className="font-medium text-slate-300">
                        {b.fromDate} to {b.toDate}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Milk Delivered:</span>
                      <span className="font-bold text-slate-200">
                        ₹{b.totalMilkAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Net Due Payable:</span>
                      <span className="font-black text-rose-400">
                        ₹{b.netPayable.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingBill(b)}
                        className="text-sky-400 hover:text-sky-300 font-bold text-[11px] flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>

                      <button
                        onClick={() => {
                          const cust = customers.find((c) => c.id === b.customerId);
                          handleShareWhatsApp(b, cust);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-bold text-[11px] flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" /> WhatsApp
                      </button>

                      <button
                        onClick={() => {
                          const cust = customers.find((c) => c.id === b.customerId);
                          handleAndroidShare(b, cust);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-bold text-[11px] flex items-center gap-1"
                        title="Android System Share"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {b.status !== 'PAID' && (
                        <button
                          onClick={() => setBillToMarkPaid(b)}
                          className="text-amber-400 hover:text-amber-300 font-bold text-[11px]"
                        >
                          Mark Paid
                        </button>
                      )}

                      <button
                        onClick={() => setBillToDelete(b)}
                        className="text-rose-400 hover:text-rose-300"
                        title="Delete bill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* View Bill Modal */}
      {viewingBill && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setViewingBill(null)}
        >
          <div
            className={`w-full max-w-2xl max-h-[92vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${
              isDark
                ? 'bg-[#0B1528] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-amber-400">
                  Bill #{viewingBill.billNumber}
                </h3>
                <span className="text-xs text-slate-400">
                  {viewingBill.fromDate} to {viewingBill.toDate}
                </span>
              </div>
              <button
                onClick={() => setViewingBill(null)}
                className="p-1 rounded-xl bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Dairy & Customer Details */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex justify-between items-start">
                <div>
                  <h4 className="font-black text-sm text-slate-100">
                    {settings.businessName || 'ASHU DAIRY ERP'}
                  </h4>
                  <p className="text-[11px] text-slate-400">{settings.address}</p>
                  <p className="text-[11px] text-slate-400">Phone: {settings.phone}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Customer
                  </span>
                  <span className="font-bold text-slate-100">{viewingBill.customerName}</span>
                  <p className="text-[11px] text-slate-400">
                    {viewingBill.customerRoute} | {viewingBill.customerPhone || 'No phone'}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-slate-400 text-[11px]">
                    <tr>
                      <th className="p-2">Product</th>
                      <th className="p-2 text-center">Quantity</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {viewingBill.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-bold text-slate-200">{it.productName}</td>
                        <td className="p-2 text-center font-bold text-amber-400">{it.quantity}</td>
                        <td className="p-2 text-right text-slate-300">₹{it.rate}</td>
                        <td className="p-2 text-right font-black text-slate-100">₹{it.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financials */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Previous Balance:</span>
                  <span className="font-bold text-slate-200">
                    ₹{viewingBill.previousBalance.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-amber-400 font-bold">
                  <span>Current Milk Amount:</span>
                  <span>+ ₹{viewingBill.totalMilkAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Payments Received:</span>
                  <span>- ₹{viewingBill.paymentsReceived.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-black text-sm">
                  <span className="text-slate-100">Total Net Due:</span>
                  <span className="text-rose-400">
                    ₹{viewingBill.netPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewingBill(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {viewingBill.status !== 'PAID' && (
                  <button
                    type="button"
                    onClick={() => setBillToMarkPaid(viewingBill)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-500 shadow"
                  >
                    Mark as Paid
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const cust = customers.find((c) => c.id === viewingBill.customerId);
                    handleShareWhatsApp(viewingBill, cust);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-500 shadow"
                >
                  <Send className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const cust = customers.find((c) => c.id === viewingBill.customerId);
                    handleAndroidShare(viewingBill, cust);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-500 shadow"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Android Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill Delete Confirmation Modal */}
      {billToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setBillToDelete(null)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl border p-5 shadow-2xl space-y-4 ${
              isDark ? 'bg-[#0B1528] border-rose-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-400">Delete Bill Record?</h3>
                <p className="text-xs text-slate-400">Are you sure you want to delete this bill?</p>
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border text-xs space-y-1 ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex justify-between">
                <span className="text-slate-400">Bill #:</span>
                <span className="font-bold">{billToDelete.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold">{billToDelete.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Net Payable:</span>
                <span className="font-black text-rose-400">₹{billToDelete.netPayable.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Period:</span>
                <span>{billToDelete.startDate} to {billToDelete.endDate}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Deleting will remove this invoice from bill history and party statement records.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBillToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = billToDelete.id;
                  setBillToDelete(null);
                  await deleteBill(id);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 active:scale-95 transition-all shadow-sm"
              >
                Yes, Delete Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Mark Paid Confirmation Modal */}
      {billToMarkPaid && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setBillToMarkPaid(null)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl border p-5 shadow-2xl space-y-4 ${
              isDark ? 'bg-[#0B1528] border-emerald-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-400">Mark Bill as Paid?</h3>
                <p className="text-xs text-slate-400">Record full settlement for this invoice</p>
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border text-xs space-y-1 ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex justify-between">
                <span className="text-slate-400">Bill #:</span>
                <span className="font-bold">{billToMarkPaid.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold">{billToMarkPaid.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Settlement Amount:</span>
                <span className="font-black text-emerald-400">
                  ₹{(billToMarkPaid.netPayable ?? billToMarkPaid.currentDue).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              This will update the bill status to PAID and automatically create a cash payment ledger entry in the customer account.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBillToMarkPaid(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const b = billToMarkPaid;
                  setBillToMarkPaid(null);
                  await executeMarkBillAsPaid(b);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 active:scale-95 transition-all shadow-sm"
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
