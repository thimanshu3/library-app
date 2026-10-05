'use client'

import { Book } from '../types'
import ReadingHeatmap from './ReadingHeatmap'
import { useState } from 'react'
import ReadingWrappedModal from './ReadingWrappedModal'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = [
  '#c46a4f', '#e38a71', '#34d399', '#f59e0b',
  '#ec4899', '#0d9f6e', '#f97316', '#8a7d6e',
]

const tooltipStyle = {
  contentStyle: {
    borderRadius: '16px',
    border: 'none',
    boxShadow: '0 20px 40px -8px rgba(80,60,40,0.25)',
    background: 'var(--surface-2)',
    color: 'var(--on-surface)',
    fontSize: '12px',
    fontWeight: '600',
  },
  cursor: { fill: 'rgba(196, 106, 79, 0.08)' },
}

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  color?: string
  icon?: React.ReactNode
}

function KpiCard({ label, value, sub, color = '', icon }: KpiCardProps) {
  return (
    <div
      className="p-5 rounded-[24px] shadow-sm flex flex-col gap-3"
      style={{
        background: 'var(--surface-warm)',
        border: '1px solid var(--outline-variant)'
      }}
    >
      {icon && <div style={{ color: 'var(--on-surface-variant)' }}>{icon}</div>}
      <div>
        <span className="text-xs font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--on-surface-variant)' }}>{label}</span>
        <span className={`text-4xl font-black ${color}`} style={color ? undefined : { color: 'var(--on-surface)' }}>{value}</span>
        {sub && <span className="text-sm ml-2" style={{ color: 'var(--on-surface-variant)' }}>{sub}</span>}
      </div>
    </div>
  )
}

