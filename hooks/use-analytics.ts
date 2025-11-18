"use client"

import { useEffect, useCallback } from "react"
import { useAnalytics, getBillAnalytics, type AnalyticsEvents } from "@/lib/analytics"
import { useBill, type SyncStatus } from "@/contexts/BillContext"
import type { SplitMethod } from "@/components/SplitMethodSelector"
import { useIsMobile } from "@/hooks/use-mobile"

export function useBillAnalytics() {
  const analytics = useAnalytics()
  const { state } = useBill()
  const isMobile = useIsMobile()

  // Initialize app analytics on mount
  useEffect(() => {
    const getBrowserInfo = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      if (userAgent.includes('chrome')) return 'chrome'
      if (userAgent.includes('firefox')) return 'firefox'
      if (userAgent.includes('safari')) return 'safari'
      if (userAgent.includes('edge')) return 'edge'
      return 'other'
    }

    const hasExistingBill = state.currentBill.title !== "New Bill" || 
                           state.currentBill.people.length > 0 || 
                           state.currentBill.items.length > 0

    analytics.trackAppInitialized({
      is_mobile: isMobile,
      browser: getBrowserInfo(),
      has_existing_bill: hasExistingBill,
    })
  }, []) // Only run once on mount

  // Track bill creation
  const trackBillCreated = useCallback((fromSharedLink: boolean = false) => {
    analytics.trackBillCreated({
      bill_id: state.currentBill.id,
      from_shared_link: fromSharedLink,
    })
  }, [state.currentBill.id, analytics])

  // Track title changes
  const trackTitleChanged = useCallback((newTitle: string) => {
    analytics.trackEvent("bill_title_changed", {
      bill_id: state.currentBill.id,
      title_length: newTitle.length,
      is_default_title: newTitle === "New Bill" || newTitle === "",
    })
  }, [state.currentBill.id, analytics])

  // Track status changes
  const trackStatusChanged = useCallback((oldStatus: string, newStatus: string) => {
    analytics.trackEvent("bill_status_changed", {
      bill_id: state.currentBill.id,
      old_status: oldStatus,
      new_status: newStatus,
    })
  }, [state.currentBill.id, analytics])

  // Track person operations
  const trackPersonAdded = useCallback((method: "manual" | "bulk" = "manual") => {
    analytics.trackPersonAdded({
      bill_id: state.currentBill.id,
      person_count: state.currentBill.people.length,
      method,
    })
  }, [state.currentBill.id, state.currentBill.people.length, analytics])

  const trackPersonRemoved = useCallback((hadItemsAssigned: boolean) => {
    analytics.trackEvent("person_removed", {
      bill_id: state.currentBill.id,
      person_count: state.currentBill.people.length,
      had_items_assigned: hadItemsAssigned,
    })
  }, [state.currentBill.id, state.currentBill.people.length, analytics])

  // Track item operations
  const trackItemAdded = useCallback((itemPrice: string, splitMethod: SplitMethod, assignedPeopleCount: number) => {
    analytics.trackItemAdded({
      bill_id: state.currentBill.id,
      item_count: state.currentBill.items.length,
      has_price: itemPrice !== "",
      split_method: splitMethod,
      people_count: state.currentBill.people.length,
      assigned_people_count: assignedPeopleCount,
    })
  }, [state.currentBill.id, state.currentBill.items.length, state.currentBill.people.length, analytics])

  const trackSplitMethodChanged = useCallback((
    itemId: string, 
    oldMethod: SplitMethod, 
    newMethod: SplitMethod, 
    assignedPeopleCount: number
  ) => {
    analytics.trackSplitMethodChanged({
      bill_id: state.currentBill.id,
      item_id: itemId,
      old_method: oldMethod,
      new_method: newMethod,
      people_count: state.currentBill.people.length,
      assigned_people_count: assignedPeopleCount,
    })
  }, [state.currentBill.id, state.currentBill.people.length, analytics])

  const trackItemRemoved = useCallback((splitMethod: SplitMethod) => {
    analytics.trackEvent("item_removed", {
      bill_id: state.currentBill.id,
      item_count: state.currentBill.items.length,
      split_method: splitMethod,
    })
  }, [state.currentBill.id, state.currentBill.items.length, analytics])

  // Track feature usage
  const trackFeatureUsed = useCallback((featureName: string, context?: Record<string, any>) => {
    analytics.trackFeatureUsage(featureName, state.currentBill.id, context)
  }, [state.currentBill.id, analytics])

  // Track bill completion
  const trackBillCompleted = useCallback(() => {
    const billAnalytics = getBillAnalytics(state.currentBill)
    analytics.trackBillCompleted({
      bill_id: state.currentBill.id,
      ...billAnalytics,
    })
  }, [state.currentBill, analytics])

  // Track sharing actions
  const trackShareBillClicked = useCallback((method: "link" | "copy") => {
    analytics.trackEvent("share_bill_clicked", {
      bill_id: state.currentBill.id,
      method,
      people_count: state.currentBill.people.length,
      items_count: state.currentBill.items.length,
    })
  }, [state.currentBill.id, state.currentBill.people.length, state.currentBill.items.length, analytics])

  const trackBillSummaryCopied = useCallback(() => {
    const billAnalytics = getBillAnalytics(state.currentBill)
    analytics.trackEvent("bill_summary_copied", {
      bill_id: state.currentBill.id,
      people_count: billAnalytics.people_count,
      items_count: billAnalytics.items_count,
      total_amount: billAnalytics.total_amount,
    })
  }, [state.currentBill, analytics])

  // Track tax, tip, discount usage
  const trackTaxTipDiscountUsed = useCallback((
    type: "tax" | "tip" | "discount", 
    value: string, 
    allocationMethod?: "proportional" | "even"
  ) => {
    analytics.trackEvent("tax_tip_discount_used", {
      bill_id: state.currentBill.id,
      type,
      value,
      allocation_method: allocationMethod,
    })
  }, [state.currentBill.id, analytics])

  // Track sync events
  const trackBillSynced = useCallback((syncStatus: SyncStatus, syncDuration?: number) => {
    analytics.trackEvent("bill_synced", {
      bill_id: state.currentBill.id,
      sync_status: syncStatus,
      sync_duration: syncDuration,
    })
  }, [state.currentBill.id, analytics])

  // Track shared bill loading
  const trackSharedBillLoaded = useCallback((source: "cloud" | "local") => {
    analytics.trackEvent("shared_bill_loaded", {
      bill_id: state.currentBill.id,
      source,
      people_count: state.currentBill.people.length,
      items_count: state.currentBill.items.length,
    })
  }, [state.currentBill.id, state.currentBill.people.length, state.currentBill.items.length, analytics])

  // Track undo/redo usage
  const trackUndoRedoUsed = useCallback((action: "undo" | "redo", historyPosition: number) => {
    analytics.trackEvent("undo_redo_used", {
      bill_id: state.currentBill.id,
      action,
      history_position: historyPosition,
    })
  }, [state.currentBill.id, analytics])

  // Track errors
  const trackError = useCallback((errorType: string, errorMessage: string, context?: Record<string, any>) => {
    analytics.trackError(errorType, errorMessage, state.currentBill.id, context)
  }, [state.currentBill.id, analytics])

  return {
    trackBillCreated,
    trackTitleChanged,
    trackStatusChanged,
    trackPersonAdded,
    trackPersonRemoved,
    trackItemAdded,
    trackSplitMethodChanged,
    trackItemRemoved,
    trackFeatureUsed,
    trackBillCompleted,
    trackShareBillClicked,
    trackBillSummaryCopied,
    trackTaxTipDiscountUsed,
    trackBillSynced,
    trackSharedBillLoaded,
    trackUndoRedoUsed,
    trackError,
  }
}