'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import BottomNav from './BottomNav'
import KidLog from './KidLog'
import TaskList from './TaskList'
import TaskManager from './TaskManager'
import ParentReview from './ParentReview'
import RewardsManager from './RewardsManager'
import RewardsStore from './RewardsStore'
import Leaderboard from './Leaderboard'

export default function AppShell({ profile, counts, onRefresh }) {
  const isParent    = profile?.role === 'parent'
  const defaultTab  = isParent ? 'review' : 'log'
  const [tab, setTab] = useState(defaultTab)

  function handleTabChange(newTab) {
    setTab(newTab)
    onRefresh()
  }

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto bg-white shadow-xl">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 h-14 bg-indigo-900 text-white flex-shrink-0">
        <span className="font-bold text-lg tracking-tight">The Ledger</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-indigo-300 truncate max-w-[120px]">{profile?.display_name}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs bg-indigo-800 hover:bg-indigo-700 active:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
        {isParent ? (
          <>
            {tab === 'review'  && <ParentReview onRefresh={onRefresh} />}
            {tab === 'tasks'   && <TaskManager  userId={profile.id} onRefresh={onRefresh} />}
            {tab === 'rewards' && <RewardsManager userId={profile.id} onRefresh={onRefresh} />}
            {tab === 'board'   && <Leaderboard />}
          </>
        ) : (
          <>
            {tab === 'log'     && <KidLog     userId={profile.id} />}
            {tab === 'tasks'   && <TaskList   userId={profile.id} />}
            {tab === 'rewards' && <RewardsStore userId={profile.id} onRefresh={onRefresh} />}
            {tab === 'board'   && <Leaderboard userId={profile.id} />}
          </>
        )}
      </main>

      {/* ── Bottom nav ─────────────────────────────────── */}
      <BottomNav
        isParent={isParent}
        activeTab={tab}
        onTabChange={handleTabChange}
        counts={counts}
      />
    </div>
  )
}
