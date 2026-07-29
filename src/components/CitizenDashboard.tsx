import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Building2, ChevronLeft, Clock, Heart, Hop as Home, LogOut, MapPin, Mic, Moon, Navigation, Phone, Pill, Search, Shield, Star, Sun, TrendingUp, User, Users, Volume2, Flag, AlertOctagon, Zap, ExternalLink, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import {
  supabase,
  type Pharmacy, type Medicine, type Facility, type Department,
  type Notification, type Favorite, type AdminAlert,
} from '@/lib/supabase';
import { searchMedicines, searchFacilities, autocompleteSuggestions, normalizeAr } from '@/lib/search';
import { OccupancyBar, StatusBadge, StatCard } from '@/components/ui/DashboardParts';
import { ToastContainer, showToast, useToast } from '@/components/ui/Toast';
import RatingCard from '@/components/ui/RatingCard';
import ChronicMedicines from '@/components/ChronicMedicines';
import SOSButton from '@/components/SOSButton';
import { FamilyCabinet, RadiusSelector } from '@/components/FamilyCabinet';
import { GenericFinder } from '@/components/AIFeatures';
import { AIChatbot } from '@/components/AIChatbot';
import { OCRScanner } from '@/components/OCRScanner';
import { DonationHub } from '@/components/DonationHub';
import type { EmergencyBroadcast } from '@/lib/supabase';
import { Camera, Gift, Radio } from 'lucide-react';

type Tab = 'home' | 'search' | 'map' | 'meds' | 'profile' | 'discover' | 'donate';
type SearchMode = 'medicine' | 'facility';
type MapFilter = 'all' | 'pharmacies' | 'facilities';

const TRENDING_MEDS = ['باراسيتامول', 'أموكسيسيلين', 'إيبوبروفين', 'أوميبرازول'];
const RECENT_SEARCHES = ['بانادول', 'فيتامين سي', 'مستشفى الشفاء', 'أوجمنتين'];

const pinColors: Record<string, string> = {
  open: 'bg-status-open', busy: 'bg-status-busy',
  emergency: 'bg-status-emergency', closed: 'bg-status-closed',
};

function facilityOccupancy(depts: Department[]): number {
  if (depts.length === 0) return 0;
  const totalWaiting = depts.reduce((s, d) => s + (d.waiting_count || 0), 0);
  const totalCapacity = depts.reduce((s, d) => s + Math.max(d.waiting_count || 0, 1), 0);
  if (totalCapacity === 0) return 0;
  return Math.min(100, Math.round((totalWaiting / totalCapacity) * 100));
}

function stockBadge(m: Medicine, t: (k: string) => string) {
  if (m.quantity <= 0) return { text: t('dash.outOfStock'), cls: 'text-status-closed' };
  if (m.quantity <= 10) return { text: t('dash.lowStock'), cls: 'text-status-busy' };
  return { text: t('dash.available'), cls: 'text-status-open' };
}

function timeAgo(iso: string, lang: 'ar' | 'en'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'ar' ? 'الآن' : 'now';
  if (mins < 60) return lang === 'ar' ? `قبل ${mins} د` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return lang === 'ar' ? `قبل ${hrs} س` : `${hrs}h ago`;
}

