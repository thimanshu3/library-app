'use client'

import { Book } from '../types'

// ─── Stat Chip Component ──────────────────────────────────────────────────────
interface StatChipProps {
  label: string
  value: string | number
  sub?: string
  dotColor?: string
}

function StatChip({ label, value, sub, dotColor }: StatChipProps) {
  return (
    <div className="stat-chip">
      {dotColor && (
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      )}
      <span className="text-[11px] font-black tracking-wider uppercase text-slate-500">
        {label}
      </span>
      <span className="text-sm font-black text-slate-900 tabular-nums">
        {value}
        {sub && <span className="text-slate-400 font-semibold ml-0.5">{sub}</span>}
      </span>
    </div>
  )
}

export default function DashboardStats({ books }: { books: Book[] }) {
  const total = books.length
  const read = books.filter(b => b.status === 'Read').length
  const reading = books.filter(b => b.status === 'Reading').length
  const pct = total > 0 ? Math.round((read / total) * 100) : 0
  const totalInvested = books.reduce((acc, b) => acc + (b.purchasePrice || 0), 0)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <StatChip
        label="Read"
        value={read}
        sub={`/${total}`}
        dotColor="bg-emerald-400"
      />
      {reading > 0 && (
        <StatChip
          label="Reading"
          value={reading}
          dotColor="bg-secondary animate-breathe"
        />
      )}
      <StatChip
        label="Done"
        value={`${pct}%`}
        dotColor="bg-accent"
      />
      {totalInvested > 0 && (
        <StatChip
          label="Invested"
          value={`₹${Math.round(totalInvested).toLocaleString()}`}
        />
      )}
    </div>
  )
}
