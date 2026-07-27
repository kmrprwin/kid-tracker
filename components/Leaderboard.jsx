'use client'
import { useEffect, useState } from 'react'
import { supabase, computeBadges, computeStreak } from '@/lib/supabaseClient'
import { Flame, Trophy } from 'lucide-react'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard({ userId }) {
  const [rows,     setRows]     = useState([])
  const [myBadges, setMyBadges] = useState([])

  useEffect(() => {
    let live = true
    async function load() {
      const [{ data: kids }, { data: appTasks }, { data: allActs }] = await Promise.all([
        supabase.from('profiles').select('id, display_name').eq('role', 'kid'),
        supabase.from('tasks').select('assigned_to, points').eq('status', 'approved'),
        supabase.from('activities').select('user_id, activity_date'),
      ])

      const ranked = (kids || []).map(k => ({
        kid_id:          k.id,
        display_name:    k.display_name,
        total_points:    (appTasks || []).filter(t => t.assigned_to === k.id).reduce((s, t) => s + Number(t.points), 0),
        tasks_completed: (appTasks || []).filter(t => t.assigned_to === k.id).length,
        streak:          computeStreak(k.id, allActs || []),
      })).sort((a, b) => b.total_points - a.total_points)

      if (live) setRows(ranked)

      if (userId) {
        const [{ data: acts }, { data: tasks }, { data: exps }] = await Promise.all([
          supabase.from('activities').select('*').eq('user_id', userId),
          supabase.from('tasks').select('*').eq('assigned_to', userId).eq('status', 'approved'),
          supabase.from('expenses').select('*').eq('user_id', userId),
        ])
        if (live) setMyBadges(computeBadges(userId, { activities: acts || [], tasks: tasks || [], expenses: exps || [] }))
      }
    }
    load()
    return () => { live = false }
  }, [userId])

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Trophy size={40} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">Leaderboard is empty.</p>
        <p className="text-xs mt-1 text-slate-400">Complete approved tasks to appear here.</p>
      </div>
    )
  }

  const maxPts = Math.max(...rows.map(r => r.total_points), 1)

  return (
    <div className="space-y-4 pb-4">
      {userId && myBadges.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Your badges</h3>
          <div className="flex flex-wrap gap-2">
            {myBadges.map(b => (
              <div key={b.id} title={b.desc} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
                <span className="text-sm">{b.icon}</span>
                <span className="text-xs font-semibold text-indigo-800">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.kid_id} className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-4 ${i === 0 ? 'ring-2 ring-indigo-100' : ''}`}>
            <div className="flex items-center gap-3 mb-2.5">
              <div className="text-2xl w-8 text-center flex-shrink-0 leading-none">
                {MEDALS[i] || <span className="text-sm font-bold text-slate-400">#{i + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800">{r.display_name}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>{r.tasks_completed} task{r.tasks_completed !== 1 ? 's' : ''} approved</span>
                  {r.streak > 0 && (
                    <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                      <Flame size={11} /> {r.streak}d
                    </span>
                  )}
                </div>
              </div>
              <div className="font-mono font-bold text-indigo-600 text-lg flex-shrink-0">{r.total_points}</div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max((r.total_points / maxPts) * 100, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
