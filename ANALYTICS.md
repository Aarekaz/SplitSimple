# SplitSimple Analytics Integration

## Overview

This document describes the comprehensive PostHog analytics integration implemented in SplitSimple to answer key business questions about user behavior and feature usage.

## Key Business Questions Tracked

### 1. Which splitting methods are most popular?
- **Events Tracked:** `split_method_changed`
- **Data Collected:** Old method, new method, people count, assigned people count
- **Insights:** Shows user preferences between even split, shares, percentages, and exact amounts

### 2. Do users get stuck at particular steps?
- **Events Tracked:** `user_stuck_detected`
- **Data Collected:** Current step, time spent, bill state (people/items count)
- **Mechanism:** Automatic detection after 30 seconds of inactivity on key steps
- **Insights:** Identifies bottlenecks in the user flow

### 3. How many people do users typically split bills with?
- **Events Tracked:** `person_added`, `bill_completed`
- **Data Collected:** People count at various stages
- **Insights:** Average group sizes, distribution of bill participant counts

### 4. Are new features actually being used?
- **Events Tracked:** `feature_used`
- **Data Collected:** Feature name, usage context, bill state
- **Insights:** Feature adoption rates, usage patterns

## Analytics Architecture

### Core Components

#### 1. `lib/analytics.ts`
- **AnalyticsManager Class:** Central analytics coordinator
- **Event Type Definitions:** Strongly typed analytics events
- **User Flow Tracking:** Session-based user journey tracking
- **Stuck Detection:** Automatic bottleneck identification

#### 2. `hooks/use-analytics.ts`
- **useBillAnalytics Hook:** React hook for easy analytics integration
- **Bill-specific Tracking:** Methods for tracking bill-related events
- **Context Integration:** Connects analytics to bill state

#### 3. `components/PostHogProvider.tsx`
- **PostHog Initialization:** Sets up PostHog with privacy-friendly settings
- **User Identification:** Anonymous but persistent user tracking
- **Session Recording:** Configured to protect sensitive data

### Event Tracking Schema

```typescript
interface AnalyticsEvents {
  // App lifecycle
  app_initialized: {
    session_id: string
    is_mobile: boolean
    browser: string
    has_existing_bill: boolean
  }

  // Bill management
  bill_created: { bill_id: string, from_shared_link?: boolean }
  bill_title_changed: { bill_id: string, title_length: number, is_default_title: boolean }
  bill_status_changed: { bill_id: string, old_status: string, new_status: string }

  // People management
  person_added: { bill_id: string, person_count: number, method: "manual" | "bulk", time_since_bill_created: number }
  person_removed: { bill_id: string, person_count: number, had_items_assigned: boolean }

  // Items and splitting
  item_added: { bill_id: string, item_count: number, has_price: boolean, split_method: SplitMethod, people_count: number, assigned_people_count: number }
  split_method_changed: { bill_id: string, item_id: string, old_method: SplitMethod, new_method: SplitMethod, people_count: number, assigned_people_count: number }

  // User flow tracking
  user_stuck_detected: { bill_id: string, step: string, time_spent: number, people_count: number, items_count: number }
  bill_completed: { bill_id: string, people_count: number, items_count: number, total_amount: number, split_methods_used: SplitMethod[], time_to_complete: number, has_tax: boolean, has_tip: boolean, has_discount: boolean }

  // Feature usage
  feature_used: { feature_name: string, bill_id: string, context?: Record<string, any> }
  
  // Sharing and export
  share_bill_clicked: { bill_id: string, method: "link" | "copy", people_count: number, items_count: number }
  bill_summary_copied: { bill_id: string, people_count: number, items_count: number, total_amount: number }

  // Error tracking
  error_occurred: { error_type: string, error_message: string, bill_id?: string, context?: Record<string, any> }
}
```

## Component Integration

### Main Integration Points

1. **HomePage (`app/page.tsx`)**
   - App initialization tracking
   - Bill creation tracking
   - Title change tracking
   - Copy summary feature tracking

2. **SplitMethodSelector (`components/SplitMethodSelector.tsx`)**
   - Split method popularity tracking
   - Method change events

3. **ShareBill (`components/ShareBill.tsx`)**
   - Sharing behavior tracking
   - Export feature usage
   - Error tracking for failed operations

4. **TotalsPanel (`components/TotalsPanel.tsx`)**
   - Person removal tracking
   - Cancellation behavior

