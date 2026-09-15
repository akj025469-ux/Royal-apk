import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Camera,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  FileSpreadsheet,
  Truck,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Boxes,
  HelpCircle,
  X,
  Eye,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Challan, ChallanItem, Shift } from '../../types';

interface ChallanItemRow {
  srNo?: number;
  hsnSac?: string;
  productId: string;
  productCode: string;
  productName: string;
  crates: number;
  pouches: number;
  totalQuantity: number;
  rate: number;
  amount: number;
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

export const ChallanScannerScreen: React.FC = () => {
  const {
    products,
    saveChallan,
    selectedDate,
    activeShift,
    theme,
    navigateTo,
    reprocessChallanData,
    setReprocessChallanData,
    showToast,
  } = useApp();

  const isDark = theme === 'dark';

  // Separate file input refs for Camera vs Gallery
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Live Camera state (if in-app camera modal is preferred)
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);

  // Workflow steps: 'intake' | 'scanning' | 'review' | 'error'
  const [step, setStep] = useState<'intake' | 'scanning' | 'review' | 'error'>('intake');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Image handling
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState<boolean>(false);

  // OCR Metadata
  const [ocrConfidence, setOcrConfidence] = useState<'high' | 'medium' | 'low'>('medium');
  const [unrecognizedFields, setUnrecognizedFields] = useState<string[]>([]);

  // Editable Challan Fields
  const [challanNo, setChallanNo] = useState<string>('');
  const [partyName, setPartyName] = useState<string>('Amul Mother Dairy');
  const [routeDemandFpo, setRouteDemandFpo] = useState<string>('');
  const [gccmp, setGccmp] = useState<string>('');
  const [pan, setPan] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [purDocRefNo, setPurDocRefNo] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>(selectedDate);
  const [dispatchDate, setDispatchDate] = useState<string>(selectedDate);
  const [dispatchTime, setDispatchTime] = useState<string>('04:30');
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [internalRefNo, setInternalRefNo] = useState<string>('');
  const [tssanNumber, setTssanNumber] = useState<string>('');
  const [date, setDate] = useState<string>(selectedDate);
  const [shift, setShift] = useState<Shift>(activeShift);

  // Product Items
  const [items, setItems] = useState<ChallanItemRow[]>([
    {
      srNo: 1,
      hsnSac: '0401',
      productId: products[0]?.id || '',
      productCode: products[0]?.code || 'GD',
      productName: products[0]?.name || 'Amul Gold 500ml',
      crates: 10,
      pouches: 0,
      totalQuantity: 240,
      rate: products[0]?.defaultWholesaleRate || 33,
      amount: 7920,
    },
  ]);

