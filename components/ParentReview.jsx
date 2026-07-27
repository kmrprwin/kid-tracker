'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ChevronLeft, ChevronRight, TrendingUp, BookOpen, DollarSign } from 'lucide-react'

function monthLabel(y, m) { return new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }
function monthBounds(y, m) {
  return {
    start: new Date(y, m, 1).toISOString().slice(0, 10),
    end:   new Date(y, m + 1, 1).toISOString().slice(0, 10),
  }
}

export default function ParentReview({ onRefresh }) {
  const now = new Date()
  const [year,       setYear]       = useState(now.getFullYear())
  const [month,      setMonth]      = useState(now.getMonth())
  const [kids,       setKids]       = useState([])
  const [kidFilter,  setKidFilter]  = useState('all')
  const [activities, setActivities] = useState([])
  const [expenses,   setExpenses]   = useState([])
  const [taskStats,  setTaskStats]  = useState({ approved: 0, pending: 0, rejected: 0 })
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'kid').then(({ data }) => setKids(data || []))
  }, [])

  useEffect(() => {
    let live = true
    setLoading(true)
    async function load() {
      const { start, end } = monthBounds(year, month)
      let aq = supabase.from('activities').select('*, profiles(display_name)').gte('activity_date', start).lt('activity_date', end).order('activity_date', { ascending: false })
      let eq = supabase.from('expenses').select('*, profiles(display_name)').gte('expense_date', start).lt('expense_date', end).order('expense_date', { ascending: false })
      if (kidFilter !== 'all') { aq = aq.eq('user_id', kidFilter); eq = eq.eq('user_id', kidFilter) }
      const [{ data: acts }, { data: exps }] = await Promise.all([aq, eq])
      if (!live) return
      setActivities(acts || [])
      setExpenses(exps || [])
      let tq = supabase.from('tasks').select('status')
        .gte('created_at', start + 'T00:00:00')
        .lt('created_at', end + 'T00:00:00')
      if (kidFilter !== 'all') tq = tq.eq('assigned_to', kidFilter)
      const { data: mt } = await tq
      setTaskStats({
        approved: (mt || []).filter(t => t.status === 'approved').length,
        pending:  (mt || []).filter(t => t.status === 'assigned' || t.status === 'completed').length,
        rejected: (mt || []).filter(t => t.status === 'rejected').length,
      })
      setLoading(false)
    }
    load()
    return () => { live = false }
  }, [year, month, kidFilter])

  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses])

  const byCategory = useMemo(() => {
    const map = {}
    for (const e of expenses) map[e.category] = (map[e.category] || 0) + Number(e.amount)
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [expenses])
  const maxCat = byCategory.length ? byCategory[0][1] : 1

  const combined = useMemo(() => [
    ...activities.map(a => ({ ...a, kind: 'activity', d: a.activity_date })),
    ...expenses.map(e => ({ ...e, kind: 'expense', d: e.expense_date })),
  ].sort((a, b) => a.d < b.d ? 1 : -1), [activities, expenses])

  function shiftMonth(delta) {
    let m = month + delta, y = year
    if (m < 0) { m = 11; y-- }
    else if (m > 11) { m = 0; y++ }
    setMonth(m); setYear(y)
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Kid filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {[{ id: 'all', display_name: 'All kids' }, ...kids].map(k => (
          <button
            key={k.id}
            onClick={() => setKidFilter(k.id)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              kidFilter === k.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
            }`}
          >
            {k.display_name}
          </button>
        ))}
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-slate-200 px-4 py-3">
        <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
          <ChevronLeft size={20} className="text-slate-500" />
        </button>
        <h2 className="font-semibold text-slate-800">{monthLabel(year, month)}</h2>
        <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
          <ChevronRight size={20} className="text-slate-500" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
      ) : (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-amber-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total spent</span>
              </div>
              <div className="text-2xl font-bold text-slate-800 font-mono">{totalSpent.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={16} className="text-teal-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Activities</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">{activities.length}</div>
            </div>
          </div>

          {/* Task stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-indigo-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Tasks this month</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Approved', value: taskStats.approved, color: 'text-emerald-600' },
                { label: 'Pending',  value: taskStats.pending,  color: 'text-amber-500' },
                { label: 'Rejected', value: taskStats.rejected, color: 'text-rose-500' },
              ].map(s => (
                <div key={s.label} className="text-center py-2">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          {byCategory.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Spending by category</h3>
              <div className="space-y-2.5">
                {byCategory.map(([cat, amt]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-20 flex-shrink-0">{cat}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${(amt / maxCat) * 100}%` }} />
                    </div>
                    <span className="text-sm font-mono text-slate-600 w-16 text-right flex-shrink-0">{amt.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All entries */}
          {combined.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">All entries</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {combined.map(r => (
                  <div key={`${r.kind}-${r.id}`} className="flex items-center gap-3 px-4 py-3">
                    <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.kind === 'activity' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {r.kind === 'activity' ? 'ACT' : 'EXP'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {r.kind === 'activity' ? r.title : r.note}
                        {kidFilter === 'all' && r.profiles && (
                          <span className="text-slate-400 font-normal"> · {r.profiles.display_name}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{r.kind === 'activity' ? (r.description || '—') : r.category}</div>
                    </div>
                    {r.kind === 'expense' && (
                      <span className="text-sm font-mono font-semibold text-amber-700 flex-shrink-0">{Number(r.amount).toFixed(2)}</span>
                    )}
                    <span className="text-xs text-slate-400 font-mono flex-shrink-0">{r.d}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">No entries this month.</div>
          )}
        </>
      )}
    </div>
  )
}
