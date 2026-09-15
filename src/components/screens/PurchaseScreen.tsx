import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Trash2,
  Calendar,
  DollarSign,
  X,
  Edit2,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Boxes,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Purchase, PurchaseItem, PaymentMode } from '../../types';

export const PurchaseScreen: React.FC = () => {
  const { purchases, products, savePurchase, deletePurchase, selectedDate, theme } = useApp();
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID' | 'PARTIAL'>('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterProduct, setFilterProduct] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [supplierName, setSupplierName] = useState('Amul Depot / Mother Dairy');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(selectedDate);
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'UNPAID' | 'PARTIAL'>('PAID');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    Array<{
      productId: string;
      quantity: number;
      crates: number;
      rate: number;
    }>
  >([]);

  const openNewPurchaseModal = () => {
    setEditingPurchase(null);
    setSupplierName('Amul Depot / Mother Dairy');
    setInvoiceNo(`INV-${Date.now().toString().slice(-4)}`);
    setPurchaseDate(selectedDate);
    setPaymentStatus('PAID');
    setPaymentMode('CASH');
    setNotes('');

    if (products.length > 0) {
      const defaultProd = products[0];
      const perCrate = defaultProd.pouchesPerCrate || defaultProd.unitsPerCrate || 24;
      setItems([
        {
          productId: defaultProd.id,
          quantity: perCrate * 2,
          crates: 2,
          rate: defaultProd.defaultWholesaleRate || 30,
        },
      ]);
    } else {
      setItems([]);
    }
    setIsModalOpen(true);
  };

  const openEditPurchaseModal = (p: Purchase) => {
    setEditingPurchase(p);
    setSupplierName(p.supplierName);
    setInvoiceNo(p.invoiceNumber);
    setPurchaseDate(p.date);
    setPaymentStatus(p.paymentStatus || 'PAID');
    setPaymentMode(p.paymentMode || 'CASH');
    setNotes(p.notes || '');

    const mappedItems = p.items.map((it) => {
      const prod = products.find((pr) => pr.id === it.productId || pr.code === it.productCode);
      const perCrate = prod?.pouchesPerCrate || prod?.unitsPerCrate || 24;
      return {
        productId: it.productId,
        quantity: it.quantity,
        crates: it.crates || Math.round((it.quantity / perCrate) * 10) / 10,
        rate: it.purchaseRate,
      };
    });
    setItems(mappedItems);
    setIsModalOpen(true);
  };

  const addItemRow = () => {
    if (products.length > 0) {
      const defaultProd = products[0];
      const perCrate = defaultProd.pouchesPerCrate || defaultProd.unitsPerCrate || 24;
      setItems([
        ...items,
        {
          productId: defaultProd.id,
          quantity: perCrate,
          crates: 1,
          rate: defaultProd.defaultWholesaleRate || 30,
        },
      ]);
    }
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemProduct = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const perCrate = prod.pouchesPerCrate || prod.unitsPerCrate || 24;
    setItems((prev) => {
      const copy = [...prev];
      const curCrates = copy[index].crates || 1;
      copy[index] = {
        ...copy[index],
        productId: prodId,
        rate: prod.defaultWholesaleRate || 30,
        quantity: curCrates * perCrate,
      };
      return copy;
    });
  };

  const updateItemCrates = (index: number, crates: number) => {
    const it = items[index];
    const prod = products.find((p) => p.id === it.productId);
    const perCrate = prod?.pouchesPerCrate || prod?.unitsPerCrate || 24;
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        crates,
        quantity: Math.round(crates * perCrate),
      };
      return copy;
    });
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const it = items[index];
    const prod = products.find((p) => p.id === it.productId);
    const perCrate = prod?.pouchesPerCrate || prod?.unitsPerCrate || 24;
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        quantity,
        crates: Math.round((quantity / perCrate) * 10) / 10,
      };
      return copy;
    });
  };

  const updateItemRate = (index: number, rate: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], rate };
      return copy;
    });
  };

  // Calculations
  const calculatedTotalAmount = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.quantity || 0) * (it.rate || 0), 0);
  }, [items]);

  const calculatedTotalQuantity = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  }, [items]);

  const calculatedTotalCrates = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.crates || 0), 0);
  }, [items]);

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || !invoiceNo.trim()) {
      alert('Please enter Supplier Name and Invoice / Reference Number');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one product item');
      return;
    }

    const formattedItems: PurchaseItem[] = items.map((it) => {
      const prod = products.find((p) => p.id === it.productId);
      return {
        productId: it.productId,
        productCode: prod?.code || 'MILK',
        productName: prod?.name || 'Dairy Product',
        quantity: it.quantity,
        crates: it.crates,
        purchaseRate: it.rate,
        amount: it.quantity * it.rate,
      };
    });

    const newPurchase: Purchase = {
      id: editingPurchase ? editingPurchase.id : `purch_${Date.now()}`,
      supplierName: supplierName.trim(),
      invoiceNumber: invoiceNo.trim(),
      date: purchaseDate,
      items: formattedItems,
      totalQuantity: calculatedTotalQuantity,
      totalCrates: calculatedTotalCrates,
      totalAmount: calculatedTotalAmount,
      paymentStatus,
      paymentMode,
      notes: notes.trim(),
      createdAt: editingPurchase ? editingPurchase.createdAt : new Date().toISOString(),
    };

    await savePurchase(newPurchase);
    setIsModalOpen(false);
  };

  const filteredPurchases = useMemo(() => {
    return purchases
      .filter((p) => {
        const matchesQuery =
          p.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || p.paymentStatus === statusFilter;
        const matchesDate =
          (!filterStartDate || p.date >= filterStartDate) &&
          (!filterEndDate || p.date <= filterEndDate);
        const matchesProduct =
          filterProduct === 'ALL' ||
          p.items.some((it) => it.productId === filterProduct || it.productCode === filterProduct);
        return matchesQuery && matchesStatus && matchesDate && matchesProduct;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, searchQuery, statusFilter, filterStartDate, filterEndDate, filterProduct]);

  const totalPurchasesAmount = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

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
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black tracking-tight">Dairy Purchase Management</h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Record supplier stock inward, rates, crates, and track payment settlement.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-new-purchase"
              onClick={openNewPurchaseModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 active:scale-95 transition-all shadow"
            >
              <Plus className="w-4 h-4" />
              <span>+ Record Purchase</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 pt-3 border-t border-slate-800/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
              placeholder="Search supplier name or invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-medium outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5 text-xs font-bold">
            {(['ALL', 'PAID', 'UNPAID', 'PARTIAL'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === st
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

          {/* Product Filter */}
          <select
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold outline-none ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">All Products</option>
            {products.map((pr) => (
              <option key={pr.id} value={pr.id}>
                {pr.name} ({pr.code})
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <div className="flex items-center gap-1 text-xs">
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              placeholder="From"
              className={`px-2 py-1 rounded-lg border text-[11px] outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="Filter from date"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              placeholder="To"
              className={`px-2 py-1 rounded-lg border text-[11px] outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="Filter to date"
            />
            {(filterStartDate || filterEndDate || filterProduct !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setFilterProduct('ALL');
                }}
                className="p-1 text-slate-400 hover:text-amber-400"
                title="Clear date/product filters"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className={`p-3.5 rounded-2xl border ${
            isDark ? 'bg-[#101D36] border-blue-900/40' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-400">Total Purchases</div>
          <div className="text-lg font-black text-amber-400">
            ₹{totalPurchasesAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{filteredPurchases.length} invoices</div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border ${
            isDark ? 'bg-[#101D36] border-blue-900/40' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-400">Paid Amount</div>
          <div className="text-lg font-black text-emerald-400">
            ₹
            {filteredPurchases
              .filter((p) => p.paymentStatus === 'PAID')
              .reduce((sum, p) => sum + p.totalAmount, 0)
              .toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-500 mt-0.5">Cleared with suppliers</div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border ${
            isDark ? 'bg-[#101D36] border-blue-900/40' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-400">Unpaid / Due</div>
          <div className="text-lg font-black text-rose-400">
            ₹
            {filteredPurchases
              .filter((p) => p.paymentStatus !== 'PAID')
              .reduce((sum, p) => sum + p.totalAmount, 0)
              .toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-rose-400 mt-0.5">Pending supplier dues</div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border ${
            isDark ? 'bg-[#101D36] border-blue-900/40' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-400">Total Stock Inward</div>
          <div className="text-lg font-black text-sky-400">
            {filteredPurchases.reduce((sum, p) => {
              const qty = p.totalQuantity || p.items.reduce((s, it) => s + (it.quantity || 0), 0);
              return sum + qty;
            }, 0)}{' '}
            <span className="text-xs font-bold text-slate-400">pouches</span>
          </div>
          <div className="text-[10px] text-sky-400 mt-0.5">Auto-added to live inventory</div>
        </div>
      </div>

      {/* Purchases List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPurchases.length === 0 ? (
          <div className="col-span-full py-16 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-500 mx-auto" />
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              No supplier purchases match your filter.
            </p>
            <button
              onClick={openNewPurchaseModal}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold shadow"
            >
              + Record Supplier Purchase
            </button>
          </div>
        ) : (
          filteredPurchases.map((purch) => {
            const totQty =
              purch.totalQuantity || purch.items.reduce((sum, it) => sum + (it.quantity || 0), 0);
            const totCrates =
              purch.totalCrates || purch.items.reduce((sum, it) => sum + (it.crates || 0), 0);

            return (
              <div
                key={purch.id}
                className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                  isDark
                    ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black tracking-tight">{purch.supplierName}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-amber-400 font-bold">
                        Inv #{purch.invoiceNumber}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {purch.date}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-amber-400">
                      ₹{purch.totalAmount.toLocaleString('en-IN')}
                    </div>
                    <span
                      className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full mt-0.5 uppercase ${
                        purch.paymentStatus === 'PAID'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : purch.paymentStatus === 'PARTIAL'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {purch.paymentStatus || 'PAID'}
                    </span>
                  </div>
                </div>

                {/* Crates & Pouches count */}
                <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
                  <div className="flex items-center gap-1 text-slate-300">
                    <Boxes className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      <strong>{totCrates}</strong> Crates
                    </span>
                  </div>
                  <div className="text-slate-300">
                    <strong>{totQty}</strong> Pouches
                  </div>
                  {purch.paymentMode && (
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Via {purch.paymentMode}
                    </div>
                  )}
                </div>

                {/* Items preview */}
                <div className="text-xs space-y-1">
                  {purch.items.slice(0, 3).map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-400 text-[11px]">
                      <span>
                        {it.productName} ({it.quantity} @ ₹{it.purchaseRate})
                      </span>
                      <span className="font-bold text-slate-200">₹{it.amount}</span>
                    </div>
                  ))}
                  {purch.items.length > 3 && (
                    <div className="text-[10px] text-amber-400 italic">
                      + {purch.items.length - 3} more products...
                    </div>
                  )}
                </div>

                {purch.notes && (
                  <div className="text-[11px] text-slate-400 italic border-t border-slate-800/40 pt-1">
                    Note: {purch.notes}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingPurchase(purch)}
                      className="text-sky-400 hover:text-sky-300 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Details
                    </button>
                    <button
                      onClick={() => openEditPurchaseModal(purch)}
                      className="text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>

                  <button
                    onClick={() => setDeleteConfirmId(purch.id)}
                    className="text-rose-400 hover:text-rose-300 text-[11px] font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Details Modal */}
      {viewingPurchase && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setViewingPurchase(null)}
        >
          <div
            className={`w-full max-w-lg rounded-3xl border p-5 space-y-4 shadow-2xl ${
              isDark
                ? 'bg-[#0B1528] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-amber-400">Purchase Invoice Details</h3>
                <p className="text-xs text-slate-400">
                  Inv #{viewingPurchase.invoiceNumber} | {viewingPurchase.date}
                </p>
              </div>
              <button
                onClick={() => setViewingPurchase(null)}
                className="p-1 rounded-xl bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Supplier / Party</span>
                <span className="font-bold text-slate-100">{viewingPurchase.supplierName}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Payment Status</span>
                <span className="font-bold text-amber-400">
                  {viewingPurchase.paymentStatus} via {viewingPurchase.paymentMode || 'CASH'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300">Items Breakup</span>
              <div className="rounded-xl border border-slate-800 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-slate-400 text-[11px]">
                    <tr>
                      <th className="p-2">Product</th>
                      <th className="p-2 text-center">Crates</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {viewingPurchase.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/30">
                        <td className="p-2 font-bold text-slate-200">{it.productName}</td>
                        <td className="p-2 text-center text-slate-300">{it.crates || '-'}</td>
                        <td className="p-2 text-center text-amber-400 font-bold">{it.quantity}</td>
                        <td className="p-2 text-right text-slate-300">₹{it.purchaseRate}</td>
                        <td className="p-2 text-right font-black text-slate-100">₹{it.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900/80 font-black text-slate-100">
                    <tr>
                      <td colSpan={4} className="p-2 text-right text-amber-400">
                        Total Amount:
                      </td>
                      <td className="p-2 text-right text-amber-400 text-sm">
                        ₹{viewingPurchase.totalAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {viewingPurchase.notes && (
              <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300">
                <strong className="text-slate-400">Notes:</strong> {viewingPurchase.notes}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingPurchase(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-sm rounded-3xl border p-5 space-y-3 shadow-2xl ${
              isDark
                ? 'bg-[#0B1528] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-black">Confirm Delete Purchase?</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete this purchase record? Inventory will automatically
              adjust to reflect the removal.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deletePurchase(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-black hover:bg-rose-600 shadow"
              >
                Delete Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Purchase Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className={`w-full max-w-xl max-h-[92vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${
              isDark
                ? 'bg-[#0B1528] border-blue-900/40 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-amber-400">
                  {editingPurchase ? 'Edit Dairy Purchase' : 'Record New Dairy Purchase'}
                </h3>
                <p className="text-xs text-slate-400">Stock updates automatically on save.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl border border-slate-700 bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="p-4 flex-1 overflow-y-auto space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Supplier / Party *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amul Hub, Mother Dairy"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Invoice / Ref # *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026-99"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) =>
                      setPaymentStatus(e.target.value as 'PAID' | 'UNPAID' | 'PARTIAL')
                    }
                    className="w-full px-2 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none font-bold"
                  >
                    <option value="PAID">PAID</option>
                    <option value="UNPAID">UNPAID</option>
                    <option value="PARTIAL">PARTIAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none font-bold"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK">BANK</option>
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">Products & Quantities</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs font-bold text-amber-400 hover:underline"
                  >
                    + Add Product
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-4">
                        <label className="block text-[9px] text-slate-400">Product</label>
                        <select
                          value={it.productId}
                          onChange={(e) => updateItemProduct(idx, e.target.value)}
                          className="w-full px-1.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 outline-none font-bold text-xs"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[9px] text-slate-400 text-center">Crates</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={it.crates || ''}
                          onChange={(e) => updateItemCrates(idx, parseFloat(e.target.value) || 0)}
                          className="w-full px-1.5 py-1 rounded bg-slate-800 border border-slate-700 text-center font-bold text-amber-400 outline-none text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[9px] text-slate-400 text-center">Pouches</label>
                        <input
                          type="number"
                          min="0"
                          value={it.quantity || ''}
                          onChange={(e) =>
                            updateItemQuantity(idx, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-full px-1.5 py-1 rounded bg-slate-800 border border-slate-700 text-center font-bold text-sky-400 outline-none text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[9px] text-slate-400 text-right">Rate</label>
                        <input
                          type="number"
                          step="0.25"
                          value={it.rate || ''}
                          onChange={(e) => updateItemRate(idx, parseFloat(e.target.value) || 0)}
                          className="w-full px-1.5 py-1 rounded bg-slate-800 border border-slate-700 text-right font-bold text-slate-200 outline-none text-xs"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-between pl-1">
                        <span className="font-black text-slate-100 text-xs">
                          ₹{(it.quantity * it.rate).toLocaleString('en-IN')}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Preview Bar */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Total Stock Inward</span>
                  <strong className="text-slate-200">
                    {calculatedTotalCrates} Crates / {calculatedTotalQuantity} Pouches
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[11px] block">Total Invoice Amount</span>
                  <strong className="text-amber-400 text-base font-black">
                    ₹{calculatedTotalAmount.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via RTGS / Cheque / Direct Cash"
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
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 shadow active:scale-95 transition-all"
                >
                  {editingPurchase ? 'Update Purchase' : 'Save Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
