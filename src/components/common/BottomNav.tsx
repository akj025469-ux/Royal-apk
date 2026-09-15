import React from 'react';
import {
  LayoutDashboard,
  Zap,
  FileSpreadsheet,
  Users,
  Grid,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppScreen } from '../../types';

interface BottomNavProps {
  onOpenMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenMenu }) => {
  const { activeScreen, navigateTo, theme } = useApp();
  const isDark = theme === 'dark';

  const NAV_ITEMS: Array<{ screen: AppScreen; label: string; icon: React.FC<{ className?: string }> }> = [
    { screen: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { screen: 'fast_entry', label: 'Milk Entry', icon: Zap },
    { screen: 'challans', label: 'Challans', icon: FileSpreadsheet },
    { screen: 'customers', label: 'Customers', icon: Users },
  ];

  return (
    <nav
      id="royal-bottom-nav"
      className={`fixed bottom-0 left-0 right-0 z-40 border-t select-none transition-colors pb-safe ${
        isDark
          ? 'bg-[#0B1528]/95 backdrop-blur-md border-blue-900/40 text-slate-300 shadow-2xl'
          : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-700 shadow-lg'
      }`}
    >
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 px-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeScreen === item.screen;
          const Icon = item.icon;
          return (
            <button
              key={item.screen}
              id={`nav-item-${item.screen}`}
              onClick={() => navigateTo(item.screen)}
              className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                isActive
                  ? isDark
                    ? 'text-amber-400 font-bold'
                    : 'text-blue-900 font-bold'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive
                    ? isDark
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-blue-100 text-blue-900'
                    : ''
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[10px] leading-tight tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* 5th button: Open Drawer / All Modules */}
        <button
          id="nav-item-more-modules"
          onClick={onOpenMenu}
          className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
            isDark ? 'text-slate-400 hover:text-amber-400' : 'text-slate-500 hover:text-blue-900'
          }`}
        >
          <div className="p-1 rounded-xl">
            <Grid className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[10px] leading-tight tracking-tight">Modules</span>
        </button>
      </div>
    </nav>
  );
};
