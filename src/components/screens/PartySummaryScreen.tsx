import React, { useState, useMemo } from 'react';
import {
  Layers,
  Calendar,
  Filter,
  FileSpreadsheet,
  Boxes,
  Truck,
  Download,
  Share2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Challan } from '../../types';

interface ProductTotal {
  code: string;
  name: string;
  crates: number;
  totalQuantity: number;
  amount: number;
}

interface ConsolidatedParty {
  partyName: string;
  challansCount: number;
  challanNumbers: string[];
  productTotals: Record<string, ProductTotal>;
  totalCrates: number;
  totalQuantity: number;
  totalFreight: number;
  totalNetAmount: number;
}

export const PartySummaryScreen: React.FC = () => {
  const { challans, products, selectedDate, setSelectedDate, theme } = useApp();
  const isDark = theme === 'dark';

  const [filterParty, setFilterParty] = useState<string>('ALL');

  // Unique parties from all challans
  const parties = useMemo(() => {
    return ['ALL', ...Array.from(new Set(challans.map((c) => c.partyName).filter(Boolean)))];
  }, [challans]);

  // Filter challans for selected date and party
  const activeChallans = useMemo(() => {
    return challans.filter((c) => {
      const matchDate = c.date === selectedDate;
      const matchParty = filterParty === 'ALL' || c.partyName === filterParty;
      return matchDate && matchParty;
    });
  }, [challans, selectedDate, filterParty]);

  // Consolidate products by Product Code across all active challans
  const consolidated = useMemo(() => {
    // Map: partyName -> ConsolidatedParty
    const partyMap: Record<string, ConsolidatedParty> = {};

    activeChallans.forEach((c) => {
      if (!partyMap[c.partyName]) {
        partyMap[c.partyName] = {
          partyName: c.partyName,
          challansCount: 0,
          challanNumbers: [],
          productTotals: {},
          totalCrates: 0,
          totalQuantity: 0,
          totalFreight: 0,
          totalNetAmount: 0,
        };
      }

      const pEntry = partyMap[c.partyName];
      pEntry.challansCount += 1;
      pEntry.challanNumbers.push(c.challanNumber);
      pEntry.totalCrates += c.totalCrates || 0;
      pEntry.totalQuantity += c.totalQuantity || 0;
      pEntry.totalFreight += c.freight || 0;
      pEntry.totalNetAmount += c.netAmount || 0;

      c.items.forEach((it) => {
        const key = it.productCode || it.productId;
        if (!pEntry.productTotals[key]) {
          pEntry.productTotals[key] = {
            code: it.productCode,
            name: it.productName,
            crates: 0,
            totalQuantity: 0,
            amount: 0,
          };
        }
        pEntry.productTotals[key].crates += it.crates || 0;
        pEntry.productTotals[key].totalQuantity += it.totalQuantity || 0;
        pEntry.productTotals[key].amount += it.amount || 0;
      });
    });

    return Object.values(partyMap);
  }, [activeChallans]);

  // Grand totals across all parties for the date
  const grandTotals = useMemo(() => {
    let crates = 0;
    let pouches = 0;
    let freight = 0;
    let net = 0;

    consolidated.forEach((p) => {
      crates += p.totalCrates;
      pouches += p.totalQuantity;
      freight += p.totalFreight;
      net += p.totalNetAmount;
    });

    return { crates, pouches, freight, net };
  }, [consolidated]);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto pb-24">
      {/* Header Controls */}
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
                <Layers className="w-4 h-4" /> Party-Wise Challan Consolidation
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Multi-Challan Grouping
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Consolidates identical product codes received from multiple challans across suppliers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Date selector */}
            <input
              id="party-summary-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 outline-none"
            />

            {/* Party Filter */}
            <select
              id="party-summary-select"
              value={filterParty}
              onChange={(e) => setFilterParty(e.target.value)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 outline-none"
            >
              {parties.map((p) => (
                <option key={p} value={p}>
                  {p === 'ALL' ? 'All Parties' : p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grand KPI Total Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div
          className={`p-3 rounded-xl border text-center ${
            isDark ? 'bg-[#101D36] border-blue-900/30' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <span className="text-[10px] text-slate-400 uppercase font-bold">Total Crates</span>
          <div className="text-xl font-black text-slate-100">{grandTotals.crates}</div>
        </div>
        <div
          className={`p-3 rounded-xl border text-center ${
            isDark ? 'bg-[#101D36] border-blue-900/30' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <span className="text-[10px] text-slate-400 uppercase font-bold">Total Pouches</span>
          <div className="text-xl font-black text-cyan-400">{grandTotals.pouches}</div>
        </div>
        <div
          className={`p-3 rounded-xl border text-center ${
            isDark ? 'bg-[#101D36] border-blue-900/30' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <span className="text-[10px] text-slate-400 uppercase font-bold">Freight Inward</span>
          <div className="text-xl font-black text-slate-200">₹{grandTotals.freight}</div>
        </div>
        <div
          className={`p-3 rounded-xl border text-center ${
            isDark ? 'bg-[#101D36] border-blue-900/30' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <span className="text-[10px] text-slate-400 uppercase font-bold">Grand Net Invoice</span>
          <div className="text-xl font-black text-amber-400">
            ₹{grandTotals.net.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Consolidated Parties */}
      {consolidated.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <FileSpreadsheet className="w-10 h-10 text-slate-500 mx-auto" />
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            No challans recorded on {selectedDate}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {consolidated.map((party) => (
            <div
              key={party.partyName}
              className={`rounded-2xl border overflow-hidden transition-all ${
                isDark
                  ? 'bg-[#101D36] border-blue-900/40 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-800 shadow-sm'
              }`}
            >
              {/* Party Header Banner */}
              <div className="p-3.5 bg-black/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-amber-400">{party.partyName}</h3>
                  <p className="text-[11px] text-slate-400">
                    Challans ({party.challansCount}): {party.challanNumbers.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="text-slate-300">{party.totalCrates} Crates</span>
                  <span className="text-cyan-400">{party.totalQuantity} Pouches</span>
                  <span className="text-amber-400 font-black">
                    Net: ₹{party.totalNetAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Products Breakdown Table */}
              <div className="p-3 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                      <th className="pb-2">Code</th>
                      <th className="pb-2">Product Name</th>
                      <th className="pb-2 text-right">Total Crates</th>
                      <th className="pb-2 text-right">Total Quantity</th>
                      <th className="pb-2 text-right">Gross Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-medium">
                    {(Object.values(party.productTotals) as ProductTotal[]).map((prod) => (
                      <tr key={prod.code} className="hover:bg-slate-800/30">
                        <td className="py-2.5 font-bold text-amber-400">{prod.code}</td>
                        <td className="py-2.5 text-slate-200 font-bold">{prod.name}</td>
                        <td className="py-2.5 text-right text-slate-300">{prod.crates}</td>
                        <td className="py-2.5 text-right text-cyan-400">{prod.totalQuantity}</td>
                        <td className="py-2.5 text-right font-black text-slate-100">
                          ₹{prod.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Party Summary Bottom Info */}
              <div className="p-3 bg-black/20 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Freight: ₹{party.totalFreight}</span>
                <span className="font-bold text-slate-200">
                  Consolidated Invoice: ₹{party.totalNetAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