  // Bottom Totals & Financials
  const [netIssuedQty, setNetIssuedQty] = useState<string>('');
  const [cbxQty, setCbxQty] = useState<string>('');
  const [totalQty, setTotalQty] = useState<string>('');
  const [netWeight, setNetWeight] = useState<string>('');
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [basicAmount, setBasicAmount] = useState<string>('');
  const [taxAmount, setTaxAmount] = useState<string>('');
  const [freightSubsidy, setFreightSubsidy] = useState<string>('');
  const [freight, setFreight] = useState<string>('0');
  const [otherCharges, setOtherCharges] = useState<string>('0');
  const [netInvoiceAmount, setNetInvoiceAmount] = useState<string>('');
  const [totalCratesIssue, setTotalCratesIssue] = useState<string>('');
  const [totalOutstanding, setTotalOutstanding] = useState<string>('');
  const [deviation, setDeviation] = useState<string>('');
  const [customerClosingBalance, setCustomerClosingBalance] = useState<string>('');
  const [notes, setNotes] = useState<string>('Scanned via Challan OCR');

  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Handle reprocess incoming from ChallansScreen
  useEffect(() => {
    if (reprocessChallanData) {
      if (reprocessChallanData.imageUri) {
        setPreviewImage(reprocessChallanData.imageUri);
      }
      setChallanNo(reprocessChallanData.challanNumber || '');
      setPartyName(reprocessChallanData.partyName || '');
      setVehicleNo(reprocessChallanData.vehicleNumber || '');
      setDate(reprocessChallanData.date || selectedDate);
      setShift(reprocessChallanData.shift || activeShift);
      setFreight(String(reprocessChallanData.freight || 0));
      if (reprocessChallanData.items && reprocessChallanData.items.length > 0) {
        setItems(
          reprocessChallanData.items.map((it, idx) => ({
            srNo: it.srNo || idx + 1,
            hsnSac: it.hsnSac || '0401',
            productId: it.productId,
            productCode: it.productCode,
            productName: it.productName,
            crates: it.crates,
            pouches: it.pouches,
            totalQuantity: it.totalQuantity,
            rate: it.rate,
            amount: it.amount,
          }))
        );
      }
      setStep('review');
      // Clear after consuming
      setReprocessChallanData(null);
    }
  }, [reprocessChallanData, selectedDate, activeShift, setReprocessChallanData]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (liveStream) {
        liveStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [liveStream]);

  // 1. SEPARATE CAMERA TRIGGER
  const triggerCamera = async () => {
    setCameraPermissionError(null);
    // Attempt in-app live camera viewfinder first
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
      } catch (err: any) {
        console.warn('In-app camera stream failed, falling back to native capture input:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraPermissionError('Camera permission was denied. Falling back to camera capture.');
        }
      }
    }
    // Direct native Android Camera fall-through
    cameraInputRef.current?.click();
  };

  // Capture snapshot from Live Camera
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
        // Stop stream
        if (liveStream) {
          liveStream.getTracks().forEach((t) => t.stop());
          setLiveStream(null);
        }
        setIsLiveCameraOpen(false);
        setPreviewImage(dataUrl);
        setImageFileName(`Camera_${Date.now()}.jpg`);
        setRotationDegrees(0);
        setZoomScale(1);
        runOCR(dataUrl);
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

  // Handle native camera file intake
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPreviewImage(dataUrl);
        setImageFileName(file.name || `Camera_${Date.now()}.jpg`);
        setRotationDegrees(0);
        setZoomScale(1);
        runOCR(dataUrl);
      };
      reader.readAsDataURL(file);
    }
    // reset input so same file can be chosen again
    if (e.target) e.target.value = '';
  };

  // 2. SEPARATE GALLERY TRIGGER (NEVER opens Camera!)
  const triggerGallery = () => {
    // Strictly triggers the standard photo picker
    galleryInputRef.current?.click();
  };

  const handleGalleryPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPreviewImage(dataUrl);
        setImageFileName(file.name || `Gallery_${Date.now()}.jpg`);
        setRotationDegrees(0);
        setZoomScale(1);
        runOCR(dataUrl);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  // Rotate base64 image 90 degrees clockwise
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

  // RUN REAL OCR VIA BACKEND GEMINI 3.8 FLASH
  const runOCR = async (imageBase64: string, isAutoRetry = false) => {
    setStep('scanning');
    setErrorMessage('');

    try {
      // Optimize image resolution and size for reliable transfer and fast OCR
      const optimizedBase64 = await optimizeImageForOCR(imageBase64);

      const response = await fetch('/api/ocr/challan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          imageBase64: optimizedBase64,
          mimeType: 'image/jpeg',
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
          console.warn('[Challan OCR] Server is warming up. Retrying in 2 seconds...');
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return runOCR(imageBase64, true);
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

      // Extract and map Header fields
      if (d.dcNo) setChallanNo(d.dcNo);
      else if (!challanNo) setChallanNo(`CH-${Math.floor(1000 + Math.random() * 9000)}`);

      if (d.partyName) setPartyName(d.partyName);
      if (d.routeDemandFpo) setRouteDemandFpo(d.routeDemandFpo);
      if (d.gccmp) setGccmp(d.gccmp);
      if (d.pan) setPan(d.pan);
      if (d.gstin) setGstin(d.gstin);
      if (d.purDocRefNo) setPurDocRefNo(d.purDocRefNo);
      if (d.orderDate) setOrderDate(d.orderDate);
      if (d.dispatchDate) setDispatchDate(d.dispatchDate);
      if (d.dispatchTime) setDispatchTime(d.dispatchTime);
      if (d.vehicleNo) setVehicleNo(d.vehicleNo);
      if (d.internalRefNo) setInternalRefNo(d.internalRefNo);
      if (d.tssanNumber) setTssanNumber(d.tssanNumber);

      // Extract products and match with registered catalogue
      if (Array.isArray(d.items) && d.items.length > 0) {
        const parsedItems: ChallanItemRow[] = d.items.map((rawItem: any, idx: number) => {
          // Attempt exact or code match
          const matchedProd =
            products.find(
              (p) =>
                (rawItem.productCode && p.code.toLowerCase() === rawItem.productCode.toLowerCase()) ||
                (rawItem.productName && p.name.toLowerCase().includes(rawItem.productName.toLowerCase())) ||
                (rawItem.productName && rawItem.productName.toLowerCase().includes(p.code.toLowerCase()))
            ) || products[0];

          const pouchesPerCrate = matchedProd?.pouchesPerCrate || 24;
          const crates = Number(rawItem.crates) || 0;
          let qty = Number(rawItem.quantity) || 0;
          if (qty === 0 && crates > 0) {
            qty = crates * pouchesPerCrate;
          }
          const defaultRate = matchedProd?.defaultWholesaleRate || 33;
          const rate = Number(rawItem.rate) || defaultRate;
          const amt = Number(rawItem.amount) || qty * rate;

          return {
            srNo: rawItem.srNo || idx + 1,
            hsnSac: rawItem.hsnSac || '0401',
            productId: matchedProd?.id || '',
            productCode: rawItem.productCode || matchedProd?.code || 'MILK',
            productName: rawItem.productName || matchedProd?.name || 'Milk Pack',
            crates,
            pouches: qty % pouchesPerCrate,
            totalQuantity: qty,
            rate,
            amount: amt,
          };
        });
        setItems(parsedItems);
      }

      // Extract Totals & Financials
      if (d.totals) {
        const t = d.totals;
        if (t.netIssuedQty) setNetIssuedQty(String(t.netIssuedQty));
        if (t.cbxQty) setCbxQty(String(t.cbxQty));
        if (t.totalQty) setTotalQty(String(t.totalQty));
        if (t.netWeight) setNetWeight(String(t.netWeight));
        if (t.grossWeight) setGrossWeight(String(t.grossWeight));
        if (t.basicAmount) setBasicAmount(String(t.basicAmount));
        if (t.taxAmount) setTaxAmount(String(t.taxAmount));
        if (t.freightSubsidy) setFreightSubsidy(String(t.freightSubsidy));
        if (t.freight !== undefined && t.freight !== null) setFreight(String(t.freight));
        if (t.netInvoiceAmount) setNetInvoiceAmount(String(t.netInvoiceAmount));
        if (t.totalCratesIssue) setTotalCratesIssue(String(t.totalCratesIssue));
        if (t.totalOutstanding) setTotalOutstanding(String(t.totalOutstanding));
        if (t.deviation) setDeviation(String(t.deviation));
        if (t.customerClosingBalance) setCustomerClosingBalance(String(t.customerClosingBalance));
      }

      setOcrConfidence(d.confidence || 'medium');
      setUnrecognizedFields(Array.isArray(d.unrecognizedFields) ? d.unrecognizedFields : []);
      setStep('review');
      showToast('Challan recognized successfully! Please review below.');
    } catch (err: any) {
      console.error('OCR error:', err);
      setErrorMessage('Internet connection required for advanced recognition.');
      setStep('error');
    }
  };

  // Product table helpers
  const addItemRow = () => {
    const defaultProd = products[0];
    const pouchesPerCrate = defaultProd?.pouchesPerCrate || 24;
    setItems((prev) => [
      ...prev,
      {
        srNo: prev.length + 1,
        hsnSac: '0401',
        productId: defaultProd?.id || '',
        productCode: defaultProd?.code || 'GD',
        productName: defaultProd?.name || 'Amul Gold 500ml',
        crates: 5,
        pouches: 0,
        totalQuantity: 5 * pouchesPerCrate,
        rate: defaultProd?.defaultWholesaleRate || 33,
        amount: 5 * pouchesPerCrate * (defaultProd?.defaultWholesaleRate || 33),
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItemRow = (idx: number, field: keyof ChallanItemRow, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[idx], [field]: val };

      if (field === 'productId') {
        const p = products.find((pr) => pr.id === val);
        if (p) {
          current.productCode = p.code;
          current.productName = p.name;
          current.rate = p.defaultWholesaleRate;
          const pouchesPerCrate = p.pouchesPerCrate || 24;
          current.totalQuantity = current.crates * pouchesPerCrate + current.pouches;
          current.amount = current.totalQuantity * current.rate;
        }
      } else if (field === 'crates' || field === 'pouches' || field === 'rate') {
        const p = products.find((pr) => pr.id === current.productId);
        const pouchesPerCrate = p?.pouchesPerCrate || 24;
        const crates = Number(current.crates) || 0;
        const pouches = Number(current.pouches) || 0;
        current.totalQuantity = crates * pouchesPerCrate + pouches;
        current.amount = current.totalQuantity * (Number(current.rate) || 0);
      } else if (field === 'totalQuantity') {
        current.amount = (Number(val) || 0) * (Number(current.rate) || 0);
      }

      copy[idx] = current;
      return copy;
    });
  };

  // Computed totals from items
  const computedTotals = useMemo(() => {
    let crates = 0;
    let qty = 0;
    let subtotal = 0;
    items.forEach((it) => {
      crates += Number(it.crates) || 0;
      qty += Number(it.totalQuantity) || 0;
      subtotal += Number(it.amount) || 0;
    });
    const freightAmt = parseFloat(freight) || 0;
    const otherAmt = parseFloat(otherCharges) || 0;
    const net = subtotal + freightAmt + otherAmt;
    return { crates, qty, subtotal, net };
  }, [items, freight, otherCharges]);

  // Handle Confirm & Save
  const handleConfirmAndSave = async () => {
    if (!challanNo.trim()) {
      showToast('Please provide or verify the Challan Number (D.C. No)', 'warning');
      return;
    }
    if (!partyName.trim()) {
      showToast('Please provide the Party Name', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const finalItems: ChallanItem[] = items.map((it, idx) => ({
        srNo: it.srNo || idx + 1,
        hsnSac: it.hsnSac || '0401',
        productId: it.productId || products[0]?.id || 'unknown',
        productCode: it.productCode || 'MILK',
        productName: it.productName || 'Milk Pack',
        crates: it.crates,
        pouches: it.pouches,
        totalQuantity: it.totalQuantity,
        rate: it.rate,
        amount: it.amount,
      }));

      const finalNet =
        netInvoiceAmount.trim() !== ''
          ? parseFloat(netInvoiceAmount) || computedTotals.net
          : computedTotals.net;

      const newChallan: Challan = {
        id: `challan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        challanNumber: challanNo.trim(),
        partyName: partyName.trim(),
        routeDemandFpo: routeDemandFpo.trim() || undefined,
        gccmp: gccmp.trim() || undefined,
        pan: pan.trim() || undefined,
        gstin: gstin.trim() || undefined,
        purDocRefNo: purDocRefNo.trim() || undefined,
        orderDate: orderDate || undefined,
        dispatchDate: dispatchDate || undefined,
        dispatchTime: dispatchTime || undefined,
        vehicleNumber: vehicleNo.trim() || undefined,
        internalRefNo: internalRefNo.trim() || undefined,
        tssanNumber: tssanNumber.trim() || undefined,
        date: date || selectedDate,
        shift: shift || activeShift,
        items: finalItems,
        totalCrates: totalCratesIssue ? parseFloat(totalCratesIssue) || computedTotals.crates : computedTotals.crates,
        totalQuantity: totalQty ? parseFloat(totalQty) || computedTotals.qty : computedTotals.qty,
        netIssuedQty: netIssuedQty ? parseFloat(netIssuedQty) : undefined,
        cbxQty: cbxQty ? parseFloat(cbxQty) : undefined,
        netWeight: netWeight ? parseFloat(netWeight) : undefined,
        grossWeight: grossWeight ? parseFloat(grossWeight) : undefined,
        basicAmount: basicAmount ? parseFloat(basicAmount) : computedTotals.subtotal,
        taxAmount: taxAmount ? parseFloat(taxAmount) : undefined,
        freightSubsidy: freightSubsidy ? parseFloat(freightSubsidy) : undefined,
        freight: parseFloat(freight) || 0,
        otherCharges: parseFloat(otherCharges) || 0,
        netAmount: finalNet,
        totalCratesIssue: totalCratesIssue ? parseFloat(totalCratesIssue) : computedTotals.crates,
        totalOutstanding: totalOutstanding ? parseFloat(totalOutstanding) : undefined,
        deviation: deviation ? parseFloat(deviation) : undefined,
        customerClosingBalance: customerClosingBalance ? parseFloat(customerClosingBalance) : undefined,
        imageUri: previewImage || undefined,
        notes: notes.trim() || undefined,
        confidence: ocrConfidence,
        unrecognizedFields,
        createdAt: new Date().toISOString(),
      };

      await saveChallan(newChallan);
      showToast(`Challan #${newChallan.challanNumber} saved to records!`);
      setTimeout(() => {
        navigateTo('challans');
      }, 1000);
    } catch (e: any) {
      console.error('Failed to save challan:', e);
      showToast('Error saving challan to database', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto pb-32">
      {/* Hidden File Inputs — Strictly separated: Camera has capture="environment", Gallery does NOT have capture */}
      <input
        id="native-camera-input"
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />
      <input
        id="native-gallery-input"
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        onChange={handleGalleryPick}
        className="hidden"
      />

      {/* Top Controls Header */}
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
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Dairy Challan Scanner
              </span>
              <span className="text-xs text-slate-400">Step 3 Real OCR Engine</span>
            </div>
            <h2 className="text-lg font-black mt-1">Smart Document Intake & OCR</h2>
            <p className="text-xs text-slate-400">
              Capture delivery challan or dispatch memo. Two independent sources: Live Camera or Photo Gallery.
            </p>
          </div>

          {/* TWO SEPARATE SOURCE BUTTONS AS MANDATED */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* 1. CAMERA */}
            <button
              id="btn-challan-camera"
              type="button"
              onClick={triggerCamera}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 shadow-lg shadow-amber-500/20"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
              <span>📷 CAMERA</span>
            </button>

            {/* 2. GALLERY (NEVER triggers camera) */}
            <button
              id="btn-challan-gallery"
              type="button"
              onClick={triggerGallery}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              <ImageIcon className="w-4 h-4 stroke-[2.5]" />
              <span>🖼 GALLERY</span>
            </button>
          </div>
        </div>

        {cameraPermissionError && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{cameraPermissionError}</span>
          </div>
        )}
      </div>

      {/* Live Camera Viewfinder Modal */}
      {isLiveCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-between p-4">
          <div className="w-full flex justify-between items-center text-white px-2">
            <span className="text-sm font-bold text-amber-400">Align Challan in Frame</span>
            <button onClick={closeLiveCamera} className="p-2 rounded-full bg-slate-800 text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative w-full max-w-lg aspect-[3/4] max-h-[70vh] rounded-2xl overflow-hidden border-2 border-amber-400 bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              onLoadedMetadata={() => videoRef.current?.play()}
            />
            {/* Viewfinder Reticle */}
            <div className="absolute inset-6 border border-white/40 rounded-xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-amber-400" />
              </div>
              <div className="text-center text-[11px] text-white/80 bg-black/60 py-1 px-2 rounded-full mx-auto">
                Hold document steady under bright lighting
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-amber-400" />
              </div>
            </div>
          </div>

          <div className="w-full flex items-center justify-center gap-6 pb-6">
            <button
              onClick={captureLiveCameraSnapshot}
              className="w-20 h-20 rounded-full border-4 border-white bg-amber-500 active:scale-95 transition-all flex items-center justify-center shadow-2xl"
            >
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                <Camera className="w-7 h-7 text-slate-900" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* SCANNING RADAR / LOADING STATE */}
      {step === 'scanning' && (
        <div
          className={`p-8 rounded-3xl border text-center space-y-4 ${
            isDark ? 'bg-[#101D36] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-amber-400/20 animate-ping" />
            <div className="w-24 h-24 rounded-full border-4 border-amber-400 border-t-transparent animate-spin flex items-center justify-center bg-amber-500/10">
              <FileSpreadsheet className="w-10 h-10 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-black text-amber-400">Running Real Challan OCR Recognition...</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Scanning header, vehicle number, D.C. No., product crates, dispatched quantities, and financial totals.
            </p>
          </div>
        </div>
      )}

      {/* ERROR HANDLING SCREEN */}
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
                if (previewImage) runOCR(previewImage);
                else setStep('intake');
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <button
              onClick={() => {
                setStep('review');
                if (!challanNo) setChallanNo(`CH-${Math.floor(1000 + Math.random() * 9000)}`);
              }}
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

      {/* STEP 1 & 3: MAIN REVIEW SCREEN (Image Preview + Complete Editable Data) */}
      {(step === 'review' || (step === 'intake' && previewImage)) && (
        <div className="space-y-4">
          {/* Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg font-black text-[11px] uppercase flex items-center gap-1.5 ${
                  ocrConfidence === 'high'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : ocrConfidence === 'medium'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{ocrConfidence.toUpperCase()} OCR CONFIDENCE</span>
              </span>
              {unrecognizedFields.length > 0 && (
                <span className="text-amber-300 text-[11px]">
                  Missing / Verify: {unrecognizedFields.slice(0, 3).join(', ')}
                  {unrecognizedFields.length > 3 ? ` +${unrecognizedFields.length - 3}` : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 font-bold text-xs flex items-center gap-1"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isEditMode ? 'Quick View' : 'Edit Mode'}</span>
              </button>
              <button
                type="button"
                onClick={() => previewImage && runOCR(previewImage)}
                className="px-3 py-1.5 rounded-xl border border-blue-500/40 bg-blue-500/20 text-blue-300 font-bold text-xs flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-OCR</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Image Viewer with Zoom, Rotate, Retake */}
            <div className="lg:col-span-5 space-y-3">
              <div
                className={`p-3 rounded-2xl border flex flex-col ${
                  isDark ? 'bg-[#101D36] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold">
                  <span>Original Challan Document</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setZoomScale((z) => Math.max(0.75, z - 0.25))}
                      title="Zoom Out"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setZoomScale((z) => Math.min(2.5, z + 0.25))}
                      title="Zoom In"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleRotateImage}
                      title="Rotate 90° Clockwise"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsImageLightboxOpen(true)}
                      title="Fullscreen Preview"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Image Canvas Box */}
                <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-800 bg-black/60 min-h-[280px] max-h-[380px] flex items-center justify-center overflow-auto">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Challan Scan"
                      style={{
                        transform: `scale(${zoomScale})`,
                        transition: 'transform 0.15s ease-out',
                      }}
                      className="max-h-[360px] object-contain cursor-zoom-in"
                      onClick={() => setIsImageLightboxOpen(true)}
                    />
                  ) : (
                    <div className="text-center p-6 text-slate-500 text-xs">
                      <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <span>No challan image attached</span>
                    </div>
                  )}
                </div>

                {/* Retake buttons */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={triggerCamera}
                    className="py-2 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Retake Photo</span>
                  </button>
                  <button
                    onClick={triggerGallery}
                    className="py-2 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Change Image</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Complete Editable OCR Form */}
            <div className="lg:col-span-7 space-y-4">
              {/* Section 1: Header & Transport Metadata */}
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-[#101D36] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-black uppercase text-amber-400">
                  <span>1. Header & Transport Information</span>
                  <span className="text-[10px] text-slate-400">All fields editable</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {/* D.C. No */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      D.C. No. / Challan No *
                    </label>
                    <input
                      type="text"
                      value={challanNo}
                      onChange={(e) => setChallanNo(e.target.value)}
                      placeholder="e.g. DC-98421"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-400 font-bold focus:border-amber-400 outline-none"
                    />
                  </div>

                  {/* Party Name */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Party / Ship To *
                    </label>
                    <input
                      type="text"
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      placeholder="e.g. Amul Mother Dairy Hub"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-bold focus:border-amber-400 outline-none"
                    />
                  </div>

                  {/* Route / Demand FPO */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Route / Demand FPO
                    </label>
                    <input
                      type="text"
                      value={routeDemandFpo}
                      onChange={(e) => setRouteDemandFpo(e.target.value)}
                      placeholder="e.g. Sector 14 / Route 2"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                    />
                  </div>

                  {/* Vehicle No */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Vehicle No.
                    </label>
                    <input
                      type="text"
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value)}
                      placeholder="e.g. DL1L 7842"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-bold outline-none"
                    />
                  </div>

                  {/* Date & Shift */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Challan Date & Shift
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs outline-none"
                      />
                      <select
                        value={shift}
                        onChange={(e) => setShift(e.target.value as Shift)}
                        className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-400 font-bold text-xs outline-none"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>

                  {/* Dispatch Date & Time */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Dispatch Date & Time
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={dispatchDate}
                        onChange={(e) => setDispatchDate(e.target.value)}
                        placeholder="YYYY-MM-DD"
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs outline-none"
                      />
                      <input
                        type="text"
                        value={dispatchTime}
                        onChange={(e) => setDispatchTime(e.target.value)}
                        placeholder="HH:mm"
                        className="w-20 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* GSTIN */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      GSTIN
                    </label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      placeholder="GSTIN"
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs outline-none"
                    />
                  </div>

                  {/* PAN */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      PAN
                    </label>
                    <input
                      type="text"
                      value={pan}
                      onChange={(e) => setPan(e.target.value)}
                      placeholder="PAN"
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs outline-none"
                    />
                  </div>

                  {/* GCCM/P */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      GCCM/P
                    </label>
                    <input
                      type="text"
                      value={gccmp}
                      onChange={(e) => setGccmp(e.target.value)}
                      placeholder="GCCM/P Code"
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs outline-none"
                    />
                  </div>

                  {/* TSSAN Number */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      TSSAN Number
                    </label>
                    <input
                      type="text"
                      value={tssanNumber}
                      onChange={(e) => setTssanNumber(e.target.value)}
                      placeholder="TSSAN No."
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs outline-none"
                    />
                  </div>

                  {/* Pur. Doc. Ref. No. */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Pur. Doc. Ref. No.
                    </label>
                    <input
                      type="text"
                      value={purDocRefNo}
                      onChange={(e) => setPurDocRefNo(e.target.value)}
                      placeholder="Purchase Doc Ref"
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Product Table */}
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-[#101D36] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-black uppercase text-amber-400">
                  <span>2. Product Crates & Quantity Matrix</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                        <th className="pb-2 w-8">#</th>
                        <th className="pb-2 min-w-[140px]">Product / Code</th>
                        <th className="pb-2 w-16 text-center">Crates</th>
                        <th className="pb-2 w-20 text-center">Pouches</th>
                        <th className="pb-2 w-20 text-right">Rate (₹)</th>
                        <th className="pb-2 w-24 text-right">Amount (₹)</th>
                        <th className="pb-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {items.map((it, idx) => (
                        <tr key={idx} className="py-2">
                          <td className="py-2 text-[10px] text-slate-500">{it.srNo || idx + 1}</td>
                          <td className="py-2 pr-2">
                            <select
                              value={it.productId}
                              onChange={(e) => updateItemRow(idx, 'productId', e.target.value)}
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold outline-none"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.code})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              min="0"
                              value={it.crates}
                              onChange={(e) => updateItemRow(idx, 'crates', parseInt(e.target.value) || 0)}
                              className="w-full px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-center text-amber-400 font-bold outline-none"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              min="0"
                              value={it.totalQuantity}
                              onChange={(e) => updateItemRow(idx, 'totalQuantity', parseInt(e.target.value) || 0)}
                              className="w-full px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-center text-slate-100 font-bold outline-none"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              step="0.1"
                              value={it.rate}
                              onChange={(e) => updateItemRow(idx, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-full px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-right text-slate-200 outline-none"
                            />
                          </td>
                          <td className="py-2 pl-1 text-right font-black text-amber-400">
                            ₹{it.amount.toFixed(2)}
                          </td>
                          <td className="py-2 pl-2 text-center">
                            {items.length > 1 && (
                              <button
                                onClick={() => removeItemRow(idx)}
                                className="text-slate-500 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals line */}
                <div className="pt-2 border-t border-slate-800 grid grid-cols-3 text-center text-xs">
                  <div className="p-2 rounded bg-slate-900/80">
                    <span className="text-[10px] text-slate-400 block uppercase">Total Crates</span>
                    <span className="font-extrabold text-amber-400">{computedTotals.crates}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80">
                    <span className="text-[10px] text-slate-400 block uppercase">Total Pouches</span>
                    <span className="font-extrabold text-slate-200">{computedTotals.qty}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80">
                    <span className="text-[10px] text-slate-400 block uppercase">Items Subtotal</span>
                    <span className="font-extrabold text-emerald-400">₹{computedTotals.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Bottom Totals & Financials */}
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-[#101D36] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-black uppercase text-amber-400">
                  <span>3. Financial Breakdown & Totals</span>
                  <span className="text-[10px] text-slate-400">Recognized & Editable</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Freight Charges (₹)
                    </label>
                    <input
                      type="number"
                      value={freight}
                      onChange={(e) => setFreight(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Freight Subsidy (₹)
                    </label>
                    <input
                      type="text"
                      value={freightSubsidy}
                      onChange={(e) => setFreightSubsidy(e.target.value)}
                      placeholder="Subsidy"
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Basic Amount (₹)
                    </label>
                    <input
                      type="text"
                      value={basicAmount || computedTotals.subtotal}
                      onChange={(e) => setBasicAmount(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Tax / GST Amount (₹)
                    </label>
                    <input
                      type="text"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Net Weight (kg)
                    </label>
                    <input
                      type="text"
                      value={netWeight}
                      onChange={(e) => setNetWeight(e.target.value)}
                      placeholder="Net Wt"
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Gross Weight (kg)
                    </label>
                    <input
                      type="text"
                      value={grossWeight}
                      onChange={(e) => setGrossWeight(e.target.value)}
                      placeholder="Gross Wt"
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Total Outstanding (₹)
                    </label>
                    <input
                      type="text"
                      value={totalOutstanding}
                      onChange={(e) => setTotalOutstanding(e.target.value)}
                      placeholder="Outstanding"
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Closing Balance (₹)
                    </label>
                    <input
                      type="text"
                      value={customerClosingBalance}
                      onChange={(e) => setCustomerClosingBalance(e.target.value)}
                      placeholder="Closing Bal"
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                    />
                  </div>
                </div>

                {/* Net Invoice Amount Highlight */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-amber-400 font-black block">
                      Net Invoice Amount (Total Challan Value)
                    </span>
                    <span className="text-xs text-slate-400">
                      Auto-calculated or override with challan print
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black text-amber-400">₹</span>
                    <input
                      type="number"
                      value={netInvoiceAmount || computedTotals.net}
                      onChange={(e) => setNetInvoiceAmount(e.target.value)}
                      className="w-32 px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-500/50 text-right text-lg font-black text-amber-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS: [ Edit ] [ Confirm & Save ] [ Scan Again ] [ Cancel ] */}
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
                    className="px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold text-xs hover:bg-amber-500/20 flex items-center gap-1.5"
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
                  <span>{isSaving ? 'SAVING...' : 'CONFIRM & SAVE CHALLAN'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Fullscreen Image View */}
      {isImageLightboxOpen && previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4"
          onClick={() => setIsImageLightboxOpen(false)}
        >
          <div className="w-full flex justify-between items-center text-white px-2">
            <span className="text-sm font-bold text-amber-400">Original Challan Image Inspection</span>
            <button onClick={() => setIsImageLightboxOpen(false)} className="p-2 rounded-full bg-slate-800 text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center max-w-4xl max-h-[85vh] overflow-auto p-2" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Challan Fullscreen" className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
          <div className="text-xs text-slate-400 pb-2">Click anywhere outside to close inspection view</div>
        </div>
      )}
    </div>
  );
};
