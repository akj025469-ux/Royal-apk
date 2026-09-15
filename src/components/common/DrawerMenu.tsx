import React from 'react';
import {
  LayoutDashboard,
  Users,
  Zap,
  FileSpreadsheet,
  Camera,
  ScanLine,
  Layers,
  Package,
  ShoppingBag,
  Boxes,
  FileText,
  CreditCard,
  Landmark,
  Receipt,
  BarChart3,
  Settings,
  X,
  Milk,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppScreen } from '../../types';

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ModuleItem {
  screen: AppScreen;
  label: string;
  badge?: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
  color: string;
}

interface ModuleSection {
  title: string;
  modules: ModuleItem[];
}

export const DrawerMenu: React.FC<DrawerMenuProps> = ({ isOpen, onClose }) => {
  const { activeScreen, navigateTo, theme, settings } = useApp();
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const handleSelect = (screen: AppScreen) => {
    navigateTo(screen);
    onClose();
  };

  const SECTIONS: ModuleSection[] = [
    {
      title: 'Daily Milk Operations',
      modules: [
        {
          screen: 'dashboard',
          label: '1. Dashboard',
          desc: 'Live milk KPIs & quick shortcuts',
          icon: LayoutDashboard,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        },
        {
          screen: 'fast_entry',
          label: '3. Fast Milk Entry',
          badge: 'AM/PM',
          desc: 'Excel-style customer/product matrix',
          icon: Zap,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        },
        {
          screen: 'customers',
          label: '2. Customers',
          desc: 'Ledger, custom rates & routes',
          icon: Users,
          color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
        },
        {
          screen: 'products',
          label: '10. Products & Packing',
          desc: 'Amul SKUs, crate count & prices',
          icon: Boxes,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
        },
      ],
    },
    {
      title: 'Inward, Challans & Scanning',
      modules: [
        {
          screen: 'challans',
          label: '4. Challans',
          desc: 'Amul gate passes, crates & freight',
          icon: FileSpreadsheet,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        },
        {
          screen: 'khali_crate',
          label: '4b. Khali Crates',
          badge: 'Empty Crates',
          desc: 'Challan TOTAL QTY vs Transport returns',
          icon: Boxes,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        },
        {
          screen: 'challan_scanner',
          label: '5. Challan Scanner',
          badge: 'Camera/Gallery',
          desc: 'Capture & review delivery challans',
          icon: Camera,
          color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        },
        {
          screen: 'register_scanner',
          label: '6. Register Scanner',
          badge: 'Handwritten',
          desc: 'Paper diary & log entry review',
          icon: ScanLine,
          color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
        },
        {
          screen: 'party_summary',
          label: '7. Party Summary',
          desc: 'Consolidated product totals',
          icon: Layers,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
        },
        {
          screen: 'stock',
          label: '8. Master Stock',
          desc: 'Opening + Inward - Outward balance',
          icon: Package,
          color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
        },
        {
          screen: 'purchase',
          label: '9. Purchase',
          desc: 'Supplier purchases & extra items',
          icon: ShoppingBag,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
        },
      ],
    },
    {
      title: 'Accounts, Cash & Billing',
      modules: [
        {
          screen: 'billing',
          label: '11. Billing & WhatsApp',
          badge: 'Share',
          desc: 'AM/PM customer statements',
          icon: FileText,
          color: 'text-green-400 bg-green-500/10 border-green-500/30',
        },
        {
          screen: 'payments',
          label: '12. Payments',
          desc: 'Cash, UPI, Bank collections',
          icon: CreditCard,
          color: 'text-lime-400 bg-lime-500/10 border-lime-500/30',
        },
        {
          screen: 'bank_cash',
          label: '13. Bank & Cash',
          desc: '₹500 to ₹10 Denomination count',
          icon: Landmark,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        },
        {
          screen: 'expenses',
          label: '14. Expenses',
          desc: 'Freight, labour, fuel & bills',
          icon: Receipt,
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        },
      ],
    },
    {
      title: 'Business Analytics & Admin',
      modules: [
        {
          screen: 'reports',
          label: '15. Reports',
          desc: 'Sales, margins & top customers',
          icon: BarChart3,
          color: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
        },
        {
          screen: 'settings',
          label: '16. Settings',
          desc: 'Firm details, rates & backup',
          icon: Settings,
          color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
        },
      ],
    },
  ];

  return (
    <div
      id="royal-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-start animate-fade-in"
      onClick={onClose}
    >
      <div
        id="royal-drawer-panel"
        className={`w-full max-w-sm h-full overflow-y-auto flex flex-col border-r shadow-2xl transition-transform ${
          isDark
            ? 'bg-[#0B1528] border-blue-900/40 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          className={`p-4 border-b flex items-center justify-between sticky top-0 z-10 ${
            isDark ? 'bg-[#0B1528] border-blue-900/40' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Milk className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">ROYAL ERP</h2>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {settings.businessName || 'Amul Distribution System'}
              </p>
            </div>
          </div>
          <button
            id="drawer-close-btn"
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modules List */}
        <div className="p-4 space-y-6 flex-1 pb-20">
          {SECTIONS.map((sec, idx) => (
            <div key={idx} className="space-y-2">
              <h3
                className={`text-[11px] font-bold uppercase tracking-wider px-1 ${
                  isDark ? 'text-amber-400/80' : 'text-blue-900 font-extrabold'
                }`}
              >
                {sec.title}
              </h3>
              <div className="grid grid-cols-1 gap-1.5">
                {sec.modules.map((m) => {
                  const Icon = m.icon;
                  const isCurrent = activeScreen === m.screen;
                  return (
                    <button
                      key={m.screen}
                      id={`drawer-module-${m.screen}`}
                      onClick={() => handleSelect(m.screen)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                        isCurrent
                          ? isDark
                            ? 'bg-amber-500/20 border-amber-500/50 shadow-sm'
                            : 'bg-blue-50 border-blue-300 shadow-sm'
                          : isDark
                          ? 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/80'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center ${m.color}`}
                        >
                          <Icon className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold leading-tight ${
                                isCurrent
                                  ? isDark
                                    ? 'text-amber-400'
                                    : 'text-blue-950 font-extrabold'
                                  : isDark
                                  ? 'text-slate-200'
                                  : 'text-slate-800'
                              }`}
                            >
                              {m.label}
                            </span>
                            {m.badge && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                {m.badge}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[11px] leading-tight ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {m.desc}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Drawer Footer */}
        <div
          className={`p-3 border-t text-center text-[11px] font-medium ${
            isDark
              ? 'bg-[#080E1B] border-blue-900/40 text-slate-500'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}
        >
          ROYAL ERP PRO • 100% Offline Local IndexedDB
        </div>
      </div>
    </div>
  );
};
