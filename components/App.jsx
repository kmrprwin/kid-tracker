'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AppShell from './AppShell'
import LoginPage from './LoginPage'

export default function App() {
  const [session,    setSession]    = useState(null)
  const [profile,    setProfile]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [counts,     setCounts]     = useState({ approvals: 0, redemptions: 0 })

  const refresh = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      if (!session) { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    let live = true
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => { if (live) { setProfile(data); setLoading(false) } })
    return () => { live = false }
  }, [session])

  useEffect(() => {
    if (!profile) return
    let live = true
    Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('redemptions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]).then(([{ count: a }, { count: r }]) => {
      if (live) setCounts({ approvals: a || 0, redemptions: r || 0 })
    })
    return () => { live = false }
  }, [refreshKey, profile])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="text-center">
          <div className="text-xl font-semibold text-slate-700 mb-1">The Ledger</div>
          <div className="text-sm">Loading…</div>
        </div>
      </div>
    )
  }

  if (!session || !profile) return <LoginPage />

  return <AppShell profile={profile} counts={counts} onRefresh={refresh} />
}
