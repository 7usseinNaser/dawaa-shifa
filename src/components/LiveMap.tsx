import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Layers, Crosshair, Loader as Loader2 } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';
import { useLiveStats } from '@/hooks/useLiveStats';
import { supabase, type Pharmacy, type Facility } from '@/lib/supabase';

const GAZA_CENTER: [number, number] = [31.42, 34.35];
const GAZA_ZOOM = 11;

const statusColors: Record<string, string> = {
  open: '#10b981',
  busy: '#f59e0b',
  emergency: '#ef4444',
  closed: '#6b7280',
};

const statusLabels: Record<string, string> = {
  open: 'متاح',
  busy: 'مزدحم',
  emergency: 'طوارئ',
  closed: 'مغلق',
};

function createIcon(color: string, type: 'pharmacy' | 'facility') {
  const emoji = type === 'pharmacy' ? '💊' : '🏥';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><span style="transform:rotate(45deg);font-size:12px;">${emoji}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

export default function LiveMap() {
  const { ref, visible } = useReveal();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [filter, setFilter] = useState<'all' | 'pharmacy' | 'facility' | 'open'>('all');
  const stats = useLiveStats();

  useEffect(() => {
    (async () => {
      try {
        const [{ data: pharms, error: e1 }, { data: facs, error: e2 }] = await Promise.all([
          supabase.from('pharmacies').select('*').limit(100),
          supabase.from('facilities').select('*').limit(100),
        ]);
        if (e1 || e2) throw e1 || e2;
        if (pharms) setPharmacies(pharms as Pharmacy[]);
        if (facs) setFacilities(facs as Facility[]);
      } catch {
        // silent — map still renders without pins
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: GAZA_CENTER,
      zoom: GAZA_ZOOM,
      zoomControl: true,
      scrollWheelZoom: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || loading) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const showPharmacies = filter === 'all' || filter === 'pharmacy' || filter === 'open';
    const showFacilities = filter === 'all' || filter === 'facility' || filter === 'open';

    if (showPharmacies) {
      pharmacies.forEach((p) => {
        if (p.lat === 0 && p.lng === 0) return;
        if (filter === 'open' && !p.is_open) return;
        const color = statusColors[p.status] || statusColors.open;
        L.marker([p.lat, p.lng], { icon: createIcon(color, 'pharmacy') })
          .addTo(map)
          .bindPopup(`<div style="font-family:sans-serif;direction:rtl;"><strong>${p.name}</strong><br/>${statusLabels[p.status] || p.status}<br/>${p.area || ''}<br/>${p.phone || ''}</div>`);
      });
    }

    if (showFacilities) {
      facilities.forEach((f) => {
        if (f.lat === 0 && f.lng === 0) return;
        if (filter === 'open' && f.overall_status === 'closed') return;
        const color = statusColors[f.overall_status] || statusColors.open;
        L.marker([f.lat, f.lng], { icon: createIcon(color, 'facility') })
          .addTo(map)
          .bindPopup(`<div style="font-family:sans-serif;direction:rtl;"><strong>${f.name}</strong><br/>${statusLabels[f.overall_status] || f.overall_status}<br/>${f.area || ''}<br/>${f.phone || ''}</div>`);
      });
    }
  }, [pharmacies, facilities, filter, loading]);

  const filterChips = [
    { id: 'all' as const, label: 'الكل' },
    { id: 'pharmacy' as const, label: '💊 صيدلية' },
    { id: 'facility' as const, label: '🏥 مرفق' },
    { id: 'open' as const, label: '🟢 متاح فقط' },
  ];

  return (
    <section className="relative py-24 overflow-hidden">
      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-blue-light mb-4">
            الخريطة الموحدة
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            مدينتك <span className="text-gradient-blue">حيّة على الخريطة</span>
          </h2>
          <p className="text-[var(--text-soft)] font-tajawal max-w-2xl mx-auto">
            كل صيدلية، مستشفى، عيادة، ونقطة طبية — مرئية لحظياً بألوان تعكس حالتها.
          </p>
        </div>

        <div className={`relative glass-card overflow-hidden h-[500px] sm:h-[600px] reveal ${visible ? 'visible' : ''}`}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-[1000] bg-[var(--bg-dark)]/50">
              <Loader2 className="w-8 h-8 animate-spin text-brand-green-light" />
            </div>
          )}

          <div ref={mapRef} className="absolute inset-0" style={{ background: '#1a1a2e' }} />

          {/* Filter chips */}
          <div className="absolute top-4 right-4 z-[500] flex gap-2 flex-wrap max-w-[70%]">
            {filterChips.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-tajawal transition-colors ${
                  filter === f.id ? 'bg-brand-green/30 text-white border border-brand-green/50' : 'text-white/80'
                }`}
                style={{ background: filter === f.id ? undefined : 'rgba(10, 10, 20, 0.7)', backdropFilter: 'blur(8px)', border: filter === f.id ? undefined : '1px solid rgba(255,255,255,0.1)' }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Bottom info card */}
          <div className="absolute bottom-4 right-4 left-4 z-[500] rounded-2xl p-4" style={{ background: 'rgba(10, 10, 20, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-sm font-cairo font-bold text-white">
                  {stats.totalCount} مرفق طبي وصيدلية على الخريطة
                </div>
                <div className="text-xs text-white/60 font-tajawal mt-1">
                  انقر على أي مؤشر لعرض التفاصيل
                </div>
              </div>
              <button className="btn-primary text-xs inline-flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                افتح الخريطة الكاملة
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-24 left-4 z-[500] rounded-xl p-3 space-y-1.5 hidden sm:block" style={{ background: 'rgba(10, 10, 20, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {Object.entries(statusLabels).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: statusColors[k] }} />
                <span className="text-xs font-tajawal text-white">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
