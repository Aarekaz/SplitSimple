# PostHog Analytics Implementation - SplitSimple

## Overview

This document describes the PostHog analytics integration implemented in SplitSimple to track user behavior and answer key business questions about how users interact with the bill splitting features.

## Business Goals

Our PostHog implementation focuses on answering these critical questions:
1. **Which splitting methods are most popular?** (even, shares, percent, exact)
2. **How many people typically split bills together?** (group size analysis)
3. **Which features are being used most?** (feature adoption tracking)
4. **Where do users get stuck in the flow?** (user experience bottlenecks)

## Architecture Overview

### Core Components

#### 1. PostHog Provider (`components/PostHogProvider.tsx`)
- **Purpose:** Initializes PostHog and provides context to the entire app
- **Key Features:**
  - Privacy-friendly user identification (anonymous but persistent)
  - Session recording with sensitive data masking
  - Debug mode for development
  - Reverse proxy setup to avoid ad-blockers

```typescript
// Key configuration
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest", // Reverse proxy to avoid ad blockers
  ui_host: "https://us.posthog.com",
  debug: process.env.NODE_ENV === "development",
  session_recording: {
    maskAllInputs: true,
    maskTextSelectors: ['.receipt-title'], // Mask bill titles for privacy
  }
})
```

#### 2. Analytics Manager (`lib/analytics.ts`)
- **Purpose:** Central analytics coordination and event tracking
- **Key Classes:**
  - `AnalyticsManager`: Core analytics logic
  - `UserFlowTracking`: Session-based user journey tracking
  - `AnalyticsEvents`: Strongly typed event definitions

#### 3. Analytics Hook (`hooks/use-analytics.ts`)
- **Purpose:** React hook for easy component integration
- **Key Functions:**
  - `useBillAnalytics()`: Main hook for tracking bill-related events
  - Context-aware tracking methods
  - Automatic bill state enrichment

### Privacy & Compliance

#### Anonymous User Tracking
```typescript
// Privacy-friendly user ID generation
const getOrCreateUserId = () => {
  let userId = localStorage.getItem('splitsimple_user_id')
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem('splitsimple_user_id', userId)
  }
  return userId
}
```

#### Data Protection
- **No Personal Data:** Only anonymous usage patterns tracked
- **Masked Inputs:** Bill titles and sensitive data masked in recordings
- **GDPR Compliant:** No personally identifiable information collected
- **Local Storage:** User preferences stored locally only

## Event Tracking Schema

### Core Events Tracked

```typescript
interface AnalyticsEvents {
  // Split method popularity tracking
  split_method_changed: {
    bill_id: string
    item_id: string
    old_method: "even" | "shares" | "percent" | "exact"
    new_method: "even" | "shares" | "percent" | "exact"
    people_count: number
    assigned_people_count: number
  }

  // Bill completion tracking
  bill_completed: {
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

  // Feature usage tracking
  feature_used: {
    feature_name: string
    bill_id: string
    context?: Record<string, any>
  }
}
```

## Component Integration

### 1. SplitMethodSelector (`components/SplitMethodSelector.tsx`)
**Tracks:** Split method popularity and changes

```typescript
const handleMethodChange = (newMethod: SplitMethod) => {
  const oldMethod = value
  onValueChange(newMethod)
  
  // Track split method changes for popularity analytics
  if (itemId && newMethod !== oldMethod) {
    analytics.trackSplitMethodChanged(itemId, oldMethod, newMethod, assignedPeopleCount)
  }
  
  // Track feature usage
  analytics.trackFeatureUsed("split_method_selector", {
    old_method: oldMethod,
    new_method: newMethod,
    people_count: peopleCount,
    assigned_people_count: assignedPeopleCount,
  })
}
```

### 2. Main App Page (`app/page.tsx`)
**Tracks:** App initialization, bill creation, feature usage

```typescript
const analytics = useBillAnalytics()

// Track bill creation
const handleNewBill = () => {
  dispatch({ type: "NEW_BILL" })
  analytics.trackBillCreated()
  analytics.trackFeatureUsed("new_bill")
}

// Track feature usage
const handleCopySummary = async () => {
  // ... copy logic
  if (success) {
    analytics.trackBillSummaryCopied()
    analytics.trackFeatureUsed("copy_summary")
  } else {
    analytics.trackError("copy_summary_failed", "Clipboard API failed")
  }
}
```

### 3. Person Management (`components/AddPersonForm.tsx`, `components/TotalsPanel.tsx`)
**Tracks:** Person addition and removal patterns

```typescript
// Adding people
const handleAddPerson = () => {
  if (newPersonName.trim()) {
    dispatch({ type: "ADD_PERSON", payload: { name: newPersonName.trim(), color: "" } })
    analytics.trackPersonAdded("manual") // Track for group size analysis
  }
}

// Removing people
const handleRemovePerson = (personId: string) => {
  const hasItems = itemBreakdowns.some(breakdown => breakdown.splits[personId] > 0)
  dispatch({ type: "REMOVE_PERSON", payload: personId })
  analytics.trackPersonRemoved(hasItems)
}
```

## PostHog Dashboard Setup

### Currently Implemented Insights

