"use client"

import { usePostHog } from "posthog-js/react"
import type { PostHog } from "posthog-js"
import { useEffect } from "react"
import type { Bill, Person, Item, SyncStatus } from "@/contexts/BillContext"
import type { SplitMethod } from "@/components/SplitMethodSelector"

export interface AnalyticsEvents {
  // App lifecycle
  "app_initialized": {
    session_id: string
    is_mobile: boolean
    browser: string
    has_existing_bill: boolean
  }

  // Bill creation and management
  "bill_created": {
    bill_id: string
    from_shared_link?: boolean
  }
  
  "bill_title_changed": {
    bill_id: string
    title_length: number
    is_default_title: boolean
  }

  "bill_status_changed": {
    bill_id: string
    old_status: string
    new_status: string
  }

  // People management
  "person_added": {
    bill_id: string
    person_count: number
    method: "manual" | "bulk"
    time_since_bill_created: number
  }

  "person_removed": {
    bill_id: string
    person_count: number
    had_items_assigned: boolean
  }

  // Items and splitting
  "item_added": {
    bill_id: string
    item_count: number
    has_price: boolean
    split_method: SplitMethod
    people_count: number
    assigned_people_count: number
  }

  "split_method_changed": {
    bill_id: string
    item_id: string
    old_method: SplitMethod
    new_method: SplitMethod
    people_count: number
    assigned_people_count: number
  }

  "item_removed": {
    bill_id: string
    item_count: number
    split_method: SplitMethod
  }

  // User flow and engagement
  "user_stuck_detected": {
    bill_id: string
    step: string
    time_spent: number
    people_count: number
    items_count: number
  }

  "bill_completed": {
    bill_id: string
    people_count: number
    items_count: number
    total_amount: number
    split_methods_used: SplitMethod[]
    time_to_complete: number
    has_tax: boolean
    has_tip: boolean
    has_discount: boolean
  }

  // Feature usage
  "feature_used": {
    feature_name: string
    bill_id: string
    context?: Record<string, any>
  }

  "share_bill_clicked": {
    bill_id: string
    method: "link" | "copy"
    people_count: number
    items_count: number
  }

  "bill_summary_copied": {
    bill_id: string
    people_count: number
    items_count: number
    total_amount: number
  }

  // Tax, tip, discount usage
  "tax_tip_discount_used": {
    bill_id: string
    type: "tax" | "tip" | "discount"
    value: string
    allocation_method?: "proportional" | "even"
  }

  // Sync and sharing
  "bill_synced": {
    bill_id: string
    sync_status: SyncStatus
    sync_duration?: number
  }

  "shared_bill_loaded": {
    bill_id: string
    source: "cloud" | "local"
    people_count: number
    items_count: number
  }

  // Undo/Redo usage
  "undo_redo_used": {
    bill_id: string
    action: "undo" | "redo"
    history_position: number
  }

  // Error tracking
  "error_occurred": {
    error_type: string
    error_message: string
    bill_id?: string
    context?: Record<string, any>
  }
}

export interface UserFlowTracking {
  sessionId: string
  billCreatedAt: number | null
  lastActivity: number
  currentStep: string
  timeInStep: number
  peopleAddedAt: number | null
  firstItemAddedAt: number | null
}

class AnalyticsManager {
  private posthog: PostHog | null = null
  private userFlow: UserFlowTracking = {
    sessionId: this.generateSessionId(),
    billCreatedAt: null,
    lastActivity: Date.now(),
    currentStep: "app_initialized",
    timeInStep: 0,
    peopleAddedAt: null,
    firstItemAddedAt: null,
  }

  private stuckDetectionTimeout: NodeJS.Timeout | null = null
  private readonly STUCK_THRESHOLD = 30000 // 30 seconds

  constructor(posthogInstance?: PostHog) {
    if (posthogInstance) {
      this.posthog = posthogInstance
    }
  }

