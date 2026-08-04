import { useEffect, useState } from 'react'
import { Bug, Lightbulb, Check, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/lang'
import type { Profile, BugReport, Suggestion } from '../lib/types'

export function CitizenDashboard({ profile }: { profile: Profile }) {
  const { t } = useLang()
  const [bugTitle, setBugTitle] = useState('')
  const [bugDesc, setBugDesc] = useState('')
  const [bugBusy, setBugBusy] = useState(false)
  const [bugSuccess, setBugSuccess] = useState(false)
  const [bugError, setBugError] = useState<string | null>(null)

  const [suggTitle, setSuggTitle] = useState('')
  const [suggDesc, setSuggDesc] = useState('')
  const [suggBusy, setSuggBusy] = useState(false)
  const [suggSuccess, setSuggSuccess] = useState(false)
  const [suggError, setSuggError] = useState<string | null>(null)

  const [myReports, setMyReports] = useState<BugReport[]>([])
  const [mySuggestions, setMySuggestions] = useState<Suggestion[]>([])

  useEffect(() => {
    loadMyData()
  }, [])

  async function loadMyData() {
    const { data: reports } = await supabase
      .from('bug_reports')
      .select('*')
      .eq('reporter_id', profile.id)
      .order('created_at', { ascending: false })
    if (reports) setMyReports(reports as BugReport[])

    const { data: suggs } = await supabase
      .from('suggestions')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    if (suggs) setMySuggestions(suggs as Suggestion[])
  }

  async function submitBug(e: React.FormEvent) {
    e.preventDefault()
    if (!bugTitle.trim() || !bugDesc.trim()) return
    setBugBusy(true)
    setBugError(null)
    const { error } = await supabase.from('bug_reports').insert({
      reporter_id: profile.id,
      reporter_name: profile.display_name || profile.email || '',
      category: 'technical',
      description: `${bugTitle}\n\n${bugDesc}`,
      status: 'open',
    })
    if (error) setBugError(error.message)
    else {
      setBugSuccess(true)
      setBugTitle('')
      setBugDesc('')
      loadMyData()
    }
    setBugBusy(false)
  }

  async function submitSuggestion(e: React.FormEvent) {
    e.preventDefault()
    if (!suggTitle.trim() || !suggDesc.trim()) return
    setSuggBusy(true)
    setSuggError(null)
    const { error } = await supabase.from('suggestions').insert({
      user_id: profile.id,
      user_name: profile.display_name || profile.email || '',
      user_role: 'citizen',
      entity_name: '',
      title: suggTitle.trim(),
      description: suggDesc.trim(),
      status: 'open',
    })
    if (error) setSuggError(error.message)
    else {
      setSuggSuccess(true)
      setSuggTitle('')
      setSuggDesc('')
      loadMyData()
    }
    setSuggBusy(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-cairo font-bold text-xl">{t('dash.citizen')}</h1>

      {/* Technical Reports Section */}
      <section className="glass-card p-5 space-y-4">
        <h2 className="font-cairo font-bold text-lg flex items-center gap-2">
          <Bug className="w-5 h-5 text-brand-amber" />
          {t('report.technical')}
        </h2>

        {bugSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-green/10 border border-brand-green/30">
            <Check className="w-4 h-4 text-brand-green-light" />
            <p className="text-sm text-brand-green-light font-tajawal">{t('report.success')}</p>
          </div>
        )}

        <form onSubmit={submitBug} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-[var(--text-soft)] mb-1.5 font-tajawal">{t('report.title')}</label>
            <input
              type="text"
              value={bugTitle}
              onChange={(e) => { setBugTitle(e.target.value); setBugSuccess(false); }}
              required
              className="w-full glass-input px-4 py-3 text-sm outline-none focus:border-brand-amber transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--text-soft)] mb-1.5 font-tajawal">{t('report.description')}</label>
            <textarea
              value={bugDesc}
              onChange={(e) => { setBugDesc(e.target.value); setBugSuccess(false); }}
              required
              rows={4}
              className="w-full glass-input px-4 py-3 text-sm outline-none focus:border-brand-amber transition-colors resize-none"
            />
          </div>
          {bugError && <p className="text-sm text-brand-red font-tajawal">{bugError}</p>}
          <button type="submit" disabled={bugBusy} className="w-full py-3 rounded-xl bg-brand-amber/20 border border-brand-amber/40 text-brand-amber font-cairo font-bold text-sm hover:bg-brand-amber/30 disabled:opacity-50 flex items-center justify-center gap-2">
            {bugBusy ? '...' : (<><Send className="w-4 h-4" /> {t('report.submit')}</>)}
          </button>
        </form>

        {myReports.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
            <p className="text-xs font-bold text-[var(--text-muted)] font-tajawal">بلاغاتي السابقة</p>
            {myReports.slice(0, 5).map((r) => (
              <div key={r.id} className="glass p-3 rounded-xl">
                <p className="text-sm font-cairo font-bold truncate">{r.description.split('\n')[0]}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${r.status === 'open' ? 'bg-brand-amber/20 text-brand-amber' : 'bg-brand-green/20 text-brand-green-light'}`}>
                    {r.status === 'open' ? 'مفتوح' : 'تم الحل'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-tajawal">{new Date(r.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Suggestions Section */}
      <section className="glass-card p-5 space-y-4">
        <h2 className="font-cairo font-bold text-lg flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-brand-green-light" />
          {t('suggestion.section')}
        </h2>

        {suggSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-green/10 border border-brand-green/30">
            <Check className="w-4 h-4 text-brand-green-light" />
            <p className="text-sm text-brand-green-light font-tajawal">{t('report.success')}</p>
          </div>
        )}

        <form onSubmit={submitSuggestion} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-[var(--text-soft)] mb-1.5 font-tajawal">{t('suggestion.title')}</label>
            <input
              type="text"
              value={suggTitle}
              onChange={(e) => { setSuggTitle(e.target.value); setSuggSuccess(false); }}
              required
              className="w-full glass-input px-4 py-3 text-sm outline-none focus:border-brand-green transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--text-soft)] mb-1.5 font-tajawal">{t('report.description')}</label>
            <textarea
              value={suggDesc}
              onChange={(e) => { setSuggDesc(e.target.value); setSuggSuccess(false); }}
              required
              rows={4}
              placeholder={t('report.placeholderSuggestion')}
              className="w-full glass-input px-4 py-3 text-sm outline-none focus:border-brand-green transition-colors resize-none"
            />
          </div>
          {suggError && <p className="text-sm text-brand-red font-tajawal">{suggError}</p>}
          <button type="submit" disabled={suggBusy} className="w-full py-3 rounded-xl bg-brand-green text-white font-cairo font-bold text-sm hover:bg-brand-green/90 disabled:opacity-50 flex items-center justify-center gap-2">
            {suggBusy ? '...' : (<><Send className="w-4 h-4" /> {t('report.submit')}</>)}
          </button>
        </form>

        {mySuggestions.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
            <p className="text-xs font-bold text-[var(--text-muted)] font-tajawal">اقتراحاتي السابقة</p>
            {mySuggestions.slice(0, 5).map((s) => (
              <div key={s.id} className="glass p-3 rounded-xl">
                <p className="text-sm font-cairo font-bold truncate">{s.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    s.status === 'open' ? 'bg-brand-amber/20 text-brand-amber' :
                    s.status === 'implemented' ? 'bg-brand-green/20 text-brand-green-light' :
                    s.status === 'rejected' ? 'bg-brand-red/20 text-brand-red' :
                    'bg-brand-blue/20 text-brand-blue-light'
                  }`}>
                    {s.status === 'open' ? 'مفتوح' : s.status === 'implemented' ? 'تم التنفيذ' : s.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-tajawal">{new Date(s.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
