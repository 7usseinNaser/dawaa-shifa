import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pharmacy, Facility, Medicine, Department } from '@/lib/supabase';

export interface LiveStats {
  pharmacyCount: number;
  facilityCount: number;
  medicalPointCount: number;
  userCount: number;
  totalCount: number;
  statusDist: { open: number; busy: number; emergency: number; closed: number };
}

export interface NearbyEntity {
  name: string;
  status: 'open' | 'busy' | 'emergency' | 'closed';
  dist?: string;
  type?: string;
}

const FALLBACK: LiveStats = {
  pharmacyCount: 52,
  facilityCount: 56,
  medicalPointCount: 8,
  userCount: 0,
  totalCount: 108,
  statusDist: { open: 62, busy: 18, emergency: 14, closed: 14 },
};

const FALLBACK_MEDICINES: MedicinePreview[] = [
  { medicine_name: 'Augmentin 1g', pharmacy_name: 'Al-Rahma Pharmacy', price: 15, is_available: true, status: 'open' },
  { medicine_name: 'Panadol Extra', pharmacy_name: 'Al-Shifa Pharmacy', price: 8, is_available: true, status: 'open' },
  { medicine_name: 'Brufen 400', pharmacy_name: 'Al-Noor Pharmacy', price: 6, is_available: true, status: 'busy' },
];

const FALLBACK_MAP: MapPreview[] = [
  { id: 'f1', name: 'Al-Shifa Hospital', status: 'busy', type: 'hospital', lat: 31.5017, lng: 34.4668 },
  { id: 'f2', name: 'Al-Aqsa Clinic', status: 'open', type: 'clinic', lat: 31.4288, lng: 34.3417 },
  { id: 'f3', name: 'Al-Rimal Medical Point', status: 'emergency', type: 'medical_point', lat: 31.5128, lng: 34.4428 },
  { id: 'p1', name: 'Al-Rahma Pharmacy', status: 'open', type: 'pharmacy', lat: 31.5057, lng: 34.4598 },
  { id: 'p2', name: 'Al-Noor Pharmacy', status: 'busy', type: 'pharmacy', lat: 31.4358, lng: 34.3487 },
  { id: 'p3', name: 'Al-Salam Pharmacy', status: 'closed', type: 'pharmacy', lat: 31.5208, lng: 34.4558 },
];

const FALLBACK_FACILITY: FacilityPreview = {
  name: 'Al-Shifa Hospital',
  overall_status: 'busy',
  type: 'hospital',
  area: 'Gaza',
  departments: [
    { name: 'Emergency', status: 'emergency', waiting_count: 12, estimated_clear_time: '45 min' },
    { name: 'Internal Medicine', status: 'busy', waiting_count: 8, estimated_clear_time: '30 min' },
    { name: 'Pediatrics', status: 'open', waiting_count: 3, estimated_clear_time: '15 min' },
  ],
};

