import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileText,
  Clock,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KhaliCrateTransport } from '../../types';

export const KhaliCrateScreen: React.FC = () => {
  const {
    challans,
    crateTransports,
    saveCrateTransport,
    deleteCrateTransport,
    khaliCrateMetrics,
    theme,
    navigateTo,
    showToast,
  } = useApp();

  const isDark = theme === 'dark';

  // Navigation tabs within Khali Crate screen
  const [activeTab, setActiveTab] = useState<'transport' | 'challans' | 'ledger'>('transport');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Transport Entry Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KhaliCrateTransport | null>(null);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formPerson, setFormPerson] = useState('');
  const [formVehicle, setFormVehicle] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formNote, setFormNote] = useState('');

  // Delete modal state
  const [entryToDelete, setEntryToDelete] = useState<KhaliCrateTransport | null>(null);

  // Open modal for new entry
  const handleOpenAdd = () => {
    setEditingEntry(null);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormPerson('');
    setFormVehicle('');
    setFormQuantity('');
    setFormNote('');
    setIsAddModalOpen(true);
  };

  // Open modal to edit existing entry
  const handleOpenEdit = (entry: KhaliCrateTransport) => {
    setEditingEntry(entry);
    setFormDate(entry.date);
    setFormPerson(entry.transportPerson);
    setFormVehicle(entry.vehicleNumber || '');
    setFormQuantity(entry.quantity.toString());
    setFormNote(entry.note || '');
    setIsAddModalOpen(true);
  };

  // Submit entry form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(formQuantity, 10);
    if (!formPerson.trim()) {
      showToast('Please enter transport or person name', 'warning');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid crate quantity greater than 0', 'warning');
      return;
    }

    await saveCrateTransport({
      id: editingEntry?.id || '',
      date: formDate,
      transportPerson: formPerson.trim(),
      vehicleNumber: formVehicle.trim() || undefined,
      quantity: qty,
      note: formNote.trim() || undefined,
      createdAt: editingEntry?.createdAt || new Date().toISOString(),
    });

    setIsAddModalOpen(false);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    await deleteCrateTransport(entryToDelete.id);
    setEntryToDelete(null);
  };

  // Filtered Transport Entries
  const filteredTransports = useMemo(() => {
    return crateTransports.filter((t) => {
      const matchSearch =
        !searchTerm ||
        t.transportPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.vehicleNumber && t.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.note && t.note.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchDate = !dateFilter || t.date === dateFilter;
      return matchSearch && matchDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [crateTransports, searchTerm, dateFilter]);

  // Filtered Challans (Challans contributing to Khali Crates)
  const filteredChallans = useMemo(() => {
    return challans.filter((c) => {
      const matchSearch =
        !searchTerm ||
        c.challanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.vehicleNumber && c.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchDate = !dateFilter || c.date === dateFilter;
      return matchSearch && matchDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [challans, searchTerm, dateFilter]);

  // Unified Chronological Ledger
  const chronologicalLedger = useMemo(() => {
    interface LedgerItem {
      id: string;
      date: string;
      type: 'INWARD_CHALLAN' | 'TRANSPORT_GIVEN';
      title: string;
      reference: string;
      inQty: number;
      outQty: number;
      note?: string;
      vehicle?: string;
    }

    const items: LedgerItem[] = [];

    challans.forEach((c) => {
      items.push({
        id: `challan_${c.id}`,
        date: c.date,
        type: 'INWARD_CHALLAN',
        title: `Challan Inward (${c.partyName})`,
        reference: `Challan #${c.challanNumber}`,
        inQty: Number(c.totalQuantity) || 0,
        outQty: 0,
        note: c.notes || 'Challan TOTAL QTY received',
        vehicle: c.vehicleNumber,
      });
    });

    crateTransports.forEach((t) => {
      items.push({
        id: `trans_${t.id}`,
        date: t.date,
        type: 'TRANSPORT_GIVEN',
        title: `Transport Return (${t.transportPerson})`,
        reference: t.vehicleNumber ? `Vehicle: ${t.vehicleNumber}` : 'Handover Slip',
        inQty: 0,
        outQty: Number(t.quantity) || 0,
        note: t.note,
        vehicle: t.vehicleNumber,
      });
    });

    // Sort ascending by date for accurate running balance
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBal = 0;
    const itemsWithBalance = items.map((it) => {
      runningBal += it.inQty - it.outQty;
      return {
        ...it,
        runningBalance: runningBal,
      };
    });

    // Now reverse for display (newest first)
    return itemsWithBalance.reverse().filter((it) => {
      const matchSearch =
        !searchTerm ||
        it.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (it.note && it.note.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchDate = !dateFilter || it.date === dateFilter;
      return matchSearch && matchDate;
    });
  }, [challans, crateTransports, searchTerm, dateFilter]);

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Reference', 'Party/Transport', 'Inward (Challan TOTAL QTY)', 'Given (Return)', 'Balance', 'Notes'],
    ];

    chronologicalLedger.forEach((row) => {
      rows.push([
        row.date,
        row.type === 'INWARD_CHALLAN' ? 'Challan Inward' : 'Transport Given',
        row.reference,
        row.title,
        row.inQty > 0 ? row.inQty.toString() : '0',
        row.outQty > 0 ? row.outQty.toString() : '0',
        row.runningBalance.toString(),
        row.note || '',
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Khali_Crate_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Khali Crate ledger exported to CSV successfully', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Khali Crate Management</h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Empty dairy crate tracking: Challan TOTAL QTY received vs Transport returns
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 active:scale-95 transition-all ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="khali-crate-add-transport-btn"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Give Transport Crates</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* RECEIVED */}
        <div
          className={`p-4 rounded-3xl border transition-all ${
            isDark
              ? 'bg-[#0E1A30] border-emerald-900/40 text-slate-100 shadow-sm'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4" />
              RECEIVED (INWARD)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              Challan TOTAL QTY
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {khaliCrateMetrics.totalReceived.toLocaleString()}{' '}
            <span className="text-sm font-semibold text-slate-400">Crates</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Contributed by {challans.length} delivery challan{challans.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* TRANSPORT GIVEN */}
        <div
          className={`p-4 rounded-3xl border transition-all ${
            isDark
              ? 'bg-[#0E1A30] border-sky-900/40 text-slate-100 shadow-sm'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" />
              TRANSPORT GIVEN
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
              Returned
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-400">
            {khaliCrateMetrics.totalTransportGiven.toLocaleString()}{' '}
            <span className="text-sm font-semibold text-slate-400">Crates</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Returned via {crateTransports.length} transport slip{crateTransports.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* BALANCE */}
        <div
          className={`p-4 rounded-3xl border transition-all ${
            isDark
              ? 'bg-[#0E1A30] border-amber-900/40 text-slate-100 shadow-sm'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Scale className="w-4 h-4" />
              BALANCE IN DAIRY
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                khaliCrateMetrics.balance >= 0
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {khaliCrateMetrics.balance >= 0 ? 'In Holding' : 'Negative'}
            </span>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black ${
              khaliCrateMetrics.balance >= 0 ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {khaliCrateMetrics.balance.toLocaleString()}{' '}
            <span className="text-sm font-semibold text-slate-400">Crates</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Current empty crates available on depot floor
          </p>
        </div>
      </div>

      {/* Critical Rule Notice */}
      <div
        className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs ${
          isDark
            ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <HelpCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
        <div className="space-y-0.5">
          <p className="font-bold">Automated Inward Rule:</p>
          <p className="opacity-90">
            Every challan automatically records its <strong>TOTAL QTY</strong> as Khali Crates Received.
            Editing or deleting a challan immediately recalculates the Received total without double-counting.
          </p>
        </div>
      </div>

      {/* Filters & Tabs Bar */}
      <div
        className={`p-3 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isDark ? 'bg-[#0E1A30] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('transport')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'transport'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : isDark
                ? 'text-slate-400 hover:bg-slate-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Transport Returns ({crateTransports.length})
          </button>

          <button
            onClick={() => setActiveTab('challans')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'challans'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : isDark
                ? 'text-slate-400 hover:bg-slate-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Challan Inwards ({challans.length})
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : isDark
                ? 'text-slate-400 hover:bg-slate-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Complete Ledger Timeline
          </button>
        </div>

        {/* Search & Date Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search person, vehicle, note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                isDark
                  ? 'bg-slate-900/80 border-slate-700 text-slate-100'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
          </div>

          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={`py-1.5 px-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                isDark
                  ? 'bg-slate-900/80 border-slate-700 text-slate-100'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
          </div>

          {(searchTerm || dateFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDateFilter('');
              }}
              className="text-[11px] text-amber-400 underline font-semibold px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: TRANSPORT RETURN ENTRIES */}
      {activeTab === 'transport' && (
        <div className="space-y-3">
          {filteredTransports.length === 0 ? (
            <div
              className={`p-8 rounded-3xl border text-center space-y-3 ${
                isDark ? 'bg-[#0E1A30] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <Truck className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-200">No Transport Return Entries</p>
                <p className="text-xs max-w-sm mx-auto">
                  Record empty crates handed back to distributors, transport trucks, or suppliers.
                </p>
              </div>
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Give Transport Crates</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTransports.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-3xl border flex flex-col justify-between space-y-3 transition-all ${
                    isDark
                      ? 'bg-[#0E1A30] border-slate-800 hover:border-sky-500/40 text-slate-100 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-sky-400 text-slate-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-sky-400 flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {entry.transportPerson}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{entry.date}</span>
                        {entry.vehicleNumber && (
                          <span className="font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">
                            {entry.vehicleNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black text-sky-400">
                        {entry.quantity}{' '}
                        <span className="text-xs font-semibold text-slate-400">Crates</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Given to transport</span>
                    </div>
                  </div>

                  {entry.note && (
                    <div
                      className={`text-xs p-2 rounded-xl italic ${
                        isDark ? 'bg-slate-900/60 text-slate-300' : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      &ldquo;{entry.note}&rdquo;
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(entry)}
                      className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-semibold ${
                        isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Edit Entry"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => setEntryToDelete(entry)}
                      className="p-1.5 rounded-lg text-xs flex items-center gap-1 font-semibold text-rose-400 hover:bg-rose-500/10"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CHALLAN INWARDS (AUTOMATIC TOTAL QTY) */}
      {activeTab === 'challans' && (
        <div className="space-y-3">
          {filteredChallans.length === 0 ? (
            <div
              className={`p-8 rounded-3xl border text-center space-y-3 ${
                isDark ? 'bg-[#0E1A30] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
              <p className="text-sm font-bold text-slate-200">No Challans Found</p>
              <p className="text-xs max-w-sm mx-auto">
                Create or scan delivery challans to automatically record Khali Crates Received from TOTAL QTY.
              </p>
              <button
                onClick={() => navigateTo('challans')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 inline-flex items-center gap-1.5"
              >
                Go to Challans Screen
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className={`font-bold border-b ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                  <tr>
                    <th className="p-3">Challan #</th>
                    <th className="p-3">Date & Shift</th>
                    <th className="p-3">Party / Ship To</th>
                    <th className="p-3">Vehicle #</th>
                    <th className="p-3 text-right">TOTAL QTY (Khali Crates)</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredChallans.map((ch) => (
                    <tr
                      key={ch.id}
                      className={`hover:bg-amber-500/5 transition-colors ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      <td className="p-3 font-bold text-amber-400 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        {ch.challanNumber}
                      </td>
                      <td className="p-3">
                        <div>{ch.date}</div>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {ch.shift}
                        </span>
                      </td>
                      <td className="p-3 font-semibold">{ch.partyName}</td>
                      <td className="p-3 font-mono text-slate-400">{ch.vehicleNumber || '—'}</td>
                      <td className="p-3 text-right font-black text-emerald-400 text-sm">
                        +{Number(ch.totalQuantity) || 0} Crates
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => navigateTo('challans')}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20"
                        >
                          View Challan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMPLETE LEDGER TIMELINE */}
      {activeTab === 'ledger' && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-3xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className={`font-bold border-b ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Transaction / Event</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3 text-right">Inward (Challan)</th>
                  <th className="p-3 text-right">Given (Transport)</th>
                  <th className="p-3 text-right">Balance</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {chronologicalLedger.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-800/20 transition-colors ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    <td className="p-3 font-semibold whitespace-nowrap">{row.date}</td>
                    <td className="p-3 font-semibold">
                      <div className="flex items-center gap-1.5">
                        {row.type === 'INWARD_CHALLAN' ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-sky-400" />
                        )}
                        <span>{row.title}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">{row.reference}</td>
                    <td className="p-3 text-right font-bold text-emerald-400">
                      {row.inQty > 0 ? `+${row.inQty}` : '—'}
                    </td>
                    <td className="p-3 text-right font-bold text-sky-400">
                      {row.outQty > 0 ? `-${row.outQty}` : '—'}
                    </td>
                    <td className="p-3 text-right font-black text-amber-400 text-sm">
                      {row.runningBalance}
                    </td>
                    <td className="p-3 text-slate-400 text-[11px] max-w-xs truncate">{row.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Transport Entry */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl space-y-4 ${
              isDark ? 'bg-[#0B1528] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Truck className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold">
                  {editingEntry ? 'Edit Transport Crates Return' : 'Record Empty Crates Given to Transport'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-300">Date *</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className={`w-full p-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">
                  Transport / Driver / Person Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Transport, Driver Suresh, Amul Van"
                  value={formPerson}
                  onChange={(e) => setFormPerson(e.target.value)}
                  className={`w-full p-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">
                    Vehicle Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GJ 01 AB 1234"
                    value={formVehicle}
                    onChange={(e) => setFormVehicle(e.target.value.toUpperCase())}
                    className={`w-full p-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300">
                    Quantity (Empty Crates) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 100"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className={`w-full p-2 rounded-xl border text-amber-400 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                      isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Notes / Memo (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sent with morning pickup slip #124"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className={`w-full p-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                >
                  {editingEntry ? 'Update Entry' : 'Save Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {entryToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEntryToDelete(null)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl border p-5 shadow-2xl space-y-4 ${
              isDark ? 'bg-[#0B1528] border-rose-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Delete Transport Entry?</h3>
                <p className="text-xs text-slate-400">
                  {entryToDelete.quantity} crates to {entryToDelete.transportPerson} on {entryToDelete.date}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              This entry will be permanently removed and the Balance in Dairy will be automatically recalculated.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
