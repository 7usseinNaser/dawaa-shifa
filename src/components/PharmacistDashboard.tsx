import { useLang } from '../lib/lang'
import type { Profile } from '../lib/types'
import { Bug, MessageSquare, Lightbulb, Building2 } from 'lucide-react'

export function PharmacistDashboard({ profile }: { profile: Profile }) {
  const { t } = useLang()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-cairo font-bold text-xl">{t('dash.pharmacist')}</h1>

      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-green/20 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-brand-green-light" />
          </div>
          <div>
            <p className="font-cairo font-bold text-lg">{profile.display_name}</p>
            <p className="text-sm text-[var(--text-muted)] font-tajawal">حساب صيدلي</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="glass-card p-4 flex items-center gap-3">
          <Bug className="w-5 h-5 text-brand-amber" />
          <p className="text-sm font-tajawal text-[var(--text-soft)]">استخدم زر "البلاغات" في الأعلى للإبلاغ عن مشكلة تقنية أو تقديم اقتراح تطوير</p>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-brand-blue-light" />
          <p className="text-sm font-tajawal text-[var(--text-soft)]">استخدم زر "المحادثات" في الأعلى للتواصل مع فريق الإدارة</p>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <Lightbulb className="w-5 h-5 text-brand-green-light" />
          <p className="text-sm font-tajawal text-[var(--text-soft)]">اقتراحاتك تساعدنا في تطوير المنصة وتحسين الخدمة</p>
        </div>
      </div>
    </div>
  )
}
