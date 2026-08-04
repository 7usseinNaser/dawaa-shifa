import { useState } from 'react'
import { Bug, MessageSquare, LogOut, User } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useLang } from '../lib/lang'
import type { Profile } from '../lib/types'
import { ReportsModal } from './ReportsModal'
import { ChatPanel } from './ChatPanel'

export function Navbar({ profile }: { profile: Profile }) {
  const { signOut } = useAuth()
  const { t } = useLang()
  const [showReports, setShowReports] = useState(false)
  const [showChat, setShowChat] = useState(false)

  const showReportsAndChat = profile.role === 'pharmacist' || profile.role === 'facility_admin' || profile.role === 'facility_owner'

  return (
    <>
      <nav className="sticky top-0 z-40 glass border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-green/20 flex items-center justify-center">
              <span className="text-brand-green-light font-cairo font-bold text-sm">د</span>
            </div>
            <span className="font-cairo font-bold text-sm hidden sm:inline">{t('app.name')}</span>
          </div>

          <div className="flex items-center gap-2">
            {showReportsAndChat && (
              <>
                <button
                  onClick={() => setShowReports(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:bg-white/5 transition-colors text-sm font-tajawal"
                >
                  <Bug className="w-4 h-4 text-brand-amber" />
                  <span className="hidden sm:inline">{t('nav.reports')}</span>
                </button>
                <button
                  onClick={() => setShowChat(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:bg-white/5 transition-colors text-sm font-tajawal"
                >
                  <MessageSquare className="w-4 h-4 text-brand-blue-light" />
                  <span className="hidden sm:inline">{t('nav.chat')}</span>
                </button>
              </>
            )}

            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass">
              <User className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm font-tajawal max-w-[100px] truncate">{profile.display_name || profile.email || ''}</span>
            </div>

            <button
              onClick={signOut}
              className="p-2 rounded-xl glass hover:bg-brand-red/10 transition-colors"
              title={t('auth.logout')}
            >
              <LogOut className="w-4 h-4 text-brand-red" />
            </button>
          </div>
        </div>
      </nav>

      {showReports && (
        <ReportsModal profile={profile} onClose={() => setShowReports(false)} />
      )}
      {showChat && (
        <ChatPanel profile={profile} onClose={() => setShowChat(false)} />
      )}
    </>
  )
}
