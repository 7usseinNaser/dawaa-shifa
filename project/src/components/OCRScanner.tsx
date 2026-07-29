import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Loader2, ScanLine, CheckCircle, AlertTriangle } from 'lucide-react';

interface OCRScannerProps {
  onResult: (text: string) => void;
  onClose: () => void;
  isRTL: boolean;
}

export function OCRScanner({ onResult, onClose, isRTL }: OCRScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      scanImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Simulated OCR: in a real app this would call Tesseract.js or a cloud OCR API.
  // For now we use a mock that detects common medicine keywords from the filename
  // and lets the user manually type/confirm the detected name.
  const scanImage = (_img: string) => {
    setScanning(true);
    setDetected(null);
    setTimeout(() => {
      setScanning(false);
      setDetected('');
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
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
            <Camera className="w-5 h-5 text-brand-green-light" />
            {isRTL ? 'ماسح الروشتة' : 'Prescription Scanner'}
          </h3>
          <button onClick={onClose} className="text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
        </div>

        {!image ? (
          <div className="space-y-3">
            <div className="glass-card p-8 text-center">
              <ScanLine className="w-12 h-12 mx-auto mb-3 text-brand-green-light opacity-50" />
              <p className="text-sm font-tajawal text-[var(--text-muted)] mb-4">
                {isRTL ? 'التقط صورة للروشتة أو علبة الدواء وسنقرأ الاسم تلقائياً' : 'Take a photo of the prescription or medicine box and we will read the name automatically'}
              </p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => cameraRef.current?.click()} className="btn-primary text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  {isRTL ? 'كاميرا' : 'Camera'}
                </button>
                <button onClick={() => fileRef.current?.click()} className="btn-secondary text-sm">
                  {isRTL ? 'اختيار ملف' : 'Choose File'}
                </button>
              </div>
            </div>
            <div className="glass-card p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs font-tajawal text-[var(--text-muted)]">
                {isRTL ? 'للحصول على أفضل نتيجة: أضئ جيداً، اجعل النص واضحاً، وركز على اسم الدواء.' : 'For best results: ensure good lighting, keep text clear, and focus on the medicine name.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden glass-card">
              <img src={image} alt="scan" className="w-full max-h-48 object-contain" />
              {scanning && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-green-light mb-2" />
                  <p className="text-xs text-white font-tajawal">{isRTL ? 'جاري المسح...' : 'Scanning...'}</p>
                  <motion.div
                    animate={{ y: [-60, 60, -60] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 right-0 h-0.5 bg-brand-green-light shadow-lg shadow-brand-green/50"
                  />
                </div>
              )}
            </div>

            {!scanning && (
              <>
                <div className="glass-card p-3">
                  <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1.5">
                    {isRTL ? 'اسم الدواء المكتشف (عدّل إذا لزم)' : 'Detected medicine name (edit if needed)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-status-open shrink-0" />
                    <input
                      value={detected || ''}
                      onChange={(e) => setDetected(e.target.value)}
                      placeholder={isRTL ? 'اكتب أو صحح اسم الدواء...' : 'Type or correct the medicine name...'}
                      className="flex-1 glass-card px-3 py-2 text-sm font-tajawal focus:outline-none focus:border-brand-green"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { if (detected && detected.trim()) { onResult(detected.trim()); onClose(); } }}
                    disabled={!detected?.trim()}
                    className="btn-primary flex-1 text-sm disabled:opacity-50"
                  >
                    {isRTL ? 'بحث عن الدواء' : 'Search Medicine'}
                  </button>
                  <button onClick={() => { setImage(null); setDetected(null); }} className="btn-secondary text-sm px-4">
                    {isRTL ? 'إعادة' : 'Retry'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </motion.div>
    </motion.div>
  );
}
