import React from 'react';
import {
  Zap,
  Users,
  FileSpreadsheet,
  Camera,
  ScanLine,
  Package,
  CreditCard,
  Landmark,
  Receipt,
  FileText,
  TrendingUp,
  Layers,
  ArrowRight,
  Boxes,
  PlusCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DashboardScreen: React.FC = () => {
  const {
    navigateTo,
    dashboardMetrics,
    activeShift,
    setActiveShift,
    selectedDate,
    setSelectedDate,
    milkEntries,
    theme,
    settings,
    khaliCrateMetrics,
  } = useApp();

  const isDark = theme === 'dark';

  const todayEntries = milkEntries.filter((e) => e.date === selectedDate);
  const shiftEntries = todayEntries.filter((e) => e.shift === activeShift);

  return (
    <div className="p-4 space-y-5 max-w-7xl mx-auto pb-24">
      {/* Top Banner / Hero Card */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border relative overflow-hidden transition-all shadow-md ${
          isDark
            ? 'bg-gradient-to-br from-[#0E1E38] via-[#0B1528] to-[#080E1B] border-blue-900/50 text-white'
            : 'bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 text-white border-blue-950'
        }`}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {settings.businessName || 'ASHU DAIRY ERP'}
              </span>
              <span className="text-[11px] font-medium text-slate-300">
                Shift: <strong className="text-amber-400">{activeShift}</strong>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
              Dairy Milk Distribution Operations
            </h2>
            <p className="text-xs text-slate-300 max-w-lg mt-0.5">
              Live morning and evening inventory, route distributions, and accounts settlement.
            </p>
          </div>

          {/* Quick Shift & Date Bar */}
          <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/10 self-start sm:self-auto">
            <div className="flex items-center rounded-lg bg-black/40 p-1 border border-white/10 text-xs font-bold">
              <button
                id="dash-am-shift-btn"
                onClick={() => setActiveShift('AM')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeShift === 'AM'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                AM (Morning)
              </button>
              <button
                id="dash-pm-shift-btn"
                onClick={() => setActiveShift('PM')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  activeShift === 'PM'
                    ? 'bg-indigo-500 text-white font-extrabold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                PM (Evening)
              </button>
            </div>
            <input
              id="dash-date-input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* Real Summary KPI Grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3
            className={`text-xs font-extrabold uppercase tracking-wider ${
              isDark ? 'text-amber-400' : 'text-blue-950'
            }`}
          >
            Today&apos;s Live Metrics ({selectedDate})
          </h3>
          <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Real-time calculations
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Milk Inward */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-sky-400 mb-1">
              <span>Milk Received</span>
              <Boxes className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {dashboardMetrics.todayReceivedPouches}{' '}
              <span className="text-xs font-normal text-slate-400">pouches</span>
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-1">
              {dashboardMetrics.todayReceivedCrates} crates inward
            </div>
          </div>

          {/* Milk Distributed */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-1">
              <span>Milk Distributed</span>
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {dashboardMetrics.todayDistributedPouches}{' '}
              <span className="text-xs font-normal text-slate-400">pouches</span>
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-1">
              {todayEntries.length} customer entries
            </div>
          </div>

          {/* Remaining Stock */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400 mb-1">
              <span>Remaining Stock</span>
              <Package className="w-4 h-4" />
            </div>
            <div
              className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                dashboardMetrics.todayRemainingPouches < 0 ? 'text-rose-400' : ''
              }`}
            >
              {dashboardMetrics.todayRemainingPouches}{' '}
              <span className="text-xs font-normal text-slate-400">pouches</span>
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-1">
              Inward - Outward balance
            </div>
          </div>

          {/* Today's Sales */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-purple-400 mb-1">
              <span>Today&apos;s Sales</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-amber-400">
              ₹{dashboardMetrics.todaySalesAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-1">
              Gross billed today
            </div>
          </div>

          {/* Collections */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-teal-400 mb-1">
              <span>Today Collected</span>
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-400">
              ₹{dashboardMetrics.todayTotalCollected.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-1 flex items-center justify-between">
              <span>Cash: ₹{dashboardMetrics.todayCashCollected}</span>
              <span>UPI: ₹{dashboardMetrics.todayUpiCollected}</span>
            </div>
          </div>

          {/* Outstanding Due */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-rose-400 mb-1">
              <span>Total Outstanding</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-rose-400">
              ₹{dashboardMetrics.totalOutstandingAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-1">
              Receivable from customers
            </div>
          </div>

          {/* Expenses */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-amber-500 mb-1">
              <span>Today Expenses</span>
              <Receipt className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
              ₹{dashboardMetrics.todayExpensesAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-1">
              Freight, labour, shop
            </div>
          </div>

          {/* Bank & Cash Session */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-400 mb-1">
              <span>Bank & Cash</span>
              <Landmark className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
              ₹{dashboardMetrics.todayBankCollected.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-1">
              Bank deposits today
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Grid (Large Prominent Buttons for Mobile Driver/Distributor) */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3
            className={`text-xs font-extrabold uppercase tracking-wider ${
              isDark ? 'text-amber-400' : 'text-blue-950'
            }`}
          >
            Primary Business Actions
          </h3>
          <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            One-tap workflows
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Fast Milk Entry */}
          <button
            id="dash-action-fast-entry"
            onClick={() => navigateTo('fast_entry')}
            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
              isDark
                ? 'bg-gradient-to-br from-emerald-950/40 to-[#101D36] border-emerald-500/40 hover:border-emerald-400'
                : 'bg-emerald-50/70 border-emerald-300 hover:bg-emerald-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Zap className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                EXCEL MATRIX
              </span>
            </div>
            <div className="mt-3">
              <div className="font-extrabold text-sm text-slate-100">Fast Milk Entry</div>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                AM & PM customer distribution
              </div>
            </div>
          </button>

          {/* Challans */}
          <button
            id="dash-action-challans"
            onClick={() => navigateTo('challans')}
            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
              isDark
                ? 'bg-gradient-to-br from-blue-950/40 to-[#101D36] border-blue-500/40 hover:border-blue-400'
                : 'bg-blue-50/70 border-blue-300 hover:bg-blue-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                INWARD
              </span>
            </div>
            <div className="mt-3">
              <div className="font-extrabold text-sm text-slate-100">Amul Challans</div>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Gate passes, crates & freight
              </div>
            </div>
          </button>

          {/* Challan Scanner */}
          <button
            id="dash-action-scan-challan"
            onClick={() => navigateTo('challan_scanner')}
            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
              isDark
                ? 'bg-gradient-to-br from-amber-950/40 to-[#101D36] border-amber-500/40 hover:border-amber-400'
                : 'bg-amber-50/70 border-amber-300 hover:bg-amber-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Camera className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                CAMERA/GALLERY
              </span>
            </div>
            <div className="mt-3">
              <div className="font-extrabold text-sm text-slate-100">Scan Challan</div>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Capture & review paper challan
              </div>
            </div>
          </button>

          {/* Register Scanner */}
          <button
            id="dash-action-scan-register"
            onClick={() => navigateTo('register_scanner')}
            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
              isDark
                ? 'bg-gradient-to-br from-orange-950/40 to-[#101D36] border-orange-500/40 hover:border-orange-400'
                : 'bg-orange-50/70 border-orange-300 hover:bg-orange-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <ScanLine className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                HANDWRITTEN
              </span>
            </div>
            <div className="mt-3">
              <div className="font-extrabold text-sm text-slate-100">Register Scanner</div>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Diary log intake & mappings
              </div>
            </div>
          </button>

          {/* Master Stock */}
          <button
            id="dash-action-stock"
            onClick={() => navigateTo('stock')}
            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
              isDark
                ? 'bg-gradient-to-br from-teal-950/40 to-[#101D36] border-teal-500/40 hover:border-teal-400'
                : 'bg-teal-50/70 border-teal-300 hover:bg-teal-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <Package className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">
                LIVE
              </span>
            </div>
            <div className="mt-3">
              <div className="font-extrabold text-sm text-slate-100">Master Stock</div>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                SKU-wise crate & pouch balance
              </div>
            </div>
          </button>

          {/* Customers & Ledger */}
          <button
            id="dash-action-customers"
            onClick={() => navigateTo('customers')}
            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
              isDark
                ? 'bg-gradient-to-br from-sky-950/40 to-[#101D36] border-sky-500/40 hover:border-sky-400'
                : 'bg-sky-50/70 border-sky-300 hover:bg-sky-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Users className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
                LEDGER
              </span>
            </div>
            <div className="mt-3">
              <div className="font-extrabold text-sm text-slate-100">Customers</div>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Accounts, rates & routes
              </div>
            </div>
          </button>

          {/* Payments */}
          <button
            id="dash-action-payments"
            onClick={() => navigateTo('payments')}
            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
              isDark
                ? 'bg-gradient-to-br from-lime-950/40 to-[#101D36] border-lime-500/40 hover:border-lime-400'
                : 'bg-lime-50/70 border-lime-300 hover:bg-lime-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-lime-500/20 text-lime-400 border border-lime-500/30">
                <CreditCard className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-lime-500/20 text-lime-300">
                COLLECT
              </span>
            </div>
            <div className="mt-3">
              <div className="font-extrabold text-sm text-slate-100">Payments</div>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Cash, UPI & Bank entries
              </div>
            </div>
          </button>

          {/* Bank & Cash Closing */}
          <button
            id="dash-action-bank-cash"
            onClick={() => navigateTo('bank_cash')}
            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
              isDark
                ? 'bg-gradient-to-br from-amber-950/40 to-[#101D36] border-amber-500/40 hover:border-amber-400'
                : 'bg-amber-50/70 border-amber-300 hover:bg-amber-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Landmark className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                ₹500-₹10
              </span>
            </div>
            <div className="mt-3">
              <div className="font-extrabold text-sm text-slate-100">Bank & Cash</div>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Denominations & daily closing
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Secondary Modules Quick Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        <button
          id="dash-quick-purchase"
          onClick={() => navigateTo('purchase')}
          className={`p-3 rounded-xl border flex items-center justify-between transition-all active:scale-95 ${
            isDark
              ? 'bg-[#101D36] border-slate-800 text-slate-200 hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold">Purchases</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <button
          id="dash-quick-billing"
          onClick={() => navigateTo('billing')}
          className={`p-3 rounded-xl border flex items-center justify-between transition-all active:scale-95 ${
            isDark
              ? 'bg-[#101D36] border-slate-800 text-slate-200 hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold">Billing & Invoices</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <button
          id="dash-quick-settlement"
          onClick={() => navigateTo('bank_cash')}
          className={`p-3 rounded-xl border flex items-center justify-between transition-all active:scale-95 ${
            isDark
              ? 'bg-[#101D36] border-slate-800 text-slate-200 hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold">Bank Settlements</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <button
          id="dash-quick-expenses"
          onClick={() => navigateTo('expenses')}
          className={`p-3 rounded-xl border flex items-center justify-between transition-all active:scale-95 ${
            isDark
              ? 'bg-[#101D36] border-slate-800 text-slate-200 hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold">Expenses</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <button
          id="dash-quick-party-summary"
          onClick={() => navigateTo('party_summary')}
          className={`p-3 rounded-xl border flex items-center justify-between transition-all active:scale-95 ${
            isDark
              ? 'bg-[#101D36] border-slate-800 text-slate-200 hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold">Party Summary</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <button
          id="dash-quick-products"
          onClick={() => navigateTo('products')}
          className={`p-3 rounded-xl border flex items-center justify-between transition-all active:scale-95 ${
            isDark
              ? 'bg-[#101D36] border-slate-800 text-slate-200 hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold">Products</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <button
          id="dash-quick-khali-crates"
          onClick={() => navigateTo('khali_crate')}
          className={`p-3 rounded-xl border flex items-center justify-between transition-all active:scale-95 ${
            isDark
              ? 'bg-[#101D36] border-amber-900/40 text-slate-200 hover:bg-slate-800'
              : 'bg-white border-amber-200 text-slate-800 hover:bg-amber-50/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-amber-400" />
            <div className="text-left">
              <span className="text-xs font-bold block">Khali Crates</span>
              <span className="text-[10px] text-amber-400 font-semibold">
                Bal: {khaliCrateMetrics.balance}
              </span>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Shift Activity & Recent Milk Entries Feed */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          isDark
            ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold tracking-tight">
              {activeShift} Shift Activity ({selectedDate})
            </h4>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {shiftEntries.length} entries recorded in this shift
            </p>
          </div>
          <button
            id="dash-new-entry-btn"
            onClick={() => navigateTo('fast_entry')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 active:scale-95 transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Milk Entry</span>
          </button>
        </div>

        {shiftEntries.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6" />
            </div>
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              No milk distribution logged for {activeShift} shift on {selectedDate}.
            </p>
            <button
              onClick={() => navigateTo('fast_entry')}
              className="text-xs font-bold text-amber-400 underline underline-offset-4"
            >
              Open Excel Matrix Entry
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {shiftEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">{entry.customerName}</div>
                  <div className="text-[11px] text-slate-400">
                    {entry.items.map((i) => `${i.productCode}: ${i.quantity}`).join(' | ')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-amber-400">
                    ₹{entry.totalAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400">{entry.totalQuantity} pouches</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
