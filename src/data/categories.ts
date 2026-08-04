export const MEDICINE_CATEGORIES = [
  'مسكنات وخافضات حرارة',
  'مضادات حيوية',
  'مزمنة - قلب وضغط',
  'مزمنة - سكري',
  'الجهاز الهضمي',
  'الجهاز التنفسي والحساسية',
  'فيتامينات ومكملات',
  'أدوية جلدية',
  'عيون وأذن',
  'نسائية وحمل',
  'أدوية أطفال',
  'مضادات التهاب ومفاصل',
  'مطهرات ومستلزمات طبية',
  'الغدة الدرقية والهرمونات',
  'مضادات فطريات وطفيليات',
] as const;

export type MedicineCategory = (typeof MEDICINE_CATEGORIES)[number];

export const MEDICINE_CATEGORIES_EN: Record<string, string> = {
  'مسكنات وخافضات حرارة': 'Painkillers & Antipyretics',
  'مضادات حيوية': 'Antibiotics',
  'مزمنة - قلب وضغط': 'Chronic - Heart & BP',
  'مزمنة - سكري': 'Chronic - Diabetes',
  'الجهاز الهضمي': 'Digestive System',
  'الجهاز التنفسي والحساسية': 'Respiratory & Allergies',
  'فيتامينات ومكملات': 'Vitamins & Supplements',
  'أدوية جلدية': 'Dermatological',
  'عيون وأذن': 'Eyes & Ears',
  'نسائية وححم': 'Women & Pregnancy',
  'أدوية أطفال': 'Pediatric',
  'مضادات التهاب ومفاصل': 'Anti-inflammatory & Joints',
  'مطهرات ومستلزمات طبية': 'Antiseptics & Medical Supplies',
  'الغدة الدرقية والهرمونات': 'Thyroid & Hormones',
  'مضادات فطريات وطفيليات': 'Antifungals & Antiparasitics',
};