#### 1. Split Method Popularity - Last 30 Days
**Purpose:** Shows which splitting methods users prefer  
**Chart Type:** Bar Chart  
**SQL Query:**
```sql
SELECT 
  properties.new_method as split_method,
  count() as usage_count,
  uniq(properties.bill_id) as unique_bills
FROM events 
WHERE event = 'split_method_changed' 
  AND timestamp >= now() - interval 30 day
GROUP BY properties.new_method
ORDER BY usage_count DESC
```

**Expected Output:**
- `even`: 156 usage_count, 45 unique_bills
- `percent`: 89 usage_count, 28 unique_bills
- `exact`: 34 usage_count, 12 unique_bills
- `shares`: 12 usage_count, 4 unique_bills

#### 2. Bill Completion Metrics - Last 30 Days
**Purpose:** Key business metrics about successful bill completions  
**Chart Type:** Table  
**SQL Query:**
```sql
SELECT 
  count() as total_bills,
  round(avg(properties.people_count), 1) as avg_people_per_bill,
  round(avg(properties.items_count), 1) as avg_items_per_bill,
  round(avg(properties.total_amount), 2) as avg_bill_amount,
  round(avg(properties.time_to_complete) / 1000 / 60, 1) as avg_completion_minutes,
  round(countIf(properties.has_tax = true) * 100.0 / count(), 1) as tax_usage_percent,
  round(countIf(properties.has_tip = true) * 100.0 / count(), 1) as tip_usage_percent,
  round(countIf(properties.has_discount = true) * 100.0 / count(), 1) as discount_usage_percent
FROM events 
WHERE event = 'bill_completed' 
  AND timestamp >= now() - interval 30 day
```

**Business Insights:**
- Average group size (helps with UI optimization)
- Bill complexity (items per bill)
- User efficiency (completion time)
- Feature adoption rates (tax, tip, discount usage)

#### 3. Most Used Features - Last 30 Days
**Purpose:** Feature adoption and usage patterns  
**Chart Type:** Table  
**SQL Query:**
```sql
SELECT 
  properties.feature_name as feature_name,
  count() as usage_count,
  uniq(properties.session_id) as unique_sessions,
  uniq(properties.bill_id) as unique_bills
FROM events 
WHERE event = 'feature_used' 
  AND timestamp >= now() - interval 30 day
  AND properties.feature_name IS NOT NULL
GROUP BY properties.feature_name
ORDER BY usage_count DESC
LIMIT 20
```

**Expected Features Tracked:**
- `split_method_selector`: Users changing split methods
- `new_bill`: Creating new bills
- `copy_summary`: Copying bill summaries
- `share_bill_copy_link`: Sharing functionality
- `copy_breakdown`: Advanced export features

## Environment Setup

### Required Environment Variables
```bash
# .env.local
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Next.js Configuration (`next.config.mjs`)
```javascript
// Reverse proxy configuration to avoid ad blockers
async rewrites() {
  return [
    {
      source: "/ingest/static/:path*",
      destination: "https://us-assets.i.posthog.com/static/:path*",
    },
    {
      source: "/ingest/:path*",
      destination: "https://us.i.posthog.com/:path*",
    },
  ];
}
```

## Development & Testing

### Debug Mode
During development, PostHog runs in debug mode with console logging:

```typescript
debug: process.env.NODE_ENV === "development"
```

### Event Verification
Check browser console for PostHog debug messages:
```
[PostHog.js] send "split_method_changed" {event details}
[PostHog.js] send "feature_used" {event details}
```

### Testing Flow
1. **Local Development:** Events work on localhost with reverse proxy
2. **Console Monitoring:** Debug logs show successful event transmission
3. **PostHog Dashboard:** Events appear in real-time Activity feed
4. **Insight Population:** Charts update as data accumulates

## Key Insights & Business Value

### What We're Learning

#### Split Method Preferences
- **Even split** is most popular (expected for casual dining)
- **Percentage splits** common for business meals
- **Exact amounts** used for complex shared purchases
- **Shares** least popular (may need UI improvements)

#### User Behavior Patterns
- Average group size helps optimize UI for typical use cases
- Completion time shows user experience efficiency
- Feature usage guides development priorities
- Error tracking prevents user frustration

#### Product Decisions Enabled
- **UI Optimization:** Focus on most-used split methods
- **Feature Development:** Invest in popular features
- **User Experience:** Reduce friction in completion flow
- **Business Model:** Understand user value and engagement

## Future Enhancements

### Additional Insights to Add
- User flow bottleneck analysis
- Error tracking and analysis
- Session engagement metrics
- Split method trends over time

### Advanced Features
- A/B testing for UI improvements
- Cohort analysis for user retention
- Conversion funnel optimization
- Real-time alerting for issues

## Troubleshooting

### Common Issues
1. **Events not showing:** Check PostHog project key and network requests to `/ingest`
2. **Missing data:** Verify event tracking is integrated in components
3. **Development testing:** Use debug mode and browser console
4. **Query errors:** Ensure property names match event schema

### Debug Checklist
- [ ] PostHog key configured in environment
- [ ] Console shows "PostHog loaded successfully"
- [ ] Network tab shows requests to `/ingest` endpoint
- [ ] Events appear in PostHog Activity feed
- [ ] Insights populate with interaction data

This implementation provides comprehensive visibility into user behavior while maintaining privacy and enabling data-driven product decisions.