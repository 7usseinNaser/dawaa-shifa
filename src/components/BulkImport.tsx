import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, FileJson, Loader as Loader2, CircleCheck as CheckCircle, Circle as XCircle, TriangleAlert as AlertTriangle, X, Download, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/lib/i18n';

type EntityType = 'pharmacies' | 'facilities' | 'medicines';

interface ImportSummary {
  added: string[];
  skipped: { name: string; reason: string }[];
  failed: { name: string; reason: string }[];
}

interface FieldMap {
  key: string;
  label: string;
  labelAr: string;
  required: boolean;
}

const FIELD_MAPS: Record<EntityType, FieldMap[]> = {
  pharmacies: [
    { key: 'name', label: 'Name', labelAr: 'الاسم', required: true },
    { key: 'area', label: 'Area', labelAr: 'المنطقة', required: true },
    { key: 'address', label: 'Address', labelAr: 'العنوان', required: false },
    { key: 'lat', label: 'Latitude', labelAr: 'خط العرض', required: false },
    { key: 'lng', label: 'Longitude', labelAr: 'خط الطول', required: false },
    { key: 'phone', label: 'Phone', labelAr: 'الهاتف', required: false },
    { key: 'open_hours', label: 'Open Hours', labelAr: 'ساعات العمل', required: false },
    { key: 'is_open', label: 'Is Open (true/false)', labelAr: 'مفتوح', required: false },
    { key: 'status', label: 'Status (open/busy/emergency/closed)', labelAr: 'الحالة', required: false },
    { key: 'verified', label: 'Verified (true/false)', labelAr: 'موثق', required: false },
    { key: 'power_status', label: 'Power (generator/no_power/grid/unknown)', labelAr: 'الكهرباء', required: false },
  ],
  facilities: [
    { key: 'name', label: 'Name', labelAr: 'الاسم', required: true },
    { key: 'type', label: 'Type (hospital/clinic/medical_point)', labelAr: 'النوع', required: true },
    { key: 'area', label: 'Area', labelAr: 'المنطقة', required: true },
    { key: 'address', label: 'Address', labelAr: 'العنوان', required: false },
    { key: 'lat', label: 'Latitude', labelAr: 'خط العرض', required: false },
    { key: 'lng', label: 'Longitude', labelAr: 'خط الطول', required: false },
    { key: 'phone', label: 'Phone', labelAr: 'الهاتف', required: false },
    { key: 'is_free', label: 'Is Free (true/false)', labelAr: 'مجاني', required: false },
    { key: 'overall_status', label: 'Status (open/busy/emergency/closed)', labelAr: 'الحالة', required: false },
    { key: 'verified', label: 'Verified (true/false)', labelAr: 'موثق', required: false },
    { key: 'power_status', label: 'Power (generator/no_power/grid/unknown)', labelAr: 'الكهرباء', required: false },
    { key: 'occupancy_rate', label: 'Occupancy %', labelAr: 'نسبة الإشغال', required: false },
  ],
  medicines: [
    { key: 'name', label: 'Name', labelAr: 'الاسم', required: true },
    { key: 'active_ingredient', label: 'Active Ingredient', labelAr: 'المادة الفعالة', required: false },
    { key: 'price', label: 'Price', labelAr: 'السعر', required: false },
    { key: 'quantity', label: 'Quantity', labelAr: 'الكمية', required: false },
    { key: 'expiry_date', label: 'Expiry Date (YYYY-MM-DD)', labelAr: 'تاريخ الصلاحية', required: false },
    { key: 'category', label: 'Category', labelAr: 'الفئة', required: false },
    { key: 'pharmacy_id', label: 'Pharmacy ID (optional)', labelAr: 'معرف الصيدلية', required: false },
  ],
};

function normalize(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'نعم';
}

