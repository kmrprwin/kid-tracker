'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { LogIn, UserPlus } from 'lucide-react'

export default function LoginPage() {
  const [mode,     setMode]     = useState('signin')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [role,     setRole]     = useState('kid')
  const [error,    setError]    = useState('')
  const [info,     setInfo]     = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSignIn(e) {
    e.preventDefault()
    setError(''); setInfo('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError(''); setInfo('')
    if (!name.trim()) { setError('Display name is required.'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name.trim(), role } },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    if (!data.session) {
      setInfo('Account created! Check your email to confirm, then sign in.')
      setMode('signin')
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition'
  const lblCls   = 'block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5'

  function switchMode(m) { setMode(m); setError(''); setInfo('') }

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-12 bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">The Ledger</h1>
          <p className="text-slate-500 mt-1.5 text-sm">Family growth &amp; responsibility tracker</p>
        </div>

        <div className="flex bg-slate-100 rounded-2xl p-1 mb-4">
          <button
            onClick={() => switchMode('signin')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors ${mode === 'signin' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LogIn size={14} /> Sign in
          </button>
          <button
            onClick={() => switchMode('signup')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors ${mode === 'signup' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <UserPlus size={14} /> Sign up
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className={lblCls}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" autoComplete="email" required />
              </div>
              <div>
                <label className={lblCls}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} autoComplete="current-password" required />
              </div>
              {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">{error}</div>}
              {info  && <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5">{info}</div>}
              <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className={lblCls}>Display name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Your name" autoComplete="name" required />
              </div>
              <div>
                <label className={lblCls}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" autoComplete="email" required />
              </div>
              <div>
                <label className={lblCls}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} placeholder="Minimum 6 characters" autoComplete="new-password" required minLength={6} />
              </div>
              <div>
                <label className={lblCls}>Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {['parent', 'kid'].map(r => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors capitalize ${role === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                    >
                      {r === 'parent' ? 'Parent' : 'Kid'}
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">{error}</div>}
              {info  && <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5">{info}</div>}
              <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
