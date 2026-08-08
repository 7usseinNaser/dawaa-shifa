import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Plus, X, Shield, Droplet, CircleAlert as AlertCircle, Phone, Trash2, CreditCard as Edit2, Check, ChevronDown } from 'lucide-react';

interface EmergencyProfile {
  fullName: string;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  medications: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

const STORAGE_KEY = 'emergency_medical_id';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const emptyProfile: EmergencyProfile = {
  fullName: '', bloodType: '', allergies: '', chronicConditions: '',
  medications: '', emergencyContactName: '', emergencyContactPhone: '',
};

export function EmergencyMedicalID({ isRTL, collapsible = false }: { isRTL: boolean; collapsible?: boolean }) {
  const [profile, setProfile] = useState<EmergencyProfile>(emptyProfile);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EmergencyProfile>(emptyProfile);
  const [showFull, setShowFull] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setProfile(JSON.parse(stored));
      else setEditing(true);
    } catch { /* ignore */ }
  }, []);

  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch { /* ignore */ }
    setProfile(draft);
    setEditing(false);
  };

  const clearProfile = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setProfile(emptyProfile);
    setDraft(emptyProfile);
    setEditing(true);
  };

  const hasData = profile.fullName || profile.bloodType || profile.emergencyContactPhone;

  if (editing) {
    return (
      <div className="glass-card p-5 border-2 border-status-emergency/40">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-status-emergency" />
          <h3 className="font-cairo font-bold text-base">
            {isRTL ? 'بطاقة هوية طبية طارئة' : 'Emergency Medical ID'}
          </h3>
        </div>
        <p className="text-xs font-tajawal text-[var(--text-muted)] mb-4">
          {isRTL ? 'تُحفظ هذه البيانات على جهازك فقط وتعمل بدون إنترنت. يسهل الوصول إليها في حالات الطوارئ.' : 'This data is stored only on your device and works offline. Easily accessible in emergencies.'}
        </p>
        <div className="space-y-3">
          <Field label={isRTL ? 'الاسم الكامل' : 'Full Name'} value={draft.fullName} onChange={(v) => setDraft({ ...draft, fullName: v })} isRTL={isRTL} />
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1.5">{isRTL ? 'فصيلة الدم' : 'Blood Type'}</label>
            <div className="flex gap-1.5 flex-wrap">
              {BLOOD_TYPES.map((bt) => (
                <button key={bt} onClick={() => setDraft({ ...draft, bloodType: bt })} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${draft.bloodType === bt ? 'bg-status-emergency text-white' : 'glass text-[var(--text-soft)]'}`}>{bt}</button>
              ))}
            </div>
          </div>
          <Field label={isRTL ? 'الحساسية' : 'Allergies'} value={draft.allergies} onChange={(v) => setDraft({ ...draft, allergies: v })} isRTL={isRTL} placeholder={isRTL ? 'مثال: البنسلين، الفول السوداني' : 'e.g. Penicillin, Peanuts'} />
          <Field label={isRTL ? 'أمراض مزمنة' : 'Chronic Conditions'} value={draft.chronicConditions} onChange={(v) => setDraft({ ...draft, chronicConditions: v })} isRTL={isRTL} placeholder={isRTL ? 'مثال: سكري، ضغط' : 'e.g. Diabetes, Hypertension'} />
          <Field label={isRTL ? 'أدوية حالية' : 'Current Medications'} value={draft.medications} onChange={(v) => setDraft({ ...draft, medications: v })} isRTL={isRTL} />
          <Field label={isRTL ? 'اسم جهة الاتصال' : 'Emergency Contact Name'} value={draft.emergencyContactName} onChange={(v) => setDraft({ ...draft, emergencyContactName: v })} isRTL={isRTL} />
          <Field label={isRTL ? 'هاتف الاتصال' : 'Emergency Contact Phone'} value={draft.emergencyContactPhone} onChange={(v) => setDraft({ ...draft, emergencyContactPhone: v })} isRTL={isRTL} placeholder="08..." />
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={save} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4" /> {isRTL ? 'حفظ' : 'Save'}
          </button>
          {hasData && (
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm px-4">{isRTL ? 'إلغاء' : 'Cancel'}</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 border-2 border-status-emergency/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-status-emergency/10 rounded-full -translate-y-12 translate-x-12 blur-2xl" />
      <div className="flex items-center justify-between mb-4 relative">
        <button
          type="button"
          onClick={collapsible ? () => setCollapsed((c) => !c) : undefined}
          className="flex items-center gap-2 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-status-emergency/20 flex items-center justify-center">
            <Heart className="w-5 h-5 text-status-emergency fill-status-emergency" />
          </div>
          <div>
            <h3 className="font-cairo font-bold text-base flex items-center gap-1.5">
              {isRTL ? 'هوية طبية طارئة' : 'Emergency Medical ID'}
              {collapsible && (
                <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${collapsed ? '' : 'rotate-180'}`} />
              )}
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] font-tajawal">{isRTL ? 'تعمل بدون إنترنت' : 'Works offline'}</p>
          </div>
        </button>
        <div className="flex gap-1">
          <button onClick={() => { setDraft(profile); setEditing(true); }} className="p-2 rounded-lg glass hover:bg-brand-green/10 transition-colors">
            <Edit2 className="w-3.5 h-3.5 text-brand-green-light" />
          </button>
          <button onClick={clearProfile} className="p-2 rounded-lg glass hover:bg-status-emergency/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-status-emergency" />
          </button>
        </div>
      </div>

      {(!collapsible || !collapsed) && (
        hasData ? (
        <div className="space-y-2.5 relative">
          {profile.fullName && (
            <InfoRow icon={<Shield className="w-3.5 h-3.5" />} label={isRTL ? 'الاسم' : 'Name'} value={profile.fullName} />
          )}
          {profile.bloodType && (
            <InfoRow icon={<Droplet className="w-3.5 h-3.5 text-status-emergency" />} label={isRTL ? 'فصيلة الدم' : 'Blood Type'} value={profile.bloodType} highlight />
          )}
          {profile.allergies && (
            <InfoRow icon={<AlertCircle className="w-3.5 h-3.5 text-amber-400" />} label={isRTL ? 'الحساسية' : 'Allergies'} value={profile.allergies} />
          )}
          {profile.chronicConditions && (
            <InfoRow icon={<Heart className="w-3.5 h-3.5" />} label={isRTL ? 'أمراض مزمنة' : 'Chronic Conditions'} value={profile.chronicConditions} />
          )}
          {profile.medications && (
            <InfoRow icon={<Plus className="w-3.5 h-3.5" />} label={isRTL ? 'أدوية' : 'Medications'} value={profile.medications} />
          )}
          {profile.emergencyContactName && (
            <InfoRow icon={<Phone className="w-3.5 h-3.5 text-brand-green-light" />} label={isRTL ? 'اتصال طارئ' : 'Emergency Contact'} value={`${profile.emergencyContactName} · ${profile.emergencyContactPhone}`} />
          )}
          {profile.emergencyContactPhone && (
            <a href={`tel:${profile.emergencyContactPhone}`} className="btn-primary w-full text-sm flex items-center justify-center gap-2 mt-3">
              <Phone className="w-4 h-4" /> {isRTL ? 'اتصال طارئ' : 'Call Emergency Contact'}
            </a>
          )}
        </div>
      ) : (
        <div className="text-center py-6 relative">
          <Shield className="w-10 h-10 mx-auto mb-2 text-[var(--text-muted)] opacity-40" />
          <p className="text-sm font-tajawal text-[var(--text-muted)] mb-3">{isRTL ? 'لا توجد بيانات طبية بعد' : 'No medical data yet'}</p>
          <button onClick={() => { setDraft(emptyProfile); setEditing(true); }} className="btn-primary text-sm">
            {isRTL ? 'إضافة بياناتي' : 'Add My Info'}
          </button>
        </div>
      )
      )}
    </div>
  );
}

function Field({ label, value, onChange, isRTL, placeholder }: { label: string; value: string; onChange: (v: string) => void; isRTL: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full glass-card px-3 py-2 text-sm font-tajawal focus:outline-none focus:border-brand-green" dir={isRTL ? 'rtl' : 'ltr'} />
    </div>
  );
}

function InfoRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg glass flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-[var(--text-muted)] font-tajawal">{label}</div>
        <div className={`text-sm font-bold truncate ${highlight ? 'text-status-emergency' : ''}`}>{value}</div>
      </div>
    </div>
  );
}