5. **AddPersonForm (`components/AddPersonForm.tsx`)**
   - Person addition tracking

## Privacy and Data Protection

### Privacy-First Approach
- **Anonymous User IDs:** Generated locally, no personal information
- **Masked Inputs:** Bill titles and sensitive data are masked in session recordings
- **GDPR Compliant:** No personal data collection
- **Local Storage Only:** User preferences stored locally

### Data Masking
```typescript
session_recording: {
  maskAllInputs: true,
  maskTextSelectors: ['.receipt-title'], // Bill titles masked
}
```

## PostHog Dashboard Setup

### Key Insights to Create

#### 1. Split Method Popularity Dashboard
```sql
SELECT 
  new_method as split_method,
  count() as usage_count,
  count(DISTINCT bill_id) as unique_bills
FROM events 
WHERE event = 'split_method_changed' 
  AND timestamp >= now() - interval '30 days'
GROUP BY new_method
ORDER BY usage_count DESC
```

#### 2. User Flow Bottleneck Analysis
```sql
SELECT 
  step,
  avg(time_spent) as avg_time_spent_ms,
  count() as stuck_events,
  avg(people_count) as avg_people_when_stuck
FROM events 
WHERE event = 'user_stuck_detected' 
  AND timestamp >= now() - interval '7 days'
GROUP BY step
ORDER BY stuck_events DESC
```

#### 3. Bill Size Distribution
```sql
SELECT 
  people_count,
  count() as bill_count,
  count() * 100.0 / sum(count()) OVER() as percentage
FROM events 
WHERE event = 'bill_completed' 
  AND timestamp >= now() - interval '30 days'
  AND people_count > 0
GROUP BY people_count
ORDER BY people_count
```

#### 4. Feature Usage Analysis
```sql
SELECT 
  feature_name,
  count() as usage_count,
  count(DISTINCT session_id) as unique_sessions
FROM events 
WHERE event = 'feature_used' 
  AND timestamp >= now() - interval '30 days'
GROUP BY feature_name
ORDER BY usage_count DESC
```

## Usage Examples

### Basic Tracking
```typescript
const analytics = useBillAnalytics()

// Track feature usage
analytics.trackFeatureUsed("new_feature_name")

// Track errors
analytics.trackError("validation_error", "Invalid email format")

// Track bill completion
analytics.trackBillCompleted()
```

### Advanced Tracking
```typescript
// Track split method changes with context
analytics.trackSplitMethodChanged(
  itemId,
  "even",
  "percent", 
  assignedPeopleCount
)

// Track sharing with method
analytics.trackShareBillClicked("copy")
```

## Monitoring and Alerts

### Key Metrics to Monitor
1. **Completion Rate:** Percentage of sessions that result in completed bills
2. **Average Session Duration:** Time users spend in the app
3. **Feature Adoption Rate:** How quickly new features are adopted
4. **Error Rate:** Frequency of errors by type
5. **User Flow Drop-off:** Where users abandon the process

### Recommended Alerts
- Error rate above 5%
- Completion rate below 60%
- New stuck detection patterns
- Unusual drop in feature usage

## Development Guidelines

### Adding New Analytics Events
1. Add event type to `AnalyticsEvents` interface in `lib/analytics.ts`
2. Create tracking method in `AnalyticsManager` class
3. Add convenience method to `useBillAnalytics` hook
4. Integrate tracking calls in components
5. Update PostHog dashboard queries

### Best Practices
- Always include session context
- Use consistent naming conventions
- Track both success and failure cases
- Include relevant bill state context
- Respect user privacy
- Test analytics in development mode

## Analytics ROI

This analytics implementation provides actionable insights to:
- **Optimize User Experience:** Identify and fix user flow bottlenecks
- **Guide Feature Development:** Focus on features users actually want
- **Improve Conversion:** Understand what leads to successful bill completion
- **Reduce Support Load:** Proactively fix common error patterns
- **Make Data-Driven Decisions:** Base product decisions on real user behavior

## Troubleshooting

### Common Issues
1. **Events not appearing:** Check PostHog project configuration and API key
2. **Missing context:** Ensure `useBillAnalytics` is used within `BillProvider`
3. **Development vs Production:** Analytics only active with valid PostHog key
4. **Session tracking:** Verify session IDs are consistent across events

### Debug Mode
Enable debug mode in development:
```typescript
debug: process.env.NODE_ENV === "development"
```

This enables PostHog debug logging in browser console.