import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  Plus,
  Search,
  Trash2,
  Calendar,
  X,
  Fuel,
  Users,
  Coffee,
  Zap,
  Building,
  Package,
  Wrench,
  HelpCircle,
  CreditCard,
  Banknote,
  PieChart,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Expense } from '../../types';

export const ExpensesScreen: React.FC = () => {
  const { expenses, saveExpense, deleteExpense, selectedDate, theme } = useApp();
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterMode, setFilterMode] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Form State
  const [category, setCategory] = useState<string>('FUEL');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(selectedDate);
  const [mode, setMode] = useState<'CASH' | 'BANK' | 'UPI'>('CASH');
  const [notes, setNotes] = useState('');

  const categoryList = [
    { key: 'FUEL', label: 'Vehicle / Fuel', icon: Fuel, color: 'text-amber-400 bg-amber-500/10' },
    { key: 'RENT', label: 'Shop Rent', icon: Building, color: 'text-blue-400 bg-blue-500/10' },
    { key: 'ELECTRICITY', label: 'Electricity', icon: Zap, color: 'text-yellow-400 bg-yellow-500/10' },
    { key: 'LABOR', label: 'Labor / Salary', icon: Users, color: 'text-emerald-400 bg-emerald-500/10' },
    {
      key: 'PACKAGING',
      label: 'Packaging / Polythene',
      icon: Package,
      color: 'text-purple-400 bg-purple-500/10',
    },
    {
      key: 'TEA_REFRESHMENTS',
      label: 'Tea / Refreshments',
      icon: Coffee,
      color: 'text-orange-400 bg-orange-500/10',
    },
    { key: 'MAINTENANCE', label: 'Maintenance', icon: Wrench, color: 'text-rose-400 bg-rose-500/10' },
    { key: 'OTHER', label: 'Other', icon: HelpCircle, color: 'text-slate-400 bg-slate-500/10' },
  ];

  const getCategoryMeta = (catKey: string) => {
    return (
      categoryList.find((c) => c.key === catKey) || {
        key: catKey,
        label: catKey,
        icon: HelpCircle,
        color: 'text-slate-400 bg-slate-500/10',
      }
    );
  };

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        const noteText = e.notes || e.note || '';
        const matchesSearch =
          noteText.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = filterCategory === 'ALL' || e.category === filterCategory;
        const pMode = e.paymentMode || e.mode || 'CASH';
        const matchesMode = filterMode === 'ALL' || pMode === filterMode;
        const matchesDate =
          (!filterStartDate || e.date >= filterStartDate) &&
          (!filterEndDate || e.date <= filterEndDate);
        return matchesSearch && matchesCat && matchesMode && matchesDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchQuery, filterCategory, filterMode, filterStartDate, filterEndDate]);

  // Summaries
  const currentMonthPrefix = selectedDate.slice(0, 7); // "YYYY-MM"

  const totalToday = useMemo(() => {
    return expenses
      .filter((e) => e.date === selectedDate)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses, selectedDate]);

  const totalThisMonth = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses, currentMonthPrefix]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0);
    });
    const totalAll = Object.values(map).reduce((sum, v) => sum + v, 0);

    return Object.entries(map)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalAll > 0 ? Math.round((amt / totalAll) * 100) : 0,
        meta: getCategoryMeta(cat),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;

    const meta = getCategoryMeta(category);
    const newExp: Expense = {
      id: `exp_${Date.now()}`,
      title: meta.label,
      category: category as any,
      amount: amt,
      date,
      paymentMode: mode,
      mode,
      note: notes.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    await saveExpense(newExp);
    setIsModalOpen(false);
    setAmount('');
    setNotes('');
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto pb-24">
      {/* Top Header */}
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
              <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                <TrendingDown className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black tracking-tight">Business Expenses</h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Record operational costs, vehicle fuel, wages, and categorize spending.
                </p>
              </div>
            </div>
          </div>

          <button
            id="btn-record-expense"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 active:scale-95 transition-all shadow"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Expense</span>
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 pt-3 border-t border-slate-800/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
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
              placeholder="Search expenses by note or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-medium outline-none"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border outline-none ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">All Categories</option>
            {categoryList.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Mode Filter */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border outline-none ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">All Modes</option>
            <option value="CASH">Cash</option>
            <option value="BANK">Bank</option>
            <option value="UPI">UPI</option>
          </select>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1 text-xs">
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className={`px-2 py-1 rounded-xl border text-[11px] outline-none ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="From date"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className={`px-2 py-1 rounded-xl border text-[11px] outline-none ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="To date"
            />
            {(filterStartDate || filterEndDate || filterMode !== 'ALL' || filterCategory !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setFilterMode('ALL');
                  setFilterCategory('ALL');
                }}
                className="p-1 text-slate-400 hover:text-amber-400"
                title="Clear all expense filters"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div
          className={`p-3.5 rounded-2xl border ${
            isDark ? 'bg-[#101D36] border-blue-900/40' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-400">Total Today ({selectedDate})</span>
          <div className="text-xl font-black text-rose-400 mt-0.5">
            ₹{totalToday.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Recorded for current date</span>
        </div>

        <div
          className={`p-3.5 rounded-2xl border ${
            isDark ? 'bg-[#101D36] border-blue-900/40' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-400">Total This Month</span>
          <div className="text-xl font-black text-amber-400 mt-0.5">
            ₹{totalThisMonth.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Month: {currentMonthPrefix}</span>
        </div>

        <div
          className={`col-span-2 sm:col-span-1 p-3.5 rounded-2xl border ${
            isDark ? 'bg-[#101D36] border-blue-900/40' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-400">All Time Expenses</span>
          <div className="text-xl font-black text-slate-200 mt-0.5">
            ₹{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">{expenses.length} entries in total</span>
        </div>
      </div>

      {/* Category-wise Breakdown Bar */}
      {categoryBreakdown.length > 0 && (
        <div
          className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#101D36] border-blue-900/40' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-amber-400" /> Category-Wise Spending Breakdown
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {categoryBreakdown.map((item) => {
              const Icon = item.meta.icon;
              return (
                <div
                  key={item.category}
                  className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-slate-200">{item.meta.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{item.percentage}%</span>
                  </div>
                  <div className="text-sm font-black text-rose-400">
                    ₹{item.amount.toLocaleString('en-IN')}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expenses Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredExpenses.length === 0 ? (
          <div className="col-span-full py-16 text-center space-y-3">
            <TrendingDown className="w-10 h-10 text-slate-500 mx-auto" />
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              No dairy expense records found.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold"
            >
              + Record Dairy Expense
            </button>
          </div>
        ) : (
          filteredExpenses.map((exp) => {
            const meta = getCategoryMeta(exp.category);
            const Icon = meta.icon;
            const pMode = exp.paymentMode || exp.mode || 'CASH';

            return (
              <div
                key={exp.id}
                className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                  isDark
                    ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`p-2 rounded-xl ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">{meta.label}</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        Paid via {pMode}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-rose-400">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400">{exp.date}</div>
                  </div>
                </div>

                {(exp.notes || exp.note) && (
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                    {exp.notes || exp.note}
                  </div>
                )}

                <div className="flex justify-end pt-1 border-t border-slate-800/60">
                  <button
                    onClick={() => setExpenseToDelete(exp)}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Expense Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl ${
              isDark
                ? 'bg-[#0B1528] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-amber-400">Record Dairy Expense</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl border border-slate-700 bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 mt-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                >
                  {categoryList.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-base font-black rounded-xl bg-slate-900 border border-slate-700 text-rose-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as 'CASH' | 'BANK' | 'UPI')}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none font-bold"
                  >
                    <option value="CASH">Cash Drawer</option>
                    <option value="BANK">Bank Account / Cheque</option>
                    <option value="UPI">UPI / QR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Fuel for tempo delivery or helper daily wage"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setExpenseToDelete(null)}
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
                <h3 className="text-base font-bold text-rose-400">Delete Expense?</h3>
                <p className="text-xs text-slate-400">Are you sure you want to delete this record?</p>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs space-y-1 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-bold">{expenseToDelete.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-black text-rose-400">₹{expenseToDelete.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mode:</span>
                <span className="font-semibold">{expenseToDelete.paymentMode || expenseToDelete.mode || 'CASH'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span>{expenseToDelete.date}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Deleting will immediately update the database, recalculate total expenses, cash drawer balance, and business profit/loss reports.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = expenseToDelete.id;
                  setExpenseToDelete(null);
                  await deleteExpense(id);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 active:scale-95 transition-all shadow-sm"
              >
                Yes, Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
