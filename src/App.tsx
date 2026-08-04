import { useAuth } from './lib/auth'
import { useLang, type TranslationKey } from './lib/lang'
import { AuthScreen } from './components/AuthScreen'
import { Navbar } from './components/Navbar'
import { CitizenDashboard } from './components/CitizenDashboard'
import { PharmacistDashboard } from './components/PharmacistDashboard'
import { FacilityDashboard } from './components/FacilityDashboard'
import { AdminPanel } from './components/AdminPanel'

export default function App() {
  const { user, profile, loading } = useAuth()
  const { t } = useLang()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-dark)]">
        <p className="text-[var(--text-muted)] font-tajawal">{t('common.loading')}</p>
      </div>
    )
  }

  if (!user || !profile) {
    return <AuthScreen />
  }

  const role = profile.role

  return (
    <div className="min-h-screen bg-[var(--bg-dark)]">
      <Navbar profile={profile} />
      <main>
        {role === 'citizen' && <CitizenDashboard profile={profile} />}
        {(role === 'pharmacist') && <PharmacistDashboard profile={profile} />}
        {(role === 'facility_admin' || role === 'facility_owner') && <FacilityDashboard profile={profile} />}
        {role === 'admin' && <AdminPanel profile={profile} />}
      </main>
    </div>
  )
}
