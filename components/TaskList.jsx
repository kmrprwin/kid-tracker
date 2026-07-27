'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { CheckSquare2, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

function todayStr() { return new Date().toISOString().slice(0, 10) }

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

function TaskCard({ task, onComplete }) {
  const today   = todayStr()
  const overdue = task.deadline && task.deadline < today && task.status === 'assigned'
  const accent  = STATUS_ACCENT[task.status] || STATUS_ACCENT.assigned

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 ${accent} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={`font-semibold text-slate-800 leading-snug ${task.status === 'approved' ? 'line-through text-slate-400' : ''}`}>
            {task.title}
          </h3>
          <span className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${PRIORITY_PILL[task.priority] || PRIORITY_PILL.medium}`}>
            {task.priority || 'medium'}
          </span>
        </div>

        {task.description && (
          <p className="text-sm text-slate-500 leading-relaxed mb-2">{task.description}</p>
        )}

        {task.rejection_comment && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5 mb-2">
            <AlertCircle size={14} className="text-rose-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-rose-700 leading-relaxed">{task.rejection_comment}</p>
          </div>
        )}

        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
          {task.deadline && (
            <span className={`flex items-center gap-1 text-xs font-medium ${overdue ? 'text-rose-600' : 'text-slate-400'}`}>
              <Clock size={11} />
              {overdue ? 'Overdue · ' : ''}{task.deadline}
            </span>
          )}
          <span className="text-xs font-mono font-bold text-indigo-600">{task.points || 0} pts</span>
          {task.status === 'completed' && (
            <span className="ml-auto text-[11px] bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full font-semibold">
              Awaiting review
            </span>
          )}
          {task.status === 'approved' && (
            <span className="ml-auto flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">
              <CheckCircle2 size={11} /> Approved
            </span>
          )}
        </div>

        {task.status === 'assigned' && (
          <button
            onClick={() => onComplete(task)}
            className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <CheckSquare2 size={16} />
            Mark as complete
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ title, items, accent, onComplete }) {
  if (!items.length) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className={`text-xs font-semibold uppercase tracking-widest ${accent || 'text-slate-500'}`}>{title}</h3>
        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full px-2 py-0.5">{items.length}</span>
      </div>
      <div className="space-y-2.5">
        {items.map(t => <TaskCard key={t.id} task={t} onComplete={onComplete} />)}
      </div>
    </div>
  )
}

export default function TaskList({ userId }) {
  const [tasks, setTasks] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('tasks').select('*').eq('assigned_to', userId).order('created_at', { ascending: false })
    setTasks(data || [])
  }

  async function markComplete(task) {
    await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', task.id)
    load()
  }

  const rejected  = tasks.filter(t => t.status === 'rejected')
  const todo      = tasks.filter(t => t.status === 'assigned')
  const reviewing = tasks.filter(t => t.status === 'completed')
  const approved  = tasks.filter(t => t.status === 'approved')

  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <CheckSquare2 size={40} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">No tasks assigned yet.</p>
        <p className="text-xs mt-1 text-slate-400">Check back soon!</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-4">
      <Section title="Needs attention" items={rejected}  accent="text-rose-600"    onComplete={markComplete} />
      <Section title="To do"          items={todo}       accent="text-slate-700"   onComplete={markComplete} />
      <Section title="Under review"   items={reviewing}  accent="text-amber-600"   onComplete={markComplete} />
      <Section title="Done"           items={approved}   accent="text-emerald-600" onComplete={markComplete} />
    </div>
  )
}
