import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Building2,
  Save,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Layers,
  Search,
  FileCheck2,
  ArrowRightLeft,
  CheckSquare,
  Square,
  AlertCircle,
  FileText,
  Calendar,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  BankCashSession,
  BankCashTransaction,
  Challan,
  ChallanSettlement,
  BankCashMode,
  TransactionType,
} from '../../types';

export const BankCashScreen: React.FC = () => {
  const {
    bankCashSessions,
    saveBankCashSession,
    challans,
    challanSettlements,
    saveChallanSettlement,
    bankTransactions,
    saveBankTransaction,
    deleteBankTransaction,
    payments,
    expenses,
    purchases,
    cashBalance,
    bankBalance,
    upiBalance,
    totalAvailableBalance,
    selectedDate,
    theme,
  } = useApp();

  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'SETTLEMENT' | 'LEDGER' | 'DENOMINATION'>('SETTLEMENT');

  // ==========================================
  // TAB 1: PARTY CHALLAN BANK SETTLEMENT
  // ==========================================
  // Find distinct parties in challans
  const distinctParties = useMemo(() => {
    const set = new Set<string>();
    challans.forEach((c) => {
      if (c.partyName && c.partyName.trim()) {
        set.add(c.partyName.trim());
      }
    });
    return Array.from(set);
  }, [challans]);

  const [selectedParty, setSelectedParty] = useState<string>(() => distinctParties[0] || '');

  // Keep selectedParty valid if list changes
  React.useEffect(() => {
    if (!selectedParty && distinctParties.length > 0) {
      setSelectedParty(distinctParties[0]);
    }
  }, [distinctParties, selectedParty]);

  // Find all unsettled challans for the selected party
  const partyUnsettledChallans = useMemo(() => {
    return challans.filter(
      (c) =>
        (c.partyName || '').trim().toLowerCase() === (selectedParty || '').trim().toLowerCase() &&
        !c.isSettled
    );
  }, [challans, selectedParty]);

  // Selected challan IDs for settlement
  const [selectedChallanIds, setSelectedChallanIds] = useState<string[]>([]);

  // Toggle selection
  const toggleChallanSelection = (id: string) => {
    setSelectedChallanIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllPartyChallans = () => {
    if (selectedChallanIds.length === partyUnsettledChallans.length) {
      setSelectedChallanIds([]);
    } else {
      setSelectedChallanIds(partyUnsettledChallans.map((c) => c.id));
    }
  };

  // Automatically calculate Total Bank Deposit = sum of selected challans' actual Net Invoice Amount
  const totalSettlementDeposit = useMemo(() => {
    return partyUnsettledChallans
      .filter((c) => selectedChallanIds.includes(c.id))
      .reduce((sum, c) => sum + (c.netAmount || 0), 0);
  }, [partyUnsettledChallans, selectedChallanIds]);

  // Settlement Form Fields
  const [bankAccount, setBankAccount] = useState('HDFC Bank - Current A/C (Royal Dairy)');
  const [depositDate, setDepositDate] = useState(selectedDate);
  const [utrNumber, setUtrNumber] = useState('');
  const [settlementNote, setSettlementNote] = useState('');
  const [isSettling, setIsSettling] = useState(false);

  const handleConfirmSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) {
      alert('Please select a party.');
      return;
    }
    if (selectedChallanIds.length === 0) {
      alert('Please select at least one delivery challan to settle.');
      return;
    }
    if (!utrNumber.trim()) {
      alert('Please enter Bank UTR / Reference Number for deposit verification.');
      return;
    }

    setIsSettling(true);
    try {
      const selectedObjs = partyUnsettledChallans.filter((c) => selectedChallanIds.includes(c.id));
      const challanNos = selectedObjs.map((c) => c.challanNumber);

      const settlementRecord: ChallanSettlement = {
        id: `settle_${Date.now()}`,
        partyName: selectedParty,
        challanIds: selectedChallanIds,
        challanNumbers: challanNos,
        totalAmount: totalSettlementDeposit,
        bankAccount: bankAccount.trim(),
        depositDate,
        utrNumber: utrNumber.trim(),
        notes: settlementNote.trim(),
        createdAt: new Date().toISOString(),
      };

      await saveChallanSettlement(settlementRecord);
      setSelectedChallanIds([]);
      setUtrNumber('');
      setSettlementNote('');
    } catch (err) {
      console.error('Error confirming bank settlement:', err);
      alert('Failed to save settlement');
    } finally {
      setIsSettling(false);
    }
  };

  // Party-wise settlement history
  const settledHistory = useMemo(() => {
    return [...challanSettlements].sort(
      (a, b) => new Date(b.depositDate).getTime() - new Date(a.depositDate).getTime()
    );
  }, [challanSettlements]);

  // ==========================================
  // TAB 2: REAL LEDGER & MANUAL TRANSACTIONS
  // ==========================================
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // New Transaction State
  const [txType, setTxType] = useState<TransactionType>('MONEY_IN');
  const [txMode, setTxMode] = useState<BankCashMode>('BANK');
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txParty, setTxParty] = useState('');
  const [txDate, setTxDate] = useState(selectedDate);
  const [txRef, setTxRef] = useState('');
  const [txNote, setTxNote] = useState('');

  // Ledger Filters & Deletion state
  const [ledgerDateFilter, setLedgerDateFilter] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [ledgerModeFilter, setLedgerModeFilter] = useState<'ALL' | BankCashMode>('ALL');
  const [txToDelete, setTxToDelete] = useState<BankCashTransaction | null>(null);

  // Transfer State (Cash <-> Bank)
  const [transferType, setTransferType] = useState<'CASH_TO_BANK' | 'BANK_TO_CASH'>('CASH_TO_BANK');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferRef, setTransferRef] = useState('');

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (txAmount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    const newTx: BankCashTransaction = {
      id: `tx_${Date.now()}`,
      date: txDate,
      type: txType,
      amount: txAmount,
      mode: txMode,
      sourceOrParty: txParty.trim() || (txType === 'MONEY_IN' ? 'Direct Receipt' : 'General Outward'),
      reference: txRef.trim(),
      category: 'Manual Ledger Entry',
      note: txNote.trim(),
      createdAt: new Date().toISOString(),
    };
    await saveBankTransaction(newTx);
    setIsTxModalOpen(false);
    setTxAmount(0);
    setTxParty('');
    setTxRef('');
    setTxNote('');
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferAmount <= 0) {
      alert('Please enter a valid transfer amount.');
      return;
    }

    if (transferType === 'CASH_TO_BANK') {
      // Out from Cash, In to Bank
      const outTx: BankCashTransaction = {
        id: `tx_tr_out_${Date.now()}`,
        date: selectedDate,
        type: 'MONEY_OUT',
        amount: transferAmount,
        mode: 'CASH',
        sourceOrParty: 'Bank Deposit Transfer',
        reference: transferRef.trim(),
        category: 'Cash to Bank Deposit',
        note: 'Physical cash deposited into bank account',
        createdAt: new Date().toISOString(),
      };
      const inTx: BankCashTransaction = {
        id: `tx_tr_in_${Date.now()}`,
        date: selectedDate,
        type: 'MONEY_IN',
        amount: transferAmount,
        mode: 'BANK',
        sourceOrParty: 'Cash Counter Deposit',
        reference: transferRef.trim(),
        category: 'Cash to Bank Deposit',
        note: 'Deposit received from cash drawer',
        createdAt: new Date().toISOString(),
      };
      await saveBankTransaction(outTx);
      await saveBankTransaction(inTx);
    } else {
      // Out from Bank, In to Cash
      const outTx: BankCashTransaction = {
        id: `tx_tr_out_${Date.now()}`,
        date: selectedDate,
        type: 'MONEY_OUT',
        amount: transferAmount,
        mode: 'BANK',
        sourceOrParty: 'Bank ATM / Cash Withdrawal',
        reference: transferRef.trim(),
        category: 'Bank to Cash Withdrawal',
        note: 'Withdrawal from bank account for cash counter',
        createdAt: new Date().toISOString(),
      };
      const inTx: BankCashTransaction = {
        id: `tx_tr_in_${Date.now()}`,
        date: selectedDate,
        type: 'MONEY_IN',
        amount: transferAmount,
        mode: 'CASH',
        sourceOrParty: 'Bank Withdrawal',
        reference: transferRef.trim(),
        category: 'Bank to Cash Withdrawal',
        note: 'Cash infused into drawer from bank withdrawal',
        createdAt: new Date().toISOString(),
      };
      await saveBankTransaction(outTx);
      await saveBankTransaction(inTx);
    }

    setIsTransferModalOpen(false);
    setTransferAmount(0);
    setTransferRef('');
  };

  // ==========================================
  // TAB 3: PHYSICAL CASH DENOMINATIONS
  // ==========================================
  const [d500, setD500] = useState<number>(0);
  const [d200, setD200] = useState<number>(0);
  const [d100, setD100] = useState<number>(0);
  const [d50, setD50] = useState<number>(0);
  const [d20, setD20] = useState<number>(0);
  const [d10, setD10] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);
  const [denomDeposit, setDenomDeposit] = useState<number>(0);
  const [denomNotes, setDenomNotes] = useState('');
  const [isDenomSaved, setIsDenomSaved] = useState(false);

  const physicalTotal = useMemo(() => {
    return (
      d500 * 500 +
      d200 * 200 +
      d100 * 100 +
      d50 * 50 +
      d20 * 20 +
      d10 * 10 +
      coins
    );
  }, [d500, d200, d100, d50, d20, d10, coins]);

  const cashCollectedToday = useMemo(() => {
    return payments
      .filter((p) => p.date === selectedDate && p.mode === 'CASH')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments, selectedDate]);

  const upiCollectedToday = useMemo(() => {
    return payments
      .filter((p) => p.date === selectedDate && p.mode === 'UPI')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments, selectedDate]);

  const cashExpensesToday = useMemo(() => {
    return expenses
      .filter((e) => e.date === selectedDate && (e.paymentMode === 'CASH' || e.mode === 'CASH'))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, selectedDate]);

  const expectedCashInHand = cashCollectedToday - cashExpensesToday - denomDeposit;
  const cashDifference = physicalTotal - expectedCashInHand;

  const handleSaveDenomination = async () => {
    const record: BankCashSession = {
      id: `denom_${Date.now()}`,
      date: selectedDate,
      denominations: {
        500: d500,
        200: d200,
        100: d100,
        50: d50,
        20: d20,
        10: d10,
        coins: coins,
      },
      totalCashPhysical: physicalTotal,
      cashCollected: cashCollectedToday,
      upiCollected: upiCollectedToday,
      bankDeposited: denomDeposit,
      cashExpenses: cashExpensesToday,
      difference: cashDifference,
      notes: denomNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    await saveBankCashSession(record);
    setIsDenomSaved(true);
    setTimeout(() => setIsDenomSaved(false), 2000);
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
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Building2 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black tracking-tight">
                  Bank, Cash & Challan Settlement
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Settle party challans directly into bank, track real-time Cash/Bank/UPI balances,
                  and reconcile physical cash notes.
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-black/30 p-1.5 rounded-xl border border-white/10 text-xs font-bold self-start sm:self-auto">
            <button
              id="tab-challan-settlement"
              onClick={() => setActiveTab('SETTLEMENT')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'SETTLEMENT'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Challan Settlement</span>
            </button>

            <button
              id="tab-bank-ledger"
              onClick={() => setActiveTab('LEDGER')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'LEDGER'
                  ? 'bg-indigo-500 text-white font-extrabold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Real Ledger</span>
            </button>

            <button
              id="tab-cash-denom"
              onClick={() => setActiveTab('DENOMINATION')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'DENOMINATION'
                  ? 'bg-emerald-500 text-slate-950 font-extrabold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Cash Denominations</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Balances KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Cash Balance */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#101D36] border-blue-900/40' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
            <span>Cash in Hand</span>
            <Banknote className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-amber-400 mt-1">
            ₹{cashBalance.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Drawer liquid cash balance</span>
        </div>

        {/* Bank Balance */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#101D36] border-blue-900/40' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-sky-400">
            <span>Bank Balance</span>
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-sky-400 mt-1">
            ₹{bankBalance.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Verified bank deposits & RTGS</span>
        </div>

        {/* UPI Balance */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#101D36] border-blue-900/40' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
            <span>UPI Balance</span>
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-emerald-400 mt-1">
            ₹{upiBalance.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">PhonePe / GPay / Paytm QR</span>
        </div>

        {/* Total Available Balance */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isDark
              ? 'bg-gradient-to-br from-[#122244] to-[#0A1428] border-amber-500/30'
              : 'bg-gradient-to-br from-blue-50 to-amber-50/50 border-amber-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-500">
            <span>Total Available</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-slate-100 dark:text-amber-300 mt-1">
            ₹{totalAvailableBalance.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400">Cash + Bank + UPI combined</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: PARTY-WISE CHALLAN BANK SETTLEMENT                                */}
      {/* ========================================================================= */}
      {activeTab === 'SETTLEMENT' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Party Selection & Unsettled Challans Multi-select */}
            <div className="lg:col-span-7 space-y-3">
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark
                    ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4" /> Select Party & Unsettled Challans
                    </h3>
                    <p className="text-xs text-slate-400">
                      Step 1: Pick supplier/party. Step 2: Select delivery challans to deposit
                      together.
                    </p>
                  </div>

                  {/* Party Picker */}
                  <div className="min-w-[200px]">
                    <select
                      id="settle-party-selector"
                      value={selectedParty}
                      onChange={(e) => {
                        setSelectedParty(e.target.value);
                        setSelectedChallanIds([]);
                      }}
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 border border-slate-700 text-amber-300 outline-none"
                    >
                      {distinctParties.length === 0 ? (
                        <option value="">No Parties with Challans</option>
                      ) : (
                        distinctParties.map((pty) => (
                          <option key={pty} value={pty}>
                            Party: {pty}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Challans List */}
                {partyUnsettledChallans.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-300">
                      All challans for &quot;{selectedParty}&quot; are settled!
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Scan new challans via Challan Scanner or choose another party.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs px-1 text-slate-400">
                      <span>
                        Found <strong>{partyUnsettledChallans.length}</strong> unsettled challans
                      </span>
                      <button
                        type="button"
                        onClick={selectAllPartyChallans}
                        className="text-amber-400 font-bold hover:underline"
                      >
                        {selectedChallanIds.length === partyUnsettledChallans.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {partyUnsettledChallans.map((ch) => {
                        const isSelected = selectedChallanIds.includes(ch.id);
                        return (
                          <div
                            key={ch.id}
                            onClick={() => toggleChallanSelection(ch.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500/40 text-slate-100 shadow-sm'
                                : isDark
                                ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-300'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                className={`p-1 rounded-lg ${
                                  isSelected ? 'text-amber-400' : 'text-slate-500'
                                }`}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-amber-400" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-500" />
                                )}
                              </button>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-xs text-slate-100">
                                    Challan #{ch.challanNumber}
                                  </span>
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {ch.date}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  Party: <strong>{ch.partyName}</strong> | Shift: {ch.shift} |
                                  Crates: {ch.totalCrates || 0}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Net Invoice Amount
                              </span>
                              <span className="text-sm font-black text-amber-400">
                                ₹{ch.netAmount.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Bank Deposit Form & Auto Calculation */}
            <div className="lg:col-span-5 space-y-3">
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark
                    ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                }`}
              >
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">
                    Bank Deposit Confirmation
                  </h3>
                  <p className="text-xs text-slate-400">
                    Calculates deposit sum automatically and updates Bank ledger.
                  </p>
                </div>

                {/* Auto Calculated Sum Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 text-center space-y-1">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Total Bank Deposit Amount
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400">
                    ₹{totalSettlementDeposit.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sum of <strong>{selectedChallanIds.length}</strong> selected challans for{' '}
                    <strong className="text-amber-300">{selectedParty || 'selected party'}</strong>
                  </p>
                </div>

                {/* Settlement Form */}
                <form onSubmit={handleConfirmSettlement} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Bank Account *
                    </label>
                    <input
                      type="text"
                      required
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="e.g. HDFC Bank - Current A/C"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Deposit Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={depositDate}
                        onChange={(e) => setDepositDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        UTR / Bank Ref # *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. UTR1092837482"
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-bold outline-none uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Settlement Note
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Morning route challans batch deposited"
                      value={settlementNote}
                      onChange={(e) => setSettlementNote(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                    />
                  </div>

                  <button
                    id="btn-confirm-bank-settlement"
                    type="submit"
                    disabled={selectedChallanIds.length === 0 || isSettling}
                    className={`w-full py-2.5 rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 ${
                      selectedChallanIds.length > 0 && !isSettling
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isSettling
                        ? 'Depositing...'
                        : `CONFIRM BANK DEPOSIT (₹${totalSettlementDeposit.toLocaleString('en-IN')})`}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Settled Challans History */}
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" /> Settled Challan Bank Deposits History
              </h4>
              <span className="text-[11px] text-slate-400 font-bold">
                {settledHistory.length} Batches Confirmed
              </span>
            </div>

            {settledHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No bank settlements confirmed yet. Select unsettled challans above to record your
                first batch deposit.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {settledHistory.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-black text-sm text-slate-100">{s.partyName}</span>
                        <div className="text-[11px] text-sky-400 font-bold mt-0.5">
                          UTR: {s.utrNumber}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-emerald-400">
                          ₹{s.totalAmount.toLocaleString('en-IN')}
                        </span>
                        <div className="text-[10px] text-slate-400">{s.depositDate}</div>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-black/30 border border-white/5 text-[11px] space-y-1">
                      <div className="text-slate-400">
                        Challans: <strong>{s.challanNumbers.join(', ')}</strong> (
                        {s.challanIds.length} bills)
                      </div>
                      <div className="text-slate-400">
                        Account: <strong>{s.bankAccount}</strong>
                      </div>
                      {s.notes && (
                        <div className="text-slate-400 italic">Remarks: {s.notes}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Deposited into Bank Ledger
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: REAL LEDGER & BALANCES                                            */}
      {/* ========================================================================= */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider">
              Bank & Cash Real-Time Ledger Transactions
            </h3>

            <div className="flex items-center gap-2">
              <button
                id="btn-quick-transfer"
                onClick={() => setIsTransferModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 text-sky-300 border border-sky-500/30 text-xs font-bold hover:bg-slate-700 active:scale-95"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transfer (Cash ⇄ Bank)</span>
              </button>

              <button
                id="btn-manual-tx"
                onClick={() => setIsTxModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Money In / Out</span>
              </button>
            </div>
          </div>

          {/* Transactions List */}
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2.5 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-300">Ledger Entries</span>
                <span className="text-slate-400 font-semibold">
                  ({bankTransactions.filter((tx) => {
                    const matchesDate = !ledgerDateFilter || tx.date === ledgerDateFilter;
                    const matchesType = ledgerTypeFilter === 'ALL' || tx.type === ledgerTypeFilter;
                    const matchesMode = ledgerModeFilter === 'ALL' || tx.mode === ledgerModeFilter;
                    return matchesDate && matchesType && matchesMode;
                  }).length} / {bankTransactions.length})
                </span>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Type Filter */}
                <select
                  value={ledgerTypeFilter}
                  onChange={(e) => setLedgerTypeFilter(e.target.value as any)}
                  className={`px-2.5 py-1 rounded-xl border text-xs font-semibold outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="ALL">All Types</option>
                  <option value="MONEY_IN">Money In (+)</option>
                  <option value="MONEY_OUT">Money Out (-)</option>
                </select>

                {/* Mode Filter */}
                <select
                  value={ledgerModeFilter}
                  onChange={(e) => setLedgerModeFilter(e.target.value as any)}
                  className={`px-2.5 py-1 rounded-xl border text-xs font-semibold outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="ALL">All Modes</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank</option>
                  <option value="UPI">UPI</option>
                </select>

                {/* Date Filter */}
                <input
                  type="date"
                  value={ledgerDateFilter}
                  onChange={(e) => setLedgerDateFilter(e.target.value)}
                  className={`px-2 py-1 rounded-xl border text-[11px] outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                  title="Filter by specific date"
                />

                {(ledgerDateFilter || ledgerTypeFilter !== 'ALL' || ledgerModeFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setLedgerDateFilter('');
                      setLedgerTypeFilter('ALL');
                      setLedgerModeFilter('ALL');
                    }}
                    className="p-1 text-slate-400 hover:text-amber-400"
                    title="Clear ledger filters"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {bankTransactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No manual ledger entries recorded yet. Customer payments, expenses, and challan
                settlements automatically flow into the ledger.
              </div>
            ) : (
              <div className="space-y-2">
                {[...bankTransactions]
                  .filter((tx) => {
                    const matchesDate = !ledgerDateFilter || tx.date === ledgerDateFilter;
                    const matchesType = ledgerTypeFilter === 'ALL' || tx.type === ledgerTypeFilter;
                    const matchesMode = ledgerModeFilter === 'ALL' || tx.mode === ledgerModeFilter;
                    return matchesDate && matchesType && matchesMode;
                  })
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-xl ${
                            tx.type === 'MONEY_IN'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {tx.type === 'MONEY_IN' ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-200">{tx.sourceOrParty}</span>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>{tx.date}</span>
                            <span>•</span>
                            <span className="font-bold uppercase text-amber-400">{tx.mode}</span>
                            {tx.reference && <span>• Ref: {tx.reference}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div>
                          <div
                            className={`font-black text-sm ${
                              tx.type === 'MONEY_IN' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {tx.type === 'MONEY_IN' ? '+' : '-'}₹
                            {tx.amount.toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] text-slate-500">{tx.category}</span>
                        </div>

                        <button
                          onClick={() => setTxToDelete(tx)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                          title="Delete entry"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: PHYSICAL CASH DENOMINATIONS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'DENOMINATION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Denominations Form */}
          <div className="lg:col-span-7">
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark
                  ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-800 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Cash Drawer Notes Count
                </h3>
                <span className="text-xs font-mono font-bold text-slate-200">
                  Total Physical: ₹{physicalTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="space-y-2">
                {[
                  { label: '₹500 ×', val: d500, set: setD500, mul: 500 },
                  { label: '₹200 ×', val: d200, set: setD200, mul: 200 },
                  { label: '₹100 ×', val: d100, set: setD100, mul: 100 },
                  { label: '₹50 ×', val: d50, set: setD50, mul: 50 },
                  { label: '₹20 ×', val: d20, set: setD20, mul: 20 },
                  { label: '₹10 ×', val: d10, set: setD10, mul: 10 },
                ].map((row, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                  >
                    <span className="w-16 font-extrabold text-amber-400">{row.label}</span>
                    <input
                      type="number"
                      min="0"
                      value={row.val || ''}
                      placeholder="0"
                      onChange={(e) => row.set(parseInt(e.target.value, 10) || 0)}
                      className="w-24 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-center font-bold text-slate-100 outline-none"
                    />
                    <span className="w-28 text-right font-black text-slate-200">
                      = ₹{(row.val * row.mul).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}

                {/* Coins */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                  <span className="w-16 font-extrabold text-amber-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> Coins
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={coins || ''}
                    placeholder="0"
                    onChange={(e) => setCoins(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-center font-bold text-slate-100 outline-none"
                  />
                  <span className="w-28 text-right font-black text-slate-200">
                    = ₹{coins.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Remarks and Save */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Daily Reconciliation Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Verified by cashier morning shift"
                    value={denomNotes}
                    onChange={(e) => setDenomNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveDenomination}
                  className="w-full py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 active:scale-95 transition-all shadow flex items-center justify-center gap-1.5"
                >
                  {isDenomSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                      <span>Count Saved to Database!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Day&apos;s Denomination Count</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="lg:col-span-5 space-y-3">
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark
                  ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-800 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Daily Physical Count History
                </h4>
              </div>

              {bankCashSessions.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No saved cash counts yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {bankCashSessions.map((cd) => (
                    <div
                      key={cd.id}
                      className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{cd.date}</span>
                        <span className="font-black text-amber-400">
                          ₹{cd.totalCashPhysical.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-2">
                        <span>500×{cd.denominations[500]}</span>
                        <span>200×{cd.denominations[200]}</span>
                        <span>100×{cd.denominations[100]}</span>
                        <span>50×{cd.denominations[50]}</span>
                      </div>
                      {cd.notes && <div className="text-[10px] text-slate-500">{cd.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Transfer Modal */}
      {isTransferModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsTransferModalOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-3xl border p-5 space-y-3 shadow-2xl ${
              isDark
                ? 'bg-[#0B1528] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-base font-black text-sky-400 flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4" /> Internal Transfer (Cash ⇄ Bank)
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Transfer Direction
                </label>
                <select
                  value={transferType}
                  onChange={(e) =>
                    setTransferType(e.target.value as 'CASH_TO_BANK' | 'BANK_TO_CASH')
                  }
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none font-bold"
                >
                  <option value="CASH_TO_BANK">Cash to Bank (Deposit)</option>
                  <option value="BANK_TO_CASH">Bank to Cash (Withdrawal)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={transferAmount || ''}
                  onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 10000"
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 font-black text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Bank Reference / Slip #
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dep Slip #8829"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-500 text-slate-950 font-black hover:bg-sky-400 shadow"
                >
                  Record Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Money In / Money Out Modal */}
      {isTxModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsTxModalOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-3xl border p-5 space-y-3 shadow-2xl ${
              isDark
                ? 'bg-[#0B1528] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-base font-black text-amber-400">Record Direct Entry</h3>
              <button
                onClick={() => setIsTxModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Entry Type
                  </label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as TransactionType)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none font-bold"
                  >
                    <option value="MONEY_IN">Money In (+)</option>
                    <option value="MONEY_OUT">Money Out (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Mode</label>
                  <select
                    value={txMode}
                    onChange={(e) => setTxMode(e.target.value as BankCashMode)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none font-bold"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={txAmount || ''}
                  onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 font-bold text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Source / Party / Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. Partner Capital, Milk Incentive, etc."
                  value={txParty}
                  onChange={(e) => setTxParty(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Reference / UTR #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. REF-1092"
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Note</label>
                <input
                  type="text"
                  placeholder="Optional note"
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black hover:bg-amber-400 shadow"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal for Ledger Entry */}
      {txToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setTxToDelete(null)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl border p-5 shadow-2xl space-y-4 ${
              isDark ? 'bg-[#0B1528] border-rose-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <X className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-400">Delete Ledger Transaction?</h3>
                <p className="text-xs text-slate-400">Are you sure you want to delete this entry?</p>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs space-y-1 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400">Party/Source:</span>
                <span className="font-bold">{txToDelete.sourceOrParty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className={`font-black ${txToDelete.type === 'MONEY_IN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {txToDelete.type === 'MONEY_IN' ? '+' : '-'}₹{txToDelete.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account:</span>
                <span className="font-semibold">{txToDelete.mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span>{txToDelete.date}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Deleting this record will immediately update the database, rebalance your cash/bank ledger, and adjust available balances.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = txToDelete.id;
                  setTxToDelete(null);
                  await deleteBankTransaction(id);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 active:scale-95 transition-all shadow-sm"
              >
                Yes, Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
