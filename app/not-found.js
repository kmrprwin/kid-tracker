import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 text-center">
      <div className="text-6xl font-bold text-indigo-200 mb-4">404</div>
      <h1 className="text-xl font-semibold text-slate-700 mb-2">Page not found</h1>
      <p className="text-slate-500 text-sm mb-6">This page does not exist.</p>
      <Link href="/" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
        Go home
      </Link>
    </div>
  )
}
