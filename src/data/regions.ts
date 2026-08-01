export interface SubDistrict {
  ar: string;
  en: string;
}

export interface Governorate {
  ar: string;
  en: string;
  subDistricts: SubDistrict[];
}

export const GAZA_GOVERNORATES: Governorate[] = [
  {
    ar: 'شمال غزة',
    en: 'North Gaza',
    subDistricts: [
      { ar: 'جباليا', en: 'Jabalia' },
      { ar: 'بيت لاهيا', en: 'Beit Lahia' },
      { ar: 'بيت حانون', en: 'Beit Hanoun' },
    ],
  },
  {
    ar: 'غزة',
    en: 'Gaza',
    subDistricts: [
      { ar: 'الرمال', en: 'Rimal' },
      { ar: 'الزيتون', en: 'Zeitoun' },
      { ar: 'الشجاعية', en: 'Shujaiya' },
      { ar: 'تل الهوا', en: 'Tel al-Hawa' },
      { ar: 'الشيخ رضوان', en: 'Sheikh Radwan' },
      { ar: 'النصر', en: 'Al-Nasr' },
      { ar: 'الدرج', en: 'Al-Daraj' },
    ],
  },
  {
    ar: 'الوسطى',
    en: 'Deir al-Balah',
    subDistricts: [
      { ar: 'دير البلح', en: 'Deir al-Balah' },
      { ar: 'النصيرات', en: 'Nuseirat' },
      { ar: 'البريج', en: 'Bureij' },
      { ar: 'المغازي', en: 'Maghazi' },
      { ar: 'الزوايدة', en: 'Zawaida' },
    ],
  },
  {
    ar: 'خانيونس',
    en: 'Khan Yunis',
    subDistricts: [
      { ar: 'مدينة خانيونس', en: 'Khan Yunis city' },
      { ar: 'القرارة', en: 'Qarara' },
      { ar: 'عبسان', en: 'Abasan' },
      { ar: 'بني سهيلا', en: 'Bani Suhaila' },
    ],
  },
  {
    ar: 'رفح',
    en: 'Rafah',
    subDistricts: [
      { ar: 'مدينة رفح', en: 'Rafah city' },
      { ar: 'الشابورة', en: 'Shaboura' },
      { ar: 'تل السلطان', en: 'Tel al-Sultan' },
      { ar: 'النصر', en: 'Al-Nasr' },
    ],
  },
];

export function governorateLabel(g: Governorate, isRTL: boolean): string {
  return isRTL ? g.ar : g.en;
}

export function subDistrictLabel(s: SubDistrict, isRTL: boolean): string {
  return isRTL ? s.ar : s.en;
}

export function findGovernorateByArea(area: string): Governorate | undefined {
  return GAZA_GOVERNORATES.find(
    (g) => g.ar === area || g.en === area || g.subDistricts.some((s) => s.ar === area || s.en === area),
  );
}
