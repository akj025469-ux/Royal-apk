import * as XLSX from 'xlsx';
import {
  Customer,
  Product,
  MilkEntry,
  Challan,
  Purchase,
  Payment,
  Expense,
  BankCashSession,
  Bill,
} from '../types';

export interface ExcelImportResult {
  type: 'CUSTOMERS' | 'PRODUCTS' | 'CUSTOMER_RATES' | 'UNKNOWN';
  totalRows: number;
  validRows: Record<string, unknown>[];
  errors: { row: number; field: string; message: string; rawData: Record<string, unknown> }[];
  summary: {
    imported: number;
    updated: number;
    skipped: number;
    errors: number;
  };
}

export class ExcelService {
  /**
   * Helper to write workbook and trigger file download
   */
  private saveWorkbook(wb: XLSX.WorkBook, filename: string) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }

  // 1. Export Customers
  exportCustomers(customers: Customer[], filename?: string) {
    const data = customers.map((c, i) => ({
      'Sr. No': i + 1,
      'Customer ID': c.id,
      'Customer Name': c.name,
      'Mobile Phone': c.phone,
      'Delivery Route': c.route,
      'Address': c.address,
      'Opening Balance (₹)': c.openingBalance,
      'Active Status': c.isActive ? 'Active' : 'Inactive',
      'Created Date': c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    this.saveWorkbook(wb, filename || `ROYAL_ERP_Customers_${new Date().toISOString().slice(0, 10)}`);
  }

  // 2. Export Products
  exportProducts(products: Product[], filename?: string) {
    const data = products.map((p, i) => ({
      'Sr. No': i + 1,
      'Product Code': p.code,
      'Product Name': p.name,
      'Pack Size': p.packSize || '',
      'Category': p.category,
      'Unit': p.unit,
      'Pouches Per Crate': p.pouchesPerCrate || p.unitsPerCrate || 24,
      'Default Wholesale Rate (₹)': p.defaultWholesaleRate || p.defaultRate || 0,
      'MRP (₹)': p.mrp || 0,
      'Active Status': p.isActive ? 'Active' : 'Inactive',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    this.saveWorkbook(wb, filename || `ROYAL_ERP_Products_${new Date().toISOString().slice(0, 10)}`);
  }

  // 3. Export Customer Rates
  exportCustomerRates(customers: Customer[], products: Product[], filename?: string) {
    const rows: Record<string, unknown>[] = [];
    customers.forEach((c) => {
      products.forEach((p) => {
        const customRate = c.customRates?.[p.id];
        const defaultRate = p.defaultWholesaleRate || p.defaultRate || 0;
        const finalRate = customRate !== undefined ? customRate : defaultRate;
        rows.push({
          'Customer ID': c.id,
          'Customer Name': c.name,
          'Route': c.route,
          'Product Code': p.code,
          'Product Name': p.name,
          'Standard Default Rate (₹)': defaultRate,
          'Custom Special Rate (₹)': customRate !== undefined ? customRate : 'Default Used',
          'Effective Rate (₹)': finalRate,
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer_Rates');
    this.saveWorkbook(wb, filename || `ROYAL_ERP_Customer_Rates_${new Date().toISOString().slice(0, 10)}`);
  }

  // 4. Export Milk Entries
  exportMilkEntries(entries: MilkEntry[], startDate?: string, endDate?: string, filename?: string) {
    let filtered = entries;
    if (startDate) filtered = filtered.filter((e) => e.date >= startDate);
    if (endDate) filtered = filtered.filter((e) => e.date <= endDate);

    const rows: Record<string, unknown>[] = [];
    filtered.forEach((e) => {
      e.items.forEach((item) => {
        rows.push({
          'Entry ID': e.id,
          'Date': e.date,
          'Shift': e.shift,
          'Customer Name': e.customerName,
          'Product Code': item.productCode,
          'Product Name': item.productName,
          'Quantity (Pouches)': item.quantity,
          'Rate (₹)': item.rate,
          'Amount (₹)': item.amount,
          'Total Entry Amount (₹)': e.totalAmount,
          'Notes': e.notes || '',
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Milk_Entries');
    this.saveWorkbook(wb, filename || `ROYAL_ERP_Milk_Entries_${new Date().toISOString().slice(0, 10)}`);
  }

  // 5. Export Customer Ledger
  exportCustomerLedger(
    customer: Customer,
    milkEntries: MilkEntry[],
    payments: Payment[],
    bills: Bill[],
    startDate?: string,
    endDate?: string,
    filename?: string
  ) {
    interface LedgerTxn {
      date: string;
      description: string;
      debit: number; // milk charges
      credit: number; // payments
      balance: number;
    }

    let runningBalance = customer.openingBalance || 0;
    const txns: LedgerTxn[] = [
      {
        date: customer.createdAt?.slice(0, 10) || 'Opening',
        description: 'Opening Balance',
        debit: customer.openingBalance > 0 ? customer.openingBalance : 0,
        credit: customer.openingBalance < 0 ? Math.abs(customer.openingBalance) : 0,
        balance: runningBalance,
      },
    ];

    const customerEntries = milkEntries.filter((e) => e.customerId === customer.id);
    const customerPayments = payments.filter((p) => p.customerId === customer.id);

    // Combine and sort by date
    interface UnifiedItem {
      date: string;
      type: 'MILK' | 'PAYMENT';
      desc: string;
      amount: number;
      mode?: string;
    }

    const combined: UnifiedItem[] = [];
    customerEntries.forEach((e) => {
      combined.push({
        date: e.date,
        type: 'MILK',
        desc: `${e.shift} Milk (${e.totalQuantity} units)`,
        amount: e.totalAmount,
      });
    });

    customerPayments.forEach((p) => {
      combined.push({
        date: p.date,
        type: 'PAYMENT',
        desc: `Payment Received (${p.mode}${p.reference ? ' - ' + p.reference : ''})`,
        amount: p.amount,
        mode: p.mode,
      });
    });

    combined.sort((a, b) => a.date.localeCompare(b.date));

    combined.forEach((item) => {
      if (startDate && item.date < startDate) return;
      if (endDate && item.date > endDate) return;

      if (item.type === 'MILK') {
        runningBalance += item.amount;
        txns.push({
          date: item.date,
          description: item.desc,
          debit: item.amount,
          credit: 0,
          balance: runningBalance,
        });
      } else {
        runningBalance -= item.amount;
        txns.push({
          date: item.date,
          description: item.desc,
          debit: 0,
          credit: item.amount,
          balance: runningBalance,
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(
      txns.map((t, idx) => ({
        'Sr. No': idx + 1,
        'Date': t.date,
        'Description': t.description,
        'Debit / Milk Sale (₹)': t.debit || '',
        'Credit / Payment (₹)': t.credit || '',
        'Closing Balance (₹)': t.balance,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer_Ledger');
    this.saveWorkbook(
      wb,
      filename || `Ledger_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`
    );
  }

  // 6. Export Payments
  exportPayments(payments: Payment[], startDate?: string, endDate?: string, filename?: string) {
    let filtered = payments;
    if (startDate) filtered = filtered.filter((p) => p.date >= startDate);
    if (endDate) filtered = filtered.filter((p) => p.date <= endDate);

    const rows = filtered.map((p, i) => ({
      'Sr. No': i + 1,
      'Date': p.date,
      'Customer Name': p.customerName,
      'Payment Mode': p.mode,
      'Amount Received (₹)': p.amount,
      'Reference No.': p.reference || p.referenceNumber || '',
      'Notes': p.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    this.saveWorkbook(wb, filename || `ROYAL_ERP_Payments_${new Date().toISOString().slice(0, 10)}`);
  }

  // 7. Export Purchases
  exportPurchases(purchases: Purchase[], startDate?: string, endDate?: string, filename?: string) {
    let filtered = purchases;
    if (startDate) filtered = filtered.filter((p) => p.date >= startDate);
    if (endDate) filtered = filtered.filter((p) => p.date <= endDate);

    const rows: Record<string, unknown>[] = [];
    filtered.forEach((p, i) => {
      if (p.items && p.items.length > 0) {
        p.items.forEach((item) => {
          rows.push({
            'Sr. No': rows.length + 1,
            'Purchase ID': p.id,
            'Date': p.date,
            'Supplier / Party': p.supplierName,
            'Invoice / Ref No': p.invoiceNumber || '',
            'Product Code': item.productCode,
            'Product Name': item.productName,
            'Quantity (Units)': item.quantity,
            'Crates': item.crates || '',
            'Rate (₹)': item.purchaseRate,
            'Item Amount (₹)': item.amount,
            'Invoice Total (₹)': p.totalAmount,
            'Payment Status': p.paymentStatus,
            'Notes': p.notes || '',
          });
        });
      } else {
        rows.push({
          'Sr. No': rows.length + 1,
          'Purchase ID': p.id,
          'Date': p.date,
          'Supplier / Party': p.supplierName,
          'Invoice / Ref No': p.invoiceNumber || '',
          'Product Code': '-',
          'Product Name': 'Multiple Items',
          'Quantity (Units)': p.totalQuantity || 0,
          'Crates': p.totalCrates || '',
          'Rate (₹)': '-',
          'Item Amount (₹)': p.totalAmount,
          'Invoice Total (₹)': p.totalAmount,
          'Payment Status': p.paymentStatus,
          'Notes': p.notes || '',
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
    this.saveWorkbook(wb, filename || `ROYAL_ERP_Purchases_${new Date().toISOString().slice(0, 10)}`);
  }

  // 8. Export Expenses
  exportExpenses(expenses: Expense[], startDate?: string, endDate?: string, filename?: string) {
    let filtered = expenses;
    if (startDate) filtered = filtered.filter((e) => e.date >= startDate);
    if (endDate) filtered = filtered.filter((e) => e.date <= endDate);

    const rows = filtered.map((e, i) => ({
      'Sr. No': i + 1,
      'Date': e.date,
      'Category': e.category,
      'Title / Description': e.title,
      'Payment Mode': e.paymentMode || e.mode || 'CASH',
      'Amount (₹)': e.amount,
      'Notes': e.note || e.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    this.saveWorkbook(wb, filename || `ROYAL_ERP_Expenses_${new Date().toISOString().slice(0, 10)}`);
  }

  // 9. Export Stock
  exportStock(
    products: Product[],
    stockCalculations: Record<string, { opening: number; inQty: number; outQty: number; currentQty: number; crates: number }>,
    filename?: string
  ) {
    const rows = products.map((p, i) => {
      const s = stockCalculations[p.id] || { opening: 0, inQty: 0, outQty: 0, currentQty: 0, crates: 0 };
      const pouchesPerCrate = p.pouchesPerCrate || p.unitsPerCrate || 24;
      const crates = (s.currentQty / pouchesPerCrate).toFixed(1);
      return {
        'Sr. No': i + 1,
        'Product Code': p.code,
        'Product Name': p.name,
        'Unit': p.unit,
        'Pouches/Crate': pouchesPerCrate,
        'Stock Received / In': s.inQty,
        'Stock Dispatched / Out': s.outQty,
        'Current Stock (Units)': s.currentQty,
        'Current Stock (Crates)': crates,
        'Valuation at MRP (₹)': (s.currentQty * (p.mrp || 0)).toFixed(2),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Live_Stock');
    this.saveWorkbook(wb, filename || `ROYAL_ERP_Stock_${new Date().toISOString().slice(0, 10)}`);
  }

  // 10. Export Challans
  exportChallans(challans: Challan[], startDate?: string, endDate?: string, filename?: string) {
    let filtered = challans;
    if (startDate) filtered = filtered.filter((c) => c.date >= startDate);
    if (endDate) filtered = filtered.filter((c) => c.date <= endDate);

    const rows = filtered.map((c, i) => ({
      'Sr. No': i + 1,
      'Challan Date': c.date,
      'Shift': c.shift,
      'D.C. / Challan No': c.challanNumber,
      'Party / Ship To': c.partyName,
      'Vehicle No': c.vehicleNumber || '',
      'Total Crates': c.totalCrates,
      'Total Quantity': c.totalQuantity,
      'Basic Amount (₹)': c.basicAmount || '',
      'Tax Amount (₹)': c.taxAmount || '',
      'Freight (₹)': c.freight || 0,
      'Net Invoice Amount (₹)': c.netAmount,
      'Bank Settled': c.isSettled ? 'YES' : 'NO',
      'Settled Date': c.settledAt ? new Date(c.settledAt).toLocaleDateString('en-IN') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Challans');
    this.saveWorkbook(wb, filename || `ROYAL_ERP_Challans_${new Date().toISOString().slice(0, 10)}`);
  }

  // 11. Export Party Summary
  exportPartySummary(challans: Challan[], filename?: string) {
    const summaryMap: Record<string, { party: string; count: number; crates: number; totalQty: number; netAmount: number; settledAmount: number; pendingAmount: number }> = {};

    challans.forEach((c) => {
      const party = c.partyName || 'Unknown Party';
      if (!summaryMap[party]) {
        summaryMap[party] = {
          party,
          count: 0,
          crates: 0,
          totalQty: 0,
          netAmount: 0,
          settledAmount: 0,
          pendingAmount: 0,
        };
      }
      summaryMap[party].count += 1;
      summaryMap[party].crates += Number(c.totalCrates || 0);
      summaryMap[party].totalQty += Number(c.totalQuantity || 0);
      summaryMap[party].netAmount += Number(c.netAmount || 0);
      if (c.isSettled) {
        summaryMap[party].settledAmount += Number(c.netAmount || 0);
      } else {
        summaryMap[party].pendingAmount += Number(c.netAmount || 0);
      }
    });

    const rows = Object.values(summaryMap).map((s, i) => ({
      'Sr. No': i + 1,
      'Party Name': s.party,
      'Total Challans': s.count,
      'Total Crates': s.crates,
      'Total Pouches': s.totalQty,
      'Total Challan Amount (₹)': s.netAmount,
      'Settled / Deposited (₹)': s.settledAmount,
      'Pending Settlement (₹)': s.pendingAmount,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Party_Summary');
    this.saveWorkbook(wb, filename || `ROYAL_ERP_Party_Summary_${new Date().toISOString().slice(0, 10)}`);
  }

  // 12. Export Bank & Cash Sessions
  exportBankCash(sessions: BankCashSession[], startDate?: string, endDate?: string, filename?: string) {
    let filtered = sessions;
    if (startDate) filtered = filtered.filter((s) => s.date >= startDate);
    if (endDate) filtered = filtered.filter((s) => s.date <= endDate);

    const rows = filtered.map((s, i) => ({
      'Sr. No': i + 1,
      'Date': s.date,
      'Physical Cash Count (₹)': s.totalCashPhysical,
      'System Cash Collected (₹)': s.cashCollected,
      'UPI Collected (₹)': s.upiCollected,
      'Bank Deposited (₹)': s.bankDeposited,
      'Cash Expenses (₹)': s.cashExpenses,
      'Cash Discrepancy (Excess/Short) (₹)': s.difference,
      'Notes': s.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank_Cash_Daybook');
    this.saveWorkbook(wb, filename || `ROYAL_ERP_BankCash_${new Date().toISOString().slice(0, 10)}`);
  }

  // 13. Export Bills
  exportBills(bills: Bill[], startDate?: string, endDate?: string, filename?: string) {
    let filtered = bills;
    if (startDate) filtered = filtered.filter((b) => b.billDate >= startDate);
    if (endDate) filtered = filtered.filter((b) => b.billDate <= endDate);

    const rows = filtered.map((b, i) => ({
      'Sr. No': i + 1,
      'Bill Number': b.billNumber,
      'Bill Date': b.billDate,
      'Billing Period': `${b.fromDate} to ${b.toDate}`,
      'Customer Name': b.customerName,
      'Customer Route': b.customerRoute || '',
      'Milk Amount (₹)': b.milkTotal || b.totalMilkAmount || 0,
      'Previous Balance (₹)': b.previousBalance || 0,
      'Payments Received (₹)': b.paymentsReceived || 0,
      'Net Current Due (₹)': b.currentDue || b.netPayable || 0,
      'Status': b.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bills');
    this.saveWorkbook(wb, filename || `ROYAL_ERP_Bills_${new Date().toISOString().slice(0, 10)}`);
  }

  // 14. Export Outstanding / Dues
  exportOutstandingDues(
    customers: Customer[],
    balances: Record<string, number>,
    filename?: string
  ) {
    const rows = customers
      .map((c) => {
        const balance = balances[c.id] !== undefined ? balances[c.id] : c.openingBalance || 0;
        return {
          'Customer ID': c.id,
          'Customer Name': c.name,
          'Mobile': c.phone,
          'Route': c.route,
          'Current Balance (₹)': balance,
          'Type': balance > 0 ? 'DUE (Receivable)' : balance < 0 ? 'ADVANCE (Payable)' : 'CLEAR',
        };
      })
      .sort((a, b) => b['Current Balance (₹)'] - a['Current Balance (₹)']);

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Outstanding_Dues');
    this.saveWorkbook(wb, filename || `ROYAL_ERP_Outstanding_Dues_${new Date().toISOString().slice(0, 10)}`);
  }

  // 15. Comprehensive Multi-Sheet Master Workbook Export
  exportComprehensiveMasterWorkbook(
    customers: Customer[],
    products: Product[],
    entries: MilkEntry[],
    challans: Challan[],
    purchases: Purchase[],
    payments: Payment[],
    expenses: Expense[],
    bills: Bill[],
    balances: Record<string, number>,
    startDate?: string,
    endDate?: string
  ) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Outstanding
    const outstandingData = customers
      .map((c) => ({
        'Customer Name': c.name,
        'Mobile': c.phone,
        'Route': c.route,
        'Current Balance (₹)': balances[c.id] !== undefined ? balances[c.id] : c.openingBalance,
        'Status': (balances[c.id] || 0) > 0 ? 'DUE' : (balances[c.id] || 0) < 0 ? 'ADVANCE' : 'NIL',
      }))
      .sort((a, b) => b['Current Balance (₹)'] - a['Current Balance (₹)']);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(outstandingData), 'Dues_Summary');

    // Sheet 2: Milk Sales
    let filteredEntries = entries;
    if (startDate) filteredEntries = filteredEntries.filter((e) => e.date >= startDate);
    if (endDate) filteredEntries = filteredEntries.filter((e) => e.date <= endDate);
    const milkData = filteredEntries.flatMap((e) =>
      e.items.map((it) => ({
        Date: e.date,
        Shift: e.shift,
        Customer: e.customerName,
        Product: it.productName,
        Qty: it.quantity,
        Rate: it.rate,
        Amount: it.amount,
      }))
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(milkData), 'Milk_Distribution');

    // Sheet 3: Payments
    let filteredPayments = payments;
    if (startDate) filteredPayments = filteredPayments.filter((p) => p.date >= startDate);
    if (endDate) filteredPayments = filteredPayments.filter((p) => p.date <= endDate);
    const paymentsData = filteredPayments.map((p) => ({
      Date: p.date,
      Customer: p.customerName,
      Mode: p.mode,
      Amount: p.amount,
      Reference: p.reference || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsData), 'Payments');

    // Sheet 4: Challans
    let filteredChallans = challans;
    if (startDate) filteredChallans = filteredChallans.filter((c) => c.date >= startDate);
    if (endDate) filteredChallans = filteredChallans.filter((c) => c.date <= endDate);
    const challanData = filteredChallans.map((c) => ({
      Date: c.date,
      ChallanNo: c.challanNumber,
      Party: c.partyName,
      Crates: c.totalCrates,
      NetQuantity: c.totalQuantity,
      NetAmount: c.netAmount,
      Settled: c.isSettled ? 'YES' : 'NO',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(challanData), 'Challans');

    // Sheet 5: Purchases
    let filteredPurchases = purchases;
    if (startDate) filteredPurchases = filteredPurchases.filter((p) => p.date >= startDate);
    if (endDate) filteredPurchases = filteredPurchases.filter((p) => p.date <= endDate);
    const purchasesData = filteredPurchases.flatMap((p) =>
      p.items && p.items.length > 0
        ? p.items.map((it) => ({
            Date: p.date,
            Supplier: p.supplierName,
            InvoiceNo: p.invoiceNumber || '',
            Product: it.productName,
            Qty: it.quantity,
            Rate: it.purchaseRate,
            Amount: it.amount,
            Status: p.paymentStatus,
          }))
        : [
            {
              Date: p.date,
              Supplier: p.supplierName,
              InvoiceNo: p.invoiceNumber || '',
              Product: 'Multiple Items',
              Qty: p.totalQuantity || 0,
              Rate: 0,
              Amount: p.totalAmount,
              Status: p.paymentStatus,
            },
          ]
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchasesData), 'Purchases');

    // Sheet 6: Expenses
    let filteredExpenses = expenses;
    if (startDate) filteredExpenses = filteredExpenses.filter((e) => e.date >= startDate);
    if (endDate) filteredExpenses = filteredExpenses.filter((e) => e.date <= endDate);
    const expenseData = filteredExpenses.map((e) => ({
      Date: e.date,
      Category: e.category,
      Title: e.title,
      Mode: e.paymentMode || e.mode || 'CASH',
      Amount: e.amount,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseData), 'Expenses');

    // Sheet 7: Customers
    const customerList = customers.map((c) => ({
      Name: c.name,
      Phone: c.phone,
      Route: c.route,
      Address: c.address,
      OpeningBal: c.openingBalance,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customerList), 'Customers_List');

    // Sheet 8: Products
    const productList = products.map((p) => ({
      Code: p.code,
      Name: p.name,
      Category: p.category,
      Unit: p.unit,
      CrateSize: p.pouchesPerCrate || 24,
      Rate: p.defaultWholesaleRate || 0,
      MRP: p.mrp || 0,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productList), 'Products_List');

    this.saveWorkbook(wb, `ROYAL_ERP_COMPLETE_BACKUP_${new Date().toISOString().slice(0, 10)}`);
  }

  // ==========================================
  // EXCEL IMPORT ENGINE
  // ==========================================

  /**
   * Reads an uploaded Excel file, inspects sheets & columns,
   * validates required data and returns a preview report with error breakdown.
   */
  async parseAndValidateExcel(
    file: File,
    existingCustomers: Customer[],
    existingProducts: Product[]
  ): Promise<ExcelImportResult> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Excel workbook contains no sheets.');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      throw new Error('Excel sheet is empty. No data rows found.');
    }

    // Detect type by column signatures
    const sample = rawRows[0] || {};
    const keys = Object.keys(sample).map((k) => k.toLowerCase().trim());

    const isCustomerRates =
      keys.some((k) => k.includes('custom') || k.includes('rate') || k.includes('effective')) &&
      keys.some((k) => k.includes('customer') || k.includes('party')) &&
      keys.some((k) => k.includes('product') || k.includes('code'));

    const isProduct =
      !isCustomerRates &&
      (keys.some((k) => k.includes('product code') || k.includes('mrp') || k.includes('crate') || k.includes('pouches')) ||
        (keys.some((k) => k.includes('code')) && keys.some((k) => k.includes('unit'))));

    const isCustomer =
      !isCustomerRates &&
      !isProduct &&
      (keys.some((k) => k.includes('customer') || k.includes('client') || k.includes('phone') || k.includes('mobile') || k.includes('route')));

    const importType: 'CUSTOMERS' | 'PRODUCTS' | 'CUSTOMER_RATES' | 'UNKNOWN' = isCustomerRates
      ? 'CUSTOMER_RATES'
      : isProduct
      ? 'PRODUCTS'
      : isCustomer
      ? 'CUSTOMERS'
      : 'UNKNOWN';

    if (importType === 'UNKNOWN') {
      throw new Error(
        'Unable to automatically detect format. Please ensure headers match Customers (Name, Mobile, Route), Products (Code, Name, Rate, MRP) or Customer Rates.'
      );
    }

    const validRows: Record<string, unknown>[] = [];
    const errors: { row: number; field: string; message: string; rawData: Record<string, unknown> }[] = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    if (importType === 'CUSTOMERS') {
      rawRows.forEach((row, idx) => {
        const rowNum = idx + 2; // header is row 1
        const name = (
          row['Customer Name'] ||
          row['name'] ||
          row['Customer'] ||
          row['Party Name'] ||
          row['Customer_Name'] ||
          ''
        )
          .toString()
          .trim();
        const phone = (row['Mobile Phone'] || row['phone'] || row['Mobile'] || row['Contact'] || '')
          .toString()
          .trim();
        const route = (row['Delivery Route'] || row['route'] || row['Route'] || 'General Route')
          .toString()
          .trim();
        const address = (row['Address'] || row['address'] || '').toString().trim();
        const rawBal = row['Opening Balance (₹)'] || row['Opening Balance'] || row['Balance'] || 0;
        const openingBalance = isNaN(Number(rawBal)) ? 0 : Number(rawBal);

        if (!name) {
          errors.push({ row: rowNum, field: 'Customer Name', message: 'Customer name is required', rawData: row });
          return;
        }

        // Check if existing customer matches name or phone
        const existing = existingCustomers.find(
          (c) =>
            c.name.toLowerCase() === name.toLowerCase() ||
            (phone && c.phone && c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))
        );

        if (existing) {
          updated++;
          validRows.push({
            id: existing.id,
            name,
            phone: phone || existing.phone,
            route: route || existing.route,
            address: address || existing.address,
            openingBalance: existing.openingBalance, // Keep existing opening balance to avoid corrupting historical ledgers!
            isUpdate: true,
          });
        } else {
          imported++;
          validRows.push({
            name,
            phone,
            route,
            address,
            openingBalance,
            isUpdate: false,
          });
        }
      });
    } else if (importType === 'PRODUCTS') {
      rawRows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const code = (row['Product Code'] || row['code'] || row['Code'] || '').toString().trim().toUpperCase();
        const name = (row['Product Name'] || row['name'] || row['Product'] || '').toString().trim();
        const packSize = (row['Pack Size'] || row['packSize'] || '500ml').toString().trim();
        const categoryRaw = (row['Category'] || 'MILK').toString().toUpperCase().trim();
        const category = ['MILK', 'CURD', 'PANEER', 'BEVERAGE', 'OTHER'].includes(categoryRaw)
          ? categoryRaw
          : 'MILK';
        const unitRaw = (row['Unit'] || 'pouch').toString().toLowerCase().trim();
        const unit = ['pouch', 'liter', 'kg', 'packet'].includes(unitRaw) ? unitRaw : 'pouch';
        const cratesRaw = row['Pouches Per Crate'] || row['pouchesPerCrate'] || row['Crate Size'] || 24;
        const pouchesPerCrate = isNaN(Number(cratesRaw)) ? 24 : Number(cratesRaw);
        const rateRaw = row['Default Wholesale Rate (₹)'] || row['Rate'] || row['Wholesale Rate'] || 0;
        const defaultRate = isNaN(Number(rateRaw)) ? 0 : Number(rateRaw);
        const mrpRaw = row['MRP (₹)'] || row['MRP'] || defaultRate;
        const mrp = isNaN(Number(mrpRaw)) ? defaultRate : Number(mrpRaw);

        if (!name) {
          errors.push({ row: rowNum, field: 'Product Name', message: 'Product name is required', rawData: row });
          return;
        }
        if (!code) {
          errors.push({ row: rowNum, field: 'Product Code', message: 'Product code is required', rawData: row });
          return;
        }

        const existing = existingProducts.find(
          (p) => p.code.toUpperCase() === code || p.name.toLowerCase() === name.toLowerCase()
        );

        if (existing) {
          updated++;
          validRows.push({
            id: existing.id,
            code,
            name,
            packSize,
            category,
            unit,
            pouchesPerCrate,
            defaultWholesaleRate: defaultRate || existing.defaultWholesaleRate,
            mrp: mrp || existing.mrp,
            isUpdate: true,
          });
        } else {
          imported++;
          validRows.push({
            code,
            name,
            packSize,
            category,
            unit,
            pouchesPerCrate,
            defaultWholesaleRate: defaultRate,
            mrp,
            isUpdate: false,
          });
        }
      });
    } else if (importType === 'CUSTOMER_RATES') {
      rawRows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const custName = (row['Customer Name'] || row['Customer'] || '').toString().trim();
        const prodCode = (row['Product Code'] || row['Code'] || '').toString().trim().toUpperCase();
        const prodName = (row['Product Name'] || row['Product'] || '').toString().trim();
        const rateRaw = row['Custom Special Rate (₹)'] || row['Special Rate'] || row['Rate'] || row['Effective Rate (₹)'] || 0;
        const rate = isNaN(Number(rateRaw)) ? 0 : Number(rateRaw);

        const customer = existingCustomers.find(
          (c) => c.name.toLowerCase() === custName.toLowerCase()
        );
        const product = existingProducts.find(
          (p) =>
            (prodCode && p.code.toUpperCase() === prodCode) ||
            (prodName && p.name.toLowerCase() === prodName.toLowerCase())
        );

        if (!customer) {
          errors.push({
            row: rowNum,
            field: 'Customer Name',
            message: `Customer "${custName}" not found in database`,
            rawData: row,
          });
          return;
        }

        if (!product) {
          errors.push({
            row: rowNum,
            field: 'Product',
            message: `Product "${prodCode || prodName}" not found in database`,
            rawData: row,
          });
          return;
        }

        if (rate <= 0) {
          skipped++;
          return;
        }

        validRows.push({
          customerId: customer.id,
          customerName: customer.name,
          productId: product.id,
          productName: product.name,
          rate,
        });
        updated++;
      });
    }

    return {
      type: importType,
      totalRows: rawRows.length,
      validRows,
      errors,
      summary: {
        imported,
        updated,
        skipped,
        errors: errors.length,
      },
    };
  }

  /**
   * Generates blank downloadable Excel template for users to fill in
   */
  generateSampleTemplate(type: 'CUSTOMERS' | 'PRODUCTS' | 'CUSTOMER_RATES') {
    const wb = XLSX.utils.book_new();
    if (type === 'CUSTOMERS') {
      const data = [
        {
          'Customer Name': 'Sharma Milk Parlour',
          'Mobile Phone': '9811223344',
          'Delivery Route': 'Route 1 - Main Market',
          'Address': 'Shop No 14, Main Road',
          'Opening Balance (₹)': 500,
        },
        {
          'Customer Name': 'Gupta Tea Stall',
          'Mobile Phone': '9899112233',
          'Delivery Route': 'Route 2 - Station Line',
          'Address': 'Opposite Station Gate 2',
          'Opening Balance (₹)': 0,
        },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Customers_Template');
      this.saveWorkbook(wb, 'ROYAL_ERP_Customers_Sample_Template');
    } else if (type === 'PRODUCTS') {
      const data = [
        {
          'Product Code': 'GD',
          'Product Name': 'Amul Gold 500ml',
          'Pack Size': '500ml',
          'Category': 'MILK',
          'Unit': 'pouch',
          'Pouches Per Crate': 24,
          'Default Wholesale Rate (₹)': 33.0,
          'MRP (₹)': 34.0,
        },
        {
          'Product Code': 'TM',
          'Product Name': 'Amul Taaza 500ml',
          'Pack Size': '500ml',
          'Category': 'MILK',
          'Unit': 'pouch',
          'Pouches Per Crate': 24,
          'Default Wholesale Rate (₹)': 26.5,
          'MRP (₹)': 27.0,
        },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Products_Template');
      this.saveWorkbook(wb, 'ROYAL_ERP_Products_Sample_Template');
    } else {
      const data = [
        {
          'Customer Name': 'Sharma Milk Parlour',
          'Product Code': 'GD',
          'Product Name': 'Amul Gold 500ml',
          'Custom Special Rate (₹)': 32.5,
        },
        {
          'Customer Name': 'Gupta Tea Stall',
          'Product Code': 'TM',
          'Product Name': 'Amul Taaza 500ml',
          'Custom Special Rate (₹)': 26.0,
        },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Rates_Template');
      this.saveWorkbook(wb, 'ROYAL_ERP_Customer_Rates_Template');
    }
  }
}

export const excelService = new ExcelService();
