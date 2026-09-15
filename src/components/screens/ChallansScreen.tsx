import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  Trash2,
  Eye,
  Calendar,
  Truck,
  Boxes,
  X,
  PlusCircle,
  Camera,
  Edit,
  RotateCw,
  RefreshCw,
  ImageIcon,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Challan, ChallanItem, Shift } from '../../types';

export const ChallansScreen: React.FC = () => {
  const {
    challans,
    products,
    saveChallan,
    deleteChallan,
    selectedDate,
    setSelectedDate,
    theme,
    navigateTo,
    setReprocessChallanData,
    showToast,
  } = useApp();

  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterParty, setFilterParty] = useState('ALL');
  const [filterShift, setFilterShift] = useState<'ALL' | Shift>('ALL');

  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);
  const [challanToDelete, setChallanToDelete] = useState<Challan | null>(null);
  const [isEditingChallan, setIsEditingChallan] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  // Edit / New Challan Form State
  const [editChallanId, setEditChallanId] = useState<string | null>(null);
  const [challanNo, setChallanNo] = useState('');
  const [partyName, setPartyName] = useState('Amul Mother Dairy');
  const [vehicleNo, setVehicleNo] = useState('');
  const [cDate, setCDate] = useState(selectedDate);
  const [cShift, setCShift] = useState<Shift>('AM');
  const [freight, setFreight] = useState('0');
  const [otherCharges, setOtherCharges] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    Array<{ productId: string; crates: number; pouches: number; rate: number }>
  >([
    {
      productId: products[0]?.id || '',
      crates: 10,
      pouches: 0,
      rate: products[0]?.defaultWholesaleRate || 33,
    },
  ]);

  // Unique parties
  const parties = ['ALL', ...Array.from(new Set(challans.map((c) => c.partyName).filter(Boolean)))];

  // Filter challans
  const filteredChallans = challans.filter((c) => {
    const matchesSearch =
      c.challanNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.vehicleNumber && c.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesParty = filterParty === 'ALL' || c.partyName === filterParty;
    const matchesShift = filterShift === 'ALL' || c.shift === filterShift;
    return matchesSearch && matchesParty && matchesShift;
  });

  // Open Edit Modal for an existing challan
  const openEditModal = (challan: Challan) => {
    setEditChallanId(challan.id);
    setChallanNo(challan.challanNumber);
    setPartyName(challan.partyName);
    setVehicleNo(challan.vehicleNumber || '');
    setCDate(challan.date);
    setCShift(challan.shift);
    setFreight(String(challan.freight || 0));
    setOtherCharges(String(challan.otherCharges || 0));
    setNotes(challan.notes || '');
    setItems(
      challan.items.map((it) => ({
        productId: it.productId,
        crates: it.crates,
        pouches: it.pouches,
        rate: it.rate,
      }))
    );
    setIsEditingChallan(true);
    setSelectedChallan(null);
  };

  // Open New Modal
  const openNewModal = () => {
    setEditChallanId(null);
    setChallanNo(`CH-${Math.floor(1000 + Math.random() * 9000)}`);
    setPartyName('Amul Mother Dairy');
    setVehicleNo('');
    setCDate(selectedDate);
    setCShift('AM');
    setFreight('0');
    setOtherCharges('0');
    setNotes('');
    setItems([
      {
        productId: products[0]?.id || '',
        crates: 10,
        pouches: 0,
        rate: products[0]?.defaultWholesaleRate || 33,
      },
    ]);
    setIsNewModalOpen(true);
  };

  // Trigger Reprocess via OCR Scanner
  const handleReprocessChallan = (challan: Challan) => {
    setReprocessChallanData(challan);
    setSelectedChallan(null);
    navigateTo('challan_scanner');
  };

  // Add Item Row
  const addItemRow = () => {
    if (products.length > 0) {
      setItems([
        ...items,
        {
          productId: products[0].id,
          crates: 5,
          pouches: 0,
          rate: products[0].defaultWholesaleRate,
        },
      ]);
    }
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const updateItemRow = (index: number, field: string, value: unknown) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };
    if (field === 'productId') {
      const p = products.find((pr) => pr.id === value);
      if (p) current.rate = p.defaultWholesaleRate;
    }
    updated[index] = current;
    setItems(updated);
  };

  // Submit Save (New or Edit)
  const handleSaveChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challanNo.trim()) {
      showToast('Please enter Challan Number', 'warning');
      return;
    }

    let totalCrates = 0;
    let totalPouches = 0;
    let totalProductsAmount = 0;

    const formattedItems: ChallanItem[] = items.map((it, idx) => {
      const p = products.find((pr) => pr.id === it.productId);
      const pouchesPerCrate = p?.pouchesPerCrate || 24;
      const totalQty = it.crates * pouchesPerCrate + it.pouches;
      const amt = totalQty * it.rate;

      totalCrates += it.crates;
      totalPouches += totalQty;
      totalProductsAmount += amt;

      return {
        srNo: idx + 1,
        hsnSac: '0401',
        productId: it.productId,
        productCode: p?.code || 'MILK',
        productName: p?.name || 'Milk Product',
        crates: it.crates,
        pouches: it.pouches,
        totalQuantity: totalQty,
        rate: it.rate,
        amount: amt,
      };
    });

    const freightAmt = parseFloat(freight) || 0;
    const otherAmt = parseFloat(otherCharges) || 0;
    const netAmount = totalProductsAmount + freightAmt + otherAmt;

    const existingChallan = editChallanId ? challans.find((c) => c.id === editChallanId) : null;

    const savedRecord: Challan = {
      id: editChallanId || `challan_${Date.now()}`,
      challanNumber: challanNo.trim(),
      partyName: partyName.trim(),
      vehicleNumber: vehicleNo.trim() || undefined,
      date: cDate,
      shift: cShift,
      items: formattedItems,
      totalCrates,
      totalQuantity: totalPouches,
      freight: freightAmt,
      otherCharges: otherAmt,
      netAmount,
      imageUri: existingChallan?.imageUri,
      notes: notes.trim() || undefined,
      createdAt: existingChallan?.createdAt || new Date().toISOString(),
    };

    await saveChallan(savedRecord);
    setIsNewModalOpen(false);
    setIsEditingChallan(false);
    showToast(`Challan #${savedRecord.challanNumber} saved successfully`);
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto pb-24">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div
            className={`flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2 rounded-xl border ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-200'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400" />
            <input
              id="challan-search-input"
              type="text"
              placeholder="Search challan #, party, vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-medium outline-none"
            />
          </div>

          {/* Party Filter */}
          <select
            id="challan-party-filter"
            value={filterParty}
            onChange={(e) => setFilterParty(e.target.value)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border outline-none ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-200'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {parties.map((p) => (
              <option key={p} value={p}>
                {p === 'ALL' ? 'All Parties' : p}
              </option>
            ))}
          </select>

          {/* Shift Filter */}
          <select
            id="challan-shift-filter"
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value as 'ALL' | Shift)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border outline-none ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-200'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">All Shifts</option>
            <option value="AM">AM Shift</option>
            <option value="PM">PM Shift</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-scan-challan-shortcut"
            onClick={() => navigateTo('challan_scanner')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-bold hover:bg-amber-500/20 active:scale-95 transition-all shadow-sm"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Challan</span>
          </button>

          <button
            id="btn-new-challan-modal"
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 active:scale-95 transition-all shadow"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Challan</span>
          </button>
        </div>
      </div>

      {/* Challans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredChallans.length === 0 ? (
          <div className="col-span-full py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-amber-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              No challans recorded yet.
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={openNewModal}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold"
              >
                + Manual Entry
              </button>
              <button
                onClick={() => navigateTo('challan_scanner')}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-xs font-bold"
              >
                Scan with Camera
              </button>
            </div>
          </div>
        ) : (
          filteredChallans.map((challan) => (
            <div
              key={challan.id}
              id={`challan-card-${challan.id}`}
              onClick={() => setSelectedChallan(challan)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all active:scale-[0.99] ${
                isDark
                  ? 'bg-[#101D36] border-blue-900/40 hover:border-amber-500/40'
                  : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
              }`}
            >
              {/* Card Header: Party Name, D.C. Number, Shift */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-100">
                      #{challan.challanNumber}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                        challan.shift === 'AM'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-indigo-500/20 text-indigo-400'
                      }`}
                    >
                      {challan.shift}
                    </span>
                    {challan.imageUri && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        📷 Scan
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-amber-400 mt-0.5">
                    {challan.partyName}
                  </h4>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-amber-400">
                    ₹{challan.netAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400">Net Invoice</div>
                </div>
              </div>

              {/* Specs: Crates, Quantity (Pouches), Freight */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-1.5 rounded-lg bg-black/30">
                  <span className="text-[10px] text-slate-400 uppercase">Total Crates</span>
                  <p className="font-extrabold text-slate-200">{challan.totalCrates}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-black/30">
                  <span className="text-[10px] text-slate-400 uppercase">Total Quantity</span>
                  <p className="font-extrabold text-slate-200">{challan.totalQuantity}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-black/30">
                  <span className="text-[10px] text-slate-400 uppercase">Freight</span>
                  <p className="font-extrabold text-slate-200">₹{challan.freight}</p>
                </div>
              </div>

              {/* Date & Vehicle Number */}
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Date: {challan.date}</span>
                <span>Veh: {challan.vehicleNumber || 'Unspecified'}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CHALLAN DETAIL VIEW MODAL (Tapping opens complete details) */}
      {selectedChallan && (
        <div
          id="challan-view-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedChallan(null)}
        >
          <div
            className={`w-full max-w-2xl max-h-[90vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${
              isDark ? 'bg-[#0B1528] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-blue-900/30 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-amber-400">
                    Challan #{selectedChallan.challanNumber}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-400">
                    {selectedChallan.shift} Shift
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {selectedChallan.partyName} • Date: {selectedChallan.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedChallan(null)}
                className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3.5 text-xs">
              {/* Image Banner if scanned */}
              {selectedChallan.imageUri && (
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedChallan.imageUri}
                      alt="Challan Doc"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-700 cursor-pointer"
                      onClick={() => setIsImageLightboxOpen(true)}
                    />
                    <div>
                      <span className="font-bold text-slate-200 block">Original Document Scanned</span>
                      <span className="text-[11px] text-slate-400">Full photo saved in database</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsImageLightboxOpen(true)}
                    className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold text-xs flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Image</span>
                  </button>
                </div>
              )}

              {/* Extended Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Vehicle Number</span>
                  <span className="font-bold text-slate-200">{selectedChallan.vehicleNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Route / Demand FPO</span>
                  <span className="font-bold text-slate-200">{selectedChallan.routeDemandFpo || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">GSTIN</span>
                  <span className="font-bold text-slate-200">{selectedChallan.gstin || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">PAN</span>
                  <span className="font-bold text-slate-200">{selectedChallan.pan || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Dispatch Time</span>
                  <span className="font-bold text-slate-200">{selectedChallan.dispatchTime || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">TSSAN / Ref</span>
                  <span className="font-bold text-slate-200">{selectedChallan.tssanNumber || selectedChallan.internalRefNo || 'N/A'}</span>
                </div>
              </div>

              {/* Product breakdown table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900">
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5 text-right">Crates</th>
                      <th className="p-2.5 text-right">Quantity</th>
                      <th className="p-2.5 text-right">Rate</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedChallan.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-2.5 font-bold text-slate-200">
                          {it.productName} ({it.productCode})
                        </td>
                        <td className="p-2.5 text-right font-medium">{it.crates}</td>
                        <td className="p-2.5 text-right font-medium">{it.totalQuantity}</td>
                        <td className="p-2.5 text-right text-slate-400">₹{it.rate}</td>
                        <td className="p-2.5 text-right font-black text-amber-400">
                          ₹{it.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Total Crates Issued:</span>
                  <span className="font-bold text-slate-200">{selectedChallan.totalCrates}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Quantity (Pouches):</span>
                  <span className="font-bold text-slate-200">{selectedChallan.totalQuantity}</span>
                </div>
                {selectedChallan.basicAmount !== undefined && (
                  <div className="flex justify-between text-slate-400">
                    <span>Basic Amount:</span>
                    <span className="font-bold text-slate-200">₹{selectedChallan.basicAmount.toFixed(2)}</span>
                  </div>
                )}
                {selectedChallan.taxAmount !== undefined && (
                  <div className="flex justify-between text-slate-400">
                    <span>Tax / GST:</span>
                    <span className="font-bold text-slate-200">₹{selectedChallan.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Freight Charges:</span>
                  <span className="font-bold text-slate-200">₹{selectedChallan.freight}</span>
                </div>
                {selectedChallan.otherCharges && (
                  <div className="flex justify-between text-slate-400">
                    <span>Other Charges:</span>
                    <span className="font-bold text-slate-200">₹{selectedChallan.otherCharges}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-black text-amber-400">
                  <span>Net Invoice Amount:</span>
                  <span>₹{selectedChallan.netAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions: [ View Image ] [ Edit ] [ Reprocess ] [ Delete ] */}
            <div className="p-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ch = selectedChallan;
                    setSelectedChallan(null);
                    setChallanToDelete(ch);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-rose-500/40 text-rose-400 text-xs font-semibold flex items-center gap-1 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Challan
                </button>

                <button
                  type="button"
                  onClick={() => handleReprocessChallan(selectedChallan)}
                  className="px-3 py-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 text-blue-300 text-xs font-semibold flex items-center gap-1 hover:bg-blue-500/20"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reprocess / OCR Again
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(selectedChallan)}
                  className="px-4 py-1.5 rounded-xl border border-amber-500/50 bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Challan
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChallan(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for viewing full original image */}
      {isImageLightboxOpen && selectedChallan?.imageUri && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4"
          onClick={() => setIsImageLightboxOpen(false)}
        >
          <div className="w-full flex justify-between items-center text-white px-2">
            <span className="text-sm font-bold text-amber-400">
              Original Challan #{selectedChallan.challanNumber}
            </span>
            <button onClick={() => setIsImageLightboxOpen(false)} className="p-2 rounded-full bg-slate-800 text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center max-w-4xl max-h-[85vh] overflow-auto p-2" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedChallan.imageUri}
              alt="Challan Inspection"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
          <div className="text-xs text-slate-400 pb-2">Click outside to close image view</div>
        </div>
      )}

      {/* Manual Add / Edit Modal */}
      {(isNewModalOpen || isEditingChallan) && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => {
            setIsNewModalOpen(false);
            setIsEditingChallan(false);
          }}
        >
          <div
            className={`w-full max-w-xl max-h-[90vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${
              isDark ? 'bg-[#0B1528] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-blue-900/30 flex items-center justify-between">
              <h3 className="text-base font-black text-amber-400">
                {isEditingChallan ? `Edit Challan #${challanNo}` : 'New Manual Challan'}
              </h3>
              <button
                onClick={() => {
                  setIsNewModalOpen(false);
                  setIsEditingChallan(false);
                }}
                className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChallan} className="p-4 flex-1 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    Challan Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={challanNo}
                    onChange={(e) => setChallanNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    Party Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Date</label>
                    <input
                      type="date"
                      value={cDate}
                      onChange={(e) => setCDate(e.target.value)}
                      className="w-full px-2 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Shift</label>
                    <select
                      value={cShift}
                      onChange={(e) => setCShift(e.target.value as Shift)}
                      className="w-full px-2 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 font-bold outline-none"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-300">Products in Challan</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-amber-400 font-bold flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Add Product
                  </button>
                </div>

                {items.map((it, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex gap-2 items-center">
                      <select
                        value={it.productId}
                        onChange={(e) => updateItemRow(idx, 'productId', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-bold outline-none"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Crates</label>
                        <input
                          type="number"
                          min="0"
                          value={it.crates}
                          onChange={(e) => updateItemRow(idx, 'crates', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-center font-bold text-amber-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Loose Pouches</label>
                        <input
                          type="number"
                          min="0"
                          value={it.pouches}
                          onChange={(e) => updateItemRow(idx, 'pouches', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Rate (₹)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={it.rate}
                          onChange={(e) => updateItemRow(idx, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-right"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Freight & Charges */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    Freight Charges (₹)
                  </label>
                  <input
                    type="number"
                    value={freight}
                    onChange={(e) => setFreight(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    Other Charges (₹)
                  </label>
                  <input
                    type="number"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewModalOpen(false);
                    setIsEditingChallan(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400"
                >
                  Save Challan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Challan Delete Confirmation Modal */}
      {challanToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setChallanToDelete(null)}
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
                <h3 className="text-base font-bold text-rose-400">Delete Challan Record?</h3>
                <p className="text-xs text-slate-400">Are you sure you want to delete this challan?</p>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs space-y-1 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400">Challan #:</span>
                <span className="font-bold">{challanToDelete.challanNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Party:</span>
                <span className="font-semibold">{challanToDelete.partyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Net Amount:</span>
                <span className="font-black text-amber-400">₹{challanToDelete.netAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date & Shift:</span>
                <span>{challanToDelete.date} ({challanToDelete.shift})</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Deleting will immediately update the database, recalculate stock crates balance, adjust party settlement dues, and update daily procurement reports.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setChallanToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = challanToDelete.id;
                  setChallanToDelete(null);
                  await deleteChallan(id);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 active:scale-95 transition-all shadow-sm"
              >
                Yes, Delete Challan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
