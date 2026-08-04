import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useLang } from '../lib/lang'
import type { UserRole } from '../lib/types'

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const { t } = useLang()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('citizen')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error)
    } else {
      const { error } = await signUp(email, password, name, role, phone)
      if (error) setError(error)
    }
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-dark)]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-cairo font-bold text-brand-green-light">{t('app.name')}</h1>
          <p className="text-sm text-[var(--text-muted)] font-tajawal mt-1">{t('app.tagline')}</p>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2.5 rounded-xl font-cairo font-bold text-sm transition-all ${mode === 'signin' ? 'bg-brand-green/20 border-2 border-brand-green' : 'glass border-2 border-transparent'}`}
            >
              {t('auth.signIn')}
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-xl font-cairo font-bold text-sm transition-all ${mode === 'signup' ? 'bg-brand-green/20 border-2 border-brand-green' : 'glass border-2 border-transparent'}`}
            >
              {t('auth.signUp')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <input
                  type="text"
                  placeholder={t('auth.name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full glass-input px-4 py-3 text-sm outline-none focus:border-brand-green transition-colors"
                />
                <input
                  type="tel"
                  placeholder={t('auth.phone')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full glass-input px-4 py-3 text-sm outline-none focus:border-brand-green transition-colors"
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full glass-input px-4 py-3 text-sm outline-none focus:border-brand-green transition-colors"
                >
                  <option value="citizen" className="bg-[var(--bg-dark)]">{t('auth.roleCitizen')}</option>
                  <option value="pharmacist" className="bg-[var(--bg-dark)]">{t('auth.rolePharmacist')}</option>
                  <option value="facility_owner" className="bg-[var(--bg-dark)]">{t('auth.roleFacility')}</option>
                </select>
              </>
            )}
            <input
              type="email"
              placeholder={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full glass-input px-4 py-3 text-sm outline-none focus:border-brand-green transition-colors"
            />
            <input
              type="password"
              placeholder={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full glass-input px-4 py-3 text-sm outline-none focus:border-brand-green transition-colors"
            />
            {error && <p className="text-sm text-brand-red font-tajawal">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-xl bg-brand-green text-white font-cairo font-bold text-sm hover:bg-brand-green/90 transition-colors disabled:opacity-50"
            >
              {busy ? '...' : mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
