import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Store, Building2, Bug, Lightbulb, Check, X, Clock,
  Trash2, RefreshCw, Users, Package, AlertTriangle, ChevronRight, Loader as Loader2,
  MessageCircle, Send,
} from 'lucide-react';
import { supabase, type Pharmacy, type Facility, type BugReport, type BugReportChat, type Suggestion, type Conversation, type ConversationMessage } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { showToast } from '@/components/ui/Toast';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

type Tab = 'overview' | 'approvals' | 'bugs' | 'suggestions';

export default function AdminPanel() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [isRTL] = useState(true);

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { id: 'overview', label: isRTL ? 'نظرة عامة' : 'Overview', icon: LayoutDashboard },
    { id: 'approvals', label: isRTL ? 'الموافقات' : 'Approvals', icon: Store },
    { id: 'bugs', label: isRTL ? 'البلاغات' : 'Bug Reports', icon: Bug },
    { id: 'suggestions', label: isRTL ? 'الاقتراحات' : 'Suggestions', icon: Lightbulb },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-dark)] text-[var(--text-main)]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden md:flex flex-col w-64 shrink-0">
            <div className="glass-card p-5 sticky top-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-2xl bg-brand-blue/15 flex items-center justify-center">
                  <LayoutDashboard className="w-6 h-6 text-brand-blue-light" />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{isRTL ? 'لوحة الإدارة' : 'Admin Panel'}</p>
                  <p className="font-bold truncate">{profile?.display_name ?? 'Admin'}</p>
                </div>
              </div>
              <nav className="space-y-1">
                {tabs.map((tb) => {
                  const Icon = tb.icon;
                  const active = tab === tb.id;
                  return (
                    <button key={tb.id} onClick={() => setTab(tb.id)}
                      className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all ${active ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-[var(--text-soft)] hover:bg-white/5'}`}>
                      {active && <motion.div layoutId="admin-sidebar-active" className="absolute inset-y-2 right-0 w-1 rounded-full bg-brand-blue-light" transition={{ duration: 0.3, ease: EASE }} />}
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{tb.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Mobile tabs */}
            <div className="md:hidden mb-6">
              <div className="glass-card p-2 flex items-center gap-1">
                {tabs.map((tb) => {
                  const Icon = tb.icon;
                  const active = tab === tb.id;
                  return (
                    <button key={tb.id} onClick={() => setTab(tb.id)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${active ? 'bg-brand-blue/15 text-brand-blue-light' : 'text-[var(--text-muted)]'}`}>
                      <Icon className="w-5 h-5" />
                      <span>{tb.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {tab === 'overview' && <OverviewTab key="overview" isRTL={isRTL} setTab={setTab} />}
              {tab === 'approvals' && <ApprovalsTab key="approvals" isRTL={isRTL} />}
              {tab === 'bugs' && <BugReportsTab key="bugs" isRTL={isRTL} />}
              {tab === 'suggestions' && <SuggestionsTab key="suggestions" isRTL={isRTL} />}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

// ============ Overview Tab ============
function OverviewTab({ isRTL, setTab }: { isRTL: boolean; setTab: (t: Tab) => void }) {
  const [stats, setStats] = useState({ users: 0, pharmacies: 0, facilities: 0, pending: 0, bugs: 0, suggestions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [users, pharmacies, facilities, pendingPharms, pendingFacs, bugs, suggestions] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('pharmacies').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('facilities').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('pharmacies').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending').is('deleted_at', null),
        supabase.from('facilities').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending').is('deleted_at', null),
        supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('suggestions').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ]);
      setStats({
        users: users.count ?? 0,
        pharmacies: pharmacies.count ?? 0,
        facilities: facilities.count ?? 0,
        pending: (pendingPharms.count ?? 0) + (pendingFacs.count ?? 0),
        bugs: bugs.count ?? 0,
        suggestions: suggestions.count ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-blue-light" /></div>;

  const cards = [
    { label: isRTL ? 'المستخدمون' : 'Users', value: stats.users, icon: Users, color: 'text-brand-blue-light', bg: 'bg-brand-blue/15' },
    { label: isRTL ? 'الصيدليات' : 'Pharmacies', value: stats.pharmacies, icon: Store, color: 'text-brand-green', bg: 'bg-brand-green/15' },
    { label: isRTL ? 'المرافق' : 'Facilities', value: stats.facilities, icon: Building2, color: 'text-brand-green-light', bg: 'bg-brand-green-light/15' },
    { label: isRTL ? 'بانتظار الموافقة' : 'Pending Approvals', value: stats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/15', tab: 'approvals' as Tab },
    { label: isRTL ? 'بلاغات مفتوحة' : 'Open Bug Reports', value: stats.bugs, icon: Bug, color: 'text-red-400', bg: 'bg-red-500/15', tab: 'bugs' as Tab },
    { label: isRTL ? 'اقتراحات مفتوحة' : 'Open Suggestions', value: stats.suggestions, icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-500/15', tab: 'suggestions' as Tab },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-6">
      <h1 className="text-2xl font-bold">{isRTL ? 'نظرة عامة' : 'Overview'}</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.label} onClick={() => c.tab && setTab(c.tab)} className="glass-card p-5 text-start hover:border-brand-blue/30 transition-colors">
              <div className={`w-10 h-10 rounded-2xl ${c.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div className="text-3xl font-bold">{c.value}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{c.label}</div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============ Approvals Tab ============
function ApprovalsTab({ isRTL }: { isRTL: boolean }) {
  const [pendingPharmacies, setPendingPharmacies] = useState<Pharmacy[]>([]);
  const [pendingFacilities, setPendingFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<{ type: 'pharmacy' | 'facility'; id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [activeList, setActiveList] = useState<'pharmacies' | 'facilities'>('pharmacies');

  const loadPending = useCallback(async () => {
    setLoading(true);
    const [pharms, facs] = await Promise.all([
      supabase.from('pharmacies').select('id,owner_id,name,area,address,phone,open_hours,is_open,status,verified,approval_status,rejection_reason,deleted_at,lat,lng,rating,reviews_count,power_status,last_updated_at,created_at,is_reference,facility_id').eq('approval_status', 'pending').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('facilities').select('id,owner_id,name,type,is_free,area,address,lat,lng,phone,overall_status,verified,power_status,occupancy_rate,max_capacity,deleted_at,last_updated_at,approval_status,rejection_reason,pricing_type,facility_capacity').eq('approval_status', 'pending').is('deleted_at', null).order('created_at', { ascending: false }),
    ]);
    setPendingPharmacies((pharms.data as Pharmacy[]) ?? []);
    setPendingFacilities((facs.data as Facility[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  // Realtime for new pending requests
  useEffect(() => {
    const pharmChannel = supabase.channel('admin_pending_pharmacies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacies' }, () => loadPending())
      .subscribe();
    const facChannel = supabase.channel('admin_pending_facilities')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facilities' }, () => loadPending())
      .subscribe();
    return () => { supabase.removeChannel(pharmChannel); supabase.removeChannel(facChannel); };
  }, [loadPending]);

  async function approve(type: 'pharmacy' | 'facility', id: string) {
    const table = type === 'pharmacy' ? 'pharmacies' : 'facilities';
    const { error } = await supabase.from(table).update({ approval_status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', id);
    if (error) { showToast(isRTL ? `فشل الموافقة: ${error.message}` : `Failed to approve: ${error.message}`, 'error'); return; }
    showToast(isRTL ? 'تمت الموافقة بنجاح' : 'Approved successfully');
    await loadPending();
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setRejecting(true);
    const table = rejectTarget.type === 'pharmacy' ? 'pharmacies' : 'facilities';
    const { error } = await supabase.from(table).update({
      approval_status: 'rejected',
      rejection_reason: rejectReason.trim() || null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', rejectTarget.id);
    setRejecting(false);
    if (error) { showToast(isRTL ? `فشل الرفض: ${error.message}` : `Failed to reject: ${error.message}`, 'error'); return; }
    showToast(isRTL ? 'تم رفض الطلب' : 'Request rejected');
    setRejectTarget(null);
    setRejectReason('');
    await loadPending();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-blue-light" /></div>;

  const list = activeList === 'pharmacies' ? pendingPharmacies : pendingFacilities;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isRTL ? 'طلبات بانتظار الموافقة' : 'Pending Approvals'}</h1>
        <button onClick={loadPending} className="glass-card p-2 rounded-xl hover:bg-white/10 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Toggle between pharmacies and facilities */}
      <div className="flex gap-2">
        <button onClick={() => setActiveList('pharmacies')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeList === 'pharmacies' ? 'bg-brand-green/15 text-brand-green' : 'glass text-[var(--text-muted)]'}`}>
          <Store className="w-4 h-4" />
          {isRTL ? 'الصيدليات' : 'Pharmacies'} ({pendingPharmacies.length})
        </button>
        <button onClick={() => setActiveList('facilities')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeList === 'facilities' ? 'bg-brand-green-light/15 text-brand-green-light' : 'glass text-[var(--text-muted)]'}`}>
          <Building2 className="w-4 h-4" />
          {isRTL ? 'المرافق' : 'Facilities'} ({pendingFacilities.length})
        </button>
      </div>

      {list.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Check className="w-10 h-10 text-brand-green mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">{isRTL ? 'لا توجد طلبات معلّقة' : 'No pending requests'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold truncate">{item.name}</h3>
                  <div className="text-xs text-[var(--text-muted)] mt-1 space-y-0.5">
                    <p>{isRTL ? 'المنطقة:' : 'Area:'} {item.area || '—'}</p>
                    <p>{isRTL ? 'الهاتف:' : 'Phone:'} {item.phone || '—'}</p>
                    {activeList === 'facilities' && (item as Facility).type && (
                      <p>{isRTL ? 'النوع:' : 'Type:'} {(item as Facility).type}</p>
                    )}
                    {activeList === 'pharmacies' && (item as Pharmacy).is_reference && (
                      <p className="text-brand-green font-bold">{isRTL ? 'صيدلية مرجعية' : 'Reference pharmacy'}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => approve(activeList === 'pharmacies' ? 'pharmacy' : 'facility', item.id)}
                    className="w-9 h-9 rounded-xl bg-brand-green/15 hover:bg-brand-green/25 flex items-center justify-center transition-colors" title={isRTL ? 'موافقة' : 'Approve'}>
                    <Check className="w-5 h-5 text-brand-green" />
                  </button>
                  <button onClick={() => setRejectTarget({ type: activeList === 'pharmacies' ? 'pharmacy' : 'facility', id: item.id, name: item.name })}
                    className="w-9 h-9 rounded-xl bg-red-500/15 hover:bg-red-500/25 flex items-center justify-center transition-colors" title={isRTL ? 'رفض' : 'Reject'}>
                    <X className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Reject confirmation modal */}
      <AnimatePresence>
        {rejectTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <X className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="font-bold text-lg">{isRTL ? 'رفض الطلب' : 'Reject Request'}</h2>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                {isRTL ? `هل أنت متأكد من رفض "${rejectTarget.name}"؟` : `Are you sure you want to reject "${rejectTarget.name}"?`}
              </p>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
                placeholder={isRTL ? 'سبب الرفض (اختياري)...' : 'Rejection reason (optional)...'}
                className="w-full glass rounded-xl px-4 py-2.5 bg-transparent outline-none focus:border-red-400 transition-colors resize-none text-sm" />
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                  className="flex-1 glass rounded-xl py-2.5 font-bold hover:bg-white/10 transition-colors">
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button onClick={confirmReject} disabled={rejecting}
                  className="flex-1 rounded-xl py-2.5 font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  {isRTL ? 'رفض' : 'Reject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ Bug Reports Tab ============
interface SenderInfo { display_name: string; email: string; role: string; pharmacy_name: string | null; facility_name: string | null; }

function BugReportsTab({ isRTL }: { isRTL: boolean }) {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [chatMessages, setChatMessages] = useState<BugReportChat[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [senderInfo, setSenderInfo] = useState<SenderInfo | null>(null);
  const [senderLoading, setSenderLoading] = useState(false);
  const [convMessages, setConvMessages] = useState<ConversationMessage[]>([]);
  const [convInput, setConvInput] = useState('');
  const [convLoading, setConvLoading] = useState(false);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [showConv, setShowConv] = useState(false);
  const [convStarting, setConvStarting] = useState(false);
  const { user, profile } = useAuth();

  const loadReports = useCallback(async () => {
    const { data, error } = await supabase.from('bug_reports')
      .select('id,reporter_id,reporter_name,category,description,status,created_at,resolved_at,admin_notes')
      .order('created_at', { ascending: false });
    if (error) { console.error('[loadReports] error:', error.message); }
    setReports((data as BugReport[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  useEffect(() => {
    const channel = supabase.channel('admin_bug_reports_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bug_reports' },
        (payload) => {
          setReports((prev) => [payload.new as BugReport, ...prev]);
          showToast(isRTL ? 'بلاغ تقني جديد' : 'New bug report');
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bug_reports' },
        (payload) => {
          setReports((prev) => prev.map((r) => r.id === (payload.new as BugReport).id ? payload.new as BugReport : r));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function updateStatus(report: BugReport, status: 'open' | 'reviewing' | 'resolved') {
    const updates: Record<string, unknown> = { status };
    if (status === 'resolved') updates.resolved_at = new Date().toISOString();
    const { error } = await supabase.from('bug_reports').update(updates).eq('id', report.id);
    if (error) { showToast(isRTL ? 'فشل التحديث' : 'Failed to update', 'error'); return; }
    showToast(isRTL ? 'تم التحديث' : 'Updated');
    await loadReports();
  }

  // Load sender info + chat messages when a report is selected
  useEffect(() => {
    if (!selectedReport) return;
    setSenderInfo(null);
    setChatMessages([]);
    setSenderLoading(true);

    (async () => {
      // Load sender profile
      if (selectedReport.reporter_id) {
        const { data: prof } = await supabase.from('profiles')
          .select('display_name,email,role,pharmacy_id,facility_id')
          .eq('id', selectedReport.reporter_id).maybeSingle();
        if (prof) {
          let pharmacy_name: string | null = null;
          let facility_name: string | null = null;
          if (prof.pharmacy_id) {
            const { data: pharm } = await supabase.from('pharmacies').select('name').eq('id', prof.pharmacy_id).maybeSingle();
            pharmacy_name = pharm?.name ?? null;
          }
          if (prof.facility_id) {
            const { data: fac } = await supabase.from('facilities').select('name').eq('id', prof.facility_id).maybeSingle();
            facility_name = fac?.name ?? null;
          }
          setSenderInfo({
            display_name: prof.display_name || selectedReport.reporter_name,
            email: prof.email || '—',
            role: prof.role || '—',
            pharmacy_name,
            facility_name,
          });
        }
      }
      setSenderLoading(false);

      // Load bug report chat messages
      const { data: chats } = await supabase.from('bug_report_chats')
        .select('id,bug_report_id,sender_id,sender_name,sender_role,message,created_at')
        .eq('bug_report_id', selectedReport.id)
        .order('created_at', { ascending: true });
      setChatMessages((chats as BugReportChat[]) ?? []);
    })();

    const channel = supabase.channel(`bug_chat_${selectedReport.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bug_report_chats', filter: `bug_report_id=eq.${selectedReport.id}` },
        (payload) => { setChatMessages((prev) => [...prev, payload.new as BugReportChat]); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedReport]);

  async function sendChat() {
    if (!chatInput.trim() || !selectedReport || !user) return;
    setChatLoading(true);
    const msg = chatInput.trim();
    setChatInput('');
    try {
      const { data, error } = await supabase.from('bug_report_chats').insert({
        bug_report_id: selectedReport.id,
        sender_id: user.id,
        sender_name: profile?.display_name || 'Admin',
        sender_role: 'admin',
        message: msg,
      }).select().single();
      if (error) throw error;
      if (data) setChatMessages((prev) => [...prev, data as BugReportChat]);
    } catch {
      showToast(isRTL ? 'فشل الإرسال' : 'Failed to send', 'error');
    } finally {
      setChatLoading(false);
    }
  }

  // Start or open a conversation linked to this bug report
  async function startConversation() {
    if (!selectedReport || !user) return;
    setConvStarting(true);
    try {
      // Check if a conversation already exists for this bug report
      const { data: existing } = await supabase.from('conversations')
        .select('id,user_id,admin_id,subject,status,created_at,closed_at,closed_by,entity_name,report_id,suggestion_id,bug_report_id')
        .eq('bug_report_id', selectedReport.id).maybeSingle();
      if (existing) {
        setActiveConv(existing as Conversation);
      } else {
        const { data: newConv, error } = await supabase.from('conversations').insert({
          bug_report_id: selectedReport.id,
          user_id: selectedReport.reporter_id,
          admin_id: user.id,
          subject: `بلاغ: ${selectedReport.reporter_name}`,
          status: 'open',
        }).select('id,user_id,admin_id,subject,status,created_at,closed_at,closed_by,entity_name,report_id,suggestion_id,bug_report_id').single();
        if (error) throw error;
        setActiveConv(newConv as Conversation);
      }
      setShowConv(true);
      // Load conversation messages
      const { data: msgs } = await supabase.from('conversation_messages')
        .select('id,conversation_id,sender_id,sender_name,sender_role,message,created_at')
        .eq('conversation_id', (existing ?? (await supabase.from('conversations').select('id').eq('bug_report_id', selectedReport.id).maybeSingle()).data)?.id ?? activeConv?.id)
        .order('created_at', { ascending: true });
      setConvMessages((msgs as ConversationMessage[]) ?? []);
    } catch {
      showToast(isRTL ? 'فشل بدء المحادثة' : 'Failed to start conversation', 'error');
    } finally {
      setConvStarting(false);
    }
  }

  // Realtime for conversation messages
  useEffect(() => {
    if (!showConv || !activeConv) return;
    const channel = supabase.channel(`admin_conv_${activeConv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages', filter: `conversation_id=eq.${activeConv.id}` },
        (payload) => { setConvMessages((prev) => [...prev, payload.new as ConversationMessage]); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [showConv, activeConv]);

  async function sendConvMessage() {
    if (!convInput.trim() || !activeConv || !user) return;
    setConvLoading(true);
    const msg = convInput.trim();
    setConvInput('');
    try {
      const { data, error } = await supabase.from('conversation_messages').insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        sender_name: profile?.display_name || 'Admin',
        sender_role: 'admin',
        message: msg,
      }).select().single();
      if (error) throw error;
      if (data) setConvMessages((prev) => [...prev, data as ConversationMessage]);
    } catch {
      showToast(isRTL ? 'فشل الإرسال' : 'Failed to send', 'error');
    } finally {
      setConvLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-blue-light" /></div>;

  const categoryLabels: Record<string, string> = {
    ui: isRTL ? 'واجهة المستخدم' : 'UI Issue',
    data: isRTL ? 'بيانات' : 'Data Issue',
    auth: isRTL ? 'مصادقة' : 'Authentication',
    performance: isRTL ? 'أداء' : 'Performance',
    other: isRTL ? 'أخرى' : 'Other',
  };
  const statusColors: Record<string, string> = {
    open: 'bg-red-500/15 text-red-400',
    reviewing: 'bg-amber-500/15 text-amber-400',
    resolved: 'bg-brand-green/15 text-brand-green',
  };
  const roleLabels: Record<string, string> = {
    citizen: isRTL ? 'مواطن' : 'Citizen',
    pharmacist: isRTL ? 'صيدلي' : 'Pharmacist',
    facility_owner: isRTL ? 'مدير مرفق' : 'Facility Owner',
    admin: isRTL ? 'مدير' : 'Admin',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isRTL ? 'البلاغات التقنية' : 'Bug Reports'}</h1>
        <button onClick={loadReports} className="glass-card p-2 rounded-xl hover:bg-white/10 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Bug className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">{isRTL ? 'لا توجد بلاغات' : 'No bug reports'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 cursor-pointer hover:border-brand-blue/30 transition-colors"
              onClick={() => setSelectedReport(r)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColors[r.status]}`}>{r.status}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)]">{categoryLabels[r.category] || r.category}</span>
                  </div>
                  <p className="text-sm font-tajawal line-clamp-2">{r.description}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{r.reporter_name} · {new Date(r.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
                </div>
                <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {r.status !== 'reviewing' && (
                    <button onClick={() => updateStatus(r, 'reviewing')} className="w-8 h-8 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center" title={isRTL ? 'قيد المراجعة' : 'Reviewing'}>
                      <Clock className="w-4 h-4 text-amber-400" />
                    </button>
                  )}
                  {r.status !== 'resolved' && (
                    <button onClick={() => updateStatus(r, 'resolved')} className="w-8 h-8 rounded-lg bg-brand-green/10 hover:bg-brand-green/20 flex items-center justify-center" title={isRTL ? 'حل' : 'Resolve'}>
                      <Check className="w-4 h-4 text-brand-green" />
                    </button>
                  )}
                  {r.status === 'resolved' && (
                    <button onClick={() => updateStatus(r, 'open')} className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center" title={isRTL ? 'إعادة فتح' : 'Reopen'}>
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Bug report detail + chat modal */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setSelectedReport(null); setChatMessages([]); setSenderInfo(null); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="glass-card p-0 w-full max-w-md h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                <h3 className="font-bold flex items-center gap-2">
                  <Bug className="w-5 h-5 text-amber-400" />
                  {isRTL ? 'تفاصيل البلاغ' : 'Bug Report Details'}
                </h3>
                <button onClick={() => { setSelectedReport(null); setChatMessages([]); setSenderInfo(null); }} className="p-1.5 rounded-lg glass">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Full sender details */}
              <div className="p-4 border-b border-[var(--border-subtle)] space-y-3">
                <div className="flex gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColors[selectedReport.status]}`}>{selectedReport.status}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)]">{categoryLabels[selectedReport.category] || selectedReport.category}</span>
                </div>
                <p className="text-sm font-tajawal">{selectedReport.description}</p>
                {senderLoading ? (
                  <p className="text-[10px] text-[var(--text-muted)]">{isRTL ? 'جارٍ تحميل البيانات...' : 'Loading...'}</p>
                ) : senderInfo ? (
                  <div className="glass rounded-xl p-3 space-y-1">
                    <p className="text-xs font-bold">{senderInfo.display_name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{isRTL ? 'البريد:' : 'Email:'} {senderInfo.email}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{isRTL ? 'نوع الحساب:' : 'Account type:'} {roleLabels[senderInfo.role] || senderInfo.role}</p>
                    {senderInfo.pharmacy_name && <p className="text-[10px] text-[var(--text-muted)]">{isRTL ? 'الصيدلية:' : 'Pharmacy:'} {senderInfo.pharmacy_name}</p>}
                    {senderInfo.facility_name && <p className="text-[10px] text-[var(--text-muted)]">{isRTL ? 'المرفق:' : 'Facility:'} {senderInfo.facility_name}</p>}
                  </div>
                ) : (
                  <p className="text-[10px] text-[var(--text-muted)]">{selectedReport.reporter_name}</p>
                )}
                <p className="text-[10px] text-[var(--text-muted)]">{new Date(selectedReport.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
                {/* Start conversation button */}
                <button onClick={startConversation} disabled={convStarting || !selectedReport.reporter_id}
                  className="w-full glass rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50">
                  {convStarting ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                  {isRTL ? 'بدء محادثة مع المرسل' : 'Start conversation with sender'}
                </button>
              </div>
              {/* Quick chat (bug_report_chats) */}
              <div className="px-4 pt-2 text-[10px] font-bold text-[var(--text-muted)]">{isRTL ? 'محادثة سريعة' : 'Quick chat'}</div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {chatMessages.length === 0 ? (
                  <p className="text-center text-sm text-[var(--text-muted)] mt-4">{isRTL ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
                ) : chatMessages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-xl p-2.5 ${isMine ? 'bg-brand-blue/20' : 'glass'}`}>
                        {!isMine && <span className="text-[10px] font-bold text-brand-green-light block mb-0.5">{m.sender_name}</span>}
                        <p className="text-xs font-tajawal">{m.message}</p>
                        <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{new Date(m.created_at).toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-[var(--border-subtle)] flex gap-2">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                  className="flex-1 glass rounded-xl px-3 py-2 text-sm font-tajawal focus:outline-none focus:border-brand-blue"
                  placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'} />
                <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="btn-primary px-4 py-2 disabled:opacity-50">
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full conversation modal */}
      <AnimatePresence>
        {showConv && activeConv && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowConv(false); setConvMessages([]); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="glass-card p-0 w-full max-w-md h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                <h3 className="font-bold flex items-center gap-2 text-sm">
                  <MessageCircle className="w-4 h-4 text-brand-blue-light" />
                  {isRTL ? 'محادثة بخصوص البلاغ' : 'Conversation about this bug report'}
                </h3>
                <button onClick={() => { setShowConv(false); setConvMessages([]); }} className="p-1.5 rounded-lg glass">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {convMessages.length === 0 ? (
                  <p className="text-center text-sm text-[var(--text-muted)] mt-4">{isRTL ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
                ) : convMessages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-xl p-2.5 ${isMine ? 'bg-brand-blue/20' : 'glass'}`}>
                        {!isMine && <span className="text-[10px] font-bold text-brand-green-light block mb-0.5">{m.sender_name}</span>}
                        <p className="text-xs font-tajawal">{m.message}</p>
                        <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{new Date(m.created_at).toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-[var(--border-subtle)] flex gap-2">
                <input value={convInput} onChange={(e) => setConvInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendConvMessage()}
                  className="flex-1 glass rounded-xl px-3 py-2 text-sm font-tajawal focus:outline-none focus:border-brand-blue"
                  placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'} />
                <button onClick={sendConvMessage} disabled={convLoading || !convInput.trim()} className="btn-primary px-4 py-2 disabled:opacity-50">
                  {convLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ Suggestions Tab ============
function SuggestionsTab({ isRTL }: { isRTL: boolean }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [senderInfo, setSenderInfo] = useState<SenderInfo | null>(null);
  const [senderLoading, setSenderLoading] = useState(false);
  const [convMessages, setConvMessages] = useState<ConversationMessage[]>([]);
  const [convInput, setConvInput] = useState('');
  const [convLoading, setConvLoading] = useState(false);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [showConv, setShowConv] = useState(false);
  const [convStarting, setConvStarting] = useState(false);
  const { user, profile } = useAuth();

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('suggestions')
      .select('id,user_id,user_name,user_role,entity_name,title,description,status,admin_notes,created_at')
      .order('created_at', { ascending: false });
    if (error) { console.error('[loadSuggestions] error:', error.message); }
    setSuggestions((data as Suggestion[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  useEffect(() => {
    const channel = supabase.channel('admin_suggestions_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suggestions' },
        (payload) => {
          setSuggestions((prev) => [payload.new as Suggestion, ...prev]);
          showToast(isRTL ? 'اقتراح جديد' : 'New suggestion');
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'suggestions' },
        (payload) => {
          setSuggestions((prev) => prev.map((s) => s.id === (payload.new as Suggestion).id ? payload.new as Suggestion : s));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function updateStatus(suggestion: Suggestion, status: 'open' | 'reviewing' | 'implemented' | 'rejected') {
    const { error } = await supabase.from('suggestions').update({ status }).eq('id', suggestion.id);
    if (error) { showToast(isRTL ? 'فشل التحديث' : 'Failed to update', 'error'); return; }
    showToast(isRTL ? 'تم التحديث' : 'Updated');
    await loadSuggestions();
  }

  // Load sender info when a suggestion is selected
  useEffect(() => {
    if (!selectedSuggestion) return;
    setSenderInfo(null);
    setSenderLoading(true);
    (async () => {
      if (selectedSuggestion.user_id) {
        const { data: prof } = await supabase.from('profiles')
          .select('display_name,email,role,pharmacy_id,facility_id')
          .eq('id', selectedSuggestion.user_id).maybeSingle();
        if (prof) {
          let pharmacy_name: string | null = null;
          let facility_name: string | null = null;
          if (prof.pharmacy_id) {
            const { data: pharm } = await supabase.from('pharmacies').select('name').eq('id', prof.pharmacy_id).maybeSingle();
            pharmacy_name = pharm?.name ?? null;
          }
          if (prof.facility_id) {
            const { data: fac } = await supabase.from('facilities').select('name').eq('id', prof.facility_id).maybeSingle();
            facility_name = fac?.name ?? null;
          }
          setSenderInfo({
            display_name: prof.display_name || selectedSuggestion.user_name,
            email: prof.email || '—',
            role: prof.role || '—',
            pharmacy_name,
            facility_name,
          });
        }
      }
      setSenderLoading(false);
    })();
  }, [selectedSuggestion]);

  async function startConversation() {
    if (!selectedSuggestion || !user) return;
    setConvStarting(true);
    try {
      const { data: existing } = await supabase.from('conversations')
        .select('id,user_id,admin_id,subject,status,created_at,closed_at,closed_by,entity_name,report_id,suggestion_id,bug_report_id')
        .eq('suggestion_id', selectedSuggestion.id).maybeSingle();
      let convId: string;
      if (existing) {
        setActiveConv(existing as Conversation);
        convId = existing.id;
      } else {
        const { data: newConv, error } = await supabase.from('conversations').insert({
          suggestion_id: selectedSuggestion.id,
          user_id: selectedSuggestion.user_id,
          admin_id: user.id,
          subject: `اقتراح: ${selectedSuggestion.title || selectedSuggestion.user_name}`,
          status: 'open',
        }).select('id,user_id,admin_id,subject,status,created_at,closed_at,closed_by,entity_name,report_id,suggestion_id,bug_report_id').single();
        if (error) throw error;
        setActiveConv(newConv as Conversation);
        convId = newConv.id;
      }
      setShowConv(true);
      const { data: msgs } = await supabase.from('conversation_messages')
        .select('id,conversation_id,sender_id,sender_name,sender_role,message,created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
      setConvMessages((msgs as ConversationMessage[]) ?? []);
    } catch {
      showToast(isRTL ? 'فشل بدء المحادثة' : 'Failed to start conversation', 'error');
    } finally {
      setConvStarting(false);
    }
  }

  useEffect(() => {
    if (!showConv || !activeConv) return;
    const channel = supabase.channel(`admin_sugg_conv_${activeConv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages', filter: `conversation_id=eq.${activeConv.id}` },
        (payload) => { setConvMessages((prev) => [...prev, payload.new as ConversationMessage]); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [showConv, activeConv]);

  async function sendConvMessage() {
    if (!convInput.trim() || !activeConv || !user) return;
    setConvLoading(true);
    const msg = convInput.trim();
    setConvInput('');
    try {
      const { data, error } = await supabase.from('conversation_messages').insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        sender_name: profile?.display_name || 'Admin',
        sender_role: 'admin',
        message: msg,
      }).select().single();
      if (error) throw error;
      if (data) setConvMessages((prev) => [...prev, data as ConversationMessage]);
    } catch {
      showToast(isRTL ? 'فشل الإرسال' : 'Failed to send', 'error');
    } finally {
      setConvLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-blue-light" /></div>;

  const statusColors: Record<string, string> = {
    open: 'bg-red-500/15 text-red-400',
    reviewing: 'bg-amber-500/15 text-amber-400',
    implemented: 'bg-brand-green/15 text-brand-green',
    rejected: 'bg-[var(--border-subtle)] text-[var(--text-muted)]',
  };
  const roleLabels: Record<string, string> = {
    citizen: isRTL ? 'مواطن' : 'Citizen',
    pharmacist: isRTL ? 'صيدلي' : 'Pharmacist',
    facility_owner: isRTL ? 'مدير مرفق' : 'Facility Owner',
    admin: isRTL ? 'مدير' : 'Admin',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isRTL ? 'اقتراحات التطوير' : 'Suggestions'}</h1>
        <button onClick={loadSuggestions} className="glass-card p-2 rounded-xl hover:bg-white/10 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {suggestions.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Lightbulb className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">{isRTL ? 'لا توجد اقتراحات' : 'No suggestions'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 cursor-pointer hover:border-brand-blue/30 transition-colors"
              onClick={() => setSelectedSuggestion(s)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColors[s.status]}`}>{s.status}</span>
                    {s.entity_name && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)]">{s.entity_name}</span>}
                  </div>
                  {s.title && <h3 className="font-bold text-sm">{s.title}</h3>}
                  <p className="text-sm font-tajawal text-[var(--text-soft)] mt-1 line-clamp-2">{s.description}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{s.user_name} · {s.user_role} · {new Date(s.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <select value={s.status} onChange={(e) => updateStatus(s, e.target.value as Suggestion['status'])}
                    className="glass rounded-xl px-2 py-1.5 text-xs font-bold outline-none focus:border-brand-blue bg-[var(--bg-dark)]">
                    <option value="open" className="bg-[var(--bg-dark)]">{isRTL ? 'مفتوح' : 'Open'}</option>
                    <option value="reviewing" className="bg-[var(--bg-dark)]">{isRTL ? 'قيد المراجعة' : 'Reviewing'}</option>
                    <option value="implemented" className="bg-[var(--bg-dark)]">{isRTL ? 'تم التنفيذ' : 'Implemented'}</option>
                    <option value="rejected" className="bg-[var(--bg-dark)]">{isRTL ? 'مرفوض' : 'Rejected'}</option>
                  </select>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Suggestion detail modal */}
      <AnimatePresence>
        {selectedSuggestion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setSelectedSuggestion(null); setSenderInfo(null); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="glass-card p-0 w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                <h3 className="font-bold flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  {isRTL ? 'تفاصيل الاقتراح' : 'Suggestion Details'}
                </h3>
                <button onClick={() => { setSelectedSuggestion(null); setSenderInfo(null); }} className="p-1.5 rounded-lg glass">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto">
                <div className="flex gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColors[selectedSuggestion.status]}`}>{selectedSuggestion.status}</span>
                  {selectedSuggestion.entity_name && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)]">{selectedSuggestion.entity_name}</span>}
                </div>
                {selectedSuggestion.title && <h3 className="font-bold">{selectedSuggestion.title}</h3>}
                <p className="text-sm font-tajawal">{selectedSuggestion.description}</p>
                {senderLoading ? (
                  <p className="text-[10px] text-[var(--text-muted)]">{isRTL ? 'جارٍ تحميل البيانات...' : 'Loading...'}</p>
                ) : senderInfo ? (
                  <div className="glass rounded-xl p-3 space-y-1">
                    <p className="text-xs font-bold">{senderInfo.display_name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{isRTL ? 'البريد:' : 'Email:'} {senderInfo.email}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{isRTL ? 'نوع الحساب:' : 'Account type:'} {roleLabels[senderInfo.role] || senderInfo.role}</p>
                    {senderInfo.pharmacy_name && <p className="text-[10px] text-[var(--text-muted)]">{isRTL ? 'الصيدلية:' : 'Pharmacy:'} {senderInfo.pharmacy_name}</p>}
                    {senderInfo.facility_name && <p className="text-[10px] text-[var(--text-muted)]">{isRTL ? 'المرفق:' : 'Facility:'} {senderInfo.facility_name}</p>}
                  </div>
                ) : (
                  <p className="text-[10px] text-[var(--text-muted)]">{selectedSuggestion.user_name} · {selectedSuggestion.user_role}</p>
                )}
                <p className="text-[10px] text-[var(--text-muted)]">{new Date(selectedSuggestion.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
                <button onClick={startConversation} disabled={convStarting || !selectedSuggestion.user_id}
                  className="w-full glass rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50">
                  {convStarting ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                  {isRTL ? 'بدء محادثة مع المرسل' : 'Start conversation with sender'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full conversation modal */}
      <AnimatePresence>
        {showConv && activeConv && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowConv(false); setConvMessages([]); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="glass-card p-0 w-full max-w-md h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                <h3 className="font-bold flex items-center gap-2 text-sm">
                  <MessageCircle className="w-4 h-4 text-brand-blue-light" />
                  {isRTL ? 'محادثة بخصوص الاقتراح' : 'Conversation about this suggestion'}
                </h3>
                <button onClick={() => { setShowConv(false); setConvMessages([]); }} className="p-1.5 rounded-lg glass">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {convMessages.length === 0 ? (
                  <p className="text-center text-sm text-[var(--text-muted)] mt-4">{isRTL ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
                ) : convMessages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-xl p-2.5 ${isMine ? 'bg-brand-blue/20' : 'glass'}`}>
                        {!isMine && <span className="text-[10px] font-bold text-brand-green-light block mb-0.5">{m.sender_name}</span>}
                        <p className="text-xs font-tajawal">{m.message}</p>
                        <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{new Date(m.created_at).toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-[var(--border-subtle)] flex gap-2">
                <input value={convInput} onChange={(e) => setConvInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendConvMessage()}
                  className="flex-1 glass rounded-xl px-3 py-2 text-sm font-tajawal focus:outline-none focus:border-brand-blue"
                  placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'} />
                <button onClick={sendConvMessage} disabled={convLoading || !convInput.trim()} className="btn-primary px-4 py-2 disabled:opacity-50">
                  {convLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
