'use client'
import { useEffect, useState } from 'react'
import { supabase, getKidPoints, computeBadges } from '@/lib/supabaseClient'
import { Clock, CheckCircle2, XCircle, Star } from 'lucide-react'

const STATUS_CFG = {
  pending:   { Icon: Clock,        color: 'text-amber-500',  bg: 'bg-amber-50',   label: 'Pending'   },
  fulfilled: { Icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Fulfilled' },
  cancelled: { Icon: XCircle,      color: 'text-slate-400',  bg: 'bg-slate-50',   label: 'Cancelled' },
}

const ALL_BADGES = [
  { name: '3-Day Streak',    icon: '🔥' }, { name: '7-Day Streak',    icon: '⚡' },
  { name: 'Month Champion',  icon: '🌟' }, { name: 'On a Roll',       icon: '✅' },
  { name: 'Task Master',     icon: '🏅' }, { name: 'Overachiever',    icon: '🏆' },
  { name: 'Reading Champion',icon: '📚' }, { name: 'Helping Hand',    icon: '🤝' },
  { name: 'Expense Master',  icon: '💰' }, { name: 'Early Bird',      icon: '🌅' },
]

function SubTabs({ tabs, active, onChange }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors relative ${active === t.id ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          {active === t.id && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-t-full" />}
          {t.label}
        </button>
      ))}
    </div>
  )
}

export default function RewardsStore({ userId, onRefresh }) {
  const [rewards,     setRewards]     = useState([])
  const [redemptions, setRedemptions] = useState([])
  const [points,      setPoints]      = useState({ earned: 0, spent: 0, balance: 0 })
  const [badges,      setBadges]      = useState([])
  const [redeeming,   setRedeeming]   = useState(null)
  const [view,        setView]        = useState('store')

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: rews }, pts, { data: myRed }, { data: acts }, { data: appTasks }, { data: exps }] = await Promise.all([
      supabase.from('rewards').select('*').eq('is_active', true).order('points_cost'),
      getKidPoints(userId),
      supabase.from('redemptions').select('*, rewards(*)').eq('kid_id', userId).order('created_at', { ascending: false }),
      supabase.from('activities').select('*').eq('user_id', userId),
      supabase.from('tasks').select('*').eq('assigned_to', userId).eq('status', 'approved'),
      supabase.from('expenses').select('*').eq('user_id', userId),
    ])
    setRewards(rews || [])
    setPoints(pts)
    setRedemptions((myRed || []).map(r => ({ ...r, reward: r.rewards })).filter(r => r.reward))
    setBadges(computeBadges(userId, { activities: acts || [], tasks: appTasks || [], expenses: exps || [] }))
  }

  async function redeem(reward) {
    if (points.balance < reward.points_cost || redeeming) return
    setRedeeming(reward.id)
    await supabase.from('redemptions').insert({ reward_id: reward.id, kid_id: userId, status: 'pending' })
    setRedeeming(null)
    await load()
    onRefresh?.()
  }

  const earnedBadgeNames = new Set(badges.map(b => b.name))

  return (
    <div className="space-y-4 pb-4">
      {/* Points balance */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="text-xs font-semibold uppercase tracking-widest text-indigo-300 mb-1">Available Points</div>
        <div className="text-6xl font-bold tracking-tight mb-2 leading-none">{points.balance}</div>
        <div className="text-sm text-indigo-300">{points.earned} earned · {points.spent} spent</div>
      </div>

      <SubTabs
        tabs={[
          { id: 'store',   label: 'Rewards' },
          { id: 'history', label: 'My requests' },
          { id: 'badges',  label: 'Badges' },
        ]}
        active={view}
        onChange={setView}
      />

      {/* Rewards store grid */}
      {view === 'store' && (
        rewards.length === 0
          ? <div className="text-center py-12 text-slate-400 text-sm">No rewards available yet.</div>
          : (
            <div className="grid grid-cols-2 gap-3">
              {rewards.map(r => {
                const canAfford = points.balance >= r.points_cost
                const busy      = redeeming === r.id
                return (
                  <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-4 flex-1">
                      <div className="font-semibold text-slate-800 mb-1 leading-snug">{r.title}</div>
                      {r.description && <div className="text-xs text-slate-500 mb-2 leading-relaxed">{r.description}</div>}
                      <div className="text-sm font-mono font-bold text-indigo-600">{r.points_cost} pts</div>
                    </div>
                    <div className="px-4 pb-4">
                      <button
                        onClick={() => redeem(r)}
                        disabled={!canAfford || !!redeeming}
                        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                          canAfford
                            ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {busy ? '…' : canAfford ? 'Redeem' : `${r.points_cost - points.balance} more pts`}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
      )}

      {/* History */}
      {view === 'history' && (
        redemptions.length === 0
          ? <div className="text-center py-12 text-slate-400 text-sm">No redemptions yet.</div>
          : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {redemptions.map(r => {
                  const cfg  = STATUS_CFG[r.status] || STATUS_CFG.pending
                  const Icon = cfg.Icon
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Icon size={17} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 text-sm truncate">{r.reward.title}</div>
                        <div className="text-xs text-slate-400">{r.created_at?.split('T')[0]}</div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs font-mono font-bold text-indigo-600">{r.reward.points_cost} pts</div>
                        <div className={`text-[10px] font-semibold mt-0.5 ${cfg.color}`}>{cfg.label}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
      )}

      {/* Badges */}
      {view === 'badges' && (
        <div className="space-y-3">
          {badges.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Earned badges</h3>
              <div className="flex flex-wrap gap-2">
                {badges.map(b => (
                  <div key={b.id} title={b.desc} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">
                    <span className="text-base">{b.icon}</span>
                    <span className="text-xs font-semibold text-indigo-800">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              {badges.length > 0 ? 'Still to unlock' : 'All badges'}
            </h3>
            {ALL_BADGES.filter(b => !earnedBadgeNames.has(b.name)).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">You have all the badges! Amazing work.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ALL_BADGES.filter(b => !earnedBadgeNames.has(b.name)).map(b => (
                  <div key={b.name} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 opacity-50">
                    <span className="text-base grayscale">{b.icon}</span>
                    <span className="text-xs font-semibold text-slate-500">{b.name}</span>
                  </div>
                ))}
              </div>
            )}
            {badges.length === 0 && (
              <div className="flex items-center gap-2 mt-3 bg-indigo-50 rounded-xl px-3 py-2.5">
                <Star size={14} className="text-indigo-400 flex-shrink-0" />
                <p className="text-xs text-indigo-600">Log activities and complete tasks to earn badges!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
