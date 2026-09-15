import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Phone,
  MapPin,
  X,
  CreditCard,
  FileText,
  Clock,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';

export const CustomersScreen: React.FC = () => {
  const {
    customers,
    products,
    milkEntries,
    payments,
    saveCustomer,
    deleteCustomer,
    getCustomerSummary,
    customerBalances,
    theme,
    navigateTo,
  } = useApp();

  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string>('ALL');
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'DUE' | 'ADVANCE' | 'ZERO'>('ALL');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'milk' | 'payments' | 'rates'>('details');

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustRoute, setNewCustRoute] = useState('Main Line');
  const [newCustOpeningBal, setNewCustOpeningBal] = useState('0');
  const [newCustRates, setNewCustRates] = useState<Record<string, number>>({});

  // Collect unique routes
  const routes = ['ALL', ...Array.from(new Set(customers.map((c) => c.route).filter(Boolean)))];

  // Filtered customers
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.route.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRoute = selectedRoute === 'ALL' || c.route === selectedRoute;
    const bal = customerBalances[c.id] !== undefined ? customerBalances[c.id] : c.openingBalance || 0;
    const matchesBalance =
      balanceFilter === 'ALL' ||
      (balanceFilter === 'DUE' && bal > 0.01) ||
      (balanceFilter === 'ADVANCE' && bal < -0.01) ||
      (balanceFilter === 'ZERO' && Math.abs(bal) <= 0.01);

    return matchesSearch && matchesRoute && matchesBalance;
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      route: newCustRoute.trim() || 'General',
      openingBalance: parseFloat(newCustOpeningBal) || 0,
      customRates: newCustRates,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await saveCustomer(newCust);
    setIsAddModalOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustOpeningBal('0');
    setNewCustRates({});
  };

  const handleUpdateActiveRates = async (productId: string, rateVal: number) => {
    if (!activeCustomer) return;
    const updatedRates = { ...(activeCustomer.customRates || {}) };
    if (rateVal > 0) {
      updatedRates[productId] = rateVal;
    } else {
      delete updatedRates[productId];
    }
    const updatedCust = { ...activeCustomer, customRates: updatedRates };
    await saveCustomer(updatedCust);
    setActiveCustomer(updatedCust);
  };

  // Customer activity data
  const customerEntries = activeCustomer
    ? milkEntries.filter((e) => e.customerId === activeCustomer.id).slice(0, 50)
    : [];
  const customerPayments = activeCustomer
    ? payments.filter((p) => p.customerId === activeCustomer.id).slice(0, 50)
    : [];
  const activeSummary = activeCustomer ? getCustomerSummary(activeCustomer.id) : null;

  // Chronological Ledger Transaction History
  const ledgerTransactions = useMemo(() => {
    if (!activeCustomer || !activeSummary) return [];

    type Tx = {
      id: string;
      date: string;
      time?: string;
      type: 'MILK' | 'PAYMENT';
      shift?: string;
      description: string;
      debit: number;
      credit: number;
      runningBalance: number;
    };

    const txs: Array<Omit<Tx, 'runningBalance'>> = [];

    customerEntries.forEach((entry) => {
      const itemsDesc = entry.items
        .map((i) => `${i.productCode || i.productName} (${i.quantity}x₹${i.rate})`)
        .join(', ');
      txs.push({
        id: entry.id,
        date: entry.date,
        time: entry.time,
        type: 'MILK',
        shift: entry.shift,
        description: `${entry.shift} Shift: ${entry.totalQuantity} pouches (${itemsDesc})`,
        debit: entry.totalAmount,
        credit: 0,
      });
    });

    customerPayments.forEach((p) => {
      txs.push({
        id: p.id,
        date: p.date,
        type: 'PAYMENT',
        description: `Payment Received (${p.mode}${p.referenceNumber ? ` • Ref: ${p.referenceNumber}` : ''})`,
        debit: 0,
        credit: p.amount,
      });
    });

    // Sort ascending by date
    txs.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

    let current = activeSummary.opening;
    return txs.map((tx) => {
      current = current + tx.debit - tx.credit;
      return {
        ...tx,
        runningBalance: current,
      };
    });
  }, [activeCustomer, activeSummary, customerEntries, customerPayments]);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto pb-24">
      {/* Header Controls: Search, Route Filter & Add Customer */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 flex items-center gap-2">
          <div
            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-200'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400" />
            <input
              id="customer-search-input"
              type="text"
              placeholder="Search by customer name, phone, route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-medium outline-none placeholder:text-slate-500"
            />
          </div>

          {/* Route Filter Dropdown */}
          <select
            id="customer-route-filter"
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border outline-none ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-200'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {routes.map((r) => (
              <option key={r} value={r}>
                {r === 'ALL' ? 'All Routes' : r}
              </option>
            ))}
          </select>
        </div>

        {/* Add Customer Button */}
        <button
          id="btn-add-customer"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 active:scale-95 transition-all shadow shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Balance Status Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-slate-400 shrink-0">Balance:</span>
        {[
          { id: 'ALL', label: 'All Customers' },
          { id: 'DUE', label: 'With Due Balance' },
          { id: 'ADVANCE', label: 'In Advance' },
          { id: 'ZERO', label: 'Zero Balance' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setBalanceFilter(item.id as any)}
            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              balanceFilter === item.id
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : isDark
                ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Customer List: primarily showing customer names as requested */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-12 text-center space-y-3">
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              No customers found. Click &quot;Add Customer&quot; to register your first dairy buyer.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold"
            >
              + Register Customer
            </button>
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const summary = getCustomerSummary(cust.id);
            const isDue = summary.balance > 0;
            const isAdvance = summary.balance < 0;

            return (
              <div
                key={cust.id}
                id={`customer-card-${cust.id}`}
                onClick={() => {
                  setActiveCustomer(cust);
                  setActiveTab('details');
                }}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all active:scale-[0.99] ${
                  isDark
                    ? 'bg-[#101D36] border-blue-900/40 hover:border-amber-500/50'
                    : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold tracking-tight text-slate-100">
                      {cust.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {cust.route || 'General'}
                      </span>
                      {cust.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {cust.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Balance Badge */}
                  <div className="text-right">
                    <div
                      className={`text-xs font-black px-2 py-1 rounded-lg border inline-block ${
                        isDue
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : isAdvance
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      ₹{Math.abs(summary.balance).toLocaleString('en-IN')}
                      <span className="text-[9px] uppercase ml-1">
                        {isDue ? 'Due' : isAdvance ? 'Adv' : 'Nil'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Billed: ₹{summary.totalBilled}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Customer Detail & Ledger Modal */}
      {activeCustomer && activeSummary && (
        <div
          id="customer-detail-modal"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setActiveCustomer(null)}
        >
          <div
            className={`w-full max-w-2xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${
              isDark ? 'bg-[#0B1528] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-blue-900/30 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-amber-400">
                  {activeCustomer.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Route: {activeCustomer.route} • Phone: {activeCustomer.phone || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setActiveCustomer(null)}
                className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Balance Banner with Closing Balance Formula */}
            <div className="p-3 bg-black/20 border-b border-blue-900/20 space-y-2">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Opening</span>
                  <p className="font-bold">₹{activeSummary.opening}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Milk Amount</span>
                  <p className="font-bold text-amber-400">₹{activeSummary.totalBilled}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Total Paid</span>
                  <p className="font-bold text-emerald-400">₹{activeSummary.totalPaid}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Net Balance</span>
                  <p
                    className={`font-black ${
                      activeSummary.balance > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    ₹{activeSummary.balance}
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-center text-slate-400 font-mono bg-slate-900/80 py-1 px-2 rounded-lg border border-slate-800">
                Formula: Closing Balance = Opening (₹{activeSummary.opening}) + Milk Amount (₹{activeSummary.totalBilled}) - Payments (₹{activeSummary.totalPaid}) = ₹{activeSummary.balance}
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-800 text-xs font-bold overflow-x-auto">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-2.5 px-3 border-b-2 whitespace-nowrap ${
                  activeTab === 'details'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400'
                }`}
              >
                Customer Ledger
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-2.5 px-3 border-b-2 whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400'
                }`}
              >
                History ({ledgerTransactions.length})
              </button>
              <button
                onClick={() => setActiveTab('milk')}
                className={`flex-1 py-2.5 px-3 border-b-2 whitespace-nowrap ${
                  activeTab === 'milk'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400'
                }`}
              >
                Milk ({customerEntries.length})
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`flex-1 py-2.5 px-3 border-b-2 whitespace-nowrap ${
                  activeTab === 'payments'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400'
                }`}
              >
                Payments ({customerPayments.length})
              </button>
              <button
                onClick={() => setActiveTab('rates')}
                className={`flex-1 py-2.5 px-3 border-b-2 whitespace-nowrap ${
                  activeTab === 'rates'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400'
                }`}
              >
                Custom Rates
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-96">
              {activeTab === 'details' && (
                <div className="space-y-3">
                  {/* Ledger Metrics Breakdown */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
                    <div className="text-[11px] font-black uppercase text-amber-400 border-b border-slate-800 pb-1 flex justify-between">
                      <span>Ledger Account Breakdown</span>
                      <span className={activeSummary.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {activeSummary.balance > 0 ? 'Balance Due' : activeSummary.balance < 0 ? 'Advance' : 'Nil'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-slate-800/60">
                        <span className="text-slate-400 block">Opening Balance</span>
                        <span className="font-extrabold text-slate-200">₹{activeSummary.opening.toFixed(2)}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-800/60">
                        <span className="text-slate-400 block">Total Milk Supplied</span>
                        <span className="font-extrabold text-amber-400">
                          {activeSummary.totalMilkQty} pouches (₹{activeSummary.totalBilled.toFixed(2)})
                        </span>
                      </div>
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                        <span className="text-amber-400 block text-[10px] font-bold">AM Morning Milk</span>
                        <span className="font-extrabold text-slate-200">{activeSummary.amQty} pouches</span>
                      </div>
                      <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20">
                        <span className="text-indigo-300 block text-[10px] font-bold">PM Evening Milk</span>
                        <span className="font-extrabold text-slate-200">{activeSummary.pmQty} pouches</span>
                      </div>
                      <div className="p-2 rounded bg-slate-800/60">
                        <span className="text-slate-400 block">Payments Received</span>
                        <span className="font-extrabold text-emerald-400">₹{activeSummary.totalPaid.toFixed(2)}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-800/60">
                        <span className="text-slate-400 block">Current / Closing Balance</span>
                        <span
                          className={`font-black ${
                            activeSummary.balance > 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          ₹{activeSummary.balance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Address</span>
                      <span className="font-semibold">{activeCustomer.address || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Route</span>
                      <span className="font-semibold">{activeCustomer.route}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phone</span>
                      <span className="font-semibold">{activeCustomer.phone || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigateTo('fast_entry');
                        setActiveCustomer(null);
                      }}
                      className="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Enter Milk
                    </button>
                    <button
                      onClick={() => {
                        navigateTo('billing');
                        setActiveCustomer(null);
                      }}
                      className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <FileText className="w-4 h-4" /> Create Bill
                    </button>
                    <button
                      onClick={() => {
                        navigateTo('payments');
                        setActiveCustomer(null);
                      }}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <CreditCard className="w-4 h-4" /> Add Payment
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-2">
                  {ledgerTransactions.length === 0 ? (
                    <p className="text-xs text-center py-6 text-slate-400">
                      No ledger transactions found yet.
                    </p>
                  ) : (
                    ledgerTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col gap-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span>{tx.date}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-extrabold text-[10px] ${
                                tx.type === 'MILK'
                                  ? tx.shift === 'AM'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-indigo-500/20 text-indigo-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {tx.type === 'MILK' ? `${tx.shift} Milk` : 'Payment'}
                            </span>
                          </div>
                          <div className="text-right">
                            {tx.debit > 0 && (
                              <span className="font-extrabold text-amber-400">+₹{tx.debit.toFixed(2)}</span>
                            )}
                            {tx.credit > 0 && (
                              <span className="font-extrabold text-emerald-400">-₹{tx.credit.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="line-clamp-1">{tx.description}</span>
                          <span className="font-bold text-slate-200 shrink-0 ml-2">
                            Bal: ₹{tx.runningBalance.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'milk' && (
                <div className="space-y-2">
                  {customerEntries.length === 0 ? (
                    <p className="text-xs text-center py-6 text-slate-400">
                      No milk delivery entries found for this customer.
                    </p>
                  ) : (
                    customerEntries.map((e) => (
                      <div
                        key={e.id}
                        className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{e.date}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-extrabold text-[10px] ${
                                e.shift === 'AM'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-indigo-500/20 text-indigo-400'
                              }`}
                            >
                              {e.shift}
                            </span>
                          </div>
                          <div className="text-slate-400 text-[11px] mt-0.5">
                            {e.items.map((i) => `${i.productCode} (${i.quantity}x₹${i.rate})`).join(', ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-amber-400">₹{e.totalAmount}</span>
                          <p className="text-[10px] text-slate-500">{e.totalQuantity} pouches</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="space-y-2">
                  {customerPayments.length === 0 ? (
                    <p className="text-xs text-center py-6 text-slate-400">
                      No payments recorded yet for this customer.
                    </p>
                  ) : (
                    customerPayments.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold">{p.date}</span>
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px]">
                            {p.mode}
                          </span>
                          {p.referenceNumber && (
                            <p className="text-slate-400 text-[10px]">Ref: {p.referenceNumber}</p>
                          )}
                        </div>
                        <span className="font-extrabold text-emerald-400">₹{p.amount}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'rates' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400">
                    Set customer-specific rates. Leave blank to use product default wholesale rate.
                  </p>
                  <div className="space-y-1.5">
                    {products.map((prod) => {
                      const customRate = activeCustomer.customRates?.[prod.id];
                      return (
                        <div
                          key={prod.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-200">{prod.name}</span>
                            <span className="text-slate-500 text-[11px] ml-2">
                              Default: ₹{prod.defaultWholesaleRate}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">₹</span>
                            <input
                              type="number"
                              step="0.5"
                              defaultValue={customRate !== undefined ? customRate : ''}
                              placeholder={String(prod.defaultWholesaleRate)}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                handleUpdateActiveRates(prod.id, isNaN(val) ? 0 : val);
                              }}
                              className="w-20 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-right text-amber-400 font-bold outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-3 border-t border-slate-800 flex justify-between">
              <button
                onClick={() => {
                  const c = activeCustomer;
                  setActiveCustomer(null);
                  setCustomerToDelete(c);
                }}
                className="px-3 py-1.5 rounded-xl border border-rose-500/40 text-rose-400 text-xs font-semibold hover:bg-rose-500/10 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Customer
              </button>
              <button
                onClick={() => setActiveCustomer(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div
          id="add-customer-modal"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl ${
              isDark ? 'bg-[#0B1528] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-amber-400">Register New Customer</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xl border border-slate-700 bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Customer / Shop Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Radhe Tea Stall / Sharma Dairy"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-slate-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Route / Line</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Line, Sector 2"
                    value={newCustRoute}
                    onChange={(e) => setNewCustRoute(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Address / Shop No.</label>
                <input
                  type="text"
                  placeholder="e.g. Shop 12, Main Bazaar"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  placeholder="0 (Positive = Due, Negative = Advance)"
                  value={newCustOpeningBal}
                  onChange={(e) => setNewCustOpeningBal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-slate-100 outline-none"
                />
                <span className="text-[10px] text-slate-500">
                  Enter existing unpaid credit balance as positive number
                </span>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Delete Confirmation Modal */}
      {customerToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setCustomerToDelete(null)}
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
                <h3 className="text-base font-bold text-rose-400">Delete Customer?</h3>
                <p className="text-xs text-slate-400">Are you sure you want to delete this customer?</p>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs space-y-1 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="font-bold">{customerToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span>{customerToDelete.phone || 'No phone'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Route:</span>
                <span className="font-semibold">{customerToDelete.route || 'General'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Balance:</span>
                <span className={`font-black ${
                  (customerBalances[customerToDelete.id] || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  ₹{Math.abs(customerBalances[customerToDelete.id] || 0).toLocaleString('en-IN')} {(customerBalances[customerToDelete.id] || 0) > 0 ? 'DUE' : 'ADV'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Deleting will remove this customer from active milk deliveries and customer lists. Historical entries will remain in the database logs for accounting integrity.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = customerToDelete.id;
                  setCustomerToDelete(null);
                  await deleteCustomer(id);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 active:scale-95 transition-all shadow-sm"
              >
                Yes, Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
