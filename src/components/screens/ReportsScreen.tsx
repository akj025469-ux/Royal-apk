import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  FileSpreadsheet,
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

type ReportTab =
  | 'OUTSTANDING'
  | 'DAILY_SALES'
  | 'PROFIT_LOSS'
  | 'STOCK_REPORT'
  | 'PARTY_PURCHASE'
  | 'EXPENSES';

export const ReportsScreen: React.FC = () => {
  const {
    customers,
    products,
    milkEntries,
    challans,
    purchases,
    payments,
    expenses,
    selectedDate,
    getCustomerSummary,
    getStockForDate,
    theme,
  } = useApp();

  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<ReportTab>('OUTSTANDING');
  const [reportDate, setReportDate] = useState(selectedDate);

  // Outstanding Dues Report Data
  const customerDues = useMemo(() => {
    return customers.map((c) => {
      const summary = getCustomerSummary(c.id);
      return {
        customer: c,
        opening: summary.opening,
        billed: summary.totalBilled,
        paid: summary.totalPaid,
        balance: summary.balance,
      };
    });
  }, [customers, getCustomerSummary]);

  const totalOutstanding = customerDues.reduce((sum, d) => sum + d.balance, 0);

  // Daily Sales Report Data
  const dailySales = useMemo(() => {
    return milkEntries.filter((e) => e.date === reportDate);
  }, [milkEntries, reportDate]);

  const amSales = dailySales.filter((e) => e.shift === 'AM');
  const pmSales = dailySales.filter((e) => e.shift === 'PM');
  const totalDailyRevenue = dailySales.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalDailyPouches = dailySales.reduce((sum, e) => sum + e.totalQuantity, 0);

  // Daily Profit & Loss Data
  const plData = useMemo(() => {
    const revenue = dailySales.reduce((sum, e) => sum + e.totalAmount, 0);

    // Cost of milk purchased/inward on that date
    const challanCost = challans
      .filter((c) => c.date === reportDate)
      .reduce((sum, c) => sum + c.netAmount, 0);

    const purchaseCost = purchases
      .filter((p) => p.date === reportDate)
      .reduce((sum, p) => sum + p.totalAmount, 0);

    const costOfGoods = challanCost + purchaseCost;
    const grossProfit = revenue - costOfGoods;

    const dayExpenses = expenses
      .filter((e) => e.date === reportDate)
      .reduce((sum, e) => sum + e.amount, 0);

    const netProfit = grossProfit - dayExpenses;

    return { revenue, costOfGoods, grossProfit, dayExpenses, netProfit };
  }, [dailySales, challans, purchases, expenses, reportDate]);

  // Stock Report Data
  const stockRows = useMemo(() => {
    return getStockForDate(reportDate, 'ALL');
  }, [getStockForDate, reportDate]);

  // Export to Excel / CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeTab === 'OUTSTANDING') {
      csvContent += 'Customer Name,Route,Phone,Opening Balance,Total Billed,Total Paid,Closing Balance\n';
      customerDues.forEach((d) => {
        csvContent += `"${d.customer.name}","${d.customer.route}","${d.customer.phone}",${d.opening},${d.billed},${d.paid},${d.balance}\n`;
      });
    } else if (activeTab === 'DAILY_SALES') {
      csvContent += 'Customer,Shift,Quantity,Amount,Date\n';
      dailySales.forEach((e) => {
        csvContent += `"${e.customerName}","${e.shift}",${e.totalQuantity},${e.totalAmount},"${e.date}"\n`;
      });
    } else if (activeTab === 'STOCK_REPORT') {
      csvContent += 'Code,Product Name,Received (Pouches),AM Outward,PM Outward,Total Outward,Balance Stock\n';
      stockRows.forEach((r) => {
        csvContent += `"${r.product.code}","${r.product.name}",${r.receivedQty},${r.distributedAM},${r.distributedPM},${r.distributedQty},${r.balanceQty}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RoyalERP_${activeTab}_${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto pb-24">
      {/* Header Bar */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          isDark
            ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <BarChart3 className="w-4 h-4" /> Dairy Audit & Financial Reports
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                Excel & PDF Ready
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive business accounting, daily profit & loss, customer ledgers, and inventory.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 outline-none"
            />

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-700 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 active:scale-95 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Report Nav Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 mt-3 border-t border-slate-800 no-scrollbar text-xs font-bold">
          <button
            onClick={() => setActiveTab('OUTSTANDING')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'OUTSTANDING'
                ? 'bg-amber-500 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            Customer Dues
          </button>
          <button
            onClick={() => setActiveTab('DAILY_SALES')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'DAILY_SALES'
                ? 'bg-amber-500 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            Daily Milk Sales
          </button>
          <button
            onClick={() => setActiveTab('PROFIT_LOSS')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'PROFIT_LOSS'
                ? 'bg-amber-500 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            Daily Profit & Loss
          </button>
          <button
            onClick={() => setActiveTab('STOCK_REPORT')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              activeTab === 'STOCK_REPORT'
                ? 'bg-amber-500 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            Stock Audit
          </button>
        </div>
      </div>

      {/* Tab 1: Customer Outstanding Balance Report */}
      {activeTab === 'OUTSTANDING' && (
        <div
          className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-[#101D36] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="p-3 bg-black/30 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
              Customer Dues & Outstanding Ledgers
            </h3>
            <span className="text-xs font-bold text-slate-200">
              Total Outstanding: <strong className="text-rose-400">₹{totalOutstanding.toLocaleString('en-IN')}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-black/20">
                  <th className="p-3">Customer</th>
                  <th className="p-3">Route</th>
                  <th className="p-3 text-right">Opening Bal</th>
                  <th className="p-3 text-right">Total Billed</th>
                  <th className="p-3 text-right">Total Paid</th>
                  <th className="p-3 text-right">Closing Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {customerDues.map((d) => (
                  <tr key={d.customer.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-slate-100">{d.customer.name}</td>
                    <td className="p-3 text-slate-400">{d.customer.route}</td>
                    <td className="p-3 text-right text-slate-300">₹{d.opening}</td>
                    <td className="p-3 text-right text-amber-400">₹{d.billed}</td>
                    <td className="p-3 text-right text-emerald-400">₹{d.paid}</td>
                    <td className="p-3 text-right">
                      <span
                        className={`font-black ${
                          d.balance > 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        ₹{d.balance.toLocaleString('en-IN')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Daily Sales */}
      {activeTab === 'DAILY_SALES' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Sales</span>
              <div className="text-lg font-black text-amber-400">₹{totalDailyRevenue}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Pouches</span>
              <div className="text-lg font-black text-slate-100">{totalDailyPouches}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold">AM Shift Sales</span>
              <div className="text-lg font-black text-amber-400">
                ₹{amSales.reduce((s, e) => s + e.totalAmount, 0)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold">PM Shift Sales</span>
              <div className="text-lg font-black text-indigo-400">
                ₹{pmSales.reduce((s, e) => s + e.totalAmount, 0)}
              </div>
            </div>
          </div>

          <div
            className={`rounded-2xl border overflow-hidden ${
              isDark ? 'bg-[#101D36] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="p-3 bg-black/30 border-b border-slate-800 text-xs font-black uppercase text-amber-400">
              Customer Deliveries Breakdown ({reportDate})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-black/20">
                    <th className="p-3">Customer</th>
                    <th className="p-3">Shift</th>
                    <th className="p-3">Items Details</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {dailySales.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-slate-100">{entry.customerName}</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                            entry.shift === 'AM'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-indigo-500/20 text-indigo-400'
                          }`}
                        >
                          {entry.shift}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">
                        {entry.items.map((i) => `${i.productCode} (${i.quantity})`).join(', ')}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-200">
                        {entry.totalQuantity}
                      </td>
                      <td className="p-3 text-right font-black text-amber-400">
                        ₹{entry.totalAmount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Profit & Loss Statement */}
      {activeTab === 'PROFIT_LOSS' && (
        <div
          className={`p-6 rounded-2xl border space-y-4 max-w-2xl mx-auto ${
            isDark ? 'bg-[#101D36] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-black text-amber-400">Daily Profit & Loss Statement</h3>
            <p className="text-xs text-slate-400">Date: {reportDate}</p>
          </div>

          <div className="divide-y divide-slate-800 text-xs space-y-2">
            <div className="flex justify-between py-1.5 font-bold text-slate-200">
              <span>Gross Milk Sales Revenue:</span>
              <span className="text-emerald-400 font-black">
                + ₹{plData.revenue.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-between py-1.5 text-slate-300">
              <span>Cost of Inward Milk (Amul Challans & Purchases):</span>
              <span className="text-rose-400 font-black">
                - ₹{plData.costOfGoods.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-between py-2 font-bold text-slate-100">
              <span>Gross Trading Margin:</span>
              <span
                className={`font-black ${
                  plData.grossProfit >= 0 ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                ₹{plData.grossProfit.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-between py-1.5 text-slate-300">
              <span>Operating Expenses (Fuel, Labor, Ice, Tea):</span>
              <span className="text-rose-400 font-black">
                - ₹{plData.dayExpenses.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="pt-3 flex justify-between items-center text-sm font-black border-t border-slate-700">
              <span className="text-slate-100">Estimated Net Daily Profit:</span>
              <span
                className={`text-base ${
                  plData.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ₹{plData.netProfit.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Stock Report */}
      {activeTab === 'STOCK_REPORT' && (
        <div
          className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-[#101D36] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="p-3 bg-black/30 border-b border-slate-800 text-xs font-black uppercase text-amber-400">
            Stock Summary ({reportDate})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-black/20">
                  <th className="p-3">Product</th>
                  <th className="p-3 text-right">Received</th>
                  <th className="p-3 text-right">AM Outward</th>
                  <th className="p-3 text-right">PM Outward</th>
                  <th className="p-3 text-right">Total Outward</th>
                  <th className="p-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {stockRows.map((r) => (
                  <tr key={r.product.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-slate-100">
                      {r.product.name} ({r.product.code})
                    </td>
                    <td className="p-3 text-right text-sky-400 font-bold">{r.receivedQty}</td>
                    <td className="p-3 text-right text-slate-300">{r.distributedAM}</td>
                    <td className="p-3 text-right text-slate-300">{r.distributedPM}</td>
                    <td className="p-3 text-right text-emerald-400 font-bold">
                      {r.distributedQty}
                    </td>
                    <td className="p-3 text-right font-black text-amber-400">{r.balanceQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
