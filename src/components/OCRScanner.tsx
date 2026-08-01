import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Loader as Loader2, ScanLine, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, RefreshCw, Search } from 'lucide-react';
import type { Medicine, Pharmacy } from '@/lib/supabase';
import { matchTextToMedicines } from '@/lib/search';

interface OCRScannerProps {
  onResult: (text: string) => void;
  onClose: () => void;
  isRTL: boolean;
  medicines?: Medicine[];
  pharmacies?: Pharmacy[];
}

type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';

interface MatchResult {
  name: string;
  score: number;
  pharmacyName?: string;
}

/**
 * Preprocess image: improve contrast and crop empty borders.
 * Draws to an offscreen canvas, applies grayscale + contrast boost,
 * then crops to the non-empty bounding box to reduce OCR noise.
 */
async function preprocessImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Grayscale + contrast boost
      const contrast = 1.5;
      const intercept = 128 * (1 - contrast);
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const v = Math.max(0, Math.min(255, gray * contrast + intercept));
        data[i] = data[i + 1] = data[i + 2] = v;
      }
      ctx.putImageData(imageData, 0, 0);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function OCRScanner({ onResult, onClose, isRTL, medicines = [], pharmacies = [] }: OCRScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [detected, setDetected] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [recognizedLines, setRecognizedLines] = useState<string[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<{ terminate: () => Promise<unknown> } | null>(null);

  useEffect(() => () => { workerRef.current?.terminate().catch(() => {}); }, []);

  const scanImage = useCallback(async (imgUrl: string) => {
    setStatus('scanning');
    setProgress(0);
    setDetected('');
    setRecognizedLines([]);
    setErrorMsg('');
    setMatchResults([]);

    try {
      // Preprocess: improve contrast before OCR
      const processedUrl = await preprocessImage(imgUrl);

      const Tesseract = await import('tesseract.js');
      const createWorker = Tesseract.createWorker ?? Tesseract.default?.createWorker;
      if (!createWorker) throw new Error('Tesseract createWorker not found');
      const worker = await createWorker(['eng', 'ara'], 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });
      workerRef.current = worker;
      const { data } = await worker.recognize(processedUrl);
      await worker.terminate();
      workerRef.current = null;

      const rawText = (data.text || '').trim();
      if (!rawText) {
        setStatus('error');
        setErrorMsg(isRTL ? 'لم يتم العثور على نص. حاول صورة أوضح.' : 'No text found. Try a clearer photo.');
        return;
      }
      const lines = rawText.split('\n').map((l: string) => l.trim()).filter(Boolean);
      setRecognizedLines(lines);

      // Match against real medicine inventory using fuzzy search
      if (medicines.length > 0) {
        const matches = matchTextToMedicines(rawText, medicines, pharmacies, 0.45);
        if (matches.length > 0) {
          const results: MatchResult[] = matches.slice(0, 5).map((m) => ({
            name: m.medicine.medicine_name,
            score: m.score,
            pharmacyName: m.pharmacy?.name,
          }));
          setMatchResults(results);

          if (matches.length === 1 || (matches.length > 1 && matches[0].score < 0.2)) {
            // Strong single match — auto-select
            setDetected(matches[0].medicine.medicine_name);
          } else {
            // Multiple candidates — let user pick
            setDetected(matches[0].medicine.medicine_name);
          }
          setStatus('done');
          return;
        }
      }

      // Fallback: extract from raw text if no inventory match
      const medKeywords = [
        'paracetamol', 'amoxicillin', 'ibuprofen', 'omeprazole', 'metformin',
        'loratadine', 'aspirin', 'cetirizine', 'azithromycin', 'ciprofloxacin',
        'ranitidine', 'esomeprazole', 'diclofenac', 'naproxen', 'clarithromycin',
        'vitamin', 'panadol', 'augmentin', 'glucose', 'insulin',
        'باراسيتامول', 'بانادول', 'أموكسيسيلين', 'أسبيرين', 'أوميبرازول',
        'ميتفورمين', 'لوراتادين', 'أزيثروميسين', 'سيبروفلوكساسين', 'ديكلوفيناك',
        'فيتامين', 'إنسولين', 'أوجمنتين', 'سيتريزين', 'نابروكسين',
      ];
      const lowerText = rawText.toLowerCase();
      let found = '';
      for (const kw of medKeywords) {
        if (lowerText.includes(kw.toLowerCase())) {
          found = kw.charAt(0).toUpperCase() + kw.slice(1);
          break;
        }
      }
      if (!found && lines.length > 0) {
        found = lines[0].replace(/[^a-zA-Z\u0600-\u06FF\s]/g, '').trim().split(/\s+/).slice(0, 3).join(' ');
      }
      setDetected(found || lines[0] || '');
      setStatus('done');
    } catch {
      setStatus('error');
      setErrorMsg(isRTL ? 'فشل قراءة الصورة. حاول مرة أخرى.' : 'Failed to read image. Please try again.');
    }
  }, [isRTL, medicines, pharmacies]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setImage(url);
      scanImage(url);
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setImage(null);
    setStatus('idle');
    setDetected('');
    setProgress(0);
    setRecognizedLines([]);
    setErrorMsg('');
    setMatchResults([]);
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
        className="glass-card p-5 w-full max-w-md max-h-[90vh] overflow-y-auto"
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
                {isRTL ? 'لأفضل نتيجة: إضاءة جيدة، نص واضح، وتركيز على اسم الدواء. المعالجة تتم على جهازك.' : 'For best results: good lighting, clear text, focus on the medicine name. Processing happens on your device.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden glass-card">
              <img src={image} alt="scan" className="w-full max-h-48 object-contain" />
              {status === 'scanning' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-green-light" />
                  <p className="text-xs text-white font-tajawal">
                    {isRTL ? `جاري القراءة... ${progress}%` : `Reading... ${progress}%`}
                  </p>
                  <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-green-light transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <motion.div
                    animate={{ y: [-60, 60, -60] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 right-0 h-0.5 bg-brand-green-light shadow-lg shadow-brand-green/50"
                  />
                </div>
              )}
            </div>

            {status === 'error' && (
              <div className="glass-card p-3 flex items-start gap-2 bg-status-emergency/10">
                <AlertTriangle className="w-4 h-4 text-status-emergency shrink-0 mt-0.5" />
                <p className="text-xs font-tajawal text-status-emergency">{errorMsg}</p>
              </div>
            )}

            {status === 'done' && (
              <>
                {/* Medicine inventory matches */}
                {matchResults.length > 0 && (
                  <div className="glass-card p-3">
                    <p className="text-xs font-tajawal font-bold text-brand-green-light mb-2 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5" />
                      {isRTL
                        ? `وُجدت ${matchResults.length} تطابق محتمل في المخزون:`
                        : `Found ${matchResults.length} potential matches in inventory:`}
                    </p>
                    <div className="space-y-1.5">
                      {matchResults.map((m, i) => (
                        <button
                          key={i}
                          onClick={() => setDetected(m.name)}
                          className={`w-full text-right px-3 py-2 rounded-lg transition-colors flex items-center justify-between gap-2 ${
                            detected === m.name
                              ? 'bg-brand-green/20 border border-brand-green/40'
                              : 'bg-white/5 hover:bg-brand-green/10'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-tajawal font-bold block truncate">{m.name}</span>
                            {m.pharmacyName && (
                              <span className="text-[10px] text-[var(--text-muted)] block truncate">{m.pharmacyName}</span>
                            )}
                          </div>
                          {i === 0 && (
                            <span className="text-[10px] text-brand-green-light font-bold shrink-0">
                              {isRTL ? 'الأقرب' : 'Best match'}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {recognizedLines.length > 1 && (
                  <div className="glass-card p-2 max-h-20 overflow-y-auto">
                    <p className="text-[10px] font-tajawal text-[var(--text-muted)] mb-1">
                      {isRTL ? 'كل النص المكتشف:' : 'All detected text:'}
                    </p>
                    {recognizedLines.slice(0, 5).map((line, i) => (
                      <p key={i} className="text-xs font-mono text-[var(--text-soft)] truncate">{line}</p>
                    ))}
                  </div>
                )}
                <div className="glass-card p-3">
                  <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1.5">
                    {isRTL ? 'اسم الدواء المكتشف (عدّل إذا لزم)' : 'Detected medicine name (edit if needed)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-status-open shrink-0" />
                    <input
                      value={detected}
                      onChange={(e) => setDetected(e.target.value)}
                      placeholder={isRTL ? 'اكتب أو صحح اسم الدواء...' : 'Type or correct the medicine name...'}
                      className="flex-1 glass-card px-3 py-2 text-sm font-tajawal focus:outline-none focus:border-brand-green"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { if (detected.trim()) { onResult(detected.trim()); onClose(); } }}
                    disabled={!detected.trim()}
                    className="btn-primary flex-1 text-sm disabled:opacity-50"
                  >
                    {isRTL ? 'بحث عن الدواء' : 'Search Medicine'}
                  </button>
                  <button onClick={reset} className="btn-secondary text-sm px-4 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
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
