import React from 'react'
import { TrendingUp, TrendingDown, LoaderCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number | null
  icon: LucideIcon
  variation?: number // percentage variation, e.g. +12 or -5
  variationPeriod?: string // e.g. "vs mês passado", "hoje"
  loading?: boolean
  iconBgClass?: string
  iconColorClass?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  variation,
  variationPeriod = 'vs mês anterior',
  loading = false,
  iconBgClass = 'bg-[#233A7A]/5',
  iconColorClass = 'text-[#233A7A]'
}) => {
  const isPositive = variation !== undefined && variation >= 0

  return (
    <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group h-full">
      <div className="flex items-center justify-between gap-4">
        {/* Label */}
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        {/* Icon wrapper */}
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${iconBgClass} ${iconColorClass}`}>
          <Icon size={18} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {/* Value */}
        <div className="text-3xl font-bold font-display text-slate-800 flex items-center">
          {loading || value === null ? (
            <LoaderCircle className="h-7 w-7 animate-spin text-[#E53935]" />
          ) : (
            value
          )}
        </div>

        {/* Variation */}
        {variation !== undefined && !loading && value !== null && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold">
            <span className={`inline-flex items-center gap-0.5 px-1.75 py-0.75 rounded-lg border ${
              isPositive 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                : 'bg-rose-50 border-rose-100 text-rose-600'
            }`}>
              {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {isPositive ? `+${variation}%` : `${variation}%`}
            </span>
            <span className="text-slate-400">
              {variationPeriod}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
export default StatCard