async function loadStats(): Promise<LiveStats> {
  try {
    const [pharmRes, facilRes, mpRes, userRes, fStatusRes, pStatusRes] = await Promise.all([
      supabase.from('pharmacies').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('approval_status', 'approved'),
      supabase.from('facilities').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('approval_status', 'approved'),
      supabase.from('facilities').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('approval_status', 'approved').eq('type', 'medical_point'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('facilities').select('overall_status').is('deleted_at', null).eq('approval_status', 'approved'),
      supabase.from('pharmacies').select('status').is('deleted_at', null).eq('approval_status', 'approved'),
    ]);

    const dist = { open: 0, busy: 0, emergency: 0, closed: 0 };
    (fStatusRes.data as Pick<Facility, 'overall_status'>[] | null)?.forEach((f) => {
      if (f.overall_status in dist) dist[f.overall_status]++;
    });
    (pStatusRes.data as Pick<Pharmacy, 'status'>[] | null)?.forEach((p) => {
      if (p.status in dist) dist[p.status]++;
    });

    const pharmacyCount = pharmRes.count ?? FALLBACK.pharmacyCount;
    const facilityCount = facilRes.count ?? FALLBACK.facilityCount;

    return {
      pharmacyCount,
      facilityCount,
      medicalPointCount: mpRes.count ?? FALLBACK.medicalPointCount,
      userCount: userRes.count ?? 0,
      totalCount: pharmacyCount + facilityCount,
      statusDist: dist,
    };
  } catch {
    return FALLBACK;
  }
}

async function loadNearby(): Promise<{ facilities: NearbyEntity[]; pharmacies: NearbyEntity[] }> {
  try {
    const [facRes, pharmRes] = await Promise.all([
      supabase.from('facilities').select('name,overall_status,type,area').is('deleted_at', null).eq('approval_status', 'approved').order('last_updated_at', { ascending: false, nullsFirst: false }).limit(2),
      supabase.from('pharmacies').select('name,status,area').is('deleted_at', null).eq('approval_status', 'approved').order('last_updated_at', { ascending: false, nullsFirst: false }).limit(2),
    ]);

    const facilities: NearbyEntity[] = ((facRes.data as (Facility & { area: string })[] | null) ?? []).map((f) => ({
      name: f.name,
      status: f.overall_status,
      dist: f.area,
      type: f.type,
    }));
    const pharmacies: NearbyEntity[] = ((pharmRes.data as (Pharmacy & { area: string })[] | null) ?? []).map((p) => ({
      name: p.name,
      status: p.status,
      dist: p.area,
    }));

    return { facilities, pharmacies };
  } catch {
    return { facilities: [], pharmacies: [] };
  }
}

export function useLiveStats(): LiveStats {
  const [stats, setStats] = useState<LiveStats>(FALLBACK);

  useEffect(() => {
    let active = true;
    loadStats().then((s) => { if (active) setStats(s); }).catch(() => {});

    const channel = supabase
      .channel('live-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacies' }, () => { if (active) loadStats().then((s) => setStats(s)).catch(() => {}); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facilities' }, () => { if (active) loadStats().then((s) => setStats(s)).catch(() => {}); })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  return stats;
}

export function useNearbyEntities() {
  const [data, setData] = useState<{ facilities: NearbyEntity[]; pharmacies: NearbyEntity[] }>({ facilities: [], pharmacies: [] });

  useEffect(() => {
    let active = true;
    const refresh = () => loadNearby().then((d) => { if (active) setData(d); }).catch(() => {});
    refresh();

    const channel = supabase
      .channel('nearby-entities')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facilities' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacies' }, refresh)
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  return data;
}

export interface MedicinePreview {
  medicine_name: string;
  pharmacy_name: string;
  price: number;
  is_available: boolean;
  status: 'open' | 'busy' | 'emergency' | 'closed';
}

async function loadMedicines(limit = 4): Promise<MedicinePreview[]> {
  try {
    const { data } = await supabase
      .from('medicines')
      .select('medicine_name,price,is_available,pharmacy_id')
      .eq('deleted_at', null)
      .order('last_updated', { ascending: false, nullsFirst: false })
      .limit(limit);
    if (!data || data.length === 0) return FALLBACK_MEDICINES.slice(0, limit);
    const items = data as (Pick<Medicine, 'medicine_name' | 'price' | 'is_available' | 'pharmacy_id'>)[];
    const pharmIds = [...new Set(items.map((m) => m.pharmacy_id))];
    const { data: pharmRows } = await supabase.from('pharmacies').select('id,name,status').in('id', pharmIds);
    const pharmsById = new Map((pharmRows as (Pick<Pharmacy, 'id' | 'name' | 'status'>)[] | null)?.map((p) => [p.id, p]));
    return items.map((m) => {
      const p = pharmsById.get(m.pharmacy_id);
      return {
        medicine_name: m.medicine_name,
        pharmacy_name: p?.name ?? 'صيدلية',
        price: m.price,
        is_available: m.is_available,
        status: p?.status ?? 'open',
      };
    });
  } catch {
    return FALLBACK_MEDICINES.slice(0, limit);
  }
}

export function useMedicinePreviews(limit = 4) {
  const [items, setItems] = useState<MedicinePreview[]>(FALLBACK_MEDICINES.slice(0, limit));
  useEffect(() => {
    let active = true;
    const refresh = () => loadMedicines(limit).then((m) => { if (active) setItems(m); }).catch(() => {});
    refresh();
    const channel = supabase
      .channel('medicine-previews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicines' }, refresh)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [limit]);
  return items;
}

export interface FacilityPreview {
  name: string;
  overall_status: 'open' | 'busy' | 'emergency' | 'closed';
  type: string;
  area: string;
  departments: DeptPreview[];
}

export interface DeptPreview {
  name: string;
  status: 'open' | 'busy' | 'emergency' | 'closed';
  waiting_count: number;
  estimated_clear_time: string;
}

async function loadFacilityPreview(): Promise<FacilityPreview | null> {
  try {
    const { data: facil } = await supabase
      .from('facilities')
      .select('id,name,overall_status,type,area')
      .eq('deleted_at', null)
      .eq('approval_status', 'approved')
      .eq('type', 'hospital')
      .order('last_updated_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!facil) return FALLBACK_FACILITY;
    const f = facil as Pick<Facility, 'id' | 'name' | 'overall_status' | 'type' | 'area'>;
    const { data: depts } = await supabase
      .from('departments')
      .select('name,status,waiting_count,estimated_clear_time')
      .eq('facility_id', f.id)
      .order('waiting_count', { ascending: false })
      .limit(3);
    return {
      name: f.name,
      overall_status: f.overall_status,
      type: f.type,
      area: f.area,
      departments: ((depts as Pick<Department, 'name' | 'status' | 'waiting_count' | 'estimated_clear_time'>[] | null) ?? []).map((d) => ({
        name: d.name,
        status: d.status,
        waiting_count: d.waiting_count,
        estimated_clear_time: d.estimated_clear_time,
      })),
    };
  } catch {
    return FALLBACK_FACILITY;
  }
}

export function useFacilityPreview() {
  const [facil, setFacil] = useState<FacilityPreview | null>(FALLBACK_FACILITY);
  useEffect(() => {
    let active = true;
    const refresh = () => loadFacilityPreview().then((f) => { if (active) setFacil(f); }).catch(() => {});
    refresh();
    const channel = supabase
      .channel('facility-preview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facilities' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, refresh)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, []);
  return facil;
}

export interface MapPreview {
  id: string;
  name: string;
  status: 'open' | 'busy' | 'emergency' | 'closed';
  type: string;
  lat: number;
  lng: number;
}

async function loadMapPoints(limit = 8): Promise<MapPreview[]> {
  try {
    const [facRes, pharmRes] = await Promise.all([
      supabase.from('facilities').select('id,name,overall_status,type,lat,lng').is('deleted_at', null).eq('approval_status', 'approved').limit(limit),
      supabase.from('pharmacies').select('id,name,status,lat,lng').is('deleted_at', null).eq('approval_status', 'approved').limit(limit),
    ]);
    const facils = ((facRes.data as (Pick<Facility, 'id' | 'name' | 'overall_status' | 'type' | 'lat' | 'lng'>)[] | null) ?? []).map((f) => ({
      id: f.id, name: f.name, status: f.overall_status, type: f.type, lat: f.lat, lng: f.lng,
    }));
    const pharms = ((pharmRes.data as (Pick<Pharmacy, 'id' | 'name' | 'status' | 'lat' | 'lng'>)[] | null) ?? []).map((p) => ({
      id: p.id, name: p.name, status: p.status, type: 'pharmacy', lat: p.lat, lng: p.lng,
    }));
    const combined = [...facils, ...pharms].slice(0, limit);
    return combined.length > 0 ? combined : FALLBACK_MAP.slice(0, limit);
  } catch {
    return FALLBACK_MAP.slice(0, limit);
  }
}

export function useMapPoints(limit = 8) {
  const [points, setPoints] = useState<MapPreview[]>(FALLBACK_MAP.slice(0, limit));
  useEffect(() => {
    let active = true;
    const refresh = () => loadMapPoints(limit).then((p) => { if (active) setPoints(p); }).catch(() => {});
    refresh();
    const channel = supabase
      .channel('map-points')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facilities' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacies' }, refresh)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [limit]);
  return points;
}

export interface MedicineSearchResult {
  pharmacy_id: string;
  pharmacy_name: string;
  pharmacy_area: string;
  pharmacy_address: string;
  pharmacy_phone: string;
  pharmacy_status: 'open' | 'busy' | 'emergency' | 'closed';
  pharmacy_rating: number;
  pharmacy_reviews: number;
  medicine_id: string;
  medicine_name: string;
  price: number;
  quantity: number;
  is_available: boolean;
}

const FALLBACK_SEARCH_RESULTS: MedicineSearchResult[] = [
  { pharmacy_id: 'p1', pharmacy_name: 'صيدلية الرحمة', pharmacy_area: 'غزة - الرمال', pharmacy_address: 'شارع الرمال', pharmacy_phone: '', pharmacy_status: 'open', pharmacy_rating: 4.8, pharmacy_reviews: 212, medicine_id: 'm1', medicine_name: 'Augmentin 1g', price: 14, quantity: 23, is_available: true },
  { pharmacy_id: 'p2', pharmacy_name: 'صيدلية النور', pharmacy_area: 'غزة - تل الهوا', pharmacy_address: 'شارع تل الهوا', pharmacy_phone: '', pharmacy_status: 'open', pharmacy_rating: 4.6, pharmacy_reviews: 184, medicine_id: 'm2', medicine_name: 'Augmentin 1g', price: 12, quantity: 8, is_available: true },
  { pharmacy_id: 'p3', pharmacy_name: 'صيدلية الشفاء', pharmacy_area: 'غزة - الزيتون', pharmacy_address: 'شارع الزيتون', pharmacy_phone: '', pharmacy_status: 'busy', pharmacy_rating: 4.3, pharmacy_reviews: 97, medicine_id: 'm3', medicine_name: 'Augmentin 1g', price: 15, quantity: 5, is_available: true },
  { pharmacy_id: 'p4', pharmacy_name: 'صيدلية السلام', pharmacy_area: 'غزة - الشجاعية', pharmacy_address: 'شارع الشجاعية', pharmacy_phone: '', pharmacy_status: 'open', pharmacy_rating: 4.9, pharmacy_reviews: 241, medicine_id: 'm4', medicine_name: 'Augmentin 1g', price: 11, quantity: 40, is_available: true },
];

const FALLBACK_SUGGESTIONS = ['Augmentin 1g', 'Panadol Extra', 'Brufen 400', 'Amoxicillin 500mg', 'Cataflam 50mg'];

async function searchMedicines(query: string): Promise<MedicineSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const { data: meds } = await supabase
      .from('medicines')
      .select('id,pharmacy_id,medicine_name,price,quantity,is_available')
      .ilike('medicine_name', `%${q}%`)
      .is('deleted_at', null)
      .order('is_available', { ascending: false })
      .limit(10);

    if (!meds || meds.length === 0) {
      return FALLBACK_SEARCH_RESULTS.filter((r) => r.medicine_name.toLowerCase().includes(q.toLowerCase()));
    }

    const items = meds as Pick<Medicine, 'id' | 'pharmacy_id' | 'medicine_name' | 'price' | 'quantity' | 'is_available'>[];
    const pharmIds = [...new Set(items.map((m) => m.pharmacy_id))];
    const { data: pharmRows } = await supabase
      .from('pharmacies')
      .select('id,name,area,address,phone,status,rating,reviews_count')
      .in('id', pharmIds)
      .is('deleted_at', null)
      .eq('approval_status', 'approved');

    const pharmsById = new Map(
      ((pharmRows as (Pick<Pharmacy, 'id' | 'name' | 'area' | 'address' | 'phone' | 'status' | 'rating' | 'reviews_count'>)[] | null) ?? []).map((p) => [p.id, p])
    );

    return items
      .map((m): MedicineSearchResult | null => {
        const p = pharmsById.get(m.pharmacy_id);
        if (!p) return null;
        return {
          pharmacy_id: m.pharmacy_id,
          pharmacy_name: p.name,
          pharmacy_area: p.area,
          pharmacy_address: p.address,
          pharmacy_phone: p.phone,
          pharmacy_status: p.status,
          pharmacy_rating: p.rating,
          pharmacy_reviews: p.reviews_count,
          medicine_id: m.id,
          medicine_name: m.medicine_name,
          price: m.price,
          quantity: m.quantity,
          is_available: m.is_available,
        };
      })
      .filter((r): r is MedicineSearchResult => r !== null);
  } catch {
    return FALLBACK_SEARCH_RESULTS.filter((r) => r.medicine_name.toLowerCase().includes(q.toLowerCase()));
  }
}

export function useMedicineSearch(query: string, delay = 400) {
  const [results, setResults] = useState<MedicineSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      searchMedicines(q)
        .then((r) => {
          setResults(r);
          setLoading(false);
        })
        .catch(() => {
          setResults([]);
          setLoading(false);
        });
    }, delay);
    return () => clearTimeout(timer);
  }, [query, delay]);

  return { results, loading };
}

async function fetchSuggestions(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const { data } = await supabase
      .from('medicines')
      .select('medicine_name')
      .ilike('medicine_name', `%${q}%`)
      .is('deleted_at', null)
      .limit(10);
    if (!data || data.length === 0) {
      return FALLBACK_SUGGESTIONS.filter((s) => s.toLowerCase().includes(q.toLowerCase()));
    }
    return [...new Set((data as Pick<Medicine, 'medicine_name'>[]).map((m) => m.medicine_name))];
  } catch {
    return FALLBACK_SUGGESTIONS.filter((s) => s.toLowerCase().includes(q.toLowerCase()));
  }
}

export function useMedicineSuggestions(query: string, delay = 300) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetchSuggestions(q).then(setSuggestions).catch(() => setSuggestions([]));
    }, delay);
    return () => clearTimeout(timer);
  }, [query, delay]);

  return suggestions;
}