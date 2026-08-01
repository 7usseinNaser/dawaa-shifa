import { useMemo, useState } from 'react';
import {
  MapPin, Navigation, Phone, Pill, Search, SlidersHorizontal, Star, X,
} from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';
import { useMedicineSearch, useMedicineSuggestions, type MedicineSearchResult } from '@/hooks/useLiveStats';

type Status = 'open' | 'busy' | 'emergency' | 'closed';

const statusMap: Record<Status, { label: string; cls: string }> = {
  open: { label: 'مفتوحة', cls: 'bg-status-open/20 text-status-open' },
  busy: { label: 'مزدحمة', cls: 'bg-status-busy/20 text-status-busy' },
  emergency: { label: 'طوارئ', cls: 'bg-status-emergency/20 text-status-emergency' },
  closed: { label: 'مغلقة', cls: 'bg-status-closed/20 text-status-closed' },
};

type SortKey = 'cheapest' | 'rating' | 'area';

/**
 * InteractiveDemo — live medicine search wired to the Supabase medicines table.
 * Results show real pharmacies, real prices, real availability, and real status.
 */
export default function InteractiveDemo() {
  const { ref, visible } = useReveal();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('cheapest');
  const [filterOpen, setFilterOpen] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [selected, setSelected] = useState<MedicineSearchResult | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeMed, setActiveMed] = useState<string>('');

  const { results, loading } = useMedicineSearch(query);
  const suggestions = useMedicineSuggestions(query);

  const medNames = useMemo(
    () => [...new Set(results.map((r) => r.medicine_name))].slice(0, 6),
    [results],
  );

  const filteredResults = useMemo(() => {
    let list = activeMed ? results.filter((r) => r.medicine_name === activeMed) : results;
    if (onlyOpen) list = list.filter((r) => r.pharmacy_status === 'open' || r.pharmacy_status === 'busy');
    list = [...list].sort((a, b) => {
      if (sort === 'cheapest') return a.price - b.price;
      if (sort === 'rating') return b.pharmacy_rating - a.pharmacy_rating;
      return a.pharmacy_area.localeCompare(b.pharmacy_area);
    });
    return list;
  }, [results, activeMed, onlyOpen, sort]);

  const onSearch = (val: string) => {
    setQuery(val);
    setShowSuggest(true);
    setActiveMed('');
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
            ابحث عن دواء، صفّ النتائج، افتح تفاصيل الصيدلية — هذه بيانات حقيقية من قاعدة بيانات المنصة.
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
              {showSuggest && suggestions.length > 0 && (
                <div className="absolute top-full mt-2 right-0 left-0 glass-card p-2 z-30 animate-fade-in">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setQuery(s); setActiveMed(s); setShowSuggest(false); }}
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

          {filterOpen && (
            <div className="mt-3 glass-card p-4 animate-fade-in space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-cairo font-bold text-sm">الترتيب</span>
                <div className="flex gap-2">
                  {([
                    { k: 'cheapest', l: 'الأرخص' },
                    { k: 'rating', l: 'التقييم' },
                    { k: 'area', l: 'المنطقة' },
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
            </div>
          )}
        </div>

        {medNames.length > 0 && (
          <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
            <span className="text-sm font-tajawal text-[var(--text-muted)]">النتائج:</span>
            {medNames.map((name) => (
              <button
                key={name}
                onClick={() => setActiveMed(activeMed === name ? '' : name)}
                className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 transition-colors ${
                  activeMed === name ? 'bg-brand-green text-white' : 'bg-brand-green/20 text-brand-green-light'
                }`}
              >
                <Pill className="w-3.5 h-3.5" /> {name}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {loading && (
            <div className="glass-card p-12 text-center">
              <div className="w-10 h-10 mx-auto mb-4 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
              <p className="font-tajawal text-[var(--text-soft)]">جاري البحث...</p>
            </div>
          )}

          {!loading && query.trim() && filteredResults.length === 0 && (
            <div className="glass-card p-12 text-center">
              <Pill className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
              <p className="font-tajawal text-[var(--text-soft)]">
                لا توجد صيدلية تملك هذا الدواء حالياً. جرّب البحث باسم آخر.
              </p>
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="glass-card p-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
              <p className="font-tajawal text-[var(--text-soft)]">
                ابحث عن دواء بالاسم لعرض الصيدليات المتوفر فيها.
              </p>
            </div>
          )}

          {!loading && filteredResults.length > 0 && (
            filteredResults.map((r, i) => {
              const st = statusMap[r.pharmacy_status];
              return (
                <div
                  key={`${r.pharmacy_id}-${r.medicine_id}`}
                  className="glass-card p-4 light-sweep hover:scale-[1.01] transition-transform cursor-pointer animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms`, opacity: 0, animationFillMode: 'forwards' }}
                  onClick={() => setSelected(r)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-brand-green/20 flex items-center justify-center">
                        <Pill className="w-5 h-5 text-brand-green-light" />
                      </div>
                      <div>
                        <div className="font-cairo font-bold text-base">{r.pharmacy_name}</div>
                        <div className="text-xs text-[var(--text-muted)] font-tajawal flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" /> {r.pharmacy_area}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className="font-inter font-bold text-lg text-brand-green-light">{r.price} ₪</div>
                        <div className={`text-xs ${r.is_available ? 'text-status-open' : 'text-status-closed'}`}>
                          {r.is_available ? `متوفر: ${r.quantity}` : 'نفد المخزون'}
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${st.cls}`}>{st.label}</span>
                    </div>
                  </div>
                  {r.pharmacy_rating > 0 && (
                    <div className="flex items-center gap-2 mt-3 text-xs">
                      <Star className="w-3.5 h-3.5 text-status-busy fill-status-busy" />
                      <span className="font-inter font-bold">{r.pharmacy_rating}</span>
                      <span className="text-[var(--text-muted)]">({r.pharmacy_reviews} تقييم)</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

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
                <h3 className="font-cairo font-bold text-xl">{selected.pharmacy_name}</h3>
                <p className="text-sm text-[var(--text-muted)] font-tajawal flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {selected.pharmacy_area}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <span className={`text-xs px-3 py-1 rounded-full font-bold ${statusMap[selected.pharmacy_status].cls}`}>
                {statusMap[selected.pharmacy_status].label}
              </span>
              {selected.pharmacy_rating > 0 && (
                <span className="text-sm flex items-center gap-1">
                  <Star className="w-4 h-4 text-status-busy fill-status-busy" />
                  <span className="font-inter font-bold">{selected.pharmacy_rating}</span>
                  <span className="text-[var(--text-muted)] text-xs">({selected.pharmacy_reviews})</span>
                </span>
              )}
            </div>

            <h4 className="font-cairo font-bold text-sm mb-3">الدواء</h4>
            <div className="glass rounded-xl p-3 flex items-center justify-between mb-6">
              <div>
                <div className="font-tajawal font-bold text-sm">{selected.medicine_name}</div>
                <div className={`text-xs ${selected.is_available ? 'text-status-open' : 'text-status-closed'}`}>
                  {selected.is_available ? `متوفر: ${selected.quantity} علبة` : 'نفد المخزون'}
                </div>
              </div>
              <div className="font-inter font-bold text-brand-green-light">{selected.price} ₪</div>
            </div>

            {selected.pharmacy_address && (
              <div className="glass rounded-xl p-3 mb-6">
                <div className="text-xs text-[var(--text-muted)] font-tajawal mb-1">العنوان</div>
                <div className="text-sm font-tajawal">{selected.pharmacy_address}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {selected.pharmacy_phone ? (
                <a href={`tel:${selected.pharmacy_phone}`} className="btn-secondary flex items-center justify-center gap-2 text-sm">
                  <Phone className="w-4 h-4" /> اتصل
                </a>
              ) : (
                <button disabled className="btn-secondary flex items-center justify-center gap-2 text-sm opacity-50 cursor-not-allowed">
                  <Phone className="w-4 h-4" /> لا يوجد رقم
                </button>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.pharmacy_name + ' ' + selected.pharmacy_area)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex items-center justify-center gap-2 text-sm"
              >
                <Navigation className="w-4 h-4" /> اتجاهات
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
