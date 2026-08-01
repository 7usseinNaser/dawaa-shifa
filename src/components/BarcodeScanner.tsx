import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, X, Camera, Loader2, CheckCircle, AlertTriangle, RefreshCw, Package } from 'lucide-react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';

interface BarcodeScannerProps {
  onResult: (text: string) => void;
  onClose: () => void;
  isRTL: boolean;
}

type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';

export function BarcodeScanner({ onResult, onClose, isRTL }: BarcodeScannerProps) {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [detected, setDetected] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const stopScan = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  useEffect(() => () => { stopScan(); }, [stopScan]);

  const startScan = useCallback(async () => {
    if (!videoRef.current) return;
    setStatus('scanning');
    setErrorMsg('');
    setDetected('');
    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, err) => {
          if (result) {
            stopScan();
            setDetected(result.getText());
            setStatus('done');
          }
        },
      );
      controlsRef.current = controls;
    } catch {
      setStatus('error');
      setErrorMsg(isRTL ? 'تعذر الوصول للكاميرا. أدخل الرقم يدوياً.' : 'Cannot access camera. Enter the code manually.');
      setManualMode(true);
    }
  }, [isRTL, stopScan]);

  const reset = () => {
    stopScan();
    setStatus('idle');
    setDetected('');
    setManualInput('');
    setErrorMsg('');
    setManualMode(false);
  };

  const submitResult = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) {
      onResult(trimmed);
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={() => { stopScan(); onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card p-5 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cairo font-bold text-base flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-brand-green-light" />
            {isRTL ? 'ماسح الباركود / QR' : 'Barcode / QR Scanner'}
          </h3>
          <button onClick={() => { stopScan(); onClose(); }} className="text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
        </div>

        {status === 'idle' && !manualMode && (
          <div className="space-y-3">
            <div className="glass-card p-8 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-brand-green-light opacity-50" />
              <p className="text-sm font-tajawal text-[var(--text-muted)] mb-4">
                {isRTL ? 'وجه الكاميرا نحو الباركود أو رمز QR على علبة الدواء' : 'Point the camera at the barcode or QR code on the medicine box'}
              </p>
              <div className="flex gap-2 justify-center">
                <button onClick={startScan} className="btn-primary text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  {isRTL ? 'بدء المسح' : 'Start Scan'}
                </button>
                <button onClick={() => setManualMode(true)} className="btn-secondary text-sm">
                  {isRTL ? 'إدخال يدوي' : 'Manual Entry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {status === 'scanning' && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden glass-card aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <motion.div
                animate={{ y: [-100, 100, -100] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 right-0 h-0.5 bg-brand-green-light shadow-lg shadow-brand-green/60"
              />
              <div className="absolute inset-0 border-2 border-brand-green-light/40 rounded-xl pointer-events-none" />
            </div>
            <div className="flex items-center justify-center gap-2 text-sm font-tajawal text-[var(--text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin text-brand-green-light" />
              {isRTL ? 'ابحث عن الباركود...' : 'Looking for barcode...'}
            </div>
            <button onClick={reset} className="btn-secondary text-sm w-full">{isRTL ? 'إلغاء' : 'Cancel'}</button>
          </div>
        )}

        {status === 'error' && (
          <div className="glass-card p-3 flex items-start gap-2 bg-status-emergency/10">
            <AlertTriangle className="w-4 h-4 text-status-emergency shrink-0 mt-0.5" />
            <p className="text-xs font-tajawal text-status-emergency">{errorMsg}</p>
          </div>
        )}

        {manualMode && (
          <div className="space-y-3">
            <div className="glass-card p-3">
              <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1.5">
                {isRTL ? 'رقم الباركود / QR' : 'Barcode / QR code'}
              </label>
              <input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={isRTL ? 'مثال: 6001234567890' : 'e.g. 6001234567890'}
                className="w-full glass-card px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-green"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => submitResult(manualInput)} disabled={!manualInput.trim()} className="btn-primary flex-1 text-sm disabled:opacity-50">
                {isRTL ? 'بحث' : 'Search'}
              </button>
              <button onClick={reset} className="btn-secondary text-sm px-4 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                {isRTL ? 'إعادة' : 'Retry'}
              </button>
            </div>
          </div>
        )}

        {status === 'done' && !manualMode && (
          <div className="space-y-3">
            <div className="glass-card p-3">
              <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1.5">
                {isRTL ? 'الرمز المكتشف (عدّل إذا لزم)' : 'Detected code (edit if needed)'}
              </label>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-status-open shrink-0" />
                <input
                  value={detected}
                  onChange={(e) => setDetected(e.target.value)}
                  className="flex-1 glass-card px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-green"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => submitResult(detected)} disabled={!detected.trim()} className="btn-primary flex-1 text-sm disabled:opacity-50">
                {isRTL ? 'بحث عن الدواء' : 'Search Medicine'}
              </button>
              <button onClick={reset} className="btn-secondary text-sm px-4 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                {isRTL ? 'إعادة' : 'Retry'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
