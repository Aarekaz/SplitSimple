"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import type { Item, Person } from '@/contexts/BillContext'

interface ColorToken {
  id: string
  bg: string
  solid: string
  text: string
  textSolid: string
  hex: string
}

interface PersonShare {
  subtotal: number
  tax: number
  tip: number
  discount: number
  total: number
  ratio: number
  items: Array<Item & { totalItemPrice: number; pricePerPerson: number; priceNumber: number; qty: number }>
}

interface ProBillBreakdownViewProps {
  calculatedItems: Array<Item & { totalItemPrice: number; pricePerPerson: number; priceNumber: number; qty: number }>
  colors: ColorToken[]
  formatCurrency: (amount: number) => string
  grandTotal: number
  people: Person[]
  personFinalShares: Record<string, PersonShare>
  subtotal: number
  taxAmount: number
  tipAmount: number
  title: string
}

export default function ProBillBreakdownView({
  calculatedItems,
  colors,
  formatCurrency,
  grandTotal,
  people,
  personFinalShares,
  subtotal,
  taxAmount,
  tipAmount,
  title,
}: ProBillBreakdownViewProps): JSX.Element {
  return (
    <div className="h-full overflow-auto p-6 bg-slate-50 pro-scrollbar" style={{ contentVisibility: 'auto' }}>
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
          {/* LEFT: Bill Summary Receipt */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900"></div>

              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900 mb-1 font-inter text-balance">{title}</h2>
                <p className="text-xs text-slate-400 uppercase font-inter">Bill Summary</p>
              </div>

              <div className="space-y-2 mb-6 font-space-mono text-sm text-slate-600 tabular-nums">
                {calculatedItems.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="truncate pr-4">{item.name}</span>
                    <span>{formatCurrency(item.totalItemPrice)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-200/60 pt-4 space-y-2 font-space-mono text-sm tabular-nums">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Tip</span>
                    <span>{formatCurrency(tipAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200/60">
                  <span>Grand Total</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Individual Breakdowns */}
          <div className="md:col-span-7 space-y-4">
            {people.map((person) => {
              const stats = personFinalShares[person.id]
              const colorObj = colors[person.colorIdx || 0]
              const initials = person.name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)

              return (
                <div key={person.id} className="bg-white rounded-lg border border-slate-200/60 shadow-sm hover:border-indigo-300 transition-colors">
                  <div className="p-4 border-b border-slate-100/60 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white",
                          colorObj.solid
                        )}
                      >
                        {initials}
                      </div>
                      <div className="font-bold text-slate-900 font-inter text-balance">{person.name}</div>
                    </div>
                    <div className="font-space-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(stats?.total || 0)}
                    </div>
                  </div>
                  <div className="p-4">
                    {/* Share Graph */}
                    <div className="mb-5">
                      <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold mb-2 font-inter">
                        <span>Share</span>
                        <span className="tabular-nums">{stats?.ratio.toFixed(1) || 0}%</span>
                      </div>
                      <div className="flex gap-1.5 h-2">
                        {[...Array(10)].map((_, index) => {
                          const filled = index < Math.round((stats?.ratio || 0) / 10)
                          return (
                            <div
                              key={index}
                              className={cn(
                                "flex-1 rounded-full transition-colors",
                                filled ? colorObj.solid : "bg-slate-100"
                              )}
                            />
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-1 mb-4">
                      {stats?.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm text-slate-600">
                          <span className="flex items-center gap-2 font-inter">
                            <div className="w-1 h-1 bg-slate-300 rounded-full"></div> {item.name}
                          </span>
                          <span className="font-space-mono text-xs tabular-nums">
                            {formatCurrency(item.pricePerPerson)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-slate-50 flex gap-4 text-xs text-slate-400 font-space-mono tabular-nums">
                      <span className="flex gap-1">
                        Sub: <span className="text-slate-600">{formatCurrency(stats?.subtotal || 0)}</span>
                      </span>
                      <span className="flex gap-1">
                        Tax: <span className="text-slate-600">{formatCurrency(stats?.tax || 0)}</span>
                      </span>
                      {stats?.tip > 0 && (
                        <span className="flex gap-1">
                          Tip: <span className="text-slate-600">{formatCurrency(stats.tip)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
