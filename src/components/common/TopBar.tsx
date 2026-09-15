import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  RotateCw,
  Sun,
  Moon,
  Menu,
  Sparkles,
  WifiOff,
  Clock,
  AlertTriangle,
  Check,
  FileSpreadsheet,
  Bell,
  Lock,
  MoreVertical,
  Settings,
  Boxes,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppScreen } from '../../types';

interface TopBarProps {
  title?: string;
  subtitle?: string;
  onOpenMenu?: () => void;
}

const SCREEN_TITLES: Record<AppScreen, { title: string; subtitle: string }> = {
  dashboard: { title: 'ROYAL ERP', subtitle: 'Amul Milk Distribution' },
  customers: { title: 'Customers', subtitle: 'Party & Retailer Directory' },
  fast_entry: { title: 'Fast Milk Entry', subtitle: 'Excel-style AM/PM Matrix' },
  challans: { title: 'Delivery Challans', subtitle: 'Amul Gate Passes & Inward' },
  challan_scanner: { title: 'Challan Scanner', subtitle: 'Camera & Gallery Intake' },
  register_scanner: { title: 'Register Scanner', subtitle: 'Handwritten Log OCR' },
  party_summary: { title: 'Party Summary', subtitle: 'Product Consolidation' },
  stock: { title: 'Master Milk Stock', subtitle: 'Received vs Distributed' },
  purchase: { title: 'Purchases', subtitle: 'Dairy Products Inflow' },
  products: { title: 'Products & Rates', subtitle: 'Amul SKUs & Crate Packing' },
  billing: { title: 'Billing & WhatsApp', subtitle: 'Customer Statements' },
  payments: { title: 'Payments Received', subtitle: 'Cash, UPI & Bank Ledger' },
  bank_cash: { title: 'Bank & Cash Closing', subtitle: 'Denomination & Settlement' },
  expenses: { title: 'Daily Expenses', subtitle: 'Freight, Labour & Utilities' },
  reports: { title: 'Reports & Analytics', subtitle: 'Financial & Volume Trends' },
  settings: { title: 'Settings', subtitle: 'Business Info & Backup' },
  khali_crate: { title: 'Khali Crate Module', subtitle: 'Empty Crates & Transport Return' },
};

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle, onOpenMenu }) => {
  const {
    activeScreen,
    canGoBack,
    goBack,
    theme,
    toggleTheme,
    refreshAllData,
    isRefreshing,
    activeShift,
    setActiveShift,
    selectedDate,
    setSelectedDate,
    syncStatus,
    navigateTo,
    showToast,
    openExcelModal,
    openNotificationsModal,
    activeAlertsCount,
    lockApp,
    settings,
  } = useApp();

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  const handleManualRefresh = async () => {
    await refreshAllData();
    showToast('Database reloaded. Dashboard, stock & balances recalculated.', 'info');
  };

  const currentInfo = SCREEN_TITLES[activeScreen] || {
    title: title || 'ROYAL ERP',
    subtitle: subtitle || 'Amul Distribution ERP',
  };

  const isDark = theme === 'dark';

  return (
    <header
      id="royal-topbar"
      className={`sticky top-0 z-40 px-3 py-2.5 transition-colors border-b select-none ${
        isDark
          ? 'bg-[#0B1528] border-blue-900/40 text-slate-100 shadow-md'
          : 'bg-white border-slate-200 text-slate-800 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Back button OR Menu icon */}
        <div className="flex items-center gap-2">
          {canGoBack ? (
            <button
              id="topbar-back-btn"
              onClick={goBack}
              className={`p-2 rounded-xl border active:scale-95 transition-all flex items-center justify-center ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
              }`}
              title="Go back"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : (
            <button
              id="topbar-menu-btn"
              onClick={onOpenMenu}
              className={`p-2 rounded-xl border active:scale-95 transition-all flex items-center justify-center ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
              }`}
              title="All Modules"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Title & Subtitle */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight leading-tight line-clamp-1">
                {title || currentInfo.title}
              </h1>
              {activeScreen === 'dashboard' && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 tracking-wider uppercase">
                  <Sparkles className="w-2.5 h-2.5" /> PRO
                </span>
              )}
            </div>
            <p className={`text-[11px] font-medium leading-none line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {subtitle || currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Shift Toggle AM / PM */}
          <div
            id="shift-selector-top"
            className={`inline-flex items-center p-0.5 rounded-lg border text-xs font-bold ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              id="shift-am-btn"
              onClick={() => setActiveShift('AM')}
              className={`px-2 py-1 rounded-md transition-all ${
                activeShift === 'AM'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AM
            </button>
            <button
              id="shift-pm-btn"
              onClick={() => setActiveShift('PM')}
              className={`px-2 py-1 rounded-md transition-all ${
                activeShift === 'PM'
                  ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              PM
            </button>
          </div>

          {/* Quick Date Selector */}
          <input
            id="topbar-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`hidden md:block text-xs font-medium px-2 py-1 rounded-lg border outline-none ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          />

          {/* Sync Status Badge */}
          <button
            id="topbar-sync-status"
            onClick={() => navigateTo('settings')}
            title={`Sync Status: ${syncStatus.toUpperCase()}. Click to view Google Drive Backup & Sync settings`}
            className={`hidden xs:inline-flex sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all active:scale-95 ${
              syncStatus === 'synced'
                ? isDark
                  ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : syncStatus === 'syncing'
                ? isDark
                  ? 'bg-sky-950/40 border-sky-700/50 text-sky-400'
                  : 'bg-sky-50 border-sky-200 text-sky-700'
                : syncStatus === 'offline'
                ? isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-400'
                  : 'bg-slate-100 border-slate-300 text-amber-700'
                : syncStatus === 'pending'
                ? isDark
                  ? 'bg-amber-950/40 border-amber-700/50 text-amber-400'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
                : isDark
                ? 'bg-rose-950/40 border-rose-700/50 text-rose-400'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {syncStatus === 'synced' && <Check className="w-3 h-3 text-emerald-400 stroke-[2.5]" />}
            {syncStatus === 'syncing' && <RotateCw className="w-3 h-3 animate-spin text-sky-400" />}
            {syncStatus === 'offline' && <WifiOff className="w-3 h-3 text-amber-400" />}
            {syncStatus === 'pending' && <Clock className="w-3 h-3 text-amber-400" />}
            {syncStatus === 'error' && <AlertTriangle className="w-3 h-3 text-rose-400" />}
            <span className="capitalize">
              {syncStatus === 'synced'
                ? 'Synced'
                : syncStatus === 'syncing'
                ? 'Syncing...'
                : syncStatus === 'offline'
                ? 'Offline'
                : syncStatus === 'pending'
                ? 'Sync Pending'
                : 'Sync Error'}
            </span>
          </button>

          {/* Excel Export & Import Hub Button */}
          <button
            id="topbar-excel-hub-btn"
            onClick={() => openExcelModal('export')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold active:scale-95 transition-all ${
              isDark
                ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/40'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
            }`}
            title="Open Excel Export & Import Hub"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Business Alerts / Notifications Center Button */}
          <button
            id="topbar-notifications-btn"
            onClick={openNotificationsModal}
            className={`relative p-2 rounded-xl border active:scale-95 transition-all ${
              activeAlertsCount > 0
                ? isDark
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-400 hover:bg-amber-900/40'
                  : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                : isDark
                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title={`Notifications & Alerts (${activeAlertsCount} active)`}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black shadow-sm animate-pulse">
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* Refresh Button */}
          <button
            id="topbar-refresh-btn"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-xl border active:scale-95 transition-all ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title="Recalculate and Reload all tables from database"
            aria-label="Refresh"
          >
            <RotateCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`}
            />
          </button>

          {/* Theme Switcher */}
          <button
            id="topbar-theme-btn"
            onClick={toggleTheme}
            className={`p-2 rounded-xl border active:scale-95 transition-all ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-amber-600 hover:bg-slate-200'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* 3-Dot Overflow Menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              id="topbar-more-menu-btn"
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              className={`p-2 rounded-xl border active:scale-95 transition-all ${
                isMoreMenuOpen
                  ? isDark
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-blue-50 border-blue-400 text-blue-700'
                  : isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="More Actions"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMoreMenuOpen && (
              <div
                id="topbar-overflow-dropdown"
                className={`absolute right-0 mt-2 w-56 rounded-2xl border p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
                  isDark
                    ? 'bg-[#101D36] border-blue-900/60 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-800 shadow-xl'
                }`}
              >
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-700/50 mb-1">
                  Quick Actions
                </div>

                <button
                  id="menu-opt-settings"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    navigateTo('settings');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Settings className="w-4 h-4 text-blue-400" />
                  <span>Settings & Profile</span>
                </button>

                <button
                  id="menu-opt-lock"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    if (settings.security?.appLockEnabled && settings.security?.pinHash) {
                      lockApp();
                      showToast('App locked.', 'info');
                    } else {
                      navigateTo('settings');
                      showToast('Please set your 4-6 digit PIN in Settings to lock app.', 'info');
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Lock App Now</span>
                </button>

                <button
                  id="menu-opt-excel"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    openExcelModal('export');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Excel Export / Import</span>
                </button>

                <button
                  id="menu-opt-crates"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    navigateTo('khali_crate');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Boxes className="w-4 h-4 text-cyan-400" />
                  <span>Khali Crates Tracker</span>
                </button>

                <div className="my-1 border-t border-slate-700/50" />

                <button
                  id="menu-opt-refresh"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    handleManualRefresh();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <RotateCw className="w-4 h-4 text-amber-400" />
                  <span>Recalculate & Reload</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
