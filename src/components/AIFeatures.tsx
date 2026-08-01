import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertOctagon, Clock, Pill, Loader2, Sparkles, Search, ArrowRight, X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import { supabase, type Medicine, type Pharmacy, type ChronicMedicine } from '@/lib/supabase';
import { showToast } from '@/components/ui/Toast';

/* ============================================================
   DRUG INTERACTION CHECKER
   Known major drug interactions (simplified clinical reference)
   ============================================================ */
const INTERACTIONS: { a: string[]; b: string[]; severity: 'danger' | 'warning'; note: string; noteAr: string }[] = [
  { a: ['warfarin', 'ماريفان'], b: ['aspirin', 'أسبرين', 'حمض الصفصاف'], severity: 'danger', note: 'Increased bleeding risk', noteAr: 'خطر نزيف متزايد' },
  { a: ['warfarin', 'ماريفان'], b: ['ibuprofen', 'ايبوبروفين', 'بروفين'], severity: 'danger', note: 'Serious bleeding risk', noteAr: 'خطر نزيف خطير' },
  { a: ['warfarin', 'ماريفان'], b: ['amoxicillin', 'أموكسيسيلين'], severity: 'warning', note: 'May increase warfarin effect', noteAr: 'قد يزيد تأثير الوارفارين' },
  { a: ['metformin', 'جلوكوفاج', 'ميتفورمين'], b: ['alcohol', 'كحول'], severity: 'danger', note: 'Lactic acidosis risk', noteAr: 'خطر الحماض اللبني' },
  { a: ['metformin', 'جلوكوفاج', 'ميتفورمين'], b: ['contrast dye', 'صبغة'], severity: 'warning', note: 'Stop metformin before imaging', noteAr: 'أوقف الميتفورمين قبل الأشعة' },
  { a: ['lisinopril', 'إنالابريل', 'enalapril', 'كابتوبريل'], b: ['potassium', 'بوتاسيوم'], severity: 'warning', note: 'High potassium risk', noteAr: 'خطر ارتفاع البوتاسيوم' },
  { a: ['simvastatin', 'ستاتين', 'atorvastatin', 'ليبitor'], b: ['clarithromycin', 'كلاريثروميسين'], severity: 'danger', note: 'Muscle damage risk', noteAr: 'خطر تلف العضلات' },
  { a: ['fluoxetine', 'فلوكستين', 'بروزاك'], b: ['tramadol', 'ترامادول'], severity: 'danger', note: 'Serotonin syndrome risk', noteAr: 'خطر متلازمة السيروتونين' },
  { a: ['omeprazole', 'أوميبرازول', 'موتيليوم'], b: ['clopidogrel', 'كلوبيدوقرل'], severity: 'warning', note: 'Reduces clopidogrel effectiveness', noteAr: 'يقلل فعالية كلوبيدوقرل' },
  { a: ['amoxicillin', 'أموكسيسيلين'], b: ['methotrexate', 'ميثوتريكسات'], severity: 'danger', note: 'Methotrexate toxicity', noteAr: 'سمية الميثوتريكسات' },
];

function checkInteractions(meds: { name: string; active_ingredient?: string }[]) {
  const results: { med1: string; med2: string; severity: 'danger' | 'warning'; note: string; noteAr: string }[] = [];
  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      const m1 = `${meds[i].name} ${meds[i].active_ingredient || ''}`.toLowerCase();
      const m2 = `${meds[j].name} ${meds[j].active_ingredient || ''}`.toLowerCase();
      for (const inter of INTERACTIONS) {
        const match1 = inter.a.some((k) => m1.includes(k)) && inter.b.some((k) => m2.includes(k));
        const match2 = inter.b.some((k) => m1.includes(k)) && inter.a.some((k) => m2.includes(k));
        if (match1 || match2) {
          results.push({ med1: meds[i].name, med2: meds[j].name, severity: inter.severity, note: inter.note, noteAr: inter.noteAr });
        }
      }
    }
  }
  return results;
}

