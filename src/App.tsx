import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TopBar } from './components/common/TopBar';
import { BottomNav } from './components/common/BottomNav';
import { DrawerMenu } from './components/common/DrawerMenu';
import { Toast } from './components/common/Toast';

// Screens
import { DashboardScreen } from './components/screens/DashboardScreen';
import { CustomersScreen } from './components/screens/CustomersScreen';
import { FastMilkEntryScreen } from './components/screens/FastMilkEntryScreen';
import { ChallansScreen } from './components/screens/ChallansScreen';
import { ChallanScannerScreen } from './components/screens/ChallanScannerScreen';
import { RegisterScannerScreen } from './components/screens/RegisterScannerScreen';
import { PartySummaryScreen } from './components/screens/PartySummaryScreen';
import { StockScreen } from './components/screens/StockScreen';
import { PurchaseScreen } from './components/screens/PurchaseScreen';
import { ProductsScreen } from './components/screens/ProductsScreen';
import { BillingScreen } from './components/screens/BillingScreen';
import { PaymentsScreen } from './components/screens/PaymentsScreen';
import { BankCashScreen } from './components/screens/BankCashScreen';
import { ExpensesScreen } from './components/screens/ExpensesScreen';
import { ReportsScreen } from './components/screens/ReportsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { KhaliCrateScreen } from './components/screens/KhaliCrateScreen';
import { ExcelHubModal } from './components/common/ExcelHubModal';
import { NotificationsCenterModal } from './components/common/NotificationsCenterModal';
import { AppLockOverlay } from './components/common/AppLockOverlay';

const MainAppContent: React.FC = () => {
  const {
    activeScreen,
    theme,
    isExcelModalOpen,
    closeExcelModal,
    excelModalTab,
    isNotificationsModalOpen,
    closeNotificationsModal,
  } = useApp();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isDark = theme === 'dark';

  // Dynamic screen resolver
  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'customers':
        return <CustomersScreen />;
      case 'fast_entry':
        return <FastMilkEntryScreen />;
      case 'challans':
        return <ChallansScreen />;
      case 'challan_scanner':
        return <ChallanScannerScreen />;
      case 'register_scanner':
        return <RegisterScannerScreen />;
      case 'party_summary':
        return <PartySummaryScreen />;
      case 'stock':
        return <StockScreen />;
      case 'purchase':
        return <PurchaseScreen />;
      case 'products':
        return <ProductsScreen />;
      case 'billing':
        return <BillingScreen />;
      case 'payments':
        return <PaymentsScreen />;
      case 'bank_cash':
        return <BankCashScreen />;
      case 'expenses':
        return <ExpensesScreen />;
      case 'reports':
        return <ReportsScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'khali_crate':
        return <KhaliCrateScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div
      id="royal-erp-root-container"
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDark ? 'bg-[#0B1528] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top App Header with back button, shifts, date, and menu */}
      <TopBar onOpenMenu={() => setIsDrawerOpen(true)} />

      {/* Main View Area */}
      <main className="flex-1 w-full overflow-y-auto overflow-x-hidden">
        {renderScreen()}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav onOpenMenu={() => setIsDrawerOpen(true)} />

      {/* Drawer Menu */}
      <DrawerMenu isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Global Status Toast */}
      <Toast />

      {/* Global Excel Export & Import Hub Modal */}
      <ExcelHubModal
        isOpen={isExcelModalOpen}
        initialTab={excelModalTab}
        onClose={closeExcelModal}
      />

      {/* Global Business Alerts & Notifications Center Modal */}
      <NotificationsCenterModal
        isOpen={isNotificationsModalOpen}
        onClose={closeNotificationsModal}
      />

      {/* Security App Lock PIN Overlay */}
      <AppLockOverlay />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
