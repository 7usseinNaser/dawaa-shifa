import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'ar' | 'en';

const translations: Record<string, { ar: string; en: string }> = {
  'nav.home': { ar: 'الرئيسية', en: 'Home' },
  'nav.search': { ar: 'البحث', en: 'Search' },
  'nav.donate': { ar: 'تبرّع', en: 'Donate' },
  'nav.login': { ar: 'تسجيل الدخول', en: 'Login' },
  'nav.register': { ar: 'حساب جديد', en: 'Register' },
  'nav.logout': { ar: 'تسجيل الخروج', en: 'Logout' },
  'nav.account': { ar: 'حسابي', en: 'My Account' },
  'nav.theme': { ar: 'الوضع الليلي', en: 'Dark Mode' },
  'nav.language': { ar: 'English', en: 'العربية' },
  'auth.name': { ar: 'الاسم', en: 'Name' },
  'auth.fullName': { ar: 'الاسم الكامل', en: 'Full Name' },
  'auth.phone': { ar: 'رقم الجوال', en: 'Phone Number' },
  'auth.phonePlaceholder': { ar: '0599123456', en: '0599123456' },
  'auth.phoneInvalid': { ar: 'رقم الجوال غير صحيح. يجب أن يبدأ بـ 05 أو +970 ويتكون من 10 أرقام.', en: 'Invalid phone number. Must start with 05 or +970 and be 10 digits.' },
  'auth.email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'auth.password': { ar: 'كلمة المرور', en: 'Password' },
  'auth.loginTitle': { ar: 'تسجيل الدخول', en: 'Login' },
  'auth.registerTitle': { ar: 'إنشاء حساب جديد', en: 'Create New Account' },
  'auth.loginBtn': { ar: 'دخول', en: 'Sign In' },
  'auth.registerBtn': { ar: 'إنشاء الحساب', en: 'Create Account' },
  'auth.haveAccount': { ar: 'لديك حساب؟', en: 'Have an account?' },
  'auth.noAccount': { ar: 'ليس لديك حساب؟', en: 'No account?' },
  'auth.citizen': { ar: 'مواطن', en: 'Citizen' },
  'auth.pharmacist': { ar: 'صيدلي', en: 'Pharmacist' },
  'auth.facility': { ar: 'صاحب مرفق', en: 'Facility Owner' },
  'donate.title': { ar: 'ساهم في استمرارية دواء وشفاء', en: 'Help Sustain Dawaa Shifa' },
  'donate.subtitle': { ar: 'تبرعك يغطي تكاليف السيرفرات وقاعدة البيانات لإبقاء المنصة تعمل.', en: 'Your donation covers server and database costs to keep the platform running.' },
  'donate.medicine': { ar: 'تبرّع بدواء', en: 'Donate Medicine' },
  'donate.platform': { ar: 'تبرّع للموقع', en: 'Donate to Platform' },
  'donate.whatsapp': { ar: 'تواصل عبر واتساب للتبرع', en: 'Contact via WhatsApp to Donate' },
  'donate.continue': { ar: 'متابعة إلى واتساب', en: 'Continue to WhatsApp' },
  'donate.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'donate.confirmMsg': { ar: 'سيتم تحويلك للتواصل المباشر مع فريق دواء وشفاء عبر واتساب لتنسيق طريقة التبرع المناسبة لك.', en: 'You will be redirected to contact the Dawaa Shifa team via WhatsApp to arrange your donation.' },
  'donate.quran': { ar: 'آية قرآنية', en: 'Quran Verse' },
  'donate.hadith': { ar: 'حديث شريف', en: 'Hadith' },
  'donate.medicineDesc': { ar: 'أدوية مغلقة وغير مستعملة تصل للمرضى مباشرة', en: 'Sealed, unused medicines delivered to patients directly' },
  'donate.platformDesc': { ar: 'دعم مالي لتغطية النقل والتخزين والتحقق', en: 'Financial support for transport, storage & verification' },
};

interface I18nContextType {
  lang: Lang;
  isRTL: boolean;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ar');
  const isRTL = lang === 'ar';
  const t = (key: string) => translations[key]?.[lang] ?? key;
  return (
    <I18nContext.Provider value={{ lang, isRTL, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useLang must be used within I18nProvider');
  return ctx;
}