  setPostHog(posthogInstance: PostHog) {
    this.posthog = posthogInstance
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private track<T extends keyof AnalyticsEvents>(
    eventName: T,
    properties: AnalyticsEvents[T]
  ) {
    if (!this.posthog) return

    // Add session context to all events
    const enrichedProperties = {
      ...properties,
      session_id: this.userFlow.sessionId,
      timestamp: Date.now(),
    }

    this.posthog.capture(eventName, enrichedProperties)
    this.updateUserFlow(eventName as string)
  }

  private updateUserFlow(eventName: string) {
    const now = Date.now()
    this.userFlow.timeInStep = now - this.userFlow.lastActivity
    this.userFlow.lastActivity = now

    // Track step transitions and detect when users might be stuck
    if (eventName !== this.userFlow.currentStep) {
      this.userFlow.currentStep = eventName
      this.resetStuckDetection()
    }
  }

  private resetStuckDetection() {
    if (this.stuckDetectionTimeout) {
      clearTimeout(this.stuckDetectionTimeout)
    }

    // Don't track "stuck" for completed states or certain actions
    const nonStuckSteps = ["bill_completed", "bill_summary_copied", "app_initialized"]
    if (nonStuckSteps.includes(this.userFlow.currentStep)) return

    this.stuckDetectionTimeout = setTimeout(() => {
      this.track("user_stuck_detected", {
        bill_id: "current", // Will be replaced with actual bill ID in usage
        step: this.userFlow.currentStep,
        time_spent: this.STUCK_THRESHOLD,
        people_count: 0, // Will be filled by caller
        items_count: 0, // Will be filled by caller
      })
    }, this.STUCK_THRESHOLD)
  }

  // Public tracking methods
  trackAppInitialized(data: Omit<AnalyticsEvents["app_initialized"], "session_id">) {
    this.track("app_initialized", {
      ...data,
      session_id: this.userFlow.sessionId,
    })
  }

  trackBillCreated(data: AnalyticsEvents["bill_created"]) {
    this.userFlow.billCreatedAt = Date.now()
    this.track("bill_created", data)
  }

  trackPersonAdded(data: Omit<AnalyticsEvents["person_added"], "time_since_bill_created">) {
    const time_since_bill_created = this.userFlow.billCreatedAt 
      ? Date.now() - this.userFlow.billCreatedAt 
      : 0
    
    if (!this.userFlow.peopleAddedAt) {
      this.userFlow.peopleAddedAt = Date.now()
    }

    this.track("person_added", {
      ...data,
      time_since_bill_created,
    })
  }

  trackItemAdded(data: AnalyticsEvents["item_added"]) {
    if (!this.userFlow.firstItemAddedAt) {
      this.userFlow.firstItemAddedAt = Date.now()
    }
    this.track("item_added", data)
  }

  trackSplitMethodChanged(data: AnalyticsEvents["split_method_changed"]) {
    this.track("split_method_changed", data)
  }

  trackBillCompleted(data: Omit<AnalyticsEvents["bill_completed"], "time_to_complete">) {
    const time_to_complete = this.userFlow.billCreatedAt 
      ? Date.now() - this.userFlow.billCreatedAt 
      : 0

    this.track("bill_completed", {
      ...data,
      time_to_complete,
    })
  }

  trackFeatureUsage(feature_name: string, bill_id: string, context?: Record<string, any>) {
    this.track("feature_used", {
      feature_name,
      bill_id,
      context,
    })
  }

  trackError(error_type: string, error_message: string, bill_id?: string, context?: Record<string, any>) {
    this.track("error_occurred", {
      error_type,
      error_message,
      bill_id,
      context,
    })
  }

  // Method to track any event type
  trackEvent<T extends keyof AnalyticsEvents>(
    eventName: T,
    properties: AnalyticsEvents[T]
  ) {
    this.track(eventName, properties)
  }

  // Get current session info
  getSessionInfo() {
    return {
      sessionId: this.userFlow.sessionId,
      billCreatedAt: this.userFlow.billCreatedAt,
      currentStep: this.userFlow.currentStep,
      timeInCurrentStep: Date.now() - this.userFlow.lastActivity,
    }
  }
}

// Global analytics instance
export const analytics = new AnalyticsManager()

// React hook for analytics
export function useAnalytics() {
  const posthog = usePostHog()

  useEffect(() => {
    if (posthog) {
      analytics.setPostHog(posthog)
    }
  }, [posthog])

  return analytics
}

// Utility functions for common analytics patterns
export function getBillAnalytics(bill: Bill) {
  const splitMethodsUsed = Array.from(
    new Set(bill.items.map(item => item.method))
  ) as SplitMethod[]

  const totalAmount = bill.items.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0
    return sum + (price * item.quantity)
  }, 0)

  return {
    people_count: bill.people.length,
    items_count: bill.items.length,
    total_amount: totalAmount,
    split_methods_used: splitMethodsUsed,
    has_tax: bill.tax !== "",
    has_tip: bill.tip !== "",
    has_discount: bill.discount !== "",
  }
}

export function trackSplitMethodPopularity(
  method: SplitMethod,
  billId: string,
  peopleCount: number,
  assignedPeopleCount: number
) {
  analytics.trackEvent("split_method_changed", {
    bill_id: billId,
    item_id: "new_item",
    old_method: "even" as SplitMethod, // Default assumption
    new_method: method,
    people_count: peopleCount,
    assigned_people_count: assignedPeopleCount,
  })
}