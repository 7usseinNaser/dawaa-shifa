import type { Facility, Medicine, Pharmacy } from '@/lib/supabase';

/**
 * Normalize Arabic text: unify alef, ta marbuta, ya, remove tatweel,
 * remove diacritics, lowercase. Also strips spaces for fuzzy prefix matching.
 */
export function normalizeAr(str: string | null | undefined): string {
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

/**
 * Normalize for search: also remove spaces so "بارا" matches "باراسيتامول 500mg"
 * even if user types without space.
 */
function searchKey(str: string | null | undefined): string {
  return normalizeAr(str).replace(/\s+/g, '');
}

export interface MedicineSearchResult {
  medicine: Medicine;
  pharmacy: Pharmacy;
  matchedField: 'name' | 'generic' | 'both';
}

export interface FacilitySearchResult {
  facility: Facility;
  matchedField: 'name' | 'area' | 'both';
}

/**
 * Fuzzy search medicines by partial name match (prefix or contains).
 * Works with Arabic and English, partial input from first 2 letters.
 * Matches on both trade name and generic name.
 */
export function searchMedicines(
  query: string,
  medicines: Medicine[],
  pharmacies: Pharmacy[],
): MedicineSearchResult[] {
  const q = searchKey(query);
  if (q.length < 1) {
    // Return all if empty query
    return medicines
      .map((m) => ({
        medicine: m,
        pharmacy: pharmacies.find((p) => p.id === m.pharmacy_id)!,
        matchedField: 'name' as const,
      }))
      .filter((r) => r.pharmacy);
  }

  const results: MedicineSearchResult[] = [];
  for (const m of medicines) {
    const pharm = pharmacies.find((p) => p.id === m.pharmacy_id);
    if (!pharm) continue;

    const nameKey = searchKey(m.medicine_name);
    const genericKey = searchKey(m.generic_name);
    const pharmNameKey = searchKey(pharm.name);

    const nameMatch = nameKey.includes(q);
    const genericMatch = genericKey.includes(q);
    const pharmMatch = pharmNameKey.includes(q);

    if (nameMatch || genericMatch || pharmMatch) {
      results.push({
        medicine: m,
        pharmacy: pharm,
        matchedField: nameMatch && genericMatch ? 'both' : nameMatch ? 'name' : 'generic',
      });
    }
  }
  return results;
}

/**
 * Fuzzy search facilities by partial name or area match.
 */
export function searchFacilities(
  query: string,
  facilities: Facility[],
): FacilitySearchResult[] {
  const q = searchKey(query);
  if (q.length < 1) {
    return facilities.map((f) => ({ facility: f, matchedField: 'name' as const }));
  }

  const results: FacilitySearchResult[] = [];
  for (const f of facilities) {
    const nameKey = searchKey(f.name);
    const areaKey = searchKey(f.area);
    const addrKey = searchKey(f.address);

    const nameMatch = nameKey.includes(q);
    const areaMatch = areaKey.includes(q);
    const addrMatch = addrKey.includes(q);

    if (nameMatch || areaMatch || addrMatch) {
      results.push({
        facility: f,
        matchedField: nameMatch && areaMatch ? 'both' : nameMatch ? 'name' : 'area',
      });
    }
  }
  return results;
}

/**
 * Autocomplete suggestions: returns medicine names that start with or contain
 * the query prefix. Useful for showing dropdown suggestions.
 */
export function autocompleteSuggestions(
  query: string,
  medicines: Medicine[],
  limit = 8,
): string[] {
  const q = searchKey(query);
  if (q.length < 1) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of medicines) {
    const nameKey = searchKey(m.medicine_name);
    const genericKey = searchKey(m.generic_name);
    if (nameKey.includes(q) && !seen.has(m.medicine_name)) {
      seen.add(m.medicine_name);
      out.push(m.medicine_name);
    } else if (genericKey.includes(q) && !seen.has(m.generic_name)) {
      seen.add(m.generic_name);
      out.push(m.generic_name);
    }
    if (out.length >= limit) break;
  }
  return out;
}
