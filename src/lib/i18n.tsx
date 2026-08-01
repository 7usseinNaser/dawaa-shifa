import { createContext, useContext, useState, type ReactNode } from 'react';

type Lang = 'ar' | 'en';

interface LangCtx {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  toggle: () => void;
  t: (key: string) => string;
}

const Ctx = createContext<LangCtx | undefined>(undefined);

const dict: Record<string, { ar: string; en: string }> = {
  // Navigation
  'nav.home': { ar: 'الرئيسية', en: 'Home' },
  'nav.search': { ar: 'بحث', en: 'Search' },
  'nav.map': { ar: 'خريطة', en: 'Map' },
  'nav.profile': { ar: 'حسابي', en: 'Profile' },
  'nav.notifications': { ar: 'الإشعارات', en: 'Notifications' },
  'nav.login': { ar: 'دخول / تسجيل', en: 'Login / Register' },
  'nav.dashboard': { ar: 'لوحتي', en: 'My Panel' },
  'nav.logout': { ar: 'خروج', en: 'Logout' },

  // Auth
  'auth.welcome': { ar: 'مرحباً', en: 'Welcome' },
  'auth.register': { ar: 'حساب جديد', en: 'New Account' },
  'auth.login': { ar: 'تسجيل دخول', en: 'Login' },
  'auth.name': { ar: 'الاسم', en: 'Name' },
  'auth.email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'auth.password': { ar: 'كلمة المرور', en: 'Password' },
  'auth.fullName': { ar: 'الاسم الكامل', en: 'Full Name' },
  'auth.phone': { ar: 'رقم الهاتف', en: 'Phone Number' },
  'auth.role': { ar: 'نوع الحساب', en: 'Account Type' },
  'auth.citizen': { ar: 'مواطن', en: 'Citizen' },
  'auth.pharmacist': { ar: 'صيدلاني', en: 'Pharmacist' },
  'auth.facility_owner': { ar: 'صاحب مرفق', en: 'Facility Owner' },
  'auth.admin': { ar: 'مشرف النظام', en: 'System Admin' },
  'auth.adminDesc': { ar: 'إدارة النظام والمستخدمين والصيدليات', en: 'Manage system, users, and pharmacies' },
  'auth.citizenDesc': { ar: 'ابحث عن الدواء واعرف حالة المرافق', en: 'Search medicines and check facility status' },
  'auth.pharmacistDesc': { ar: 'حدّث مخزونك وأسعارك لحظياً', en: 'Update your inventory and prices live' },
  'auth.facilityDesc': { ar: 'أعلن حالة الأقسام والانتظار', en: 'Broadcast department status and wait times' },
  'auth.howUse': { ar: 'كيف ستستخدم دواء وشفاء؟', en: 'How will you use Dawaa & Shifa?' },
  'auth.back': { ar: 'رجوع', en: 'Back' },
  'auth.change': { ar: 'تغيير', en: 'Change' },
  'auth.createAndLogin': { ar: 'إنشاء الحساب والدخول', en: 'Create Account & Login' },
  'auth.freeSecure': { ar: 'تسجيل مجاني · بدون رسوم · بياناتك مشفّرة', en: 'Free signup · No fees · Your data is encrypted' },
  'auth.backToSite': { ar: '← العودة للموقع', en: '← Back to site' },
  'auth.joinPlatform': { ar: 'انضم لمنصة دواء وشفاء', en: 'Join Dawaa & Shifa platform' },
  'auth.welcomeBack': { ar: 'أهلاً بعودتك', en: 'Welcome back' },

  // Status
  'status.open': { ar: 'متاح', en: 'Available' },
  'status.busy': { ar: 'مزدحم', en: 'Busy' },
  'status.emergency': { ar: 'طوارئ', en: 'Emergency' },
  'status.closed': { ar: 'مغلق', en: 'Closed' },
  'status.normal': { ar: 'متاح', en: 'Available' },

  // Dashboard common
  'dash.welcome': { ar: 'مرحباً', en: 'Welcome' },
  'dash.searchPlaceholder': { ar: 'ابحث عن دواء معين أو مستشفى...', en: 'Search for a medicine or hospital...' },
  'dash.medicines': { ar: 'الأدوية', en: 'Medicines' },
  'dash.facilities': { ar: 'المرافق', en: 'Facilities' },
  'dash.viewDetails': { ar: 'عرض الأقسام والتفاصيل', en: 'View departments & details' },
  'dash.checkOccupancy': { ar: 'تفقد حالة الإشغال الفوري', en: 'Check live occupancy status' },
  'dash.call': { ar: 'اتصال', en: 'Call' },
  'dash.directions': { ar: 'اتجاهات', en: 'Directions' },
  'dash.back': { ar: '⬅️ رجوع', en: '⬅️ Back' },
  'dash.available': { ar: 'متوفر', en: 'Available' },
  'dash.outOfStock': { ar: 'نفد', en: 'Out of stock' },
  'dash.lowStock': { ar: 'كمية منخفضة', en: 'Low stock' },
  'dash.reviews': { ar: 'تقييمات', en: 'reviews' },
  'dash.openPharmacies': { ar: 'صيدليات متاحة', en: 'Open pharmacies' },
  'dash.activeFacilities': { ar: 'مرافق تستقبل الحالات', en: 'Facilities receiving patients' },
  'dash.emergencyFacilities': { ar: 'مرافق تحت الطوارئ', en: 'Emergency facilities' },
  'dash.trendingSearches': { ar: 'الأدوية الأكثر بحثاً', en: 'Trending searches' },
  'dash.nearbyFacilities': { ar: 'المرافق الطبية القريبة', en: 'Nearby facilities' },
  'dash.occupancy': { ar: 'مؤشر الإشغال', en: 'Occupancy' },
  'dash.departments': { ar: 'الأقسام', en: 'Departments' },
  'dash.doctor': { ar: 'الطبيب', en: 'Doctor' },
  'dash.waiting': { ar: 'منتظر', en: 'waiting' },
  'dash.estClear': { ar: 'الوقت المتوقع للفراغ', en: 'Est. clear time' },
  'dash.workHours': { ar: 'ساعات العمل', en: 'Working hours' },
  'dash.notifyMe': { ar: '🔔 تنبيهني عند الفراغ', en: '🔔 Notify me when available' },
  'dash.cancelNotify': { ar: '🔕 إلغاء التنبيه', en: '🔕 Cancel notification' },
  'dash.closedBanner': { ar: '⚫ هذه الصيدلية مغلقة حالياً', en: '⚫ This pharmacy is currently closed' },
  'dash.free': { ar: 'مجاني', en: 'Free' },
  'dash.paid': { ar: 'مدفوع', en: 'Paid' },
  'dash.hospital': { ar: 'مستشفى', en: 'Hospital' },
  'dash.clinic': { ar: 'عيادة', en: 'Clinic' },
  'dash.medicalPoint': { ar: 'نقطة طبية', en: 'Medical point' },
  'dash.sortNearest': { ar: 'الأقرب', en: 'Nearest' },
  'dash.sortCheapest': { ar: 'الأرخص', en: 'Cheapest' },
  'dash.sortRating': { ar: 'التقييم', en: 'Rating' },
  'dash.openNow': { ar: 'المفتوحة فقط', en: 'Open only' },
  'dash.maxDistance': { ar: 'أقصى مسافة', en: 'Max distance' },
  'dash.noResults': { ar: 'لا توجد نتائج', en: 'No results found' },
  'dash.loading': { ar: 'جاري التحميل...', en: 'Loading...' },
  'dash.visitPharmacy': { ar: 'زيارة الصيدلية', en: 'Visit pharmacy' },
  'dash.searchMeds': { ar: 'ابحث في أدوية هذه الصيدلية...', en: 'Search within this pharmacy...' },
  'dash.medList': { ar: 'قائمة مخزون الأدوية', en: 'Medicine inventory' },
  'dash.lastUpdate': { ar: 'آخر تحديث', en: 'Last updated' },
  'dash.all': { ar: 'الكل', en: 'All' },
  'dash.map.title': { ar: 'الخريطة الصحية التفاعلية', en: 'Interactive Health Map' },
  'dash.map.subtitle': { ar: 'انقر فوق أي مؤشر طبي لعرض تفاصيله', en: 'Click any pin to view details' },
  'dash.map.all': { ar: 'عرض الكل', en: 'Show all' },
  'dash.map.pharmacies': { ar: 'الصيدليات', en: 'Pharmacies' },
  'dash.map.facilities': { ar: 'المرافق', en: 'Facilities' },
  'dash.map.viewDetails': { ar: 'عرض التفاصيل', en: 'View details' },
  'dash.map.legend': { ar: 'مفتاح الخريطة', en: 'Map legend' },

  // Pharmacist
  'pharm.title': { ar: 'لوحة تحكم الصيدلية', en: 'Pharmacy Control Panel' },
  'pharm.medicines': { ar: 'إدارة الأدوية', en: 'Manage Medicines' },
  'pharm.info': { ar: 'معلومات الصيدلية', en: 'Pharmacy Info' },
  'pharm.totalMeds': { ar: 'إجمالي الأدوية', en: 'Total medicines' },
  'pharm.outOfStock': { ar: 'نفد المخزون', en: 'Out of stock' },
  'pharm.avgPrice': { ar: 'متوسط الأسعار', en: 'Avg price' },
  'pharm.lastUpdate': { ar: 'آخر تحديث', en: 'Last update' },
  'pharm.status': { ar: 'حالة الصيدلية', en: 'Pharmacy status' },
  'pharm.openNow': { ar: 'مفتوحة', en: 'Open' },
  'pharm.closedNow': { ar: 'مغلقة', en: 'Closed' },
  'pharm.addMed': { ar: '➕ إضافة دواء', en: '➕ Add medicine' },
  'pharm.edit': { ar: 'تعديل', en: 'Edit' },
  'pharm.delete': { ar: 'حذف', en: 'Delete' },
  'pharm.medName': { ar: 'اسم الدواء', en: 'Medicine name' },
  'pharm.genericName': { ar: 'الاسم العلمي', en: 'Generic name' },
  'pharm.price': { ar: 'السعر (₪)', en: 'Price (₪)' },
  'pharm.quantity': { ar: 'الكمية', en: 'Quantity' },
  'pharm.save': { ar: 'حفظ', en: 'Save' },
  'pharm.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'pharm.confirmDelete': { ar: 'هل أنت متأكد من الحذف؟', en: 'Are you sure you want to delete?' },
  'pharm.noMeds': { ar: 'لا توجد أدوية. اضغط "إضافة دواء" للبدء.', en: 'No medicines. Click "Add medicine" to start.' },
  'pharm.setup': { ar: 'إعداد صيدليتك', en: 'Setup your pharmacy' },
  'pharm.setupDesc': { ar: 'أدخل بيانات صيدليتك للبدء.', en: 'Enter your pharmacy details to start.' },
  'pharm.pharmName': { ar: 'اسم الصيدلية', en: 'Pharmacy name' },
  'pharm.area': { ar: 'المنطقة', en: 'Area' },
  'pharm.address': { ar: 'العنوان', en: 'Address' },
  'pharm.create': { ar: 'إنشاء الصيدلية', en: 'Create pharmacy' },
  'pharm.recentActivity': { ar: 'أحدث التعديلات', en: 'Recent activity' },

  // Facility
  'fac.title': { ar: 'لوحة إدارة المرفق', en: 'Facility Management Panel' },
  'fac.departments': { ar: 'إدارة الأقسام', en: 'Manage Departments' },
  'fac.info': { ar: 'معلومات المرفق', en: 'Facility Info' },
  'fac.totalDepts': { ar: 'عدد الأقسام', en: 'Total departments' },
  'fac.emergencyDepts': { ar: 'أقسام طوارئ', en: 'Emergency depts' },
  'fac.totalWaiting': { ar: 'إجمالي المنتظرين', en: 'Total waiting' },
  'fac.occupancy': { ar: 'مؤشر الإشغال', en: 'Occupancy' },
  'fac.globalStatus': { ar: 'الحالة العامة للمرفق', en: 'Facility overall status' },
  'fac.addDept': { ar: '➕ إضافة قسم', en: '➕ Add department' },
  'fac.deptName': { ar: 'اسم القسم', en: 'Department name' },
  'fac.deptDoctor': { ar: 'اسم الطبيب', en: 'Doctor name' },
  'fac.deptStatus': { ar: 'حالة القسم', en: 'Department status' },
  'fac.deptWaiting': { ar: 'عدد المنتظرين', en: 'Waiting count' },
  'fac.deptClearTime': { ar: 'وقت الفراغ المتوقع', en: 'Est. clear time' },
  'fac.noDepts': { ar: 'لا توجد أقسام. أضف قسمك الأول للبدء.', en: 'No departments. Add your first one to start.' },
  'fac.setup': { ar: 'إعداد مرفقك الطبي', en: 'Setup your facility' },
  'fac.setupDesc': { ar: 'أدخل بيانات مرفقك الطبي للبدء.', en: 'Enter your facility details to start.' },
  'fac.facName': { ar: 'اسم المرفق', en: 'Facility name' },
  'fac.type': { ar: 'النوع', en: 'Type' },
  'fac.create': { ar: 'إنشاء المرفق', en: 'Create facility' },
  'fac.deleteDept': { ar: 'حذف القسم', en: 'Delete dept' },
  'fac.editDept': { ar: 'تعديل فوري', en: 'Quick edit' },

  // Profile
  'profile.title': { ar: 'حسابي', en: 'My Profile' },
  'profile.darkMode': { ar: 'الوضع الليلي', en: 'Dark mode' },
  'profile.seniorMode': { ar: 'وضع كبار السن', en: 'Senior mode' },
  'profile.favorites': { ar: 'المفضلة', en: 'Favorites' },
  'profile.noFavorites': { ar: 'لا توجد مفضلة بعد', en: 'No favorites yet' },
  'profile.logout': { ar: 'تسجيل الخروج', en: 'Logout' },

  // Misc
  'common.distance': { ar: 'كم', en: 'km' },
  'common.minutes': { ar: 'د', en: 'min' },
  'common.currency': { ar: '₪', en: '₪' },

  // Landing page — Problem
  'problem.title': { ar: 'المشكلة', en: 'The Problem' },
  'problem.subtitle': { ar: 'لماذا البحث عن الدواء في غزة تحدياً يومياً؟', en: 'Why finding medicine in Gaza is a daily challenge' },
  'problem.1.title': { ar: 'تنقل خطير بلا معلومات', en: 'Risky travel without info' },
  'problem.1.desc': { ar: 'تتنقل بين صيدليات لا تعرف ما إذا كان دواؤك متوفراً فيها أم لا، في ظروف أمنية صعبة.', en: 'You travel between pharmacies not knowing if your medicine is available, in difficult security conditions.' },
  'problem.2.title': { ar: 'ازدحام غير متوقع', en: 'Unexpected crowding' },
  'problem.2.desc': { ar: 'تصل للمستشفى فتجده مكتظاً بالمرضى، فتنتظر ساعات دون داعٍ.', en: 'You arrive at the hospital to find it overcrowded, waiting for hours unnecessarily.' },
  'problem.3.title': { ar: 'أسعار غير شفافة', en: 'Non-transparent pricing' },
  'problem.3.desc': { ar: 'تختلف الأسعار بين صيدلية وأخرى دون سبب واضح، فلا تعرف أين الأرخص.', en: 'Prices vary between pharmacies without clear reason, so you never know where it\'s cheapest.' },

  // Landing page — Solution
  'solution.title': { ar: 'الحل', en: 'The Solution' },
  'solution.subtitle': { ar: 'منصة موحدة تربط الناس بالصيدليات والمرافق لحظياً', en: 'A unified platform connecting people with pharmacies and facilities in real-time' },
  'solution.1.title': { ar: 'بحث لحظي عن الدواء', en: 'Real-time medicine search' },
  'solution.1.desc': { ar: 'اعرف أي صيدلية تملك دواءك قبل أن تخرج من بيتك.', en: 'Know which pharmacy has your medicine before leaving home.' },
  'solution.2.title': { ar: 'حالة المرافق المباشرة', en: 'Live facility status' },
  'solution.2.desc': { ar: 'شاهد ازدحام كل قسم قبل التوجه إليه.', en: 'See the crowding level of each department before heading there.' },
  'solution.3.title': { ar: 'خريطة تفاعلية', en: 'Interactive map' },
  'solution.3.desc': { ar: 'كل الصيدليات والمرافق في خريطة واحدة محدثة.', en: 'All pharmacies and facilities on one updated map.' },

  // Landing page — How it works
  'how.title': { ar: 'كيف يعمل', en: 'How it works' },
  'how.subtitle': { ar: 'ثلاث خطوات بسيطة', en: 'Three simple steps' },
  'how.step1': { ar: 'أنشئ حساباً', en: 'Create an account' },
  'how.step1Desc': { ar: 'سجّل كمواطن أو صيدلاني أو صاحب مرفق', en: 'Sign up as citizen, pharmacist, or facility owner' },
  'how.step2': { ar: 'ابحث أو حدّث', en: 'Search or update' },
  'how.step2Desc': { ar: 'ابحث عن دوائك أو حدّث مخزونك', en: 'Search for your medicine or update your inventory' },
  'how.step3': { ar: 'تحرّك بثقة', en: 'Move with confidence' },
  'how.step3Desc': { ar: 'توجه للمكان المناسب بمعرفة مسبقة', en: 'Head to the right place with prior knowledge' },

  // Landing page — Users
  'users.title': { ar: 'من يستخدمها', en: 'Who uses it' },
  'users.citizen': { ar: 'المواطن', en: 'Citizen' },
  'users.citizenDesc': { ar: 'يبحث عن دوائه ويتفقد حالة المرافق', en: 'Searches for medicine and checks facility status' },
  'users.pharmacist': { ar: 'الصيدلاني', en: 'Pharmacist' },
  'users.pharmacistDesc': { ar: 'يحدّث مخزونه وأسعاره', en: 'Updates inventory and prices' },
  'users.admin': { ar: 'صاحب مرفق', en: 'Facility Owner' },
  'users.adminDesc': { ar: 'تعلن حالة الأقسام والازدحام', en: 'Broadcasts department status and crowding' },

  // Landing page — About
  'about.title': { ar: 'عن المشروع', en: 'About' },
  'about.desc': { ar: 'منصة أنشئت لخدمة سكان غزة في ظروف صعبة، لربطهم بالصيدليات والمرافق الطبية لحظياً.', en: 'A platform created to serve Gaza residents in difficult conditions, connecting them with pharmacies and medical facilities in real-time.' },

  // Landing page — common
  'landing.getStarted': { ar: 'ابدأ الآن', en: 'Get started' },
  'landing.learnMore': { ar: 'اعرف أكثر', en: 'Learn more' },
  'landing.livePlatform': { ar: 'منصة حية', en: 'Live platform' },
  'landing.allMeds': { ar: 'كل الدواء', en: 'All medicines' },
  'landing.allFacilities': { ar: 'كل المرافق', en: 'All facilities' },
  'landing.onePlace': { ar: 'في مكان واحد', en: 'in one place' },
  'landing.heroDesc': { ar: 'منصة تربط سكان غزة بالصيدليات والمستشفيات لحظياً لتوفير الوقت والجهد في الظروف الحرجة. نحن نراك. نحن معك. تحرك بثقة.', en: 'A platform connecting Gaza residents with pharmacies and hospitals in real-time to save time and effort in critical conditions. We see you. We are with you. Move with confidence.' },
  'landing.createAccount': { ar: 'ابدأ الآن — أنشئ حسابك', en: 'Get started — Create account' },
  'landing.pharmacies': { ar: 'صيدلية', en: 'Pharmacies' },
  'landing.medFacilities': { ar: 'مرفق طبي', en: 'Facilities' },
  'landing.findMeds': { ar: 'لإيجاد الدواء', en: 'To find medicine' },
  'landing.dawaaPanel': { ar: 'لوحة دواء وشفاء', en: 'Dawaa Panel' },
  'landing.searchMeds': { ar: 'ابحث عن دواء...', en: 'Search medicine...' },
  'landing.waitTime': { ar: 'وقت الانتظار: 15 د', en: 'Wait: 15 min' },
  'landing.rating': { ar: '4.8 تقييم', en: '4.8 rating' },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ar');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const toggle = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
  };

  const t = (key: string) => {
    const entry = dict[key];
    if (!entry) return key;
    return entry[lang];
  };

  return <Ctx.Provider value={{ lang, dir, toggle, t }}>{children}</Ctx.Provider>;
}

export function useLang() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
