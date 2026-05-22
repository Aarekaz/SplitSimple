"use client"

import {
  BarChart2,
  Calculator,
  DollarSign,
  Percent,
  Scale,
  Split,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { SplitMethod } from "@/lib/bill-types"

export type { SplitMethod } from "@/lib/bill-types"

interface SplitMethodOption {
  value: SplitMethod
  label: string
  shortLabel: string
  description: string
  icon: LucideIcon
  badgeIcon: LucideIcon
  badgeClassName: string
}

export const splitMethodOptions: SplitMethodOption[] = [
  {
    value: "even",
    label: "Even Split",
    shortLabel: "EVEN",
    description: "Split equally among selected people",
    icon: Users,
    badgeIcon: Split,
    badgeClassName:
      "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  {
    value: "shares",
    label: "By Shares",
    shortLabel: "SHARES",
    description: "Split based on custom shares",
    icon: Scale,
    badgeIcon: BarChart2,
    badgeClassName:
      "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
  },
  {
    value: "percent",
    label: "By Percent",
    shortLabel: "%",
    description: "Split by percentage amounts",
    icon: Percent,
    badgeIcon: Percent,
    badgeClassName:
      "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  {
    value: "exact",
    label: "Exact Amount",
    shortLabel: "EXACT",
    description: "Specify exact dollar amounts",
    icon: Calculator,
    badgeIcon: DollarSign,
    badgeClassName:
      "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
]

export function getSplitMethodOption(method: SplitMethod): SplitMethodOption {
  return splitMethodOptions.find((option) => option.value === method) ?? splitMethodOptions[0]
}
