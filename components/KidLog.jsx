'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Pencil, DollarSign } from 'lucide-react'

const CATEGORIES = ['Food', 'School', 'Fun', 'Clothes', 'Transport', 'Other']

function todayStr() { return new Date().toISOString().slice(0, 10) }

export default function KidLog({ userId }) {
  const [type,     setType]     = useState('activity')
  const [date,     setDate]     = useState(todayStr())
  const [title,    setTitle]    = useState('')
  const [note,     setNote]     = useState('')
  const [amount,   setAmount]   = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [recent,   setRecent]   = useState([])

  useEffect(() => { loadRecent() }, [])

  async function loadRecent() {
    const [{ data: acts }, { data: exps }] = await Promise.all([
      supabase.from('activities').select('*').eq('user_id', userId).order('activity_date', { ascending: false }).limit(10),
      supabase.from('expenses').select('*').eq('user_id', userId).order('expense_date', { ascending: false }).limit(10),
    ])
    const merged = [
      ...(acts || []).map(a => ({ ...a, kind: 'activity', d: a.activity_date })),
      ...(exps || []).map(e => ({ ...e, kind: 'expense',  d: e.expense_date })),
    ].sort((a, b) => a.d < b.d ? 1 : -1)
    setRecent(merged.slice(0, 12))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError('Add a title first.'); return }
    if (type === 'expense' && (!amount || Number(amount) <= 0)) { setError('Enter a valid amount.'); return }
    setSaving(true)
    let err
    if (type === 'activity') {
      const res = await supabase.from('activities').insert({ user_id: userId, activity_date: date, title: title.trim(), description: note.trim() || null })
      err = res.error
    } else {
      const res = await supabase.from('expenses').insert({ user_id: userId, expense_date: date, amount: Number(amount), category, note: title.trim() })
      err = res.error
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    setTitle(''); setNote(''); setAmount('')
    loadRecent()
  }

  const isActivity = type === 'activity'

  const inputClass = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition'
  const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5'

  return (
    <div className="space-y-4 pb-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Type toggle */}
        <div className="grid grid-cols-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setType('activity')}
            className={`py-3 text-sm font-semibold transition-colors relative ${
              isActivity ? 'text-teal-700 bg-teal-50' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {isActivity && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-teal-600 rounded-t-full" />}
            Activity
          </button>
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-3 text-sm font-semibold transition-colors relative ${
              !isActivity ? 'text-amber-700 bg-amber-50' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {!isActivity && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-amber-600 rounded-t-full" />}
            Expense
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className={labelClass}>{isActivity ? 'What did you do?' : 'What was it for?'}</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={isActivity ? 'e.g. Football practice' : 'e.g. New school bag'}
              className={inputClass}
            />
          </div>

          {!isActivity && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Amount</label>
                <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {isActivity && (
            <div>
              <label className={labelClass}>Notes (optional)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          </div>

          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">{error}</div>}

          <button
            type="submit"
            disabled={saving}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
              isActivity
                ? 'bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300'
                : 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300'
            }`}
          >
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </form>
      </div>

      {recent.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Recent entries</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recent.map(r => (
              <div key={`${r.kind}-${r.id}`} className="flex items-center gap-3 px-4 py-3">
                <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  r.kind === 'activity' ? 'bg-teal-100' : 'bg-amber-100'
                }`}>
                  {r.kind === 'activity'
                    ? <Pencil size={13} className="text-teal-600" />
                    : <DollarSign size={13} className="text-amber-600" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">
                    {r.kind === 'activity' ? r.title : r.note}
                  </div>
                  <div className="text-xs text-slate-400">
                    {r.kind === 'activity' ? (r.description || 'Activity') : r.category}
                  </div>
                </div>
                {r.kind === 'expense' && (
                  <span className="text-sm font-mono font-semibold text-amber-700 flex-shrink-0">
                    {Number(r.amount).toFixed(2)}
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono flex-shrink-0">{r.d}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recent.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Pencil size={36} className="mb-2 opacity-30" />
          <p className="text-sm text-center">Nothing logged yet.<br />Add your first entry above.</p>
        </div>
      )}
    </div>
  )
}
