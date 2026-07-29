import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Clock, MapPin, Navigation, Phone, Pill,
  Search, Shield, SlidersHorizontal, Star, X,
} from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

type Status = 'open' | 'busy' | 'emergency' | 'closed';

interface Pharmacy {
  id: number;
  name: string;
  area: string;
  distance: number;
  walkingMin: number;
  rating: number;
  reviews: number;
  isOpen: boolean;
  status: Status;
  medicines: { name: string; price: number; quantity: number }[];
}

const statusMap: Record<Status, { label: string; cls: string; dot: string }> = {
  open: { label: 'مفتوحة', cls: 'bg-status-open/20 text-status-open', dot: 'bg-status-open' },
  busy: { label: 'مزدحمة', cls: 'bg-status-busy/20 text-status-busy', dot: 'bg-status-busy' },
  emergency: { label: 'طوارئ', cls: 'bg-status-emergency/20 text-status-emergency', dot: 'bg-status-emergency' },
  closed: { label: 'مغلقة', cls: 'bg-status-closed/20 text-status-closed', dot: 'bg-status-closed' },
};

const pharmacies: Pharmacy[] = [
  { id: 1, name: 'صيدلية الرحمة', area: 'غزة - الرمال', distance: 0.85, walkingMin: 11, rating: 4.8, reviews: 212, isOpen: true, status: 'open',
    medicines: [{ name: 'Augmentin 1g', price: 14, quantity: 23 }, { name: 'Panadol Extra', price: 8, quantity: 50 }, { name: 'Brufen 400', price: 6, quantity: 12 }] },
  { id: 2, name: 'صيدلية النور', area: 'غزة - تل الهوا', distance: 1.2, walkingMin: 15, rating: 4.6, reviews: 184, isOpen: true, status: 'open',
    medicines: [{ name: 'Augmentin 1g', price: 12, quantity: 8 }, { name: 'Panadol Extra', price: 7, quantity: 0 }] },
  { id: 3, name: 'صيدلية الشفاء', area: 'غزة - الزيتون', distance: 2.1, walkingMin: 26, rating: 4.3, reviews: 97, isOpen: true, status: 'busy',
    medicines: [{ name: 'Augmentin 1g', price: 15, quantity: 5 }, { name: 'Brufen 400', price: 7, quantity: 30 }] },
  { id: 4, name: 'صيدلية الحياة', area: 'غزة - الشيخ رضوان', distance: 3.4, walkingMin: 42, rating: 4.7, reviews: 156, isOpen: true, status: 'busy',
    medicines: [{ name: 'Augmentin 1g', price: 13, quantity: 18 }, { name: 'Panadol Extra', price: 9, quantity: 22 }] },
  { id: 5, name: 'صيدلية الأمل', area: 'غزة - الدرج', distance: 4.8, walkingMin: 58, rating: 4.1, reviews: 63, isOpen: false, status: 'closed',
    medicines: [{ name: 'Augmentin 1g', price: 16, quantity: 0 }] },
  { id: 6, name: 'صيدلية السلام', area: 'غزة - الشجاعية', distance: 5.2, walkingMin: 64, rating: 4.9, reviews: 241, isOpen: true, status: 'open',
    medicines: [{ name: 'Augmentin 1g', price: 11, quantity: 40 }, { name: 'Brufen 400', price: 5, quantity: 60 }] },
];

const allMeds = ['Augmentin 1g', 'Panadol Extra', 'Brufen 400'];

type SortKey = 'nearest' | 'cheapest' | 'rating';

/**
 * InteractiveDemo — fully interactive medicine search experience.
 * Features: live search, autocomplete, filters, sort, detail drawer,
 * distance/price/rating display, status badges, call/directions actions.
 */
