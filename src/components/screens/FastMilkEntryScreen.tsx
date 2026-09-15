import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Zap,
  Calendar,
  Clock,
  User,
  Plus,
  Minus,
  Save,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Sliders,
  Sparkles,
  Search,
  ChevronDown,
  ArrowRight,
  Package,
  Layers,
  X,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MilkEntry, MilkEntryItem, Shift, Product, Customer } from '../../types';

export const FastMilkEntryScreen: React.FC = () => {
  const {
    products,
    customers,
    milkEntries,
    saveMilkEntry,
    selectedDate,
    setSelectedDate,
    activeShift,
    setActiveShift,
    getCustomerSummary,
    theme,
    showToast,
  } = useApp();

  const isDark = theme === 'dark';

  // Customer Selection State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Form State
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [entryTime, setEntryTime] = useState<string>('06:30');
  const [notes, setNotes] = useState<string>('');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default customer if none selected
  useEffect(() => {
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  // Handle clicking outside customer dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update current time on shift toggle
  useEffect(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    setEntryTime(`${hours}:${mins}`);
  }, [activeShift]);

  // Selected Customer object & customer rates
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Customer overall ledger summary
  const customerSummary = useMemo(() => {
    return selectedCustomer ? getCustomerSummary(selectedCustomer.id) : null;
  }, [selectedCustomer, getCustomerSummary]);

  // Check if an existing entry exists for (Date + Shift + Customer)
  // CRITICAL: AM and PM are separate records and query strictly by activeShift
  const existingEntry = useMemo(() => {
    if (!selectedCustomerId || !selectedDate) return null;
    return (
      milkEntries.find(
        (e) =>
          e.date === selectedDate &&
          e.shift === activeShift &&
          e.customerId === selectedCustomerId
      ) || null
    );
  }, [milkEntries, selectedDate, activeShift, selectedCustomerId]);

  // Check today's AM and PM entries for this customer to display shift comparison
  const todayAmEntry = useMemo(() => {
    if (!selectedCustomerId || !selectedDate) return null;
    return (
      milkEntries.find(
        (e) =>
          e.date === selectedDate &&
          e.shift === 'AM' &&
          e.customerId === selectedCustomerId
      ) || null
    );
  }, [milkEntries, selectedDate, selectedCustomerId]);

  const todayPmEntry = useMemo(() => {
    if (!selectedCustomerId || !selectedDate) return null;
    return (
      milkEntries.find(
        (e) =>
          e.date === selectedDate &&
          e.shift === 'PM' &&
          e.customerId === selectedCustomerId
      ) || null
    );
  }, [milkEntries, selectedDate, selectedCustomerId]);

  // Load saved quantities when customer, date, shift, or existing entry changes
  useEffect(() => {
    if (existingEntry) {
      const qMap: Record<string, number> = {};
      existingEntry.items.forEach((item) => {
        qMap[item.productId] = item.quantity;
      });
      setQuantities(qMap);
      setNotes(existingEntry.notes || '');
    } else {
      setQuantities({});
      setNotes('');
    }
    setIsSavedSuccess(false);
  }, [existingEntry, selectedCustomerId, selectedDate, activeShift]);

  // Filtered customer list for the searchable dropdown
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.route && c.route.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [customers, customerSearchQuery]);

  // Quantity helpers (supports decimals e.g. 0.5, 1.5, 2.5)
  const handleQuantityChange = (productId: string, val: number) => {
    const valid = Math.max(0, isNaN(val) ? 0 : val);
    setQuantities((prev) => ({
      ...prev,
      [productId]: valid,
    }));
  };

  const handleStep = (productId: string, delta: number) => {
    const current = quantities[productId] || 0;
    const nextVal = Math.max(0, Math.round((current + delta) * 100) / 100);
    handleQuantityChange(productId, nextVal);
  };

  // Product Matrix calculations with Customer-Specific Rates
  const matrixItems = useMemo(() => {
    return products.map((prod) => {
      // 1. Determine customer-specific rate if defined, else default wholesale rate
      const customRate = selectedCustomer?.customRates?.[prod.id];
      const hasCustomRate = customRate !== undefined && customRate > 0;
      const rate = hasCustomRate
        ? customRate
        : prod.defaultWholesaleRate || prod.defaultRate || 0;

      const qty = quantities[prod.id] || 0;
      const amount = Number((qty * rate).toFixed(2));
      const packCrateUnits =
        prod.unitsPerCrate || prod.pouchesPerCrate || (prod.unit === 'pouch' ? 24 : 12);
      const cratesEquivalent = (qty / packCrateUnits).toFixed(1);

      return {
        product: prod,
        rate,
        hasCustomRate,
        qty,
        amount,
        packCrateUnits,
        cratesEquivalent,
      };
    });
  }, [products, selectedCustomer, quantities]);

  // Overall totals for live bottom summary
  const totalPouches = useMemo(() => {
    return matrixItems.reduce((sum, item) => sum + item.qty, 0);
  }, [matrixItems]);

  const totalCrates = useMemo(() => {
    return matrixItems.reduce((sum, item) => {
      return sum + item.qty / item.packCrateUnits;
    }, 0);
  }, [matrixItems]);

  const totalAmount = useMemo(() => {
    return matrixItems.reduce((sum, item) => sum + item.amount, 0);
  }, [matrixItems]);

  // Core Save Logic with full validations
  const executeSave = async (options?: { isNext?: boolean }): Promise<boolean> => {
    // 1. Validate Customer
    if (!selectedCustomer) {
      showToast('Please select a customer first', 'warning');
      return false;
    }

    // 2. Validate Date
    if (!selectedDate) {
      showToast('Please select a valid date', 'warning');
      return false;
    }

    // 3. Validate Shift
    if (!activeShift) {
      showToast('Please select AM or PM shift', 'warning');
      return false;
    }

    // 4. Validate Quantity
    if (totalPouches <= 0) {
      showToast('Please enter quantity for at least one milk product', 'warning');
      return false;
    }

    setIsSubmitting(true);

    try {
      // 5. Save all non-zero product quantities with the exact rate used at this time
      const items: MilkEntryItem[] = matrixItems
        .filter((m) => m.qty > 0)
        .map((m) => ({
          productId: m.product.id,
          productCode: m.product.code,
          productName: m.product.name,
          quantity: m.qty,
          rate: m.rate, // exact customer-specific rate stored permanently
          amount: Number((m.qty * m.rate).toFixed(2)),
        }));

      // 6. AM and PM are stored as separate records in IndexedDB
      const entryId = existingEntry
        ? existingEntry.id
        : `entry_${selectedCustomer.id}_${selectedDate}_${activeShift}`;

      const newEntry: MilkEntry = {
        id: entryId,
        date: selectedDate,
        time: entryTime,
        shift: activeShift,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        items,
        totalQuantity: totalPouches,
        totalAmount: Number(totalAmount.toFixed(2)),
        notes: notes.trim(),
        createdAt: existingEntry ? existingEntry.createdAt : new Date().toISOString(),
      };

      await saveMilkEntry(newEntry);

      setIsSavedSuccess(true);
      setTimeout(() => setIsSavedSuccess(false), 2500);

      showToast(
        `✓ Saved ${activeShift} entry for ${selectedCustomer.name}: ${totalPouches} pouches (₹${totalAmount.toFixed(2)})`,
        'success'
      );

      if (options?.isNext) {
        // Save & Next: switch to next customer in the directory
        const currentIndex = customers.findIndex((c) => c.id === selectedCustomer.id);
        const nextIndex = (currentIndex + 1) % customers.length;
        const nextCustomer = customers[nextIndex];
        setSelectedCustomerId(nextCustomer.id);
        setCustomerSearchQuery('');
        showToast(`Selected next: ${nextCustomer.name}`);
      } else {
        // Clear/reset only after successful regular save
        setQuantities({});
        setNotes('');
      }

      return true;
    } catch (error) {
      console.error('Failed to save milk entry:', error);
      showToast('Error saving milk entry. Please try again.', 'warning');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEntry = async () => {
    await executeSave({ isNext: false });
  };

  const handleSaveAndNext = async () => {
    await executeSave({ isNext: true });
  };

  const handleResetQuantities = () => {
    setQuantities({});
    setNotes('');
    showToast('Quantities reset', 'info');
  };

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-5xl mx-auto pb-56 sm:pb-48">
      {/* Top Banner: Fast Milk Entry Title, Date & AM/PM Shift */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          isDark
            ? 'bg-[#101D36] border-blue-900/40 text-slate-100 shadow-md'
            : 'bg-white border-slate-200 text-slate-800 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 fill-amber-400" /> Fast Milk Entry
              </span>
              <span
                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  activeShift === 'AM'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                }`}
              >
                {activeShift} Shift
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter morning & evening distribution with automatic customer rates & stock sync.
            </p>
          </div>

          {/* Shift Controls & Date Picker */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* AM / PM Toggle */}
            <div className="flex rounded-xl bg-slate-900/80 p-1 border border-slate-700/80 text-xs font-bold">
              <button
                id="fast-entry-am-btn"
                type="button"
                onClick={() => setActiveShift('AM')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeShift === 'AM'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-950" />
                AM (Morning)
              </button>
              <button
                id="fast-entry-pm-btn"
                type="button"
                onClick={() => setActiveShift('PM')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeShift === 'PM'
                    ? 'bg-indigo-600 text-white font-black shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-300" />
                PM (Evening)
              </button>
            </div>

            {/* Date Input */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                id="fast-entry-date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-semibold bg-transparent text-slate-200 outline-none"
              />
            </div>
          </div>
        </div>

        {/* REQUIREMENT 1: Searchable Customer Selector */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Customer Selection *
            </label>
            <span className="text-[11px] text-slate-400">
              Pick customer to load their custom rates automatically
            </span>
          </div>

          {/* Searchable Customer Dropdown Container */}
          <div className="relative" ref={customerDropdownRef}>
            <div className="flex items-center gap-2">
              <div
                onClick={() => setIsCustomerDropdownOpen(true)}
                className={`flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all ${
                  isCustomerDropdownOpen
                    ? 'border-amber-400 ring-1 ring-amber-400/30'
                    : isDark
                    ? 'bg-slate-900/90 border-slate-700 hover:border-slate-600'
                    : 'bg-white border-slate-300 hover:border-slate-400'
                }`}
              >
                <Search className="w-4 h-4 text-amber-400 shrink-0" />
                <input
                  id="customer-search-input"
                  type="text"
                  placeholder={
                    selectedCustomer
                      ? `Selected: ${selectedCustomer.name} (Type to search another...)`
                      : 'Search customer name, route, or phone...'
                  }
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setIsCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-100 placeholder-slate-400 outline-none"
                />
                {customerSearchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomerSearchQuery('');
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                    isCustomerDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {/* Dropdown Menu */}
            {isCustomerDropdownOpen && (
              <div
                className={`absolute top-full left-0 right-0 mt-1 z-50 max-h-64 overflow-y-auto rounded-2xl border shadow-2xl backdrop-blur-xl ${
                  isDark
                    ? 'bg-[#0E1A33] border-blue-900/60 text-slate-200'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="p-2 border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                  <span>Customer Directory ({filteredCustomers.length})</span>
                  <span>Click to select</span>
                </div>

                {filteredCustomers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No matching customer found for &quot;{customerSearchQuery}&quot;.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/50">
                    {filteredCustomers.map((cust) => {
                      const isSelected = cust.id === selectedCustomerId;
                      const summary = getCustomerSummary(cust.id);
                      return (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(cust.id);
                            setIsCustomerDropdownOpen(false);
                            setCustomerSearchQuery('');
                          }}
                          className={`w-full p-3 text-left transition-colors flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-amber-500/15 text-amber-300 font-black'
                              : isDark
                              ? 'hover:bg-slate-800/80 text-slate-200'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {cust.name.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                                <span>{cust.name}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {cust.route || 'General Route'} • {cust.phone || 'No phone'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                summary.balance > 0
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : summary.balance < 0
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {summary.balance > 0
                                ? `₹${summary.balance.toLocaleString('en-IN')} Due`
                                : summary.balance < 0
                                ? `₹${Math.abs(summary.balance).toLocaleString('en-IN')} Adv`
                                : '₹0 Nil'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick-Pick Customer Chips (horizontal 1-tap select) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 mr-1">
              Quick Pick:
            </span>
            {customers.map((c) => {
              const isSelected = c.id === selectedCustomerId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId(c.id);
                    setCustomerSearchQuery('');
                  }}
                  className={`px-3 py-1 rounded-full whitespace-nowrap text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md scale-105'
                      : 'bg-slate-800/80 text-slate-300 border border-slate-700/80 hover:bg-slate-700'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          {/* Selected Customer Info Card & Today's Shift Status */}
          {selectedCustomer && (
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-blue-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-black text-amber-400">
                    {selectedCustomer.name}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {selectedCustomer.route || 'Route 1'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Ledger Balance:{' '}
                  <strong
                    className={
                      customerSummary && customerSummary.balance > 0
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }
                  >
                    {customerSummary
                      ? `₹${Math.abs(customerSummary.balance).toLocaleString('en-IN')} ${
                          customerSummary.balance > 0 ? '(Due)' : customerSummary.balance < 0 ? '(Advance)' : '(Nil)'
                        }`
                      : '₹0'}
                  </strong>
                </div>
              </div>

              {/* Requirement 4: AM & PM Shift Separation Display */}
              <div className="p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px] space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                  <span>Today&apos;s Shift Records ({selectedDate})</span>
                  {existingEntry && (
                    <span className="text-amber-400 font-extrabold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {activeShift} Entry Loaded
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-amber-500/10 p-1 rounded border border-amber-500/20">
                    <span className="text-[9px] text-amber-400 font-bold block">AM Morning</span>
                    <span className="font-extrabold text-slate-200">
                      {todayAmEntry ? `${todayAmEntry.totalQuantity} pcs` : 'None'}
                    </span>
                  </div>
                  <div className="bg-indigo-500/10 p-1 rounded border border-indigo-500/20">
                    <span className="text-[9px] text-indigo-300 font-bold block">PM Evening</span>
                    <span className="font-extrabold text-slate-200">
                      {todayPmEntry ? `${todayPmEntry.totalQuantity} pcs` : 'None'}
                    </span>
                  </div>
                  <div className="bg-emerald-500/10 p-1 rounded border border-emerald-500/20">
                    <span className="text-[9px] text-emerald-400 font-bold block">Day Total</span>
                    <span className="font-black text-emerald-400">
                      {(todayAmEntry?.totalQuantity || 0) + (todayPmEntry?.totalQuantity || 0)} pcs
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* REQUIREMENT 2 & 11: Product Matrix */}
      <div
        className={`rounded-2xl border overflow-hidden transition-all ${
          isDark
            ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800 shadow-sm'
        }`}
      >
        <div className="p-3 bg-black/30 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" /> Product Matrix ({activeShift} Shift)
          </h3>
          <span className="text-[11px] text-slate-400">
            Tap buttons, drag slider, or type numbers
          </span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {matrixItems.map(
            ({
              product,
              rate,
              hasCustomRate,
              qty,
              amount,
              packCrateUnits,
              cratesEquivalent,
            }) => (
              <div
                key={product.id}
                className={`p-3 transition-colors ${
                  qty > 0
                    ? isDark
                      ? 'bg-amber-500/5'
                      : 'bg-amber-50/60'
                    : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Product Details & Customer Rate */}
                  <div className="flex items-center gap-2.5 sm:w-1/3">
                    <span className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 font-black text-xs text-amber-400 flex items-center justify-center shrink-0">
                      {product.code}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100 line-clamp-1">
                        {product.name}
                      </h4>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span>
                          Rate: <strong className="text-amber-400 font-bold">₹{rate.toFixed(2)}</strong> / {product.unit}
                        </span>
                        {hasCustomRate && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Custom Rate
                          </span>
                        )}
                        <span className="text-slate-500">• {packCrateUnits} / crt</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2.5">
                    {/* Quick Jump Buttons: +1, +5, +12, +1 Crt */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStep(product.id, 1)}
                        className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-200 hover:bg-slate-700 active:scale-95"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStep(product.id, 5)}
                        className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-200 hover:bg-slate-700 active:scale-95"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStep(product.id, 12)}
                        className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-200 hover:bg-slate-700 active:scale-95"
                      >
                        +12
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStep(product.id, packCrateUnits)}
                        className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-[11px] font-black text-amber-300 hover:bg-amber-500/30 active:scale-95"
                      >
                        +1 Crt
                      </button>
                    </div>

                    {/* Minus, Direct Input (supports decimals), Plus */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStep(product.id, -1)}
                        disabled={qty <= 0}
                        className="w-8 h-8 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 flex items-center justify-center active:scale-95 disabled:opacity-30"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={qty === 0 ? '' : qty}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleQuantityChange(
                            product.id,
                            val === '' ? 0 : parseFloat(val)
                          );
                        }}
                        className="w-16 h-8 rounded-xl bg-slate-900 border border-slate-700 text-center font-black text-sm text-amber-400 outline-none focus:border-amber-400"
                      />

                      <button
                        type="button"
                        onClick={() => handleStep(product.id, 1)}
                        className="w-8 h-8 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 flex items-center justify-center active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Live Row Total Amount & Crates */}
                    <div className="w-24 text-right shrink-0">
                      <div className="text-xs font-black text-amber-400">
                        ₹{amount.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {cratesEquivalent} crates
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slider for high volume dragging */}
                <div className="mt-2 pt-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="1"
                    value={qty}
                    onChange={(e) =>
                      handleQuantityChange(product.id, parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>
              </div>
            )
          )}
        </div>

        {/* Matrix Notes */}
        <div className="p-3 bg-black/20 border-t border-slate-800 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 shrink-0">Delivery Notes:</span>
          <input
            type="text"
            placeholder="e.g. Leave crate with guard / Morning direct counter supply"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* REQUIREMENT 3 & 11: STICKY BOTTOM ACTION BAR (Elevated above BottomNav) */}
      <div
        id="fast-entry-sticky-bar"
        className={`fixed bottom-16 left-0 right-0 z-40 border-t backdrop-blur-md shadow-[0_-8px_25px_rgba(0,0,0,0.6)] transition-all ${
          isDark
            ? 'bg-[#0B1528]/98 border-amber-500/30 text-slate-100'
            : 'bg-white/98 border-slate-300 text-slate-900 shadow-xl'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Live Summary: Total Pouches/Packs, Total Crates, Total Amount */}
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Pouches
              </span>
              <div className="text-base font-black text-slate-100">
                {totalPouches} <span className="text-xs font-normal text-slate-400">pcs</span>
              </div>
            </div>

            <div className="h-7 w-[1px] bg-slate-700/60" />

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Crates
              </span>
              <div className="text-base font-black text-cyan-400">
                {totalCrates.toFixed(1)} <span className="text-xs font-normal text-slate-400">crt</span>
              </div>
            </div>

            <div className="h-7 w-[1px] bg-slate-700/60" />

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Amount
              </span>
              <div className="text-lg font-black text-amber-400">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Sticky Buttons: Reset, Save Entry, Save & Next */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetQuantities}
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white active:scale-95 transition-all"
              title="Reset Quantities"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* [ SAVE ENTRY ] */}
            <button
              id="fast-entry-save-btn"
              type="button"
              onClick={handleSaveEntry}
              disabled={isSubmitting || totalPouches <= 0}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm active:scale-95 transition-all shadow-lg ${
                totalPouches <= 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-amber-500/20'
              }`}
            >
              {isSavedSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-950" />
                  <span>Entry Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Entry</span>
                </>
              )}
            </button>

            {/* [ SAVE & NEXT ] */}
            <button
              id="fast-entry-save-next-btn"
              type="button"
              onClick={handleSaveAndNext}
              disabled={isSubmitting || totalPouches <= 0}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm active:scale-95 transition-all shadow-lg ${
                totalPouches <= 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/20'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              <span>Save & Next</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
