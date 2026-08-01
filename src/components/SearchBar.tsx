import { useState, useRef, useEffect } from 'react';
import { Search, X, Phone, MapPin } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import type { Pharmacy } from '@/lib/types';

interface SearchBarProps {
  pharmacies: Pharmacy[];
}

// Normalize Arabic text for case-insensitive search
function normalizeAr(str: string | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replace(/[\u064B-\u065F\u0670]/g, '') // diacritics
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ةه]/g, 'ه')
    .replace(/[يى]/g, 'ي')
    .replace(/ـ/g, '')
    .toLowerCase()
    .trim();
}

export function SearchBar({ pharmacies }: SearchBarProps) {
  const { t, isRTL } = useLang();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = query.length >= 1
    ? pharmacies.filter((p) =>
        normalizeAr(p.name).includes(normalizeAr(query)) ||
        normalizeAr(p.area).includes(normalizeAr(query)) ||
        normalizeAr(p.address).includes(normalizeAr(query)),
      ).slice(0, 8)
    : [];

  const handleSelectPharmacy = (p: Pharmacy) => {
    setQuery(p.name);
    setShowResults(false);
  };

  const handleClear = () => {
    setQuery('');
    setShowResults(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          placeholder={isRTL ? 'ابحث عن صيدلية أو منطقة...' : 'Search for pharmacy or area...'}
          className="w-full glass rounded-xl pr-11 pl-10 py-3 text-right font-tajawal focus:outline-none focus:border-brand-green transition-colors"
        />
        {query && (
          <button onClick={handleClear} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown — max-height + overflow-y: auto + high z-index */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full glass-card p-2 space-y-1 max-h-72 overflow-y-auto z-[80] animate-fade-in">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPharmacy(p)}
              className="w-full text-right px-3 py-2.5 rounded-lg hover:bg-brand-green/10 transition-colors flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-tajawal font-bold text-sm truncate">{p.name}</div>
                <div className="text-xs text-[var(--text-muted)] font-tajawal flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{p.area} — {p.address}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`tel:${p.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-lg bg-brand-green/15 flex items-center justify-center hover:bg-brand-green/25 transition-colors"
                >
                  <Phone className="w-4 h-4 text-brand-green-light" />
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-lg bg-brand-blue/15 flex items-center justify-center hover:bg-brand-blue/25 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-brand-blue-light" />
                </a>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