export function DrugInteractionChecker({ chronicMeds }: { chronicMeds: ChronicMedicine[] }) {
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const interactions = useMemo(() => {
    return checkInteractions(chronicMeds.map((m) => ({ name: m.name, active_ingredient: m.name })));
  }, [chronicMeds]);

  if (chronicMeds.length < 2) return null;

  return (
    <div className="glass-card p-4 space-y-3">
      <h3 className="font-cairo font-bold text-sm flex items-center gap-2">
        <AlertOctagon className={`w-4 h-4 ${interactions.length > 0 ? 'text-status-emergency animate-pulse' : 'text-status-open'}`} />
        {isRTL ? 'فاحص التداخلات الدوائية' : 'Drug Interaction Checker'}
      </h3>
      {interactions.length === 0 ? (
        <div className="flex items-center gap-2 text-xs font-tajawal text-status-open">
          <Sparkles className="w-3.5 h-3.5" />
          {isRTL ? 'لا توجد تعارضات بين أدويتك الحالية' : 'No interactions found between your current medicines'}
        </div>
      ) : (
        <div className="space-y-2">
          {interactions.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-2.5 rounded-xl border ${r.severity === 'danger' ? 'bg-status-emergency/10 border-status-emergency/30' : 'bg-amber-500/10 border-amber-500/30'}`}
            >
              <div className="flex items-center gap-1.5 text-xs font-cairo font-bold">
                <span className={r.severity === 'danger' ? 'text-status-emergency' : 'text-amber-400'}>
                  {r.med1} + {r.med2}
                </span>
              </div>
              <p className={`text-[10px] font-tajawal mt-1 ${r.severity === 'danger' ? 'text-status-emergency' : 'text-amber-400'}`}>
                {isRTL ? r.noteAr : r.note}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   REFILL PREDICTOR
   Calculates days until medicine runs out and warns 3 days before
   ============================================================ */
export function RefillPredictor({ chronicMeds }: { chronicMeds: ChronicMedicine[] }) {
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const predictions = useMemo(() => {
    return chronicMeds.map((m) => {
      const perDay = m.pills_per_day > 0 ? m.pills_per_day : 1;
      const daysLeft = Math.floor(m.pills_left / perDay);
      const needsRefill = daysLeft <= 3 && m.pills_left > 0;
      const empty = m.pills_left === 0;
      return { ...m, daysLeft, needsRefill, empty };
    }).filter((p) => p.needsRefill || p.empty);
  }, [chronicMeds]);

  if (predictions.length === 0) return null;

  return (
    <div className="glass-card p-4 space-y-3">
      <h3 className="font-cairo font-bold text-sm flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-400" />
        {isRTL ? 'تنبيهات نفاد الدواء' : 'Refill Alerts'}
      </h3>
      <div className="space-y-2">
        {predictions.map((p) => (
          <div key={p.id} className={`p-2.5 rounded-xl flex items-center gap-2 ${p.empty ? 'bg-status-emergency/10' : 'bg-amber-500/10'}`}>
            <Pill className={`w-4 h-4 shrink-0 ${p.empty ? 'text-status-emergency' : 'text-amber-400'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-cairo font-bold truncate">{p.name}</div>
              <div className={`text-[10px] font-tajawal ${p.empty ? 'text-status-emergency' : 'text-amber-400'}`}>
                {p.empty
                  ? (isRTL ? 'نفد! يرجى التجديد فوراً' : 'Empty! Refill now')
                  : (isRTL ? `متبقي ${p.daysLeft} أيام — جدد قريباً` : `${p.daysLeft} days left — refill soon`)}
              </div>
            </div>
            <span className="text-xs font-inter font-bold text-[var(--text-muted)]">{p.pills_left}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   GENERIC FINDER
   Finds cheaper alternatives with same active ingredient
   ============================================================ */
export function GenericFinder({ medicineName, activeIngredient }: { medicineName: string; activeIngredient?: string }) {
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const [alternatives, setAlternatives] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const findAlternatives = async () => {
    setLoading(true);
    setShow(true);
    try {
      const { data } = await supabase
        .from('medicines')
        .select('*')
        .ilike('generic_name', `%${activeIngredient || medicineName}%`)
        .neq('medicine_name', medicineName)
        .limit(5);
      setAlternatives((data || []) as Medicine[]);
    } catch {
      setAlternatives([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={findAlternatives} className="btn-secondary text-xs flex items-center gap-1.5 w-full justify-center">
        <Search className="w-3.5 h-3.5" />
        {isRTL ? 'البحث عن بدائل أرخص' : 'Find Cheaper Alternatives'}
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShow(false)}
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
                  <Sparkles className="w-5 h-5 text-brand-green" />
                  {isRTL ? 'البدائل المتاحة' : 'Available Alternatives'}
                </h3>
                <button onClick={() => setShow(false)} className="text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-tajawal mb-3">
                {isRTL ? `بدائل بنفس المادة الفعالة: ${activeIngredient || medicineName}` : `Alternatives with same active ingredient: ${activeIngredient || medicineName}`}
              </p>
              {loading ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-brand-green" /></div>
              ) : alternatives.length === 0 ? (
                <p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-6">{isRTL ? 'لا توجد بدائل متاحة حالياً' : 'No alternatives available'}</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {alternatives.map((alt) => (
                    <div key={alt.id} className="glass-card p-3 flex items-center justify-between">
                      <div>
                        <div className="font-cairo font-bold text-sm">{alt.medicine_name}</div>
                        <div className="text-xs text-[var(--text-muted)] font-tajawal">{alt.generic_name || '—'}</div>
                      </div>
                      <div className="text-end">
                        <div className="font-inter font-bold text-sm text-brand-green">{alt.price ? `${alt.price}₪` : '—'}</div>
                        {alt.is_available && <span className="text-[10px] text-status-open font-bold">{isRTL ? 'متوفر' : 'Available'}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