export default function CitizenDashboard({ theme, onToggleTheme }: { theme: 'dark' | 'light'; onToggleTheme: () => void }) {
  const { profile, user, signOut } = useAuth();
  const { t, lang } = useLang();
  const { toasts, remove } = useToast();

  const [tab, setTab] = useState<Tab>('home');
  const [query, setQuery] = useState('');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [medicines, setMedicines] = useState<Record<string, Medicine[]>>({});
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [departments, setDepartments] = useState<Record<string, Department[]>>({});
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [seniorMode, setSeniorMode] = useState(false);
  const [radius, setRadius] = useState(0); // 0 = all
  const [showOCR, setShowOCR] = useState(false);
  const [listening, setListening] = useState(false);
  const [broadcast, setBroadcast] = useState<EmergencyBroadcast | null>(null);

  const favIds = useMemo(() => new Set(favorites.map((f) => f.target_id)), [favorites]);
  const notifyIds = useMemo(
    () => new Set(favorites.filter((f) => f.target_type === 'notify').map((f) => f.target_id)),
    [favorites],
  );
  const unreadCount = notifications.filter((n) => n.unread).length;

  /* ---------- Load data on mount (only verified, non-deleted) ---------- */
  useEffect(() => {
    (async () => {
      const [ph, meds, facs, depts] = await Promise.all([
        supabase.from('pharmacies').select('*').eq('verified', true).is('deleted_at', null),
        supabase.from('medicines').select('*').is('deleted_at', null),
        supabase.from('facilities').select('*').eq('verified', true).is('deleted_at', null),
        supabase.from('departments').select('*'),
      ]);

      const verifiedPharmIds = new Set((ph.data as Pharmacy[] || []).map((p) => p.id));
      if (ph.data) setPharmacies(ph.data as Pharmacy[]);
      if (meds.data) {
        const map: Record<string, Medicine[]> = {};
        (meds.data as Medicine[]).forEach((m) => {
          if (verifiedPharmIds.has(m.pharmacy_id)) (map[m.pharmacy_id] ||= []).push(m);
        });
        setMedicines(map);
      }
      if (facs.data) setFacilities(facs.data as Facility[]);
      if (depts.data) {
        const facIds = new Set((facs.data as Facility[] || []).map((f) => f.id));
        const map: Record<string, Department[]> = {};
        (depts.data as Department[]).forEach((d) => {
          if (facIds.has(d.facility_id)) (map[d.facility_id] ||= []).push(d);
        });
        setDepartments(map);
      }
      setLoading(false);
    })();
  }, []);

  /* ---------- Load user favorites + notifications ---------- */
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: favs }, { data: notifs }] = await Promise.all([
        supabase.from('favorites').select('*').eq('user_id', user.id),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('ts', { ascending: false }),
      ]);
      if (favs) setFavorites(favs as Favorite[]);
      if (notifs) setNotifications(notifs as Notification[]);
    })();
  }, [user]);

  /* ---------- Favorites / notify toggle (Supabase) ---------- */
  const toggleFav = async (targetId: string, targetType: 'pharmacy' | 'facility', targetName: string) => {
    if (!user) return;
    const existing = favorites.find((f) => f.target_id === targetId && f.target_type === targetType);
    if (existing) {
      await supabase.from('favorites').delete().eq('id', existing.id);
      setFavorites((p) => p.filter((f) => f.id !== existing.id));
      showToast(lang === 'ar' ? 'أُزيل من المفضلة' : 'Removed from favorites', 'info');
    } else {
      const { data } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, target_id: targetId, target_type: targetType, target_name: targetName })
        .select()
        .single();
      if (data) {
        setFavorites((p) => [...p, data as Favorite]);
        showToast(lang === 'ar' ? 'أُضيف إلى المفضلة' : 'Added to favorites');
      }
    }
  };

  const toggleNotify = async (deptId: string, deptName: string) => {
    if (!user) return;
    const existing = favorites.find((f) => f.target_id === deptId && f.target_type === 'notify');
    if (existing) {
      await supabase.from('favorites').delete().eq('id', existing.id);
      setFavorites((p) => p.filter((f) => f.id !== existing.id));
      showToast(lang === 'ar' ? 'تم إلغاء التنبيه' : 'Notification cancelled', 'info');
    } else {
      const { data } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, target_id: deptId, target_type: 'notify', target_name: deptName })
        .select()
        .single();
      if (data) {
        setFavorites((p) => [...p, data as Favorite]);
        showToast(lang === 'ar' ? 'سيتم تنبيهك عند الفراغ!' : 'You will be notified when available!');
      }
    }
  };

  /* ---------- Report wrong data ---------- */
  const [showReportForm, setShowReportForm] = useState<{ targetType: 'facility' | 'pharmacy' | 'medicine'; targetId: string; targetName: string } | null>(null);

  async function submitReport(targetType: 'facility' | 'pharmacy' | 'medicine', targetId: string, targetName: string, issueType: string, message: string) {
    if (!user) return;
    try {
      const { error } = await supabase.from('data_reports').insert({
        reporter_id: user.id,
        reporter_name: profile?.display_name || user.email || '',
        target_type: targetType,
        target_id: targetId,
        target_name: targetName,
        issue_type: issueType,
        message,
      });
      if (error) throw error;
      showToast(lang === 'ar' ? 'تم إرسال البلاغ. شكراً لك!' : 'Report submitted. Thank you!');
      setShowReportForm(null);
    } catch {
      showToast(lang === 'ar' ? 'فشل إرسال البلاغ' : 'Failed to send report', 'error');
    }
  }

  /* ---------- Crisis ticker ---------- */
  const [crisisAlerts, setCrisisAlerts] = useState<AdminAlert[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('admin_alerts').select('*').eq('severity', 'emergency').order('created_at', { ascending: false }).limit(3);
      if (data) setCrisisAlerts(data as AdminAlert[]);
    })();
  }, []);

  /* ---------- Emergency broadcast ---------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('emergency_broadcasts').select('*').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) {
        const b = data[0] as EmergencyBroadcast;
        const dismissedKey = `broadcast_${b.id}`;
        if (!sessionStorage.getItem(dismissedKey)) setBroadcast(b);
      }
    })();
  }, []);

  /* ---------- Voice search ---------- */
  const startVoiceSearch = () => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast(lang === 'ar' ? 'البحث الصوتي غير مدعوم في هذا المتصفح' : 'Voice search not supported in this browser', 'error');
      return;
    }
    const recognition = new SpeechRecognition() as { start: () => void; stop: () => void; onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null; onend: (() => void) | null; lang: string; continuous: boolean; interimResults: boolean };
    recognition.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
 const transcript = e.results[0][0].transcript;
      setQuery(transcript);
      setTab('search');
      showToast(lang === 'ar' ? `تم البحث عن: ${transcript}` : `Searched for: ${transcript}`);
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  /* ---------- Log search for heatmap ---------- */
  const logSearch = async (q: string, type: 'medicine' | 'facility') => {
    if (!q.trim() || q.trim().length < 2) return;
    await supabase.from('search_logs').insert({ user_id: user?.id || null, query: q.trim(), search_type: type, area: profile?.phone || null });
  };

  /* ---------- Derived stats ---------- */
  const openPharmacies = pharmacies.filter((p) => p.is_open).length;
  const activeFacilities = facilities.filter((f) => f.overall_status !== 'closed').length;
  const emergencyFacilities = facilities.filter((f) => f.overall_status === 'emergency').length;

  const seniorCls = seniorMode ? 'text-lg' : '';

  /* ---------- Detail views ---------- */
  const reportModal = (
    <AnimatePresence>
      {showReportForm && (
        <ReportFormModal
          target={showReportForm}
          onClose={() => setShowReportForm(null)}
          onSubmit={(issueType, message) => submitReport(showReportForm.targetType, showReportForm.targetId, showReportForm.targetName, issueType, message)}
          lang={lang}
        />
      )}
    </AnimatePresence>
  );

  if (selectedFacility) {
    return (
      <>
        <FacilityDetail
          facility={selectedFacility}
          departments={departments[selectedFacility.id] || []}
          isFav={favIds.has(selectedFacility.id)}
          notifyIds={notifyIds}
          onBack={() => setSelectedFacility(null)}
          onToggleFav={() => toggleFav(selectedFacility.id, 'facility', selectedFacility.name)}
          onToggleNotify={(d) => toggleNotify(d.id, d.name)}
          onReport={() => setShowReportForm({ targetType: 'facility', targetId: selectedFacility.id, targetName: selectedFacility.name })}
        />
        {reportModal}
      </>
    );
  }
  if (selectedPharmacy) {
    return (
      <>
        <PharmacyDetail
          pharmacy={selectedPharmacy}
          medicines={medicines[selectedPharmacy.id] || []}
          isFav={favIds.has(selectedPharmacy.id)}
          onBack={() => setSelectedPharmacy(null)}
          onToggleFav={() => toggleFav(selectedPharmacy.id, 'pharmacy', selectedPharmacy.name)}
          onReport={() => setShowReportForm({ targetType: 'pharmacy', targetId: selectedPharmacy.id, targetName: selectedPharmacy.name })}
        />
        {reportModal}
      </>
    );
  }

  return (
    <div className={`min-h-screen pb-20 bg-[var(--bg-dark)] ${seniorCls}`}>
      <ToastContainer toasts={toasts} onRemove={remove} />
      <SOSButton />

      {/* Crisis Ticker Banner */}
      {crisisAlerts.length > 0 && (
        <div className="bg-status-emergency/20 border-b border-status-emergency/40 overflow-hidden">
          <div className="max-w-2xl mx-auto px-4 py-2 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-status-emergency shrink-0 animate-pulse" />
            <div className="overflow-hidden flex-1">
              <motion.div animate={{ x: [0, -300] }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} className="whitespace-nowrap text-xs font-tajawal font-bold text-status-emergency">
                {crisisAlerts.map((a) => a.message).join('  ◆  ')}
              </motion.div>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-30 glass border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-green to-brand-blue flex items-center justify-center font-cairo font-bold text-white text-sm">
            {profile?.display_name?.charAt(0) || 'م'}
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)] font-tajawal">{t('dash.welcome')}</div>
            <div className="font-cairo font-bold text-sm">{profile?.display_name}</div>
          </div>
        </div>
        <button className="relative p-2 rounded-full glass">
          <Bell className="w-5 h-5 text-brand-green-light" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-status-emergency rounded-full" />
          )}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-tajawal text-[var(--text-muted)]">{t('dash.loading')}</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <HomeTab
                  pharmacies={pharmacies} facilities={facilities} departments={departments}
                  openPharmacies={openPharmacies} activeFacilities={activeFacilities} emergencyFacilities={emergencyFacilities}
                  favIds={favIds}
                  onFacilityClick={setSelectedFacility} onPharmacyClick={setSelectedPharmacy}
                  onSearchClick={() => setTab('search')}
                  onTrendingClick={(m) => { setQuery(m); setTab('search'); }}
                  onToggleFav={(f) => toggleFav(f.id, 'facility', f.name)}
                  t={t}
                />
              </motion.div>
            )}
            {tab === 'search' && (
              <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <SearchTab
                  query={query} setQuery={setQuery}
                  pharmacies={pharmacies} medicines={medicines} facilities={facilities} departments={departments}
                  favIds={favIds}
                  radius={radius} setRadius={setRadius}
                  onPharmacyClick={setSelectedPharmacy} onFacilityClick={setSelectedFacility}
                  onToggleFavPharm={(p) => toggleFav(p.id, 'pharmacy', p.name)}
                  onToggleFavFac={(f) => toggleFav(f.id, 'facility', f.name)}
                  t={t}
                  onOCR={() => setShowOCR(true)}
                  onVoice={startVoiceSearch}
                  listening={listening}
                  isRTL={lang === 'ar'}
                />
              </motion.div>
            )}
            {tab === 'map' && (
              <motion.div key="map" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <MapTab
                  pharmacies={pharmacies} facilities={facilities}
                  onPharmacyClick={setSelectedPharmacy} onFacilityClick={setSelectedFacility}
                  t={t}
                />
              </motion.div>
            )}
            {tab === 'discover' && (
              <motion.div key="discover" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <DiscoverTab
                  pharmacies={pharmacies} facilities={facilities} medicines={medicines} departments={departments}
                  onPharmacyClick={setSelectedPharmacy} onFacilityClick={setSelectedFacility}
                  lang={lang}
                />
              </motion.div>
            )}
            {tab === 'donate' && (
              <motion.div key="donate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <DonationHub />
              </motion.div>
            )}
            {tab === 'meds' && (
              <motion.div key="meds" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <FamilyCabinet />
              </motion.div>
            )}
            {tab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <ProfileTab
                  profile={profile} favorites={favorites} pharmacies={pharmacies} facilities={facilities}
                  darkMode={darkMode} setDarkMode={setDarkMode}
                  seniorMode={seniorMode} setSeniorMode={setSeniorMode}
                  theme={theme} onToggleTheme={onToggleTheme}
                  onToggleFav={(id, type, name) => toggleFav(id, type, name)}
                  onSignOut={signOut} t={t}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 inset-x-0 z-30 glass border-t border-[var(--border-subtle)]">
        <div className="max-w-2xl mx-auto flex items-center justify-around px-2 py-2">
          {([
            { key: 'home', icon: Home, label: t('nav.home') },
            { key: 'search', icon: Search, label: t('nav.search') },
            { key: 'discover', icon: LayoutGrid, label: lang === 'ar' ? 'استكشاف' : 'Discover' },
            { key: 'donate', icon: Gift, label: lang === 'ar' ? 'تبرع' : 'Donate' },
            { key: 'meds', icon: Pill, label: lang === 'ar' ? 'أدويتي' : 'My Meds' },
            { key: 'profile', icon: User, label: t('nav.profile') },
          ] as const).map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key as Tab)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                tab === item.key ? 'text-brand-green-light' : 'text-[var(--text-muted)]'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-tajawal font-bold">{item.label}</span>
              {tab === item.key && (
                <motion.div layoutId="bottomNav" className="absolute -top-px w-8 h-0.5 bg-brand-green rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Report Wrong Data Modal */}
      {reportModal}

      {/* OCR Scanner Modal */}
      <AnimatePresence>
        {showOCR && (
          <OCRScanner onResult={(text) => { setQuery(text); setTab('search'); }} onClose={() => setShowOCR(false)} isRTL={lang === 'ar'} />
        )}
      </AnimatePresence>

      {/* Emergency Broadcast Modal */}
      <AnimatePresence>
        {broadcast && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card p-5 w-full max-w-md border-2" style={{ borderColor: broadcast.severity === 'emergency' ? 'var(--status-emergency)' : 'var(--status-busy)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${broadcast.severity === 'emergency' ? 'bg-status-emergency/20' : 'bg-amber-500/20'}`}>
                  <Radio className={`w-6 h-6 ${broadcast.severity === 'emergency' ? 'text-status-emergency' : 'text-amber-400'}`} />
                </div>
                <div>
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${broadcast.severity === 'emergency' ? 'bg-status-emergency/20 text-status-emergency' : 'bg-amber-500/20 text-amber-400'}`}>
                    {broadcast.severity === 'emergency' ? (lang === 'ar' ? 'طارئ' : 'EMERGENCY') : (lang === 'ar' ? 'تنبيه' : 'WARNING')}
                  </div>
                  <h3 className="font-cairo font-bold text-base mt-1">{broadcast.title}</h3>
                </div>
              </div>
              <p className="text-sm font-tajawal text-[var(--text-soft)] leading-relaxed mb-2">{broadcast.message}</p>
              <div className="text-xs text-[var(--text-muted)] font-tajawal mb-4">{lang === 'ar' ? 'المنطقة' : 'Area'}: {broadcast.area === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : broadcast.area}</div>
              <button onClick={() => { sessionStorage.setItem(`broadcast_${broadcast.id}`, '1'); setBroadcast(null); }} className="btn-primary w-full text-sm">{lang === 'ar' ? 'فهمت' : 'Got it'}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chatbot */}
      <AIChatbot />
    </div>
  );
}

/* ===================== REPORT FORM MODAL ===================== */
function ReportFormModal({ target, onClose, onSubmit, lang }: {
  target: { targetType: string; targetId: string; targetName: string };
  onClose: () => void;
  onSubmit: (issueType: string, message: string) => void;
  lang: string;
}) {
  const isRTL = lang === 'ar';
  const [issueType, setIssueType] = useState('wrong_status');
  const [message, setMessage] = useState('');
  const issueLabels: Record<string, string> = {
    wrong_status: isRTL ? 'حالة خاطئة' : 'Wrong Status',
    wrong_availability: isRTL ? 'توفر خاطئ' : 'Wrong Availability',
    wrong_info: isRTL ? 'معلومات خاطئة' : 'Wrong Info',
    other: isRTL ? 'أخرى' : 'Other',
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cairo font-bold text-base flex items-center gap-2"><Flag className="w-5 h-5 text-amber-400" />{isRTL ? 'الإبلاغ عن بيانات خاطئة' : 'Report Wrong Data'}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)]">✕</button>
        </div>
        <p className="text-xs text-[var(--text-muted)] font-tajawal mb-3">{isRTL ? 'الهدف' : 'Target'}: {target.targetName}</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'نوع المشكلة' : 'Issue Type'}</label>
            <select value={issueType} onChange={(e) => setIssueType(e.target.value)} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl">
              {Object.entries(issueLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </select>
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'تفاصيل' : 'Details'}</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl focus:outline-none focus:border-brand-green resize-none" placeholder={isRTL ? 'اشرح المشكلة...' : 'Explain the issue...'} />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => onSubmit(issueType, message)} disabled={!message.trim()} className="btn-primary flex-1 text-sm disabled:opacity-50">{isRTL ? 'إرسال البلاغ' : 'Submit Report'}</button>
          <button onClick={onClose} className="btn-secondary text-sm px-4">{isRTL ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
function HomeTab({ pharmacies, facilities, departments, openPharmacies, activeFacilities, emergencyFacilities, favIds, onFacilityClick, onPharmacyClick, onSearchClick, onTrendingClick, onToggleFav, t }: {
  pharmacies: Pharmacy[]; facilities: Facility[]; departments: Record<string, Department[]>;
  openPharmacies: number; activeFacilities: number; emergencyFacilities: number;
  favIds: Set<string>;
  onFacilityClick: (f: Facility) => void; onPharmacyClick: (p: Pharmacy) => void;
  onSearchClick: () => void; onTrendingClick: (m: string) => void;
  onToggleFav: (f: Facility) => void; t: (k: string) => string;
}) {
  return (
    <div className="space-y-6">
      {/* Quick search */}
      <button onClick={onSearchClick} className="w-full glass-card p-4 flex items-center gap-3 text-right hover:scale-[1.01] transition-transform">
        <Search className="w-5 h-5 text-brand-green-light" />
        <span className="font-tajawal text-[var(--text-muted)]">{t('dash.searchPlaceholder')}</span>
      </button>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Pill} value={openPharmacies} label={t('dash.openPharmacies')} color="brand-green" delay={0} />
        <StatCard icon={Shield} value={activeFacilities} label={t('dash.activeFacilities')} color="brand-blue" delay={0.1} />
        <StatCard icon={Bell} value={emergencyFacilities} label={t('dash.emergencyFacilities')} color="status-emergency" delay={0.2} />
      </div>

      {/* Trending meds */}
      <div>
        <h3 className="font-cairo font-bold text-sm mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-green-light" />
          {t('dash.trendingSearches')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {TRENDING_MEDS.map((m) => (
            <button key={m} onClick={() => onTrendingClick(m)} className="px-4 py-2 rounded-full glass text-sm font-tajawal hover:bg-brand-green/10 transition-colors">
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Nearby facilities */}
      <div>
        <h3 className="font-cairo font-bold text-lg mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand-green-light" />
          {t('dash.nearbyFacilities')}
        </h3>
        <div className="space-y-3">
          {facilities.slice(0, 5).map((f, i) => {
            const depts = departments[f.id] || [];
            const occ = facilityOccupancy(depts);
            const isFav = favIds.has(f.id);
            return (
              <motion.div key={f.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.08 } }} className="glass-card p-4 light-sweep">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-brand-blue/20 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-brand-blue-light" />
                    </div>
                    <div>
                      <div className="font-cairo font-bold text-sm">{f.name}</div>
                      <div className="text-xs text-[var(--text-muted)] font-tajawal flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {f.address || f.area}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-blue/20 text-brand-blue-light font-bold">
                          {f.type === 'hospital' ? t('dash.hospital') : f.type === 'clinic' ? t('dash.clinic') : t('dash.medicalPoint')}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${f.is_free ? 'bg-status-open/20 text-status-open' : 'bg-status-busy/20 text-status-busy'}`}>
                          {f.is_free ? t('dash.free') : t('dash.paid')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={f.overall_status} />
                    <button onClick={(e) => { e.stopPropagation(); onToggleFav(f); }} className={isFav ? 'text-status-emergency' : 'text-[var(--text-muted)]'}>
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-status-emergency' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-[var(--text-muted)] font-tajawal">{t('dash.occupancy')}</span>
                  <OccupancyBar value={occ} delay={i * 0.1} />
                  <span className="text-xs font-inter font-bold">{occ}%</span>
                </div>
                <button onClick={() => onFacilityClick(f)} className="btn-secondary w-full text-xs py-2">
                  {t('dash.viewDetails')}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Open pharmacies */}
      <div>
        <h3 className="font-cairo font-bold text-lg mb-3 flex items-center gap-2">
          <Pill className="w-5 h-5 text-brand-green-light" />
          {t('dash.openPharmacies')}
        </h3>
        <div className="space-y-2">
          {pharmacies.filter((p) => p.is_open).slice(0, 4).map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.08 } }} onClick={() => onPharmacyClick(p)} className="glass-card p-3 flex items-center gap-3 cursor-pointer hover:scale-[1.01] transition-transform">
              <div className="w-10 h-10 rounded-xl bg-brand-green/20 flex items-center justify-center">
                <Pill className="w-5 h-5 text-brand-green-light" />
              </div>
              <div className="flex-1">
                <div className="font-cairo font-bold text-sm">{p.name}</div>
                <div className="text-xs text-[var(--text-muted)] font-tajawal">{p.area}</div>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-status-busy fill-status-busy" />
                <span className="font-inter font-bold text-sm">{p.rating}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================== SEARCH TAB ===================== */
function SearchTab({ query, setQuery, pharmacies, medicines, facilities, departments, favIds, radius, setRadius, onPharmacyClick, onFacilityClick, onToggleFavPharm, onToggleFavFac, t, onOCR, onVoice, listening, isRTL }: {
  query: string; setQuery: (q: string) => void;
  pharmacies: Pharmacy[]; medicines: Record<string, Medicine[]>; facilities: Facility[]; departments: Record<string, Department[]>;
  favIds: Set<string>;
  radius: number; setRadius: (v: number) => void;
  onPharmacyClick: (p: Pharmacy) => void; onFacilityClick: (f: Facility) => void;
  onToggleFavPharm: (p: Pharmacy) => void; onToggleFavFac: (f: Facility) => void;
  t: (k: string) => string;
  onOCR: () => void; onVoice: () => void; listening: boolean; isRTL: boolean;
}) {
  const [mode, setMode] = useState<SearchMode>('medicine');
  const [sort, setSort] = useState<'nearest' | 'cheapest' | 'rating'>('nearest');
  const [facType, setFacType] = useState<'all' | 'hospital' | 'clinic' | 'medical_point'>('all');
  const [cost, setCost] = useState<'all' | 'free' | 'paid'>('all');

  /* Medicine results — bilingual fuzzy search */
  const allMedicines = useMemo(() => Object.values(medicines).flat(), [medicines]);
  const medResults = useMemo(() => {
    const found = searchMedicines(query, allMedicines, pharmacies);
    let results = found.map((r) => ({ pharmacy: r.pharmacy, medicine: r.medicine }));
    if (sort === 'cheapest') results.sort((a, b) => a.medicine.price - b.medicine.price);
    else if (sort === 'rating') results.sort((a, b) => b.pharmacy.rating - a.pharmacy.rating);
    return results;
  }, [query, allMedicines, pharmacies, sort]);

  /* Autocomplete suggestions */
  const suggestions = useMemo(() => autocompleteSuggestions(query, allMedicines), [query, allMedicines]);

  /* Facility results — bilingual fuzzy search */
  const facResults = useMemo(() => {
    const found = searchFacilities(query, facilities).map((r) => r.facility);
    let r = found;
    if (facType !== 'all') r = r.filter((f) => f.type === facType);
    if (cost !== 'all') r = r.filter((f) => (cost === 'free' ? f.is_free : !f.is_free));
    return r;
  }, [facilities, facType, cost, query]);

  return (
    <div className="space-y-4">
      {/* Radius selector */}
      <RadiusSelector value={radius} onChange={setRadius} isRTL={t('dash.searchPlaceholder').includes('بحث')} />

      {/* Search input */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-green-light" />
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={t('dash.searchPlaceholder')}
          className="w-full glass-card pr-11 pl-20 py-3.5 text-right font-tajawal focus:outline-none focus:border-brand-green transition-colors"
          autoFocus
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <button onClick={onVoice} title={isRTL ? 'بحث صوتي' : 'Voice search'} className={`p-1.5 rounded-lg transition-colors ${listening ? 'bg-status-emergency/20 text-status-emergency animate-pulse' : 'text-brand-green-light hover:bg-brand-green/10'}`}>
            <Mic className="w-4 h-4" />
          </button>
          <button onClick={onOCR} title={isRTL ? 'ماسح الروشتة' : 'Prescription scanner'} className="p-1.5 rounded-lg text-brand-green-light hover:bg-brand-green/10 transition-colors">
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Autocomplete suggestions */}
      {suggestions.length > 0 && query.length >= 2 && (
        <div className="glass-card p-2 space-y-1">
          {suggestions.map((s) => (
            <button key={s} onClick={() => setQuery(s)} className="w-full text-right px-3 py-2 rounded-lg hover:bg-brand-green/10 transition-colors text-sm font-tajawal flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-brand-green-light shrink-0" />
              <span>{s}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2">
        {([
          { k: 'medicine', l: t('dash.medicines') },
          { k: 'facility', l: t('dash.facilities') },
        ] as const).map((m) => (
          <button key={m.k} onClick={() => setMode(m.k)} className={`flex-1 py-2 rounded-xl text-sm font-tajawal font-bold transition-colors ${mode === m.k ? 'bg-brand-green text-white' : 'glass text-[var(--text-soft)]'}`}>
            {m.l}
          </button>
        ))}
      </div>

      {/* Medicine mode */}
      {mode === 'medicine' && (
        <>
          {/* Sort chips */}
          <div className="flex gap-2 flex-wrap">
            {([
              { k: 'nearest', l: t('dash.sortNearest') },
              { k: 'cheapest', l: t('dash.sortCheapest') },
              { k: 'rating', l: t('dash.sortRating') },
            ] as const).map((s) => (
              <button key={s.k} onClick={() => setSort(s.k)} className={`px-3 py-1.5 rounded-full text-xs font-tajawal font-bold transition-colors ${sort === s.k ? 'bg-brand-blue text-white' : 'glass text-[var(--text-soft)]'}`}>
                {s.l}
              </button>
            ))}
          </div>

          {query.length >= 2 && medResults.length === 0 && (
            <div className="glass-card p-8 text-center">
              <Pill className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
              <p className="font-tajawal text-[var(--text-soft)]">{t('dash.noResults')}</p>
            </div>
          )}

          <div className="space-y-3">
            {medResults.map(({ pharmacy, medicine }, i) => (
              <motion.div key={medicine.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }} className="glass-card p-4 light-sweep">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-brand-green/20 flex items-center justify-center shrink-0">
                      <Pill className="w-5 h-5 text-brand-green-light" />
                    </div>
                    <div>
                      <div className="font-cairo font-bold text-sm">{medicine.medicine_name}</div>
                      <div className="text-xs text-[var(--text-muted)] font-tajawal">{medicine.generic_name}</div>
                    </div>
                  </div>
                  <button onClick={() => onToggleFavPharm(pharmacy)} className={favIds.has(pharmacy.id) ? 'text-status-emergency' : 'text-[var(--text-muted)]'}>
                    <Heart className={`w-4 h-4 ${favIds.has(pharmacy.id) ? 'fill-status-emergency' : ''}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs font-tajawal text-[var(--text-muted)] mb-3">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {pharmacy.name} · {pharmacy.address || pharmacy.area}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={pharmacy.status} />
                    <span className="text-xs text-status-open font-bold">{t('dash.available')}: {medicine.quantity}</span>
                  </div>
                  <div className="font-inter font-bold text-lg text-brand-green-light">{medicine.price} ₪</div>
                </div>
                <button onClick={() => onPharmacyClick(pharmacy)} className="btn-primary w-full text-xs py-2 mt-3 flex items-center justify-center gap-1">
                  <Pill className="w-3 h-3" /> {t('dash.visitPharmacy')}
                </button>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Facility mode */}
      {mode === 'facility' && (
        <>
          {/* Type filter */}
          <div className="flex gap-2 flex-wrap">
            {([
              { k: 'all', l: t('dash.all') },
              { k: 'hospital', l: t('dash.hospital') },
              { k: 'clinic', l: t('dash.clinic') },
              { k: 'medical_point', l: t('dash.medicalPoint') },
            ] as const).map((s) => (
              <button key={s.k} onClick={() => setFacType(s.k)} className={`px-3 py-1.5 rounded-full text-xs font-tajawal font-bold transition-colors ${facType === s.k ? 'bg-brand-blue text-white' : 'glass text-[var(--text-soft)]'}`}>
                {s.l}
              </button>
            ))}
          </div>
          {/* Cost filter */}
          <div className="flex gap-2 flex-wrap">
            {([
              { k: 'all', l: t('dash.all') },
              { k: 'free', l: t('dash.free') },
              { k: 'paid', l: t('dash.paid') },
            ] as const).map((s) => (
              <button key={s.k} onClick={() => setCost(s.k)} className={`px-3 py-1.5 rounded-full text-xs font-tajawal font-bold transition-colors ${cost === s.k ? 'bg-brand-green text-white' : 'glass text-[var(--text-soft)]'}`}>
                {s.l}
              </button>
            ))}
          </div>

          {facResults.length === 0 && (
            <div className="glass-card p-8 text-center">
              <Shield className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
              <p className="font-tajawal text-[var(--text-soft)]">{t('dash.noResults')}</p>
            </div>
          )}

          <div className="space-y-3">
            {facResults.map((f, i) => {
              const occ = facilityOccupancy(departments[f.id] || []);
              const isFav = favIds.has(f.id);
              return (
                <motion.div key={f.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }} className="glass-card p-4 light-sweep">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-brand-blue/20 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 text-brand-blue-light" />
                      </div>
                      <div>
                        <div className="font-cairo font-bold text-sm">{f.name}</div>
                        <div className="text-xs text-[var(--text-muted)] font-tajawal flex items-center gap-1"><MapPin className="w-3 h-3" /> {f.address || f.area}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-blue/20 text-brand-blue-light font-bold">
                            {f.type === 'hospital' ? t('dash.hospital') : f.type === 'clinic' ? t('dash.clinic') : t('dash.medicalPoint')}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${f.is_free ? 'bg-status-open/20 text-status-open' : 'bg-status-busy/20 text-status-busy'}`}>
                            {f.is_free ? t('dash.free') : t('dash.paid')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={f.overall_status} />
                      <button onClick={() => onToggleFavFac(f)} className={isFav ? 'text-status-emergency' : 'text-[var(--text-muted)]'}>
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-status-emergency' : ''}`} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-[var(--text-muted)] font-tajawal">{t('dash.occupancy')}</span>
                    <OccupancyBar value={occ} delay={i * 0.05} />
                    <span className="text-xs font-inter font-bold">{occ}%</span>
                  </div>
                  <button onClick={() => onFacilityClick(f)} className="btn-secondary w-full text-xs py-2">
                    {t('dash.checkOccupancy')}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Recent searches when empty */}
      {!query && (
        <div>
          <h3 className="font-cairo font-bold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-green-light" />
            {t('dash.trendingSearches')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {RECENT_SEARCHES.map((m) => (
              <button key={m} onClick={() => setQuery(m)} className="px-4 py-2 rounded-full glass text-sm font-tajawal hover:bg-brand-green/10 transition-colors">
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== DISCOVER TAB ===================== */
function DiscoverTab({ pharmacies, facilities, medicines, departments, onPharmacyClick, onFacilityClick, lang }: {
  pharmacies: Pharmacy[]; facilities: Facility[]; medicines: Record<string, Medicine[]>; departments: Record<string, Department[]>;
  onPharmacyClick: (p: Pharmacy) => void; onFacilityClick: (f: Facility) => void;
  lang: string;
}) {
  const isRTL = lang === 'ar';
  const [view, setView] = useState<'facilities' | 'pharmacies' | 'medicines'>('facilities');
  const [govFilter, setGovFilter] = useState('all');
  const [selectedMed, setSelectedMed] = useState<string | null>(null);

  const governorates = Array.from(new Set([
    ...facilities.map((f) => f.area).filter(Boolean),
    ...pharmacies.map((p) => p.area).filter(Boolean),
  ])).sort();

  const filteredFacilities = govFilter === 'all' ? facilities : facilities.filter((f) => f.area === govFilter);
  const filteredPharmacies = govFilter === 'all' ? pharmacies : pharmacies.filter((p) => p.area === govFilter);

  // Build medicine availability map
  const allMeds = Object.values(medicines).flat();
  const uniqueMedNames = Array.from(new Set(allMeds.map((m) => m.medicine_name))).sort();
  const medPharmacies = selectedMed
    ? allMeds.filter((m) => m.medicine_name === selectedMed).map((m) => ({
        med: m,
        pharmacy: pharmacies.find((p) => p.id === m.pharmacy_id),
      })).filter((x) => x.pharmacy)
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-cairo font-bold text-lg mb-1">{isRTL ? 'استكشاف شامل' : 'Full Discovery'}</h3>
        <p className="text-sm font-tajawal text-[var(--text-muted)]">{isRTL ? 'تصفّح جميع المرافق والصيدليات والأدوية المتاحة' : 'Browse all facilities, pharmacies, and available medicines'}</p>
      </div>

      {/* View tabs */}
      <div className="flex gap-2">
        {([
          { k: 'facilities', l: isRTL ? 'المرافق' : 'Facilities', icon: Shield },
          { k: 'pharmacies', l: isRTL ? 'الصيدليات' : 'Pharmacies', icon: Pill },
          { k: 'medicines', l: isRTL ? 'الأدوية' : 'Medicines', icon: Pill },
        ] as const).map((v) => (
          <button key={v.k} onClick={() => { setView(v.k); setSelectedMed(null); }} className={`px-4 py-2 rounded-full text-sm font-tajawal font-bold transition-colors flex items-center gap-1.5 ${view === v.k ? 'bg-brand-green text-white' : 'glass text-[var(--text-soft)]'}`}>
            <v.icon className="w-3.5 h-3.5" /> {v.l}
          </button>
        ))}
      </div>

      {/* Governorate filter */}
      {view !== 'medicines' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-tajawal text-[var(--text-muted)] shrink-0">{isRTL ? 'المحافظة:' : 'Governorate:'}</span>
          <button onClick={() => setGovFilter('all')} className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${govFilter === 'all' ? 'bg-brand-blue text-white' : 'glass'}`}>{isRTL ? 'الكل' : 'All'}</button>
          {governorates.map((g) => (
            <button key={g} onClick={() => setGovFilter(g)} className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${govFilter === g ? 'bg-brand-blue text-white' : 'glass'}`}>{g}</button>
          ))}
        </div>
      )}

      {/* Facilities view */}
      {view === 'facilities' && (
        <div className="space-y-2">
          {filteredFacilities.length === 0 ? (
            <p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-8">{isRTL ? 'لا توجد مرافق' : 'No facilities'}</p>
          ) : (
            filteredFacilities.map((f, i) => {
              const occ = facilityOccupancy(departments[f.id] || []);
              return (
                <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }} onClick={() => onFacilityClick(f)} className="glass-card p-3 cursor-pointer hover:border-brand-blue/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-blue/20 flex items-center justify-center shrink-0"><Shield className="w-5 h-5 text-brand-blue-light" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-cairo font-bold text-sm truncate">{f.name}</div>
                      <div className="text-xs text-[var(--text-muted)] font-tajawal">{f.area} · {f.type}</div>
                    </div>
                    <div className="text-end shrink-0">
                      <StatusBadge status={f.overall_status} />
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{isRTL ? `إشغال ${occ}%` : `${occ}% full`}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Pharmacies view */}
      {view === 'pharmacies' && (
        <div className="space-y-2">
          {filteredPharmacies.length === 0 ? (
            <p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-8">{isRTL ? 'لا توجد صيدليات' : 'No pharmacies'}</p>
          ) : (
            filteredPharmacies.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }} onClick={() => onPharmacyClick(p)} className="glass-card p-3 cursor-pointer hover:border-brand-green/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-green/20 flex items-center justify-center shrink-0"><Pill className="w-5 h-5 text-brand-green-light" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-cairo font-bold text-sm truncate">{p.name}</div>
                    <div className="text-xs text-[var(--text-muted)] font-tajawal">{p.area} · {p.status}</div>
                  </div>
                  <div className="text-end shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.status === 'open' ? 'bg-status-open/20 text-status-open' : 'bg-status-closed/20 text-status-closed'}`}>{p.status}</span>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">⭐ {p.rating}</div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Medicines view */}
      {view === 'medicines' && (
        <div className="space-y-3">
          {!selectedMed ? (
            <>
              <p className="text-xs font-tajawal text-[var(--text-muted)]">{isRTL ? `اضغط على دواء لمعرفة أين يتوفر (${uniqueMedNames.length})` : `Tap a medicine to see where it's available (${uniqueMedNames.length})`}</p>
              <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
                {uniqueMedNames.map((name, i) => {
                  const count = allMeds.filter((m) => m.medicine_name === name).length;
                  return (
                    <motion.button key={name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.02 } }} onClick={() => setSelectedMed(name)} className="glass-card p-2.5 w-full flex items-center justify-between hover:border-brand-green/40 transition-colors">
                      <span className="font-cairo font-bold text-sm flex items-center gap-2"><Pill className="w-3.5 h-3.5 text-brand-green-light" /> {name}</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-bold">{count} {isRTL ? 'صيدلية' : 'pharmacies'}</span>
                    </motion.button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setSelectedMed(null)} className="text-sm font-tajawal text-brand-blue-light flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> {isRTL ? 'رجوع' : 'Back'}</button>
              <h4 className="font-cairo font-bold text-base">{selectedMed}</h4>
              <div className="space-y-2">
                {medPharmacies.map(({ med, pharmacy }) => (
                  <div key={med.id} onClick={() => pharmacy && onPharmacyClick(pharmacy)} className="glass-card p-3 cursor-pointer hover:border-brand-green/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4 text-brand-green-light" />
                        <div>
                          <div className="font-cairo font-bold text-sm">{pharmacy?.name}</div>
                          <div className="text-xs text-[var(--text-muted)] font-tajawal">{pharmacy?.area} · {med.generic_name}</div>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="font-inter font-bold text-sm text-brand-green-light">{med.price} ₪</div>
                        <div className={`text-[10px] font-bold ${med.quantity > 0 ? 'text-status-open' : 'text-status-emergency'}`}>{med.quantity > 0 ? (isRTL ? 'متوفر' : 'In stock') : (isRTL ? 'نفد' : 'Out')}: {med.quantity}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {medPharmacies.length === 0 && <p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-4">{isRTL ? 'غير متوفر حالياً' : 'Not available'}</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ===================== MAP TAB ===================== */
function MapTab({ pharmacies, facilities, onPharmacyClick, onFacilityClick, t }: {
  pharmacies: Pharmacy[]; facilities: Facility[];
  onPharmacyClick: (p: Pharmacy) => void; onFacilityClick: (f: Facility) => void;
  t: (k: string) => string;
}) {
  const [filter, setFilter] = useState<MapFilter>('all');
  const [selected, setSelected] = useState<{ name: string; type: 'pharmacy' | 'facility'; item: Pharmacy | Facility } | null>(null);

  const showPharm = filter === 'all' || filter === 'pharmacies';
  const showFac = filter === 'all' || filter === 'facilities';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-cairo font-bold text-lg mb-1">{t('dash.map.title')}</h3>
        <p className="text-sm font-tajawal text-[var(--text-muted)]">{t('dash.map.subtitle')}</p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {([
          { k: 'all', l: t('dash.map.all') },
          { k: 'pharmacies', l: t('dash.map.pharmacies') },
          { k: 'facilities', l: t('dash.map.facilities') },
        ] as const).map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)} className={`px-4 py-2 rounded-full text-sm font-tajawal font-bold transition-colors ${filter === f.k ? 'bg-brand-green text-white' : 'glass text-[var(--text-soft)]'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* SVG map */}
      <div className="relative h-80 rounded-2xl bg-dark-3/50 border border-[var(--border-subtle)] overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`v${i}`} x1={`${(i + 1) * 12.5}%`} y1="0" x2={`${(i + 1) * 12.5}%`} y2="100%" stroke="var(--border-subtle)" strokeWidth="0.5" />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={`${(i + 1) * 16}%`} x2="100%" y2={`${(i + 1) * 16}%`} stroke="var(--border-subtle)" strokeWidth="0.5" />
          ))}
        </svg>

        {/* Pharmacy pins */}
        {showPharm && pharmacies.map((p, i) => (
          <motion.button
            key={p.id}
            onClick={() => setSelected({ name: p.name, type: 'pharmacy', item: p })}
            initial={{ scale: 0 }}
            animate={{ scale: 1, transition: { delay: i * 0.05 } }}
            className={`absolute w-5 h-5 rounded-full border-2 border-white ${p.status === 'open' ? 'bg-status-open' : 'bg-status-closed'} -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform`}
            style={{ top: `${15 + (i * 17) % 60}%`, left: `${20 + (i * 23) % 60}%` }}
            aria-label={p.name}
          />
        ))}

        {/* Facility pins */}
        {showFac && facilities.map((f, i) => (
          <motion.button
            key={f.id}
            onClick={() => setSelected({ name: f.name, type: 'facility', item: f })}
            initial={{ scale: 0 }}
            animate={{ scale: 1, transition: { delay: i * 0.05 } }}
            className={`absolute w-7 h-7 rounded-full border-2 border-white ${pinColors[f.overall_status]} -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform flex items-center justify-center`}
            style={{ top: `${25 + (i * 19) % 50}%`, left: `${30 + (i * 29) % 50}%` }}
            aria-label={f.name}
          >
            <Shield className="w-3.5 h-3.5 text-white" />
          </motion.button>
        ))}
      </div>

      {/* Floating selected card */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selected.type === 'pharmacy' ? <Pill className="w-5 h-5 text-brand-green-light" /> : <Shield className="w-5 h-5 text-brand-blue-light" />}
              <span className="font-cairo font-bold text-sm">{selected.name}</span>
            </div>
            <button
              onClick={() => selected.type === 'pharmacy' ? onPharmacyClick(selected.item as Pharmacy) : onFacilityClick(selected.item as Facility)}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {t('dash.map.viewDetails')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="glass-card p-4">
        <div className="text-xs font-cairo font-bold mb-2">{t('dash.map.legend')}</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { c: 'bg-status-open', l: t('status.open') },
            { c: 'bg-status-busy', l: t('status.busy') },
            { c: 'bg-status-emergency', l: t('status.emergency') },
            { c: 'bg-status-closed', l: t('status.closed') },
          ].map((s) => (
            <div key={s.l} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${s.c}`} />
              <span className="text-xs font-tajawal">{s.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================== PROFILE TAB ===================== */
function ProfileTab({ profile, favorites, pharmacies, facilities, darkMode, setDarkMode, seniorMode, setSeniorMode, theme, onToggleTheme, onToggleFav, onSignOut, t }: {
  profile: { display_name: string; role: string; phone: string } | null;
  favorites: Favorite[]; pharmacies: Pharmacy[]; facilities: Facility[];
  darkMode: boolean; setDarkMode: (v: boolean) => void;
  seniorMode: boolean; setSeniorMode: (v: boolean) => void;
  theme: 'dark' | 'light'; onToggleTheme: () => void;
  onToggleFav: (id: string, type: 'pharmacy' | 'facility', name: string) => void;
  onSignOut: () => void; t: (k: string) => string;
}) {
  const favPharmacies = pharmacies.filter((p) => favorites.some((f) => f.target_id === p.id && f.target_type === 'pharmacy'));
  const favFacilities = facilities.filter((f) => favorites.some((fa) => fa.target_id === f.id && fa.target_type === 'facility'));

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="glass-card p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-green to-brand-blue flex items-center justify-center font-cairo font-black text-3xl text-white mx-auto mb-4">
          {profile?.display_name?.charAt(0) || 'م'}
        </div>
        <h3 className="font-cairo font-black text-xl">{profile?.display_name}</h3>
        <p className="text-sm font-tajawal text-[var(--text-muted)] mt-1">{profile?.phone || '—'}</p>
        <span className="inline-block mt-2 px-3 py-1 rounded-full bg-brand-green/20 text-brand-green-light text-xs font-bold">
          {profile?.role === 'citizen' ? t('auth.citizen') : profile?.role || t('auth.citizen')}
        </span>
      </div>

      {/* Toggles */}
      <div className="glass-card p-4 space-y-3">
        <button onClick={onToggleTheme} className="w-full flex items-center justify-between">
          <span className="font-tajawal text-sm flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-brand-blue-light" /> : <Sun className="w-4 h-4 text-amber-400" />}
            {theme === 'dark' ? t('profile.darkMode') : (t('profile.darkMode') === 'الوضع الداكن' ? 'الوضع الفاتح' : 'Light mode')}
          </span>
          <span className={`w-10 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-brand-green' : 'bg-[var(--border-subtle)]'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-0.5' : 'right-0.5'}`} />
          </span>
        </button>
        <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center justify-between">
          <span className="font-tajawal text-sm flex items-center gap-2"><Moon className="w-4 h-4 text-brand-blue-light" /> {t('profile.darkMode')}</span>
          <span className={`w-10 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-brand-green' : 'bg-[var(--border-subtle)]'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${darkMode ? 'left-0.5' : 'right-0.5'}`} />
          </span>
        </button>
        <button onClick={() => setSeniorMode(!seniorMode)} className="w-full flex items-center justify-between">
          <span className="font-tajawal text-sm flex items-center gap-2"><Volume2 className="w-4 h-4 text-brand-green-light" /> {t('profile.seniorMode')}</span>
          <span className={`w-10 h-6 rounded-full transition-colors relative ${seniorMode ? 'bg-brand-green' : 'bg-[var(--border-subtle)]'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${seniorMode ? 'left-0.5' : 'right-0.5'}`} />
          </span>
        </button>
      </div>

      {/* Favorites */}
      <div>
        <h3 className="font-cairo font-bold text-lg mb-3">{t('profile.favorites')}</h3>
        {favPharmacies.length === 0 && favFacilities.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <p className="font-tajawal text-[var(--text-muted)]">{t('profile.noFavorites')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {favPharmacies.map((p) => (
              <div key={p.id} className="glass-card p-3 flex items-center gap-3">
                <Pill className="w-5 h-5 text-brand-green-light" />
                <span className="font-cairo font-bold text-sm flex-1">{p.name}</span>
                <button onClick={() => onToggleFav(p.id, 'pharmacy', p.name)} className="text-status-emergency">
                  <Heart className="w-4 h-4 fill-status-emergency" />
                </button>
              </div>
            ))}
            {favFacilities.map((f) => (
              <div key={f.id} className="glass-card p-3 flex items-center gap-3">
                <Shield className="w-5 h-5 text-brand-blue-light" />
                <span className="font-cairo font-bold text-sm flex-1">{f.name}</span>
                <button onClick={() => onToggleFav(f.id, 'facility', f.name)} className="text-status-emergency">
                  <Heart className="w-4 h-4 fill-status-emergency" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button onClick={onSignOut} className="w-full btn-secondary text-sm flex items-center justify-center gap-2 text-status-emergency">
        <LogOut className="w-4 h-4" /> {t('profile.logout')}
      </button>
    </div>
  );
}

/* ===================== FACILITY DETAIL ===================== */
function FacilityDetail({ facility, departments, isFav, notifyIds, onBack, onToggleFav, onToggleNotify, onReport }: {
  facility: Facility; departments: Department[]; isFav: boolean; notifyIds: Set<string>;
  onBack: () => void; onToggleFav: () => void; onToggleNotify: (d: Department) => void; onReport: () => void;
}) {
  const { t, lang } = useLang();
  const occ = facilityOccupancy(departments);

  return (
    <div className="min-h-screen pb-20 bg-[var(--bg-dark)]">
      <div className="sticky top-0 z-30 glass border-b border-[var(--border-subtle)] px-4 py-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-tajawal text-brand-blue-light hover:underline">
          <ChevronLeft className="w-4 h-4" /> {t('dash.back')}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-blue/20 flex items-center justify-center shrink-0">
                <Shield className="w-8 h-8 text-brand-blue-light" />
              </div>
              <div>
                <h2 className="font-cairo font-black text-xl">{facility.name}</h2>
                <p className="text-sm text-[var(--text-muted)] font-tajawal flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {facility.address || facility.area}
                </p>
                <p className="text-sm text-[var(--text-muted)] font-tajawal flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3" /> {facility.phone || '—'}
                </p>
              </div>
            </div>
            <button onClick={onToggleFav} className={`p-3 rounded-full glass transition-colors ${isFav ? 'text-status-emergency' : 'text-[var(--text-muted)]'}`}>
              <Heart className={`w-5 h-5 ${isFav ? 'fill-status-emergency' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge status={facility.overall_status} size="md" />
            <span className="text-sm text-[var(--text-muted)] font-tajawal">{facility.is_free ? t('dash.free') : t('dash.paid')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-tajawal text-[var(--text-soft)]">{t('dash.occupancy')}</span>
            <OccupancyBar value={occ} />
            <span className="text-sm font-inter font-bold">{occ}%</span>
          </div>
          {/* Last updated + Power status */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {facility.last_updated_at && (
              <span className="text-[10px] text-[var(--text-muted)] font-tajawal flex items-center gap-1">
                <Clock className="w-3 h-3" /> {lang === 'ar' ? 'آخر تحديث' : 'Last updated'}: {timeAgo(facility.last_updated_at, lang)}
              </span>
            )}
            {facility.power_status === 'generator' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> {lang === 'ar' ? 'مولّد كهرباء' : 'Generator'}</span>
            )}
            {facility.power_status === 'no_power' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-emergency/20 text-status-emergency font-bold">{lang === 'ar' ? 'لا كهرباء' : 'No Power'}</span>
            )}
          </div>
          {/* Actions */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <a href={`tel:${facility.phone || ''}`} className="btn-secondary flex items-center justify-center gap-1.5 text-xs">
              <Phone className="w-3.5 h-3.5" /> {t('dash.call')}
            </a>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center justify-center gap-1.5 text-xs">
              <Navigation className="w-3.5 h-3.5" /> {lang === 'ar' ? 'توجيه' : 'Navigate'}
            </a>
            <button onClick={onReport} className="px-3 py-2 rounded-xl glass text-amber-400 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-amber-500/15 transition-colors">
              <Flag className="w-3.5 h-3.5" /> {lang === 'ar' ? 'بلاغ' : 'Report'}
            </button>
          </div>
        </motion.div>

        {/* Departments */}
        <div>
          <h3 className="font-cairo font-bold text-lg mb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-blue-light" />
            {t('dash.departments')} ({departments.length})
          </h3>
          <div className="space-y-3">
            {departments.map((d, i) => {
              const canNotify = d.status === 'busy' || d.status === 'emergency';
              const isNotifying = notifyIds.has(d.id);
              return (
                <motion.div key={d.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.08 } }} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${pinColors[d.status] || 'bg-status-open'} ${d.status === 'open' ? 'status-pulse' : ''}`} />
                      <span className="font-cairo font-bold">{d.name}</span>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="flex items-center justify-between text-sm font-tajawal text-[var(--text-soft)] mb-2">
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {d.doctor_name}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {d.waiting_count} {t('dash.waiting')}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5 text-brand-green-light" />
                    <span className="text-xs text-[var(--text-muted)] font-tajawal">{t('dash.estClear')}:</span>
                    <span className="text-xs font-bold text-brand-green-light">{d.estimated_clear_time || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)] font-tajawal">{t('dash.workHours')}:</span>
                    <span className="text-xs font-bold text-[var(--text-soft)]">{d.open_time} - {d.close_time}</span>
                  </div>
                  {canNotify && (
                    <button
                      onClick={() => onToggleNotify(d)}
                      className={`w-full text-xs py-2 rounded-xl font-bold transition-colors ${isNotifying ? 'bg-status-busy/20 text-status-busy' : 'btn-primary'}`}
                    >
                      {isNotifying ? t('dash.cancelNotify') : t('dash.notifyMe')}
                    </button>
                  )}
                </motion.div>
              );
            })}
            {departments.length === 0 && (
              <div className="glass-card p-6 text-center">
                <p className="font-tajawal text-[var(--text-muted)]">{t('dash.noResults')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Rating card */}
        <RatingCard targetId={facility.id} targetType="facility" targetName={facility.name} />
      </div>
    </div>
  );
}

/* ===================== PHARMACY DETAIL ===================== */
function PharmacyDetail({ pharmacy, medicines, isFav, onBack, onToggleFav, onReport }: {
  pharmacy: Pharmacy; medicines: Medicine[]; isFav: boolean;
  onBack: () => void; onToggleFav: () => void; onReport: () => void;
}) {
  const { t, lang } = useLang();
  const [search, setSearch] = useState('');

  const filtered = medicines.filter((m) =>
    m.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
    m.generic_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen pb-20 bg-[var(--bg-dark)]">
      <div className="sticky top-0 z-30 glass border-b border-[var(--border-subtle)] px-4 py-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-tajawal text-brand-blue-light hover:underline">
          <ChevronLeft className="w-4 h-4" /> {t('dash.back')}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-green/20 flex items-center justify-center shrink-0">
                <Pill className="w-8 h-8 text-brand-green-light" />
              </div>
              <div>
                <h2 className="font-cairo font-black text-xl">{pharmacy.name}</h2>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`w-4 h-4 ${n <= Math.round(pharmacy.rating) ? 'text-status-busy fill-status-busy' : 'text-[var(--border-subtle)]'}`} />
                  ))}
                  <span className="font-inter font-bold text-sm mr-1">{pharmacy.rating}</span>
                  <span className="text-xs text-[var(--text-muted)]">({pharmacy.reviews_count} {t('dash.reviews')})</span>
                </div>
                <p className="text-sm text-[var(--text-muted)] font-tajawal flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" /> {pharmacy.address || pharmacy.area}
                </p>
                <p className="text-sm text-[var(--text-muted)] font-tajawal flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" /> {pharmacy.open_hours || '—'}
                </p>
                <p className="text-sm text-[var(--text-muted)] font-tajawal flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3" /> {pharmacy.phone || '—'}
                </p>
              </div>
            </div>
            <button onClick={onToggleFav} className={`p-3 rounded-full glass transition-colors ${isFav ? 'text-status-emergency' : 'text-[var(--text-muted)]'}`}>
              <Heart className={`w-5 h-5 ${isFav ? 'fill-status-emergency' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={pharmacy.status} size="md" />
            {pharmacy.open_hours?.includes('24') && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-blue/20 text-brand-blue-light font-bold flex items-center gap-1"><Moon className="w-2.5 h-2.5" /> {lang === 'ar' ? '24/7' : '24/7'}</span>
            )}
          </div>
          {pharmacy.last_updated_at && (
            <div className="mt-3">
              <span className="text-[10px] text-[var(--text-muted)] font-tajawal flex items-center gap-1">
                <Clock className="w-3 h-3" /> {lang === 'ar' ? 'آخر تحديث' : 'Last updated'}: {timeAgo(pharmacy.last_updated_at, lang)}
              </span>
            </div>
          )}
          {!pharmacy.is_open && (
            <div className="mt-4 glass rounded-xl p-3 text-center text-sm font-tajawal text-status-closed">
              {t('dash.closedBanner')}
            </div>
          )}
        </motion.div>

        {/* Call + Directions + Report */}
        <div className="grid grid-cols-3 gap-3">
          <a href={`tel:${pharmacy.phone || ''}`} className="btn-secondary flex items-center justify-center gap-2 text-sm">
            <Phone className="w-4 h-4" /> {t('dash.call')}
          </a>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}`} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center justify-center gap-2 text-sm">
            <Navigation className="w-4 h-4" /> {lang === 'ar' ? 'توجيه' : 'Navigate'}
          </a>
          <button onClick={onReport} className="px-3 py-2 rounded-xl glass text-amber-400 text-sm font-bold flex items-center justify-center gap-2 hover:bg-amber-500/15 transition-colors">
            <Flag className="w-4 h-4" /> {lang === 'ar' ? 'بلاغ' : 'Report'}
          </button>
        </div>

        {/* Medicine search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-green-light" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('dash.searchMeds')}
            className="w-full glass-card pr-11 pl-4 py-3 text-right font-tajawal focus:outline-none focus:border-brand-green transition-colors"
          />
        </div>

        {/* Medicine list */}
        <div>
          <h3 className="font-cairo font-bold text-lg mb-3">{t('dash.medList')}</h3>
          <div className="space-y-2">
            {filtered.map((m, i) => {
              const badge = stockBadge(m, t);
              return (
                <div key={m.id}>
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05 } }} className="glass-card p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-green/20 flex items-center justify-center shrink-0">
                      <Pill className="w-5 h-5 text-brand-green-light" />
                    </div>
                    <div className="flex-1">
                      <div className="font-cairo font-bold text-sm">{m.medicine_name}</div>
                      <div className="text-xs text-[var(--text-muted)] font-tajawal">{m.generic_name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-tajawal mt-0.5">
                        {t('dash.lastUpdate')}: {timeAgo(m.last_updated, lang)}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-inter font-bold text-brand-green-light">{m.price} ₪</div>
                      <div className={`text-xs font-bold ${badge.cls}`}>{badge.text}</div>
                    </div>
                  </motion.div>
                  <div className="px-2 pb-2">
                    <GenericFinder medicineName={m.medicine_name} activeIngredient={m.generic_name} />
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="glass-card p-6 text-center">
                <p className="font-tajawal text-[var(--text-muted)]">{t('dash.noResults')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Rating card */}
        <RatingCard targetId={pharmacy.id} targetType="pharmacy" targetName={pharmacy.name} />
      </div>
    </div>
  );
}
