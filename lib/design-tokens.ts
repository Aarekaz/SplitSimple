import { Users, Scale, Percent, Calculator } from 'lucide-react'

export type SplitMethod = "even" | "shares" | "percent" | "exact"

export interface ColorToken {
  id: string
  bg: string
  solid: string
  text: string
  textSolid: string
  hex: string
}

export const PERSON_COLORS: ColorToken[] = [
  { id: 'indigo', bg: 'bg-primary/20', solid: 'bg-primary', text: 'text-primary', textSolid: 'text-white', hex: '#4F46E5' },
  { id: 'orange', bg: 'bg-orange-100', solid: 'bg-orange-500', text: 'text-orange-700', textSolid: 'text-white', hex: '#F97316' },
  { id: 'rose', bg: 'bg-rose-100', solid: 'bg-rose-500', text: 'text-rose-700', textSolid: 'text-white', hex: '#F43F5E' },
  { id: 'emerald', bg: 'bg-emerald-100', solid: 'bg-emerald-500', text: 'text-emerald-700', textSolid: 'text-white', hex: '#10B981' },
  { id: 'blue', bg: 'bg-blue-100', solid: 'bg-blue-500', text: 'text-blue-700', textSolid: 'text-white', hex: '#3B82F6' },
  { id: 'amber', bg: 'bg-amber-100', solid: 'bg-amber-500', text: 'text-amber-700', textSolid: 'text-white', hex: '#F59E0B' },
]

export const SPLIT_METHOD_OPTIONS = [
  { value: 'even' as SplitMethod, label: 'Even Split', icon: Users },
  { value: 'shares' as SplitMethod, label: 'By Shares', icon: Scale },
  { value: 'percent' as SplitMethod, label: 'By Percent', icon: Percent },
  { value: 'exact' as SplitMethod, label: 'Exact Amount', icon: Calculator },
]

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
}
