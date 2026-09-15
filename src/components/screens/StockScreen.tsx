import React, { useState } from 'react';
import {
  Package,
  Calendar,
  Layers,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Boxes,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Shift } from '../../types';

export const StockScreen: React.FC = () => {
  const {
    products,
    getStockForDate,
    selectedDate,
    setSelectedDate,
    theme,
  } = useApp();

  const isDark = theme === 'dark';

  const [shiftFilter, setShiftFilter] = useState<Shift | 'ALL'>('ALL');

  const stockRows = getStockForDate(selectedDate, shiftFilter);

  // Overall totals
  const totalReceived = stockRows.reduce((sum, r) => sum + r.receivedQty, 0);
  const totalReceivedCrates = stockRows.reduce((sum, r) => sum + r.receivedCrates, 0);
  const totalDistributed = stockRows.reduce((sum, r) => sum + r.distributedQty, 0);
  const totalDistributedAM = stockRows.reduce((sum, r) => sum + r.distributedAM, 0);
  const totalDistributedPM = stockRows.reduce((sum, r) => sum + r.distributedPM, 0);
  const totalBalance = totalReceived - totalDistributed;

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto pb-24">
      {/* Header & Filter Bar */}
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
                <Package className="w-4 h-4" /> Master Milk Stock Ledger
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                Live Inventory
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Opening + Received (Challans) - Distributed (AM & PM Milk Entries) = Remaining Stock
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Shift Mode: All Day vs AM vs PM */}
            <div className="flex rounded-xl bg-slate-900/80 p-1 border border-slate-700 text-xs font-bold">
              <button
                id="stock-filter-all"
                onClick={() => setShiftFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  shiftFilter === 'ALL'
                    ? 'bg-teal-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Full Day
              </button>
              <button
                id="stock-filter-am"
                onClick={() => setShiftFilter('AM')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  shiftFilter === 'AM'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                AM Shift
              </button>
              <button
                id="stock-filter-pm"
                onClick={() => setShiftFilter('PM')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  shiftFilter === 'PM'
                    ? 'bg-indigo-600 text-white font-black shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PM Shift
              </button>
            </div>

            {/* Date */}
            <input
              id="stock-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Stock Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div
          className={`p-3 rounded-xl border text-center ${
            isDark ? 'bg-[#101D36] border-blue-900/30' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <span className="text-[10px] text-slate-400 uppercase font-bold">Total Inward</span>
          <div className="text-xl font-black text-sky-400">
            {totalReceived}{' '}
            <span className="text-xs font-normal text-slate-400">pouches</span>
          </div>
          <span className="text-[10px] text-slate-500">{totalReceivedCrates} crates</span>
        </div>

        <div
          className={`p-3 rounded-xl border text-center ${
            isDark ? 'bg-[#101D36] border-blue-900/30' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <span className="text-[10px] text-slate-400 uppercase font-bold">Total Distributed</span>
          <div className="text-xl font-black text-emerald-400">
            {totalDistributed}{' '}
            <span className="text-xs font-normal text-slate-400">pouches</span>
          </div>
          <span className="text-[10px] text-slate-500">
            AM: {totalDistributedAM} | PM: {totalDistributedPM}
          </span>
        </div>

        <div
          className={`p-3 rounded-xl border text-center ${
            isDark ? 'bg-[#101D36] border-blue-900/30' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <span className="text-[10px] text-slate-400 uppercase font-bold">Remaining Stock</span>
          <div
            className={`text-xl font-black ${
              totalBalance < 0 ? 'text-rose-400' : 'text-amber-400'
            }`}
          >
            {totalBalance}{' '}
            <span className="text-xs font-normal text-slate-400">pouches</span>
          </div>
          <span className="text-[10px] text-slate-500">
            {totalBalance >= 0 ? 'Available on floor' : 'Deficit / Over-distributed'}
          </span>
        </div>

        <div
          className={`p-3 rounded-xl border text-center ${
            isDark ? 'bg-[#101D36] border-blue-900/30' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <span className="text-[10px] text-slate-400 uppercase font-bold">Distribution Rate</span>
          <div className="text-xl font-black text-purple-400">
            {totalReceived > 0
              ? `${Math.round((totalDistributed / totalReceived) * 100)}%`
              : '0%'}
          </div>
          <span className="text-[10px] text-slate-500">of daily inward delivered</span>
        </div>
      </div>

      {/* SKU-Wise Stock Table */}
      <div
        className={`rounded-2xl border overflow-hidden transition-all ${
          isDark
            ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800 shadow-sm'
        }`}
      >
        <div className="p-3 bg-black/30 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
            Product Stock Breakdown ({selectedDate})
          </h3>
          <span className="text-[11px] text-slate-400">
            Filtered by: <strong className="text-slate-200">{shiftFilter}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-black/20">
                <th className="p-3">Product</th>
                <th className="p-3 text-right">Received (Inward)</th>
                <th className="p-3 text-right">AM Outward</th>
                <th className="p-3 text-right">PM Outward</th>
                <th className="p-3 text-right">Total Outward</th>
                <th className="p-3 text-right">Balance Stock</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {stockRows.map((row) => {
                const isShortage = row.balanceQty < 0;
                const isZero = row.balanceQty === 0 && row.receivedQty > 0;
                const isHealthy = row.balanceQty > 0;

                return (
                  <tr key={row.product.id} className="hover:bg-slate-800/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 font-black flex items-center justify-center text-[11px]">
                          {row.product.code}
                        </span>
                        <div>
                          <div className="font-bold text-slate-200">{row.product.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {row.product.pouchesPerCrate} pouches/crate
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <div className="font-bold text-sky-400">{row.receivedQty}</div>
                      <div className="text-[10px] text-slate-500">
                        {row.receivedCrates} crt
                      </div>
                    </td>

                    <td className="p-3 text-right text-slate-300 font-bold">
                      {row.distributedAM}
                    </td>

                    <td className="p-3 text-right text-slate-300 font-bold">
                      {row.distributedPM}
                    </td>

                    <td className="p-3 text-right font-bold text-emerald-400">
                      {row.distributedQty}
                    </td>

                    <td className="p-3 text-right">
                      <div
                        className={`font-black text-sm ${
                          isShortage ? 'text-rose-400' : isZero ? 'text-slate-400' : 'text-amber-400'
                        }`}
                      >
                        {row.balanceQty}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {(row.balanceQty / (row.product.pouchesPerCrate || 24)).toFixed(1)} crt
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          isShortage
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : isZero
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {isShortage ? 'Deficit' : isZero ? 'Cleared' : 'In Stock'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
