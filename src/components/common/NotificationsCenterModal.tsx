import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  Package,
  Users,
  CloudAlert,
  WifiOff,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NotificationsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface AppNotificationItem {
  id: string;
  category: 'DUE' | 'STOCK' | 'BACKUP' | 'SYNC';
  title: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  actionScreen?: any;
  timestamp: string;
}

export const NotificationsCenterModal: React.FC<NotificationsCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    settings,
    customers,
    products,
    milkEntries,
    purchases,
    customerBalances,
    backupMeta,
    syncStatus,
    setActiveScreen,
    theme,
  } = useApp();

  const isDark = theme === 'dark';
  const notifConfig = settings.notifications || {
    dueAlerts: true,
    lowStockAlerts: true,
    backupAlerts: true,
    backupFailureAlerts: true,
    syncErrorAlerts: true,
    dueThresholdAmount: 5000,
    lowStockCrateLimit: 5,
  };

  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [browserPermStatus, setBrowserPermStatus] = useState<string>('default');

  // Check and evaluate real notifications from persistent data
  useEffect(() => {
    if (!isOpen) return;

    // Check browser notification permission status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermStatus(Notification.permission);
    } else {
      setBrowserPermStatus('unsupported');
    }

    const items: AppNotificationItem[] = [];

    // 1. Customer Due Alerts
    if (notifConfig.dueAlerts) {
      const threshold = notifConfig.dueThresholdAmount || 5000;
      customers.forEach((c) => {
        const bal = customerBalances[c.id] !== undefined ? customerBalances[c.id] : c.openingBalance || 0;
        if (bal >= threshold) {
          items.push({
            id: `due_${c.id}`,
            category: 'DUE',
            title: `High Due: ${c.name}`,
            message: `Outstanding balance is ₹${bal.toLocaleString('en-IN')}, exceeding alert threshold of ₹${threshold.toLocaleString('en-IN')}.`,
            severity: 'high',
            actionScreen: 'customers',
            timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          });
        }
      });
    }

    // 2. Low Stock Alerts
    if (notifConfig.lowStockAlerts) {
      const crateLimit = notifConfig.lowStockCrateLimit || 5;
      products.forEach((p) => {
        const inQty = purchases.reduce(
          (acc, pur) =>
            acc + (pur.items?.filter((it) => it.productId === p.id).reduce((s, it) => s + it.quantity, 0) || 0),
          0
        );
        const outQty = milkEntries.reduce(
          (acc, e) =>
            acc + (e.items?.filter((it) => it.productId === p.id).reduce((s, it) => s + it.quantity, 0) || 0),
          0
        );
        const currentQty = inQty - outQty;
        const pouchesPerCrate = p.pouchesPerCrate || p.unitsPerCrate || 24;
        const currentCrates = currentQty / pouchesPerCrate;

        if (currentCrates <= crateLimit) {
          items.push({
            id: `stock_${p.id}`,
            category: 'STOCK',
            title: `Low Stock: ${p.name}`,
            message: `Only ${currentCrates.toFixed(1)} crates (${currentQty} units) remaining. Below limit of ${crateLimit} crates.`,
            severity: currentCrates <= 0 ? 'high' : 'medium',
            actionScreen: 'stock',
            timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          });
        }
      });
    }

    // 3. Backup Alerts
    if (notifConfig.backupAlerts) {
      if (!backupMeta.lastSuccessfulBackup) {
        items.push({
          id: 'backup_never',
          category: 'BACKUP',
          title: 'Database Backup Pending',
          message: 'No cloud backup has been created yet. Please back up your dairy database in Settings.',
          severity: 'medium',
          actionScreen: 'settings',
          timestamp: 'Just now',
        });
      } else {
        const hoursAgo = (Date.now() - new Date(backupMeta.lastSuccessfulBackup).getTime()) / (1000 * 60 * 60);
        if (hoursAgo > 48) {
          items.push({
            id: 'backup_old',
            category: 'BACKUP',
            title: 'Backup Reminder',
            message: `Last successful backup was ${Math.round(hoursAgo)} hours ago. Consider performing a fresh backup.`,
            severity: 'low',
            actionScreen: 'settings',
            timestamp: 'Notice',
          });
        }
      }
    }

    // 4. Backup Failure & Sync Error
    if (notifConfig.backupFailureAlerts && backupMeta.lastError) {
      items.push({
        id: 'backup_error',
        category: 'BACKUP',
        title: 'Google Drive Backup Notice',
        message: backupMeta.lastError,
        severity: 'high',
        actionScreen: 'settings',
        timestamp: 'Recent',
      });
    }

    if (notifConfig.syncErrorAlerts && syncStatus === 'error') {
      items.push({
        id: 'sync_error',
        category: 'SYNC',
        title: 'Cloud Synchronization Issue',
        message: 'Could not communicate with cloud storage. Local IndexedDB is safely keeping all changes.',
        severity: 'medium',
        actionScreen: 'settings',
        timestamp: 'Offline Safe',
      });
    }

    setNotifications(items);
  }, [
    isOpen,
    customers,
    products,
    milkEntries,
    purchases,
    customerBalances,
    backupMeta,
    syncStatus,
    notifConfig,
  ]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setBrowserPermStatus(res);
      } catch (e) {
        console.warn('Notification permission request error:', e);
      }
    }
  };

  const handleNavigate = (screen: any) => {
    if (screen) {
      setActiveScreen(screen);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#101D36] border-blue-900/60 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-400">
                Notifications & Business Alerts
              </h2>
              <p className="text-xs text-slate-400">
                Live monitoring for Customer Dues, Low Stock & Backup Status
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Permission Info / Banner */}
        <div
          className={`p-3 border-b text-xs flex items-center justify-between gap-2 shrink-0 ${
            browserPermStatus === 'granted'
              ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
              : 'bg-slate-900/80 border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px]">
              {browserPermStatus === 'granted'
                ? 'Device System Notifications: ENABLED'
                : browserPermStatus === 'unsupported' || browserPermStatus === 'denied'
                ? 'Preview Environment Note: In-app alerts are active in this panel.'
                : 'Enable system notifications on your Android device for instant alerts.'}
            </span>
          </div>

          {browserPermStatus === 'default' && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-bold shrink-0 hover:bg-amber-400"
            >
              Enable
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-70" />
              <div className="text-sm font-bold text-slate-200">All Clear! No Pending Alerts</div>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No high customer dues, stock levels are adequate, and cloud backups are up to date.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNavigate(n.actionScreen)}
                className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01] ${
                  n.severity === 'high'
                    ? isDark
                      ? 'bg-rose-950/20 border-rose-800/40 hover:border-rose-600/50'
                      : 'bg-rose-50 border-rose-200'
                    : n.severity === 'medium'
                    ? isDark
                      ? 'bg-amber-950/20 border-amber-800/40 hover:border-amber-600/50'
                      : 'bg-amber-50 border-amber-200'
                    : isDark
                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                      n.category === 'DUE'
                        ? 'bg-rose-500/20 text-rose-400'
                        : n.category === 'STOCK'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-sky-500/20 text-sky-400'
                    }`}
                  >
                    {n.category === 'DUE' && <Users className="w-4 h-4" />}
                    {n.category === 'STOCK' && <Package className="w-4 h-4" />}
                    {n.category === 'BACKUP' && <CloudAlert className="w-4 h-4" />}
                    {n.category === 'SYNC' && <WifiOff className="w-4 h-4" />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <span>{n.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({n.timestamp})</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{n.message}</p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mt-2" />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs bg-slate-900/50 shrink-0">
          <span className="text-[11px] text-slate-400">
            {notifications.length} active business alert{notifications.length === 1 ? '' : 's'}
          </span>

          <button
            type="button"
            onClick={() => handleNavigate('settings')}
            className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:underline"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configure Notification Limits</span>
          </button>
        </div>
      </div>
    </div>
  );
};