function parseNum(v: unknown): number {
  const n = parseFloat(String(v ?? '0').replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

export function BulkImport({ entityType, pharmacyId, onClose, onDone, isRTL }: {
  entityType: EntityType;
  pharmacyId?: string;
  onClose: () => void;
  onDone: () => void;
  isRTL: boolean;
}) {
  const { t } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState('');
  const fields = FIELD_MAPS[entityType];

  const handleFile = useCallback((file: File) => {
    setError('');
    setSummary(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let data: Record<string, unknown>[] = [];
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(String(e.target?.result));
          data = Array.isArray(json) ? json : [json];
        } else {
          const wb = XLSX.read(e.target?.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          data = XLSX.utils.sheet_to_json(ws);
        }
        const cleaned = data.map((r) => {
          const out: Record<string, unknown> = {};
          for (const f of fields) {
            out[f.key] = r[f.key] ?? r[f.label] ?? r[f.labelAr] ?? '';
          }
          return out;
        });
        setRows(cleaned);
      } catch {
        setError(isRTL ? 'فشل قراءة الملف. تأكد من الصيغة.' : 'Failed to read file. Check format.');
      }
    };
    if (file.name.endsWith('.json')) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  }, [fields, isRTL]);

  const doImport = async () => {
    setLoading(true);
    setError('');
    const result: ImportSummary = { added: [], skipped: [], failed: [] };

    const { data: existing } = await supabase.from(entityType).select('name');
    const existingNames = new Set((existing || []).map((r: { name: string }) => normalize(r.name)));

    for (const row of rows) {
      const name = String(row.name ?? '').trim();
      if (!name) {
        result.failed.push({ name: '(empty)', reason: isRTL ? 'اسم فارغ' : 'Empty name' });
        continue;
      }
      const requiredOk = fields.filter((f) => f.required).every((f) => String(row[f.key] ?? '').trim());
      if (!requiredOk) {
        result.failed.push({ name, reason: isRTL ? 'حقول مطلوبة ناقصة' : 'Missing required fields' });
        continue;
      }
      if (existingNames.has(normalize(name))) {
        result.skipped.push({ name, reason: isRTL ? 'مسجل مسبقاً' : 'Already exists' });
        continue;
      }
      existingNames.add(normalize(name));

      const hasMissingOptional = fields.some((f) => !f.required && (String(row[f.key] ?? '').trim() === ''));

      const record: Record<string, unknown> = { name };
      for (const f of fields) {
        if (f.key === 'name') continue;
        const val = row[f.key];
        if (val === '' || val === undefined || val === null) continue;
        if (['is_open', 'verified', 'is_free'].includes(f.key)) record[f.key] = parseBool(val);
        else if (['lat', 'lng', 'price', 'occupancy_rate'].includes(f.key)) record[f.key] = parseNum(val);
        else if (f.key === 'quantity') record[f.key] = Math.round(parseNum(val));
        else record[f.key] = String(val).trim();
      }
      if (entityType === 'medicines' && pharmacyId) {
        record.pharmacy_id = pharmacyId;
      }
      if (entityType === 'medicines') {
        record.is_incomplete = hasMissingOptional;
      }
      if (entityType === 'pharmacies') {
        if (!record.lat) record.lat = 31.5;
        if (!record.lng) record.lng = 34.47;
        if (!record.is_open) record.is_open = true;
        if (!record.status) record.status = 'open';
        if (!record.power_status) record.power_status = 'unknown';
        if (!record.verified) record.verified = false;
      }
      if (entityType === 'facilities') {
        if (!record.lat) record.lat = 31.5;
        if (!record.lng) record.lng = 34.47;
        if (!record.overall_status) record.overall_status = 'open';
        if (!record.power_status) record.power_status = 'unknown';
        if (!record.verified) record.verified = false;
        if (!record.occupancy_rate) record.occupancy_rate = 0;
      }

      const { error: insError } = await supabase.from(entityType).insert(record);
      if (insError) {
        result.failed.push({ name, reason: insError.message });
      } else {
        result.added.push(name);
      }
    }

    setSummary(result);
    setLoading(false);
    onDone();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{}]);
    XLSX.utils.sheet_add_aoa(ws, [fields.map((f) => f.label)], { origin: 'A1' });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${entityType}_template.xlsx`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card p-5 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cairo font-bold text-base flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-green" />
            {isRTL ? 'استيراد بيانات مجمعة' : 'Bulk Import'} — {entityType}
          </h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Upload */}
        {!summary && (
          <div className="space-y-4">
            {/* Template download */}
            <button onClick={downloadTemplate} className="text-xs font-tajawal text-brand-blue-light hover:underline flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              {isRTL ? 'تحميل قالب فارغ' : 'Download empty template'}
            </button>

            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[var(--border-subtle)] rounded-2xl p-8 text-center cursor-pointer hover:border-brand-green transition-colors"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {fileName ? (
                <div className="flex flex-col items-center gap-2">
                  {fileName.endsWith('.json') ? <FileJson className="w-10 h-10 text-brand-blue-light" /> : <FileSpreadsheet className="w-10 h-10 text-status-open" />}
                  <p className="font-tajawal text-sm font-bold">{fileName}</p>
                  <p className="text-xs text-[var(--text-muted)]">{rows.length} {isRTL ? 'صفف جاهزة' : 'rows ready'}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-[var(--text-muted)]" />
                  <p className="font-tajawal text-sm">{isRTL ? 'اسحب ملف هنا أو انقر للاختيار' : 'Drag file here or click to browse'}</p>
                  <p className="text-xs text-[var(--text-muted)]">Excel, CSV, JSON</p>
                </div>
              )}
            </div>

            {/* Field mapping info */}
            <div className="glass-card p-3">
              <p className="text-xs font-cairo font-bold mb-2">{isRTL ? 'الحقول المطلوبة' : 'Required Fields'}:</p>
              <div className="flex flex-wrap gap-1.5">
                {fields.map((f) => (
                  <span key={f.key} className={`text-[10px] px-2 py-1 rounded-full font-tajawal ${f.required ? 'bg-brand-green/20 text-brand-green font-bold' : 'glass text-[var(--text-muted)]'}`}>
                    {isRTL ? f.labelAr : f.label}{f.required ? ' *' : ''}
                  </span>
                ))}
              </div>
            </div>

            {/* Preview */}
            {rows.length > 0 && (
              <div className="glass-card p-3 max-h-40 overflow-auto">
                <p className="text-xs font-cairo font-bold mb-2">{isRTL ? 'معاينة' : 'Preview'} ({rows.length} {isRTL ? 'صف' : 'rows'})</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] font-tajawal">
                    <thead>
                      <tr className="text-[var(--text-muted)]">
                        <th className="p-1">{isRTL ? 'تحذير' : 'Flag'}</th>
                        {fields.slice(0, 5).map((f) => (<th key={f.key} className="text-start p-1">{isRTL ? f.labelAr : f.label}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((r, i) => {
                        const hasMissing = fields.some((f) => !f.required && String(r[f.key] ?? '').trim() === '');
                        return (
                          <tr key={i} className="border-t border-[var(--border-subtle)]">
                            <td className="p-1">{hasMissing && <span className="text-status-emergency">⚠</span>}</td>
                            {fields.slice(0, 5).map((f) => (<td key={f.key} className="p-1 truncate max-w-24">{String(r[f.key] ?? '—')}</td>))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {rows.some((r) => fields.some((f) => !f.required && String(r[f.key] ?? '').trim() === '')) && (
                  <p className="text-[10px] text-status-emergency font-tajawal mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {isRTL ? 'الصفوف ذات التحذير ستُحفظ ولكن لن تظهر للجمهور حتى تكتمل' : 'Flagged rows will be saved but hidden from public until completed'}</p>
                )}
              </div>
            )}

            {error && <p className="text-xs text-status-emergency font-tajawal">{error}</p>}

            {/* Import button */}
            {rows.length > 0 && (
              <button onClick={doImport} disabled={loading} className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? (isRTL ? 'جاري الاستيراد...' : 'Importing...') : (isRTL ? 'بدء الاستيراد' : 'Start Import')}
              </button>
            )}
          </div>
        )}

        {/* Step 2: Summary */}
        {summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card p-3 text-center">
                <CheckCircle className="w-6 h-6 text-status-open mx-auto mb-1" />
                <div className="text-2xl font-inter font-bold text-status-open">{summary.added.length}</div>
                <div className="text-[10px] font-tajawal text-[var(--text-muted)]">{isRTL ? 'تمت الإضافة' : 'Added'}</div>
              </div>
              <div className="glass-card p-3 text-center">
                <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                <div className="text-2xl font-inter font-bold text-amber-400">{summary.skipped.length}</div>
                <div className="text-[10px] font-tajawal text-[var(--text-muted)]">{isRTL ? 'متكرر (تجاهل)' : 'Skipped'}</div>
              </div>
              <div className="glass-card p-3 text-center">
                <XCircle className="w-6 h-6 text-status-emergency mx-auto mb-1" />
                <div className="text-2xl font-inter font-bold text-status-emergency">{summary.failed.length}</div>
                <div className="text-[10px] font-tajawal text-[var(--text-muted)]">{isRTL ? 'فشل' : 'Failed'}</div>
              </div>
            </div>

            {/* Added list */}
            {summary.added.length > 0 && (
              <div className="glass-card p-3 max-h-32 overflow-y-auto">
                <p className="text-xs font-cairo font-bold text-status-open mb-2 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> {isRTL ? 'تمت الإضافة بنجاح' : 'Successfully Added'}</p>
                <div className="flex flex-wrap gap-1">
                  {summary.added.map((n, i) => (<span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-status-open/15 text-status-open font-tajawal">{n}</span>))}
                </div>
              </div>
            )}

            {/* Skipped list */}
            {summary.skipped.length > 0 && (
              <div className="glass-card p-3 max-h-32 overflow-y-auto">
                <p className="text-xs font-cairo font-bold text-amber-400 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {isRTL ? 'متكرر — تم تجاهله' : 'Skipped (Duplicates)'}</p>
                <div className="space-y-1">
                  {summary.skipped.map((s, i) => (
                    <div key={i} className="text-[10px] font-tajawal flex justify-between">
                      <span className="text-[var(--text-soft)]">{s.name}</span>
                      <span className="text-[var(--text-muted)]">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed list */}
            {summary.failed.length > 0 && (
              <div className="glass-card p-3 max-h-32 overflow-y-auto">
                <p className="text-xs font-cairo font-bold text-status-emergency mb-2 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> {isRTL ? 'فشل — بيانات ناقصة' : 'Failed (Incomplete)'}</p>
                <div className="space-y-1">
                  {summary.failed.map((f, i) => (
                    <div key={i} className="text-[10px] font-tajawal flex justify-between">
                      <span className="text-[var(--text-soft)]">{f.name}</span>
                      <span className="text-[var(--text-muted)]">{f.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={onClose} className="btn-primary w-full text-sm">
              {isRTL ? 'تم' : 'Done'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