export default function AnalyticsDashboard({ books }: { books: Book[] }) {
  const [showWrapped, setShowWrapped] = useState(false)

  const readBooks = books.filter(b => b.status === 'Read')
  const reading = books.filter(b => b.status === 'Reading')
  const owned = books.filter(b => b.purchased)
  const totalInvestment = books.reduce((s, b) => s + (b.purchasePrice || 0), 0)
  const pct = books.length > 0 ? Math.round((readBooks.length / books.length) * 100) : 0

  // Yearly Goal setup
  const currentYear = new Date().getFullYear()
  const yearlyGoal = 50
  const readThisYear = books.filter(b => b.status === 'Read' && b.readingEndDate && b.readingEndDate.startsWith(currentYear.toString())).length
  const goalProgress = Math.min(100, Math.round((readThisYear / yearlyGoal) * 100))

  // Genre distribution
  const genreCount: Record<string, number> = {}
  books.forEach(b => { genreCount[b.genre] = (genreCount[b.genre] || 0) + 1 })
  const genreData = Object.entries(genreCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // Era distribution
  const yearCount: Record<string, number> = {}
  books.forEach(b => {
    const y = parseInt(b.launchYear || '0')
    let era = 'Unknown'
    if (y >= 2020) era = '2020s'
    else if (y >= 2010) era = '2010s'
    else if (y >= 2000) era = '2000s'
    else if (y >= 1950) era = 'Late 1900s'
    else if (y >= 1900) era = 'Early 1900s'
    else if (y > 0) era = 'Pre-1900'
    if (era !== 'Unknown') yearCount[era] = (yearCount[era] || 0) + 1
  })
  const eraOrder = ['Pre-1900', 'Early 1900s', 'Late 1900s', '2000s', '2010s', '2020s']
  const yearData = Object.entries(yearCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => eraOrder.indexOf(a.name) - eraOrder.indexOf(b.name))

  // Status bar data
  const statusData = [
    { name: 'Read', count: readBooks.length, fill: '#34d399' },
    { name: 'Reading', count: reading.length, fill: '#c46a4f' },
    { name: 'Unread', count: books.filter(b => b.status === 'Unread').length, fill: '#8a7d6e' },
  ]

  // Format breakdown
  const formatCount: Record<string, number> = {}
  books.forEach(b => { formatCount[b.format || 'None'] = (formatCount[b.format || 'None'] || 0) + 1 })
  const formatData = Object.entries(formatCount).map(([name, value]) => ({ name, value }))

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Goal & Heatmap Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-1 p-6 rounded-[32px] flex flex-col justify-center items-center text-center gap-4 relative overflow-hidden"
          style={{ background: 'var(--surface-warm)', border: '1px solid var(--outline-variant)' }}
        >
          <div className="flex w-full justify-between items-center z-10 px-2">
            <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>{currentYear} Reading Goal</h3>
            <button
              onClick={() => setShowWrapped(true)}
              className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-[#ec4899] to-[#f97316] text-white hover:scale-105 active:scale-95 transition-all shadow-md"
            >
              See Wrapped
            </button>
          </div>
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" style={{ color: 'var(--outline-variant)' }} />
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * goalProgress) / 100} className="text-accent transition-all duration-1000" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black" style={{ color: 'var(--on-surface)' }}>{readThisYear}</span>
              <span className="text-xs font-bold" style={{ color: 'var(--on-surface-variant)' }}>/ {yearlyGoal}</span>
            </div>
          </div>
          <p className="text-sm font-bold text-accent">{goalProgress}% Complete</p>
        </div>
        
        <div
          className="lg:col-span-2 p-6 rounded-[32px]"
          style={{ background: 'var(--surface-warm)', border: '1px solid var(--outline-variant)' }}
        >
          <ReadingHeatmap books={books} />
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Books"
          value={books.length}
          color="text-slate-900 dark:text-white"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        <KpiCard
          label={`${pct}% Complete`}
          value={readBooks.length}
          sub="read"
          color="text-emerald-600 dark:text-emerald-400"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard
          label="Physically Owned"
          value={owned.filter(b => b.format === 'Physical').length}
          color="text-accent dark:text-accent-dim"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
        />
        <KpiCard
          label="Est. Investment"
          value={`$${Math.round(totalInvestment).toLocaleString()}`}
          color="text-amber-600 dark:text-amber-400"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Progress bar */}
      <div
        className="p-6 rounded-[24px] shadow-sm"
        style={{ background: 'var(--surface-warm)', border: '1px solid var(--outline-variant)' }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Library Completion</h3>
          <span className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>{pct}%</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--outline-variant)' }}>
          <div
            className="h-full bg-gradient-to-r from-accent via-secondary to-primary-dim rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-6 mt-4 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
          {statusData.map(s => (
            <div key={s.name} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.fill }} />
              <span>{s.name}: <strong style={{ color: 'var(--on-surface)' }}>{s.count}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Genre pie */}
        <div
          className="p-6 rounded-[24px] shadow-sm flex flex-col gap-4 h-96"
          style={{ background: 'var(--surface-warm)', border: '1px solid var(--outline-variant)' }}
        >
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Top Genres</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genreData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {genreData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span style={{ color: 'var(--on-surface-variant)', fontSize: 11, fontWeight: 600 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Publication eras */}
        <div
          className="p-6 rounded-[24px] shadow-sm flex flex-col gap-4 h-96"
          style={{ background: 'var(--surface-warm)', border: '1px solid var(--outline-variant)' }}
        >
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Publication Eras</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--on-surface-variant)', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" fill="#c46a4f" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Format breakdown */}
        <div
          className="p-6 rounded-[24px] shadow-sm flex flex-col gap-4 h-80"
          style={{ background: 'var(--surface-warm)', border: '1px solid var(--outline-variant)' }}
        >
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Format Breakdown</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formatData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {formatData.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span style={{ color: 'var(--on-surface-variant)', fontSize: 11, fontWeight: 600 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status breakdown bar */}
        <div
          className="p-6 rounded-[24px] shadow-sm flex flex-col gap-4 h-80"
          style={{ background: 'var(--surface-warm)', border: '1px solid var(--outline-variant)' }}
        >
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>Reading Status</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                layout="vertical"
              >
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: 'var(--on-surface-variant)', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showWrapped && (
        <ReadingWrappedModal 
          books={books} 
          isDark={typeof document !== 'undefined' && document.documentElement.classList.contains('dark')} 
          onClose={() => setShowWrapped(false)} 
        />
      )}
    </div>
  )
}
