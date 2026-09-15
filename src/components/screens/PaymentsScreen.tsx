import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Trash2,
  Calendar,
  IndianRupee,
  CheckCircle2,
  X,
  Smartphone,
  Building2,
  Banknote,
  Receipt,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Payment } from '../../types';

export const PaymentsScreen: React.FC = () => {
  const {
    payments,
    customers,
    savePayment,
    deletePayment,
    selectedDate,
    getCustomerSummary,
    theme,
  } = useApp();

  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(selectedDate);
  const [mode, setMode] = useState<Payment['mode']>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const selectedCust = customers.find((c) => c.id === customerId);
  const custSummary = selectedCust ? getCustomerSummary(selectedCust.id) : null;

  const filteredPayments = payments.filter((p) => {
    const ref = p.referenceNumber || p.reference || '';
    const matchesSearch =
      p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = filterMode === 'ALL' || p.mode === filterMode;
    const matchesDate =
      (!filterStartDate || p.date >= filterStartDate) &&
      (!filterEndDate || p.date <= filterEndDate);
    return matchesSearch && matchesMode && matchesDate;
  });

  const totalCollected = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const payAmt = parseFloat(amount);
    if (!payAmt || payAmt <= 0) {
      alert('Please enter a valid positive payment amount');
      return;
    }

    if (!selectedCust) return;

    const newPayment: Payment = {
      id: `pay_${Date.now()}`,
      customerId: selectedCust.id,
      customerName: selectedCust.name,
      date: paymentDate,
      amount: payAmt,
      mode,
      reference: reference.trim(),
      referenceNumber: reference.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    await savePayment(newPayment);
    setIsModalOpen(false);
    setAmount('');
    setReference('');
    setNotes('');
  };

  const setAmountToDue = () => {
    if (custSummary && custSummary.balance > 0) {
      setAmount(String(custSummary.balance));
    }
  };

  const getModeIcon = (m: Payment['mode']) => {
    switch (m) {
      case 'UPI':
        return <Smartphone className="w-3.5 h-3.5 text-purple-400" />;
      case 'BANK':
        return <Building2 className="w-3.5 h-3.5 text-blue-400" />;
      case 'CHEQUE':
        return <Receipt className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Banknote className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto pb-24">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 flex flex-wrap items-center gap-2">
          <div
            className={`flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2 rounded-xl border ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-200'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer name or reference #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-medium outline-none"
            />
          </div>

          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border outline-none ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-200'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">All Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK">Bank</option>
            <option value="CHEQUE">Cheque</option>
          </select>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1 text-xs">
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className={`px-2 py-1.5 rounded-xl border text-[11px] outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="From date"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className={`px-2 py-1.5 rounded-xl border text-[11px] outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="To date"
            />
            {(filterStartDate || filterEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="p-1 text-slate-400 hover:text-amber-400"
                title="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <button
          id="btn-collect-payment-modal"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 active:scale-95 transition-all shadow"
        >
          <Plus className="w-4 h-4" />
          <span>+ Collect Payment</span>
        </button>
      </div>

      {/* Total Collected Strip */}
      <div
        className={`p-3.5 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-[#101D36] border-blue-900/40' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            ₹
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">
              Total Payments Displayed
            </div>
            <div className="text-base font-black text-emerald-400">
              ₹{totalCollected.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          {filteredPayments.length} transactions recorded
        </span>
      </div>

      {/* Payments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPayments.length === 0 ? (
          <div className="col-span-full py-16 text-center space-y-3">
            <CreditCard className="w-10 h-10 text-slate-500 mx-auto" />
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              No payment transactions matching your query.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold"
            >
              + Record Customer Collection
            </button>
          </div>
        ) : (
          filteredPayments.map((pay) => (
            <div
              key={pay.id}
              className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                isDark
                  ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-800 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-100">{pay.customerName}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    {getModeIcon(pay.mode)}
                    <span className="font-bold text-slate-300">{pay.mode}</span>
                    {(pay.referenceNumber || pay.reference) && (
                      <span>• Ref: {pay.referenceNumber || pay.reference}</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-emerald-400">
                    ₹{pay.amount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400">{pay.date}</div>
                </div>
              </div>

              {pay.notes && (
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                  {pay.notes}
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                <span className="text-[10px] text-slate-500 font-mono">
                  Txn ID: #{pay.id.slice(-6)}
                </span>
                <button
                  onClick={() => setPaymentToDelete(pay)}
                  className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Revert
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Collect Payment Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl ${
              isDark ? 'bg-[#0B1528] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-amber-400">Record Payment Collection</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl border border-slate-700 bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Customer *
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.route})
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Current Balance Reminder */}
              {custSummary && (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Current Outstanding Due:</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-black ${
                        custSummary.balance > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      ₹{custSummary.balance}
                    </span>
                    {custSummary.balance > 0 && (
                      <button
                        type="button"
                        onClick={setAmountToDue}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      >
                        Fill Due
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-base font-black rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 outline-none"
                />

                {/* Quick amount chips */}
                <div className="flex items-center gap-2 mt-2">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(String(amt))}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as Payment['mode'])}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none font-bold"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK">Bank Transfer (NEFT/IMPS)</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Reference # (UPI UTR / Cheque #)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR 98218391283"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional remarks"
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
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {paymentToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPaymentToDelete(null)}
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
                <h3 className="text-base font-bold text-rose-400">Delete Payment Record?</h3>
                <p className="text-xs text-slate-400">Are you sure you want to delete this record?</p>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs space-y-1 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold">{paymentToDelete.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-black text-rose-400">₹{paymentToDelete.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mode:</span>
                <span className="font-semibold">{paymentToDelete.mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span>{paymentToDelete.date}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Deleting will immediately update the database, recalculate the customer's ledger balance, adjust cash/bank ledger, and update party reports.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = paymentToDelete.id;
                  setPaymentToDelete(null);
                  await deletePayment(id);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 active:scale-95 transition-all shadow-sm"
              >
                Yes, Delete Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
