import { BookOpen, CheckSquare, Gift, Trophy } from 'lucide-react'

const PARENT_TABS = [
  { id: 'review',  label: 'Review',  Icon: BookOpen },
  { id: 'tasks',   label: 'Tasks',   Icon: CheckSquare, badgeKey: 'approvals' },
  { id: 'rewards', label: 'Rewards', Icon: Gift,        badgeKey: 'redemptions' },
  { id: 'board',   label: 'Board',   Icon: Trophy },
]

const KID_TABS = [
  { id: 'log',     label: 'Journal', Icon: BookOpen },
  { id: 'tasks',   label: 'Tasks',   Icon: CheckSquare },
  { id: 'rewards', label: 'Rewards', Icon: Gift },
  { id: 'board',   label: 'Board',   Icon: Trophy },
]

export default function BottomNav({ isParent, activeTab, onTabChange, counts }) {
  const tabs = isParent ? PARENT_TABS : KID_TABS

  return (
    <nav className="flex border-t border-slate-200 bg-white flex-shrink-0 shadow-[0_-1px_3px_rgba(0,0,0,.06)]">
      {tabs.map(({ id, label, Icon, badgeKey }) => {
        const isActive    = activeTab === id
        const badgeCount  = badgeKey ? counts[badgeKey] : 0
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-colors ${
              isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {isActive && (
              <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-b-full" />
            )}
            <span className="relative">
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              {badgeCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 leading-none">
                  {badgeCount}
                </span>
              )}
            </span>
            <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
