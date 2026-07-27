import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export function computeStreak(userId, activities) {
  const days = [...new Set(
    activities.filter(a => a.user_id === userId).map(a => a.activity_date)
  )].sort().reverse()
  if (!days.length) return 0
  const today = new Date().toISOString().slice(0, 10)
  if (days[0] !== today && days[0] !== new Date(Date.now() - 86400000).toISOString().slice(0, 10)) return 0
  let streak = 1
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1])
    const curr = new Date(days[i])
    const diff = (prev - curr) / 86400000
    if (diff === 1) streak++
    else break
  }
  return streak
}

export function computeBadges(kidId, { activities = [], tasks = [], expenses = [] }) {
  const streak = computeStreak(kidId, activities)
  const badges = []

  if (streak >= 3)  badges.push({ id: 'streak3',  name: '3-Day Streak',    icon: '🔥', desc: '3 consecutive days of activity' })
  if (streak >= 7)  badges.push({ id: 'streak7',  name: '7-Day Streak',    icon: '⚡', desc: '7 consecutive days of activity' })
  if (tasks.length >= 5)  badges.push({ id: 'tasks5',  name: 'On a Roll',   icon: '✅', desc: '5 tasks approved' })
  if (tasks.length >= 10) badges.push({ id: 'tasks10', name: 'Task Master', icon: '🏅', desc: '10 tasks approved' })
  if (tasks.length >= 20) badges.push({ id: 'tasks20', name: 'Overachiever',icon: '🏆', desc: '20 tasks approved' })

  const thisMonth = new Date().toISOString().slice(0, 7)
  const months = new Set(activities.map(a => a.activity_date?.slice(0, 7)))
  if (months.has(thisMonth)) badges.push({ id: 'monthchamp', name: 'Month Champion', icon: '🌟', desc: 'Active this month' })

  const readingActs = activities.filter(a => /read|book|story/i.test(a.title))
  if (readingActs.length >= 5) badges.push({ id: 'reading', name: 'Reading Champion', icon: '📚', desc: '5 reading activities' })

  const helpActs = activities.filter(a => /help|clean|chore|cook/i.test(a.title))
  if (helpActs.length >= 3) badges.push({ id: 'helping', name: 'Helping Hand', icon: '🤝', desc: '3 helping activities' })

  if (expenses.length >= 5) badges.push({ id: 'expense', name: 'Expense Master', icon: '💰', desc: '5 expenses logged' })

  const morningActs = activities.filter(a => {
    const hour = new Date(a.created_at || a.activity_date).getHours()
    return hour < 9
  })
  if (morningActs.length >= 3) badges.push({ id: 'earlybird', name: 'Early Bird', icon: '🌅', desc: '3 early morning logs' })

  return badges
}

export async function getKidPoints(kidId) {
  const [{ data: tasks }, { data: redemptions }] = await Promise.all([
    supabase.from('tasks').select('points').eq('assigned_to', kidId).eq('status', 'approved'),
    supabase.from('redemptions')
      .select('reward_id, rewards(points_cost)')
      .eq('kid_id', kidId)
      .in('status', ['pending', 'fulfilled']),
  ])
  const earned = (tasks || []).reduce((s, t) => s + (Number(t.points) || 0), 0)
  const spent  = (redemptions || []).reduce((s, r) => s + (r.rewards ? Number(r.rewards.points_cost) : 0), 0)
  return { earned, spent, balance: earned - spent }
}
