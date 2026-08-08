import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, Copy, Loader as Loader2, Pill, Search, Store, X } from 'lucide-react';
import { supabase, type Medicine, type Pharmacy } from '@/lib/supabase';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function CloneFromPharmacy({
  targetPharmacyId,
  onClose,
  onDone,
  isRTL,
  allowReference = false,
}: {
  targetPharmacyId: string;
  onClose: () => void;
  onDone: () => void;
  isRTL: boolean;
  allowReference?: boolean;
}) {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmId, setSelectedPharmId] = useState<string | null>(null);
  const [selectedMeds, setSelectedMeds] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [cloning, setCloning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const query = supabase
        .from('pharmacies')
        .select('id,name,area,is_reference,deleted_at,owner_id,approval_status')
        .is('deleted_at', null)
        .neq('id', targetPharmacyId)
        .order('name', { ascending: true });
      const { data, error } = await query;
      if (error) console.error('[CloneFromPharmacy] query error:', error.message);
      const filtered = (data as Pharmacy[]).filter((p) =>
        p.is_reference === true || p.approval_status === 'approved'
      );
      if (filtered) setPharmacies(filtered);
      setLoading(false);
    })();
  }, [targetPharmacyId]);

  async function loadPharmMeds(pharmId: string) {
    setSelectedPharmId(pharmId);
    const { data } = await supabase
      .from('medicines')
      .select('id,pharmacy_id,medicine_name,generic_name,price,quantity,expiry_date,deleted_at,is_restricted,alternative_medicine_id,is_incomplete,category,price_usd,is_available,restriction_note,last_updated,created_at')
      .eq('pharmacy_id', pharmId)
      .is('deleted_at', null)
      .order('medicine_name', { ascending: true });
    if (data) setSelectedMeds(data as Medicine[]);
  }

  const filteredMeds = search.trim()
    ? selectedMeds.filter((m) =>
        m.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
        (m.generic_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : selectedMeds;

  async function cloneAll() {
    if (selectedMeds.length === 0) return;
    setCloning(true);
    const rows = selectedMeds.map((m) => ({
      pharmacy_id: targetPharmacyId,
      medicine_name: m.medicine_name,
      generic_name: m.generic_name || '',
      price: m.price,
      quantity: m.quantity,
      expiry_date: m.expiry_date || null,
      category: m.category || null,
      is_available: true,
      is_restricted: false,
      last_updated: new Date().toISOString(),
    }));
    const { error } = await supabase.from('medicines').insert(rows);
    setCloning(false);
    if (error) {
      console.error('[cloneAll] Supabase error:', error.code, error.message, error.details, error.hint);
      return;
    }
    onDone();
  }

  const selectedPharm = pharmacies.find((p) => p.id === selectedPharmId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Copy className="w-5 h-5 text-brand-green" />
            {isRTL ? 'استيراد من صيدلية أخرى' : 'Import from another pharmacy'}
          </h2>
          <button
        onClick={onClose}
        className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
        </div>

        {!selectedPharmId && (
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
              </div>
            ) : pharmacies.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">
                {isRTL ? 'لا توجد صيدليات متاحة للاستنساخ' : 'No pharmacies available for cloning'}
              </p>
            ) : (
              pharmacies.map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadPharmMeds(p.id)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl glass hover:border-brand-green transition-all text-start"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-green/15 flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{p.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{p.area}</p>
                  </div>
                  {p.is_reference && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-blue/20 text-brand-blue-light">
                      {isRTL ? 'مرجعية' : 'Reference'}
                    </span>
                  )}
                  <ChevronLeft className="w-4 h-4 text-[var(--text-muted)] rotate-180" />
                </button>
              ))
            )}
          </div>
        )}

        {selectedPharmId && (
          <div className="space-y-4">
            <button
              onClick={() => { setSelectedPharmId(null); setSelectedMeds([]); }}
              className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-brand-green transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {isRTL ? 'رجوع للقائمة' : 'Back to list'}
            </button>

            <div className="glass p-3 rounded-2xl">
              <p className="font-bold text-sm">{selectedPharm?.name}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {selectedMeds.length} {isRTL ? 'دواء متاح للاستنساخ' : 'medicines available to clone'}
              </p>
            </div>

            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 start-4 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRTL ? 'ابحث في الأدوية...' : 'Search medicines...'}
                className="w-full glass rounded-2xl ps-12 pe-4 py-3 bg-transparent outline-none focus:border-brand-green transition-colors text-sm"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {filteredMeds.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">
                  {isRTL ? 'لا توجد أدوية' : 'No medicines found'}
                </p>
              ) : (
                filteredMeds.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl glass">
                    <Pill className="w-4 h-4 text-brand-green shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">{m.medicine_name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {m.generic_name} · {m.price} ₪ · {isRTL ? 'الكمية' : 'Qty'}: {m.quantity}
                      </p>
                      {m.category && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-brand-green/15 text-brand-green-light">
                          {m.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={cloneAll}
              disabled={cloning || selectedMeds.length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {cloning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isRTL ? 'جاري الاستنساخ...' : 'Cloning...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isRTL ? `استنساخ كل الأدوية (${selectedMeds.length})` : `Clone all medicines (${selectedMeds.length})`}
                </>
              )}
            </button>
            <p className="text-xs text-[var(--text-muted)] text-center">
              {isRTL
                ? 'بعد الاستنساخ يمكنك تعديل الأسعار والكميات أو حذف الأدوية غير المتوفرة'
                : 'After cloning you can edit prices, quantities, or delete unavailable medicines'}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
