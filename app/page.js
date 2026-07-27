'use client'

import dynamic from 'next/dynamic'

const App = dynamic(() => import('@/components/App'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-slate-400">
      <div className="text-center">
        <div className="text-xl font-semibold text-slate-700 mb-1">The Ledger</div>
        <div className="text-sm">Loading…</div>
      </div>
    </div>
  ),
})

export default function Page() {
  return <App />
}
