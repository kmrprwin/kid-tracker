'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircle2, XCircle, Trash2, AlertTriangle } from 'lucide-react'

const PRIORITY_PILL = {
  low:    'bg-slate-100 text-slate-500',
  medium: 'bg-amber-100 text-amber-700',
  high:   'bg-rose-100 text-rose-600',
}

const STATUS_ACCENT = {
  assigned:  'border-l-violet-400',
  completed: 'border-l-amber-400',
  approved:  'border-l-emerald-400',
  rejected:  'border-l-rose-500',
}

function SubTabs({ tabs, active, onChange }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors relative ${active === t.id ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          {active === t.id && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-t-full" />}
          {t.label}
          {t.badge > 0 && (
            <span className="ml-1.5 bg-rose-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export default function TaskManager({ userId, onRefresh }) {
  const [view,       setView]      = useState('approve')
  const [kids,       setKids]      = useState([])
  const [tasks,      setTasks]     = useState([])
  const [rejectId,   setRejectId]  = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [saving,     setSaving]    = useState(false)
  const [saved,      setSaved]     = useState(false)
  const [err,        setErr]       = useState('')
  const [form,       setForm]      = useState({ assigned_to: '', title: '', description: '', deadline: '', points: 10, priority: 'medium' })

  const inputClass = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition'
  const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5'

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: k }, { data: t }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'kid'),
      supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(display_name)').order('created_at', { ascending: false }),
    ])
    setKids(k || [])
    setTasks(t || [])
    if (k?.length && !form.assigned_to) setForm(f => ({ ...f, assigned_to: k[0].id }))
    onRefresh?.()
  }

  const pending    = tasks.filter(t => t.status === 'completed')
  const otherTasks = tasks.filter(t => t.status !== 'completed')

  async function approve(id) {
    await supabase.from('tasks').update({ status: 'approved' }).eq('id', id)
    await load()
  }

  async function confirmReject() {
    if (!rejectId) return
    await supabase.from('tasks').update({ status: 'rejected', rejection_comment: rejectNote.trim() || 'Please try again.' }).eq('id', rejectId)
    setRejectId(null); setRejectNote('')
    await load()
  }

  async function remove(id) {
    await supabase.from('tasks').delete().eq('id', id)
    await load()
  }

  async function assign(e) {
    e.preventDefault()
    setErr('')
    if (!form.title.trim())  { setErr('Task title is required.'); return }
    if (!form.assigned_to)   { setErr('Select a child.'); return }
    setSaving(true)
    const { error } = await supabase.from('tasks').insert({
      assigned_to:  form.assigned_to,
      assigned_by:  userId,
      title:        form.title.trim(),
      description:  form.description.trim() || null,
      deadline:     form.deadline || null,
      points:       Math.max(0, Number(form.points) || 0),
      priority:     form.priority,
      status:       'assigned',
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setSaved(true)
    setForm(f => ({ ...f, title: '', description: '', deadline: '', points: 10 }))
    setTimeout(() => setSaved(false), 2500)
    await load()
  }

  function TaskCard({ task }) {
    const isRejecting = rejectId === task.id
    const accent      = STATUS_ACCENT[task.status] || STATUS_ACCENT.assigned

    return (
      <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 ${accent}`}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              {task.assignee && (
                <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-0.5">
                  {task.assignee.display_name}
                </div>
              )}
              <h3 className="font-semibold text-slate-800 leading-snug">{task.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${PRIORITY_PILL[task.priority] || PRIORITY_PILL.medium}`}>
                {task.priority || 'medium'}
              </span>
              <button onClick={() => remove(task.id)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors rounded-lg">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {task.description && <p className="text-sm text-slate-500 mb-2 leading-relaxed">{task.description}</p>}

          <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
            {task.deadline && <span>{task.deadline}</span>}
            <span className="font-mono font-bold text-indigo-600">{task.points || 0} pts</span>
          </div>

          {task.status === 'completed' && !isRejecting && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => approve(task.id)} className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                <CheckCircle2 size={15} /> Approve
              </button>
              <button onClick={() => { setRejectId(task.id); setRejectNote('') }} className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                <XCircle size={15} /> Reject
              </button>
            </div>
          )}

          {isRejecting && (
            <div className="space-y-2">
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="Add a comment for the child (optional)…"
                rows={2}
                className="w-full px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={confirmReject} className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  Confirm reject
                </button>
                <button onClick={() => setRejectId(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {task.status === 'approved' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
              <CheckCircle2 size={13} /> Approved
            </div>
          )}

          {task.status === 'rejected' && task.rejection_comment && (
            <div className="flex items-start gap-2 bg-rose-50 rounded-xl px-3 py-2">
              <AlertTriangle size={12} className="text-rose-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-rose-600">{task.rejection_comment}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <SubTabs
        tabs={[
          { id: 'approve', label: 'Review', badge: pending.length },
          { id: 'all',     label: 'All' },
          { id: 'assign',  label: 'Assign' },
        ]}
        active={view}
        onChange={setView}
      />

      {view === 'approve' && (
        pending.length === 0
          ? <div className="text-center py-12 text-slate-400 text-sm">No tasks awaiting approval.</div>
          : <div className="space-y-3">{pending.map(t => <TaskCard key={t.id} task={t} />)}</div>
      )}

      {view === 'all' && (
        tasks.length === 0
          ? <div className="text-center py-12 text-slate-400 text-sm">No tasks yet.</div>
          : (
            <div className="space-y-3">
              {pending.length > 0 && (
                <div className="text-xs font-semibold text-amber-600 uppercase tracking-widest">Awaiting review</div>
              )}
              {pending.map(t => <TaskCard key={t.id} task={t} />)}
              {otherTasks.length > 0 && pending.length > 0 && (
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Other tasks</div>
              )}
              {otherTasks.map(t => <TaskCard key={t.id} task={t} />)}
            </div>
          )
      )}

      {view === 'assign' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-800 mb-4">Assign a new task</h2>
          <form onSubmit={assign} className="space-y-3">
            <div>
              <label className={labelClass}>Assign to</label>
              <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} className={inputClass}>
                {kids.map(k => <option key={k.id} value={k.id}>{k.display_name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Task title</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Finish homework" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Details (optional)</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Any extra instructions…" rows={2} className={`${inputClass} resize-none`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={inputClass}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Points</label>
                <input type="number" min="0" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Deadline (optional)</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className={inputClass} />
            </div>
            {err  && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">{err}</div>}
            {saved && <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5">Task assigned successfully!</div>}
            <button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
              {saving ? 'Assigning…' : 'Assign task'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
