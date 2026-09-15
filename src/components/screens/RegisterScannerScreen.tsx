import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Camera,
  Image as ImageIcon,
  ScanLine,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Tag,
  FileCheck,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  AlertCircle,
  X,
  UserPlus,
  UserCheck,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MilkEntry, MilkEntryItem, Payment, Shift, Customer } from '../../types';

interface RegisterRow {
  id: string;
  date: string;
  customerName: string;
  customerId: string; // Linked customer ID or 'NEW'
  productCode: string;
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  amount: number;
  paymentCollected: number;
  balance?: number;
  shift: Shift;
  confidence: 'high' | 'medium' | 'low';
}

// Client-side image optimization for fast upload and preventing PayloadTooLarge errors
function optimizeImageForOCR(dataUrl: string, maxDim = 2048, quality = 0.88): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        return resolve(dataUrl);
      }
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const RegisterScannerScreen: React.FC = () => {
  const {
    products,
    customers,
    saveCustomer,
    saveMilkEntry,
    savePayment,
    selectedDate,
    activeShift,
    settings,
    updateSettings,
    theme,
    navigateTo,
    showToast,
  } = useApp();

  const isDark = theme === 'dark';

  // Separate refs for Camera vs Gallery
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Live Camera state
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Workflow steps: 'intake' | 'scanning' | 'review' | 'error'
  const [step, setStep] = useState<'intake' | 'scanning' | 'review' | 'error'>('intake');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Image handling
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState<boolean>(false);

  // Default short-form mappings
  const [mappings, setMappings] = useState<Record<string, string>>(
    settings.shortFormMappings || {
      FC: 'Amul Gold (Full Cream)',
      GD: 'Amul Gold',
      TM: 'Amul Taaza (Toned)',
      DT: 'Amul DTM',
      CM: 'Amul Cow Milk',
      BM: 'Amul Buffalo Milk',
      MT: 'Amul Moti',
      CH: 'Amul Chaas',
    }
  );
  const [showMappingsModal, setShowMappingsModal] = useState(false);
  const [newShortcutCode, setNewShortcutCode] = useState('');
  const [newShortcutTarget, setNewShortcutTarget] = useState('');

  // Quick Customer Creation Modal
  const [quickCustomerModalRowIdx, setQuickCustomerModalRowIdx] = useState<number | null>(null);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');

  // Recognized Review Rows
  const [rows, setRows] = useState<RegisterRow[]>([
    {
      id: 'r_1',
      date: selectedDate,
      customerName: customers[0]?.name || 'Radhe Tea Stall',
      customerId: customers[0]?.id || '',
      productCode: 'GD',
      productId: products[0]?.id || '',
      productName: products[0]?.name || 'Amul Gold 500ml',
      quantity: 10,
      rate: products[0]?.defaultWholesaleRate || 33,
      amount: 330,
      paymentCollected: 300,
      shift: activeShift,
      confidence: 'high',
    },
  ]);

  const [ocrConfidence, setOcrConfidence] = useState<'high' | 'medium' | 'low'>('medium');
  const [isSaving, setIsSaving] = useState(false);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (liveStream) {
        liveStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [liveStream]);

  // CAMERA INTAKE
  const triggerCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        setLiveStream(stream);
        setIsLiveCameraOpen(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        return;
      } catch (err) {
        console.warn('In-app camera fallback:', err);
      }
    }
    cameraInputRef.current?.click();
  };

  const captureLiveCameraSnapshot = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        if (liveStream) {
          liveStream.getTracks().forEach((t) => t.stop());
          setLiveStream(null);
        }
        setIsLiveCameraOpen(false);
        setPreviewImage(dataUrl);
        setRotationDegrees(0);
        setZoomScale(1);
        runRegisterOCR(dataUrl);
      }
    }
  };

  const closeLiveCamera = () => {
    if (liveStream) {
      liveStream.getTracks().forEach((t) => t.stop());
      setLiveStream(null);
    }
    setIsLiveCameraOpen(false);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPreviewImage(dataUrl);
        setRotationDegrees(0);
        setZoomScale(1);
        runRegisterOCR(dataUrl);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  // GALLERY INTAKE (NEVER triggers camera!)
  const triggerGallery = () => {
    galleryInputRef.current?.click();
  };

  const handleGalleryPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPreviewImage(dataUrl);
        setRotationDegrees(0);
        setZoomScale(1);
        runRegisterOCR(dataUrl);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  // Rotate image 90 degrees
  const handleRotateImage = () => {
    if (!previewImage) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        const rotatedData = canvas.toDataURL('image/jpeg', 0.95);
        setPreviewImage(rotatedData);
        setRotationDegrees((prev) => (prev + 90) % 360);
      }
    };
    img.src = previewImage;
  };

  // RUN REAL OCR FOR HANDWRITTEN REGISTER
  const runRegisterOCR = async (imageBase64: string, isAutoRetry = false) => {
    setStep('scanning');
    setErrorMessage('');

    try {
      // Optimize image resolution and size for reliable transfer and fast OCR
      const optimizedBase64 = await optimizeImageForOCR(imageBase64);

      const response = await fetch('/api/ocr/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          imageBase64: optimizedBase64,
          mimeType: 'image/jpeg',
          shortFormMappings: mappings,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text().catch(() => '');
        const isWarmup =
          text.includes('Starting Server') ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504;

        if (isWarmup && !isAutoRetry) {
          console.warn('[Register OCR] Server is warming up. Retrying in 2 seconds...');
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return runRegisterOCR(imageBase64, true);
        }

        setErrorMessage(
          response.status === 413
            ? 'The image file is too large. Please take a photo with standard resolution or try again.'
            : isWarmup
            ? 'Server is starting up. Please tap Try Again in a few moments or enter manually.'
            : 'Recognition service temporarily unavailable. Please try again or enter manually.'
        );
        setStep('error');
        return;
      }

      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        setErrorMessage(
          result?.message || 'Could not read enough information. Please enter the details manually.'
        );
        setStep('error');
        return;
      }

      const d = result.data;
      if (!Array.isArray(d.rows) || d.rows.length === 0) {
        setErrorMessage('Could not read enough information. Please enter the details manually.');
        setStep('error');
        return;
      }

      // Map rows against existing Customers & Products
      const parsedRows: RegisterRow[] = d.rows.map((r: any, idx: number) => {
        const rawCustName = (r.customerName || '').trim();

        // Find customer in database (fuzzy / case-insensitive)
        const matchedCust = customers.find(
          (c) =>
            c.name.toLowerCase() === rawCustName.toLowerCase() ||
            c.name.toLowerCase().includes(rawCustName.toLowerCase()) ||
            rawCustName.toLowerCase().includes(c.name.toLowerCase())
        );

        // Map short code to registered product
        const codeUpper = (r.productCode || '').toUpperCase().trim();
        let matchedProd = products.find(
          (p) =>
            p.code.toUpperCase() === codeUpper ||
            (codeUpper === 'FC' && p.code === 'GD') ||
            p.name.toLowerCase().includes((r.productName || '').toLowerCase())
        );
        if (!matchedProd) {
          matchedProd = products[0];
        }

        // Customer-specific rate or default
        const custRate =
          matchedCust?.customRates?.[matchedProd.id] ??
          matchedCust?.customRates?.[matchedProd.code] ??
          matchedProd.defaultWholesaleRate;

        const qty = Number(r.quantity) || 1;
        const rate = Number(r.rate) > 0 ? Number(r.rate) : custRate;
        const amt = Number(r.amount) > 0 ? Number(r.amount) : qty * rate;
        const payment = Number(r.paymentCollected) || 0;

        return {
          id: `row_${Date.now()}_${idx}`,
          date: r.date || d.detectedDate || selectedDate,
          customerName: matchedCust ? matchedCust.name : rawCustName || `Customer ${idx + 1}`,
          customerId: matchedCust ? matchedCust.id : '',
          productCode: matchedProd.code,
          productId: matchedProd.id,
          productName: matchedProd.name,
          quantity: qty,
          rate,
          amount: amt,
          paymentCollected: payment,
          balance: r.balance !== undefined ? Number(r.balance) : undefined,
          shift: (r.shift === 'PM' || d.detectedShift === 'PM' ? 'PM' : 'AM') as Shift,
          confidence: r.confidence || 'medium',
        };
      });

      setRows(parsedRows);
      setOcrConfidence(d.confidence || 'medium');
      setStep('review');
      showToast(`Recognized ${parsedRows.length} register entries. Please review.`);
    } catch (err) {
      console.error('Register OCR Error:', err);
      setErrorMessage('Internet connection required for advanced recognition.');
      setStep('error');
    }
  };

  // Row operations
  const updateRow = (idx: number, field: keyof RegisterRow, val: any) => {
    setRows((prev) => {
      const copy = [...prev];
      const current = { ...copy[idx], [field]: val };

      if (field === 'customerId') {
        const cust = customers.find((c) => c.id === val);
        if (cust) {
          current.customerName = cust.name;
          // Recalculate customer rate
          const rate = cust.customRates?.[current.productId] ?? current.rate;
          current.rate = rate;
          current.amount = current.quantity * rate;
        }
      } else if (field === 'productId') {
        const p = products.find((pr) => pr.id === val);
        if (p) {
          current.productCode = p.code;
          current.productName = p.name;
          const cust = customers.find((c) => c.id === current.customerId);
          current.rate = cust?.customRates?.[p.id] ?? p.defaultWholesaleRate;
          current.amount = current.quantity * current.rate;
        }
      } else if (field === 'quantity' || field === 'rate') {
        current.amount = (Number(current.quantity) || 0) * (Number(current.rate) || 0);
      }

      copy[idx] = current;
      return copy;
    });
  };

  const addRow = () => {
    const p = products[0];
    const c = customers[0];
    setRows((prev) => [
      ...prev,
      {
        id: `row_${Date.now()}_${prev.length}`,
        date: selectedDate,
        customerName: c?.name || 'Customer Name',
        customerId: c?.id || '',
        productCode: p?.code || 'GD',
        productId: p?.id || '',
        productName: p?.name || 'Amul Gold 500ml',
        quantity: 12,
        rate: p?.defaultWholesaleRate || 33,
        amount: 12 * (p?.defaultWholesaleRate || 33),
        paymentCollected: 0,
        shift: activeShift,
        confidence: 'high',
      },
    ]);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // Quick Customer Creation inline
  const openQuickCustomerModal = (rowIdx: number) => {
    setQuickCustomerModalRowIdx(rowIdx);
    setQuickCustName(rows[rowIdx].customerName || '');
    setQuickCustPhone('');
  };

  const saveQuickCustomer = async () => {
    if (!quickCustName.trim()) {
      showToast('Please enter customer name', 'warning');
      return;
    }

    const newCust: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: quickCustName.trim(),
      phone: quickCustPhone.trim() || '',
      address: '',
      route: 'General',
      openingBalance: 0,
      isActive: true,
      customRates: {},
      createdAt: new Date().toISOString(),
    };

    await saveCustomer(newCust);
    if (quickCustomerModalRowIdx !== null) {
      updateRow(quickCustomerModalRowIdx, 'customerId', newCust.id);
      updateRow(quickCustomerModalRowIdx, 'customerName', newCust.name);
    }
    setQuickCustomerModalRowIdx(null);
    showToast(`Created & linked customer: ${newCust.name}`);
  };

  // CONFIRM & SAVE INTO THE REAL MILK ENTRY DATABASE
  const handleConfirmAndSave = async () => {
    // Check if any row has missing customer
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].customerId && !rows[i].customerName) {
        showToast(`Row ${i + 1} has no customer specified`, 'warning');
        return;
      }
    }

    setIsSaving(true);
    try {
      // Group rows by customerId + date + shift so each customer gets a consolidated entry
      const groups: Record<string, RegisterRow[]> = {};

      for (const r of rows) {
        let custId = r.customerId;
        // If customer is not linked to an ID, create customer on the fly
        if (!custId) {
          const newCust: Customer = {
            id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: r.customerName.trim() || 'Walk-in Customer',
            phone: '',
            address: '',
            route: 'General',
            openingBalance: 0,
            customRates: {},
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          await saveCustomer(newCust);
          custId = newCust.id;
        }

        const key = `${custId}_${r.date}_${r.shift}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push({ ...r, customerId: custId });
      }

      // Save each group as a real MilkEntry
      let savedCount = 0;
      for (const [key, groupRows] of Object.entries(groups)) {
        const first = groupRows[0];
        const custId = first.customerId;
        const entryDate = first.date || selectedDate;
        const entryShift = first.shift || activeShift;
        const custName = first.customerName || 'Customer';

        const entryItems: MilkEntryItem[] = groupRows.map((gr) => {
          const prod = products.find((p) => p.id === gr.productId) || products[0];
          return {
            productId: prod?.id || gr.productId,
            productCode: prod?.code || gr.productCode,
            productName: prod?.name || gr.productName,
            quantity: gr.quantity,
            rate: gr.rate,
            amount: gr.amount,
          };
        });

        const totalAmt = entryItems.reduce((s, it) => s + it.amount, 0);
        const totalQty = entryItems.reduce((s, it) => s + it.quantity, 0);

        const newEntry: MilkEntry = {
          id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          date: entryDate,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          shift: entryShift,
          customerId: custId,
          customerName: custName,
          items: entryItems,
          totalQuantity: totalQty,
          totalAmount: totalAmt,
          notes: 'Imported from Handwritten Register OCR',
          createdAt: new Date().toISOString(),
        };

        await saveMilkEntry(newEntry);
        savedCount++;

        // Also record any collected payment in real payments table
        const totalPayment = groupRows.reduce((s, gr) => s + (gr.paymentCollected || 0), 0);
        if (totalPayment > 0) {
          const newPayment: Payment = {
            id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            customerId: custId,
            customerName: custName,
            date: entryDate,
            amount: totalPayment,
            mode: 'CASH',
            notes: `Spot collection during register delivery (${entryShift})`,
            createdAt: new Date().toISOString(),
          };
          await savePayment(newPayment);
        }
      }

      showToast(`Successfully saved ${savedCount} customer entries to database!`);
      setTimeout(() => {
        navigateTo('fast_entry');
      }, 1000);
    } catch (err: any) {
      console.error('Error saving register entries:', err);
      showToast('Error saving entries to database', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  // Add / Edit short-form mappings
  const handleSaveNewShortcut = async () => {
    if (!newShortcutCode.trim() || !newShortcutTarget.trim()) {
      showToast('Please enter code and product name', 'warning');
      return;
    }
    const updated = {
      ...mappings,
      [newShortcutCode.trim().toUpperCase()]: newShortcutTarget.trim(),
    };
    setMappings(updated);
    await updateSettings({ shortFormMappings: updated });
    setNewShortcutCode('');
    setNewShortcutTarget('');
    showToast(`Added mapping: ${newShortcutCode.toUpperCase()} -> ${newShortcutTarget}`);
  };

  const handleDeleteShortcut = async (code: string) => {
    const copy = { ...mappings };
    delete copy[code];
    setMappings(copy);
    await updateSettings({ shortFormMappings: copy });
    showToast(`Removed shortcut ${code}`);
  };

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto pb-32">
      {/* Hidden Separate Inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        onChange={handleGalleryPick}
        className="hidden"
      />

      {/* Top Header Controls */}
      <div
        className={`p-4 rounded-3xl border transition-all ${
          isDark
            ? 'bg-[#101D36] border-blue-900/40 text-slate-100 shadow-xl'
            : 'bg-white border-slate-200 text-slate-900 shadow-md'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Handwritten Register OCR
              </span>
              <span className="text-xs text-slate-400">Step 3 Real Recognition</span>
            </div>
            <h2 className="text-lg font-black mt-1">Daily Delivery Register Scanner</h2>
            <p className="text-xs text-slate-400">
              Scan diary pages or notebooks. Separate inputs: Live Camera vs Photo Gallery.
            </p>
          </div>

          {/* Separate Camera and Gallery buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              id="btn-register-camera"
              type="button"
              onClick={triggerCamera}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 shadow-lg shadow-amber-500/20"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
              <span>📷 CAMERA</span>
            </button>

            <button
              id="btn-register-gallery"
              type="button"
              onClick={triggerGallery}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              <ImageIcon className="w-4 h-4 stroke-[2.5]" />
              <span>🖼 GALLERY</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMappingsModal(true)}
              className="p-3 rounded-2xl border border-slate-700 bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
              title="Short-form Mappings"
            >
              <Tag className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Camera Modal */}
      {isLiveCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-between p-4">
          <div className="w-full flex justify-between items-center text-white px-2">
            <span className="text-sm font-bold text-indigo-400">Align Register Page</span>
            <button onClick={closeLiveCamera} className="p-2 rounded-full bg-slate-800 text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative w-full max-w-lg aspect-[3/4] max-h-[70vh] rounded-2xl overflow-hidden border-2 border-indigo-400 bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              onLoadedMetadata={() => videoRef.current?.play()}
            />
            <div className="absolute inset-6 border border-white/40 rounded-xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
              </div>
              <div className="text-center text-[11px] text-white/80 bg-black/60 py-1 px-2 rounded-full mx-auto">
                Hold register flat under good lighting
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
              </div>
            </div>
          </div>

          <div className="w-full flex items-center justify-center gap-6 pb-6">
            <button
              onClick={captureLiveCameraSnapshot}
              className="w-20 h-20 rounded-full border-4 border-white bg-indigo-500 active:scale-95 transition-all flex items-center justify-center shadow-2xl"
            >
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                <Camera className="w-7 h-7 text-slate-900" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* SCANNING STATE */}
      {step === 'scanning' && (
        <div
          className={`p-8 rounded-3xl border text-center space-y-4 ${
            isDark ? 'bg-[#101D36] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-400/20 animate-ping" />
            <div className="w-24 h-24 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin flex items-center justify-center bg-indigo-500/10">
              <ScanLine className="w-10 h-10 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-black text-indigo-400">Scanning Handwritten Register...</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Deciphering customer names, milk quantities, AM/PM shifts, short codes (FC, GD, TM, DT), and cash collections.
            </p>
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {step === 'error' && (
        <div
          className={`p-6 rounded-3xl border space-y-4 text-center ${
            isDark ? 'bg-[#101D36] border-rose-900/40 text-slate-100' : 'bg-white border-rose-200 text-slate-900'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-black text-rose-400">Recognition Unsuccessful</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">{errorMessage}</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                if (previewImage) runRegisterOCR(previewImage);
                else setStep('intake');
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <button
              onClick={() => setStep('review')}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 font-bold text-xs"
            >
              <span>Enter Manually</span>
            </button>
            <button
              onClick={() => {
                setPreviewImage(null);
                setStep('intake');
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-700 text-slate-300 font-bold text-xs"
            >
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 1 & 3: MAIN REVIEW SCREEN */}
      {(step === 'review' || (step === 'intake' && previewImage)) && (
        <div className="space-y-4">
          {/* Top Review Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg font-black text-[11px] uppercase flex items-center gap-1.5 ${
                  ocrConfidence === 'high'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{ocrConfidence.toUpperCase()} ACCURACY</span>
              </span>
              <span className="text-slate-400 text-xs">
                Flow: SCAN → OCR → REVIEW → EDIT → CONFIRM → SAVE
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addRow}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
              <button
                type="button"
                onClick={() => previewImage && runRegisterOCR(previewImage)}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 font-bold text-xs flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-OCR</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Image Box */}
            <div className="lg:col-span-4 space-y-3">
              <div
                className={`p-3 rounded-2xl border flex flex-col ${
                  isDark ? 'bg-[#101D36] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold">
                  <span>Register Page Image</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setZoomScale((z) => Math.max(0.75, z - 0.25))}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setZoomScale((z) => Math.min(2.5, z + 0.25))}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleRotateImage}
                      className="p-1.5 rounded-lg bg-slate-800 text-amber-400"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-800 bg-black/60 min-h-[260px] max-h-[340px] flex items-center justify-center overflow-auto">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Register Scan"
                      style={{ transform: `scale(${zoomScale})` }}
                      className="max-h-[320px] object-contain"
                    />
                  ) : (
                    <div className="text-center p-6 text-slate-500 text-xs">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <span>No image attached</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={triggerCamera}
                    className="py-2 px-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 font-bold flex items-center justify-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Retake</span>
                  </button>
                  <button
                    onClick={triggerGallery}
                    className="py-2 px-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 font-bold flex items-center justify-center gap-1"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Gallery</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Editable Register Rows Table */}
            <div className="lg:col-span-8 space-y-4">
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-[#101D36] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-black uppercase text-indigo-400">
                  <span>Recognized Customer Milk Entries</span>
                  <span className="text-[10px] text-slate-400">
                    Saves directly into real Milk Entry Database
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {rows.map((row, idx) => {
                    const isLinked = Boolean(row.customerId);
                    return (
                      <div
                        key={row.id || idx}
                        className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/70 space-y-2 text-xs transition-all hover:border-slate-700"
                      >
                        {/* Row Header: Date, Shift, Customer */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                              #{idx + 1}
                            </span>
                            <input
                              type="date"
                              value={row.date}
                              onChange={(e) => updateRow(idx, 'date', e.target.value)}
                              className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs outline-none"
                            />
                            <select
                              value={row.shift}
                              onChange={(e) => updateRow(idx, 'shift', e.target.value as Shift)}
                              className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-amber-400 font-bold text-xs outline-none"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Customer Link Status */}
                            {isLinked ? (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <UserCheck className="w-3 h-3" />
                                <span>Linked Customer</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openQuickCustomerModal(idx)}
                                className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30"
                              >
                                <UserPlus className="w-3 h-3" />
                                <span>+ Add As New Customer</span>
                              </button>
                            )}

                            {rows.length > 1 && (
                              <button
                                onClick={() => removeRow(idx)}
                                className="p-1 rounded text-slate-500 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Customer & Product Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {/* Customer Selector / Name */}
                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                              Customer
                            </label>
                            <select
                              value={row.customerId}
                              onChange={(e) => updateRow(idx, 'customerId', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-bold outline-none"
                            >
                              <option value="">{row.customerName} (Unlinked)</option>
                              {customers.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Product */}
                          <div className="col-span-2 sm:col-span-1">
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                              Product
                            </label>
                            <select
                              value={row.productId}
                              onChange={(e) => updateRow(idx, 'productId', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 font-bold outline-none"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code} - {p.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quantity */}
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                              Qty (Pouches)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => updateRow(idx, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-center font-black text-slate-100 outline-none"
                            />
                          </div>

                          {/* Rate */}
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                              Rate (₹)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={row.rate}
                              onChange={(e) => updateRow(idx, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-right text-slate-200 outline-none"
                            />
                          </div>
                        </div>

                        {/* Amount & Cash Collected */}
                        <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Total Amount</span>
                              <span className="font-extrabold text-amber-400">
                                ₹{row.amount.toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">
                                Spot Payment Received (₹)
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={row.paymentCollected}
                                onChange={(e) =>
                                  updateRow(idx, 'paymentCollected', parseFloat(e.target.value) || 0)
                                }
                                placeholder="0"
                                className="w-24 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400 font-bold outline-none"
                              />
                            </div>
                          </div>

                          {row.balance !== undefined && (
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block">Noted Balance</span>
                              <span className="font-bold text-slate-300">₹{row.balance}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ACTION BUTTONS: [ Add Row ] [ Confirm & Save to Milk Entry ] [ Scan Again ] [ Cancel ] */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImage(null);
                      setStep('intake');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={triggerCamera}
                    className="px-4 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 text-indigo-400 font-bold text-xs hover:bg-indigo-500/20 flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Scan Again</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleConfirmAndSave}
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSaving ? 'IMPORTING...' : 'CONFIRM & SAVE TO MILK ENTRY'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Customer Creation Modal */}
      {quickCustomerModalRowIdx !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-5 rounded-3xl border space-y-4 ${
              isDark ? 'bg-[#101D36] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black text-amber-400">Add New Customer</h3>
              <button
                onClick={() => setQuickCustomerModalRowIdx(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={quickCustName}
                  onChange={(e) => setQuickCustName(e.target.value)}
                  placeholder="e.g. Ramesh Tea Corner"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-bold outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={quickCustPhone}
                  onChange={(e) => setQuickCustPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickCustomerModalRowIdx(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveQuickCustomer}
                className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400"
              >
                Create & Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Short-form Mappings Modal */}
      {showMappingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg p-5 rounded-3xl border space-y-4 max-h-[85vh] overflow-y-auto ${
              isDark ? 'bg-[#101D36] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-black text-indigo-400">Short-Form Product Mappings</h3>
                <p className="text-[11px] text-slate-400">
                  Used by OCR to expand handwritten abbreviations to real products
                </p>
              </div>
              <button
                onClick={() => setShowMappingsModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of current mappings */}
            <div className="space-y-2">
              {Object.entries(mappings).map(([code, target]) => (
                <div
                  key={code}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-black">
                      {code}
                    </span>
                    <span className="text-slate-200">{target}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteShortcut(code)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new mapping */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-300 block">Add New Shortcut</span>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newShortcutCode}
                  onChange={(e) => setNewShortcutCode(e.target.value)}
                  placeholder="Code (e.g. PN)"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-bold text-xs uppercase"
                />
                <input
                  type="text"
                  value={newShortcutTarget}
                  onChange={(e) => setNewShortcutTarget(e.target.value)}
                  placeholder="Target Product Name"
                  className="col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveNewShortcut}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                Save Shortcut
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