export default function InteractiveDemo() {
  const { ref, visible } = useReveal();
  const [query, setQuery] = useState('');
  const [selectedMed, setSelectedMed] = useState('Augmentin 1g');
  const [sort, setSort] = useState<SortKey>('nearest');
  const [filterOpen, setFilterOpen] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [maxDist, setMaxDist] = useState(10);
  const [selected, setSelected] = useState<Pharmacy | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);

  const suggestions = useMemo(
    () => allMeds.filter((m) => m.toLowerCase().includes(query.toLowerCase()) && m !== query),
    [query]
  );

  const results = useMemo(() => {
    let list = pharmacies.filter((p) => {
      const has = p.medicines.some((m) => m.name === selectedMed && m.quantity > 0);
      return has;
    });
    if (onlyOpen) list = list.filter((p) => p.isOpen);
    list = list.filter((p) => p.distance <= maxDist);

    list = [...list].sort((a, b) => {
      if (sort === 'nearest') return a.distance - b.distance;
      if (sort === 'cheapest') {
        const pa = a.medicines.find((m) => m.name === selectedMed)?.price ?? 999;
        const pb = b.medicines.find((m) => m.name === selectedMed)?.price ?? 999;
        return pa - pb;
      }
      return b.rating - a.rating;
    });
    return list;
  }, [selectedMed, sort, onlyOpen, maxDist]);

  const onSearch = (val: string) => {
    setQuery(val);
    setShowSuggest(true);
    const match = allMeds.find((m) => m.toLowerCase() === val.toLowerCase().trim());
    if (match) setSelectedMed(match);
  };

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="mesh-gradient">
        <div className="mesh-blob bg-brand-green/15 w-[400px] h-[400px] top-0 right-0" />
      </div>

      <div ref={ref} className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-green-light mb-4">
            تجربة حية
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            جرّب البحث <span className="text-gradient">بنفسك</span>
          </h2>
          <p className="text-[var(--text-soft)] font-tajawal max-w-2xl mx-auto">
            ابحث عن دواء، صفّ النتائج، افتح تفاصيل الصيدلية — هذه تجربة حقيقية قريبة مما سيكون عليه التطبيق.
          </p>
        </div>

        {/* Search bar */}
        <div className={`relative max-w-2xl mx-auto mb-6 reveal ${visible ? 'visible' : ''}`}>
          <div className="glass-card p-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-green-light" />
              <input
                value={query}
                onChange={(e) => onSearch(e.target.value)}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
                placeholder="ابحث عن دواء... (مثال: Augmentin)"
                className="w-full bg-transparent pr-11 pl-4 py-3 text-right font-tajawal text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none"
                aria-label="بحث الدواء"
              />
              {/* Autocomplete */}
              {showSuggest && suggestions.length > 0 && (
                <div className="absolute top-full mt-2 right-0 left-0 glass-card p-2 z-30 animate-fade-in">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setQuery(s); setSelectedMed(s); setShowSuggest(false); }}
                      className="w-full text-right px-3 py-2.5 rounded-lg hover:bg-brand-green/10 transition-colors flex items-center gap-2 font-tajawal text-sm"
                    >
                      <Pill className="w-4 h-4 text-brand-green-light" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`p-3 rounded-xl transition-colors ${filterOpen ? 'bg-brand-green/20 text-brand-green-light' : 'glass text-[var(--text-soft)]'}`}
              aria-label="الفلاتر"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Filter panel */}
          {filterOpen && (
            <div className="mt-3 glass-card p-4 animate-fade-in space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-cairo font-bold text-sm">الترتيب</span>
                <div className="flex gap-2">
                  {([
                    { k: 'nearest', l: 'الأقرب' },
                    { k: 'cheapest', l: 'الأرخص' },
                    { k: 'rating', l: 'التقييم' },
                  ] as const).map((s) => (
                    <button
                      key={s.k}
                      onClick={() => setSort(s.k)}
                      className={`text-xs px-3 py-1.5 rounded-full font-tajawal transition-colors ${
                        sort === s.k ? 'bg-brand-green text-white' : 'glass text-[var(--text-soft)]'
                      }`}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-cairo font-bold text-sm">المفتوحة فقط</span>
                <button
                  onClick={() => setOnlyOpen(!onlyOpen)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${onlyOpen ? 'bg-brand-green' : 'bg-[var(--border-subtle)]'}`}
                  aria-label="المفتوحة فقط"
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${onlyOpen ? 'right-0.5' : 'right-6'}`} />
                </button>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-cairo font-bold text-sm">أقصى مسافة</span>
                  <span className="text-sm font-inter text-brand-green-light font-bold">{maxDist} كم</span>
                </div>
                <input
                  type="range" min={1} max={10} value={maxDist}
                  onChange={(e) => setMaxDist(Number(e.target.value))}
                  className="w-full accent-brand-green"
                  aria-label="أقصى مسافة"
                />
              </div>
            </div>
          )}
        </div>

        {/* Active med chip */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-sm font-tajawal text-[var(--text-muted)]">تبحث عن:</span>
          <span className="px-3 py-1 rounded-full bg-brand-green/20 text-brand-green-light text-sm font-bold flex items-center gap-1">
            <Pill className="w-3.5 h-3.5" /> {selectedMed}
          </span>
        </div>

        {/* Results */}
        <div className="space-y-3">
          {results.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Pill className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
              <p className="font-tajawal text-[var(--text-soft)]">
                لا توجد صيدلية تملك هذا الدواء ضمن نطاقك الحالي. جرّب توسيع المسافة أو تغيير الدواء.
              </p>
            </div>
          ) : (
            results.map((p, i) => {
              const med = p.medicines.find((m) => m.name === selectedMed)!;
              const st = statusMap[p.status];
              return (
                <div
                  key={p.id}
                  className="glass-card p-4 light-sweep hover:scale-[1.01] transition-transform cursor-pointer animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms`, opacity: 0, animationFillMode: 'forwards' }}
                  onClick={() => setSelected(p)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-brand-green/20 flex items-center justify-center">
                        <Pill className="w-5 h-5 text-brand-green-light" />
                      </div>
                      <div>
                        <div className="font-cairo font-bold text-base">{p.name}</div>
                        <div className="text-xs text-[var(--text-muted)] font-tajawal flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" /> {p.area} · {p.distance} كم · {p.walkingMin} د سيراً
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className="font-inter font-bold text-lg text-brand-green-light">{med.price} ₪</div>
                        <div className="text-xs text-[var(--text-muted)]">متوفر: {med.quantity}</div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${st.cls}`}>{st.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    <Star className="w-3.5 h-3.5 text-status-busy fill-status-busy" />
                    <span className="font-inter font-bold">{p.rating}</span>
                    <span className="text-[var(--text-muted)]">({p.reviews} تقييم)</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative glass-card p-6 w-full max-w-md max-h-[80vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setSelected(null)} className="absolute top-4 left-4 p-2 rounded-full glass hover:bg-status-emergency/20 transition-colors">
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-green/20 flex items-center justify-center">
                <Pill className="w-7 h-7 text-brand-green-light" />
              </div>
              <div>
                <h3 className="font-cairo font-bold text-xl">{selected.name}</h3>
                <p className="text-sm text-[var(--text-muted)] font-tajawal">{selected.area}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className={`text-xs px-3 py-1 rounded-full font-bold ${statusMap[selected.status].cls}`}>
                {statusMap[selected.status].label}
              </span>
              <span className="text-sm flex items-center gap-1">
                <Star className="w-4 h-4 text-status-busy fill-status-busy" />
                <span className="font-inter font-bold">{selected.rating}</span>
                <span className="text-[var(--text-muted)] text-xs">({selected.reviews})</span>
              </span>
            </div>

            {/* Medicines */}
            <h4 className="font-cairo font-bold text-sm mb-3">الأدوية المتوفرة</h4>
            <div className="space-y-2 mb-6">
              {selected.medicines.map((m) => (
                <div key={m.name} className="glass rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="font-tajawal font-bold text-sm">{m.name}</div>
                    <div className={`text-xs ${m.quantity > 0 ? 'text-status-open' : 'text-status-closed'}`}>
                      {m.quantity > 0 ? `متوفر: ${m.quantity} علبة` : 'نفد المخزون'}
                    </div>
                  </div>
                  <div className="font-inter font-bold text-brand-green-light">{m.price} ₪</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button className="btn-secondary flex items-center justify-center gap-2 text-sm">
                <Phone className="w-4 h-4" /> اتصل
              </button>
              <button className="btn-primary flex items-center justify-center gap-2 text-sm">
                <Navigation className="w-4 h-4" /> اتجاهات
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
