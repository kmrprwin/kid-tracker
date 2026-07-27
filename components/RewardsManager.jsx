'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Gift, Check, X, Trash2 } from 'lucide-react'

function SubTabs({ tabs, active, onChange }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors relative ${active === t.id ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          {active === t.id && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-t-full" />}
          {t.label}
          {t.badge > 0 && <span className="ml-1.5 bg-rose-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{t.badge}</span>}
        </button>
      ))}
    </div>
  )
}

export default function RewardsManager({ userId, onRefresh }) {
  const [view,    setView]    = useState('redeem')
  const [rewards, setRewards] = useState([])
  const [pending, setPending] = useState([])
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [err,     setErr]     = useState('')
  const [form,    setForm]    = useState({ title: '', description: '', points_cost: 100 })

  const inputClass = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition'
  const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5'

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: rews }, { data: pend }] = await Promise.all([
      supabase.from('rewards').select('*').eq('is_active', true).order('created_at'),
      supabase.from('redemptions')
        .select('*, rewards(*), profiles!redemptions_kid_id_fkey(display_name)')
        .eq('status', 'pending')
        .order('created_at'),
    ])
    setRewards(rews || [])
    const mapped = (pend || [])
      .map(r => ({ ...r, reward: r.rewards, kid: r.profiles }))
      .filter(r => r.reward && r.kid)
      .sort((a, b) => a.created_at < b.created_at ? 1 : -1)
    setPending(mapped)
    onRefresh?.()
  }

  async function fulfill(id) {
    await supabase.from('redemptions').update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  async function cancel(id) {
    await supabase.from('redemptions').update({ status: 'cancelled' }).eq('id', id)
    load()
  }

  async function deactivate(id) {
    await supabase.from('rewards').update({ is_active: false }).eq('id', id)
    load()
  }

  async function addReward(e) {
    e.preventDefault()
    setErr('')
    if (!form.title.trim())           { setErr('Title is required.'); return }
    if (Number(form.points_cost) < 1) { setErr('Points cost must be at least 1.'); return }
    setSaving(true)
    await supabase.from('rewards').insert({ title: form.title.trim(), description: form.description.trim() || null, points_cost: Number(form.points_cost), created_by: userId, is_active: true })
    setSaving(false)
    setSaved(true)
    setForm({ title: '', description: '', points_cost: 100 })
    setTimeout(() => setSaved(false), 2500)
    load()
  }

  return (
    <div className="space-y-4 pb-4">
      <SubTabs
        tabs={[
          { id: 'redeem', label: 'Redemptions', badge: pending.length },
          { id: 'manage', label: 'Rewards' },
          { id: 'add',    label: 'Add' },
        ]}
        active={view}
        onChange={setView}
      />

      {view === 'redeem' && (
        pending.length === 0
          ? <div className="text-center py-12 text-slate-400 text-sm">No pending redemptions.</div>
          : (
            <div className="space-y-3">
              {pending.map(r => (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800">{r.reward.title}</div>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {r.kid.display_name}
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span className="font-mono font-bold text-indigo-600">{r.reward.points_cost} pts</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{r.created_at?.split('T')[0]}</div>
                    </div>
                    <Gift size={20} className="text-indigo-200 flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => fulfill(r.id)} className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                      <Check size={14} /> Fulfill
                    </button>
                    <button onClick={() => cancel(r.id)} className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold py-2.5 rounded-xl transition-colors">
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
      )}

      {view === 'manage' && (
        rewards.length === 0
          ? <div className="text-center py-12 text-slate-400 text-sm">No rewards yet. Add one!</div>
          : (
            <div className="space-y-2">
              {rewards.map(r => (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800">{r.title}</div>
                    {r.description && <div className="text-sm text-slate-500 mt-0.5">{r.description}</div>}
                    <div className="text-sm font-mono font-bold text-indigo-600 mt-1">{r.points_cost} pts</div>
                  </div>
                  <button onClick={() => deactivate(r.id)} className="flex-shrink-0 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors rounded-xl">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )
      )}

      {view === 'add' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-800 mb-4">Add a new reward</h2>
          <form onSubmit={addReward} className="space-y-3">
            <div>
              <label className={labelClass}>Title</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Movie Night" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does the child get?" rows={2} className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className={labelClass}>Points cost</label>
              <input type="number" min="1" value={form.points_cost} onChange={e => setForm(f => ({ ...f, points_cost: e.target.value }))} className={inputClass} />
            </div>
            {err  && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">{err}</div>}
            {saved && <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5">Reward added!</div>}
            <button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
              {saving ? 'Saving…' : 'Add reward'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
