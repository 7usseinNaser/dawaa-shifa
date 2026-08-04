import { useState } from 'react'
import { X, Bug, Lightbulb, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/lang'
import type { Profile } from '../lib/types'

export function ReportsModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { t } = useLang()
  const [tab, setTab] = useState<'technical' | 'suggestion'>('technical')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadEntityName(): Promise<string> {
    if (profile.role === 'pharmacist') {
      const { data } = await supabase
        .from('pharmacies')
        .select('name')
        .eq('owner_id', profile.id)
        .is('deleted_at', null)
        .maybeSingle()
      return data?.name || ''
    } else if (profile.role === 'facility_admin' || profile.role === 'facility_owner') {
      const { data } = await supabase
        .from('facilities')
        .select('name')
        .eq('owner_id', profile.id)
        .is('deleted_at', null)
        .maybeSingle()
      return data?.name || ''
    }
    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setBusy(true)
    setError(null)

    const entityName = await loadEntityName()

    if (tab === 'technical') {
      const { error } = await supabase.from('bug_reports').insert({
        reporter_id: profile.id,
        reporter_name: profile.display_name || profile.email || '',
        category: 'technical',
        description: `${title}\n\n${description}`,
        status: 'open',
      })
      if (error) setError(error.message)
      else setSuccess(true)
    } else {
      const { error } = await supabase.from('suggestions').insert({
        user_id: profile.id,
        user_name: profile.display_name || profile.email || '',
        user_role: profile.role,
        entity_name: entityName,
        title: title.trim(),
        description: description.trim(),
        status: 'open',
      })
      if (error) setError(error.message)
      else setSuccess(true)
    }

    setBusy(false)
  }

  function reset() {
    setTitle('')
    setDescription('')
    setSuccess(false)
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-md glass-card p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-cairo font-bold text-lg">{t('nav.reports')}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5">
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-brand-green/20 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-brand-green-light" />
            </div>
            <p className="font-tajawal text-[var(--text-soft)]">{t('report.success')}</p>
            <button onClick={() => { reset(); onClose(); }} className="px-6 py-2 rounded-xl glass font-cairo font-bold text-sm hover:bg-white/5">
              {t('common.close')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => setTab('technical')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-cairo font-bold text-sm transition-all ${tab === 'technical' ? 'bg-brand-amber/20 border-2 border-brand-amber' : 'glass border-2 border-transparent'}`}
              >
                <Bug className="w-4 h-4" />
                {t('report.technical')}
              </button>
              <button
                onClick={() => setTab('suggestion')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-cairo font-bold text-sm transition-all ${tab === 'suggestion' ? 'bg-brand-green/20 border-2 border-brand-green' : 'glass border-2 border-transparent'}`}
              >
                <Lightbulb className="w-4 h-4" />
                {t('report.suggestion')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-soft)] mb-1.5 font-tajawal">{t('report.title')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full glass-input px-4 py-3 text-sm outline-none focus:border-brand-green transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--text-soft)] mb-1.5 font-tajawal">{t('report.description')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  placeholder={tab === 'suggestion' ? t('report.placeholderSuggestion') : ''}
                  className="w-full glass-input px-4 py-3 text-sm outline-none focus:border-brand-green transition-colors resize-none"
                />
              </div>
              {error && <p className="text-sm text-brand-red font-tajawal">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl glass font-cairo font-bold text-sm hover:bg-white/5">
                  {t('report.cancel')}
                </button>
                <button type="submit" disabled={busy} className="flex-1 py-2.5 rounded-xl bg-brand-green text-white font-cairo font-bold text-sm hover:bg-brand-green/90 disabled:opacity-50">
                  {busy ? '...' : t('report.submit')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
