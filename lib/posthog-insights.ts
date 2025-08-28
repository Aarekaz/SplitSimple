/**
 * PostHog Custom Insights and Metrics for SplitSimple
 * 
 * This file defines the analytics insights that answer your key business questions:
 * 1. Which splitting methods are most popular
 * 2. If users get stuck at particular steps
 * 3. How many people they typically split bills with
 * 4. Whether new features are actually being used
 */

export const POSTHOG_INSIGHTS = {
  // 1. SPLITTING METHOD POPULARITY
  splitMethodPopularity: {
    name: "Split Method Popularity",
    description: "Shows which splitting methods are most popular among users",
    query: `
      SELECT 
        new_method as split_method,
        count() as usage_count,
        count(DISTINCT bill_id) as unique_bills
      FROM events 
      WHERE event = 'split_method_changed' 
        AND timestamp >= now() - interval '30 days'
      GROUP BY new_method
      ORDER BY usage_count DESC
    `,
    visualization: "bar_chart"
  },

  splitMethodTrends: {
    name: "Split Method Usage Trends",
    description: "Shows how splitting method preferences change over time",
    query: `
      SELECT 
        toDate(timestamp) as date,
        new_method as split_method,
        count() as daily_usage
      FROM events 
      WHERE event = 'split_method_changed' 
        AND timestamp >= now() - interval '90 days'
      GROUP BY date, split_method
      ORDER BY date DESC
    `,
    visualization: "line_chart"
  },

  // 2. USER FLOW AND BOTTLENECKS
  userFlowBottlenecks: {
    name: "User Flow Bottlenecks",
    description: "Identifies where users get stuck in the bill creation process",
    query: `
      SELECT 
        step,
        avg(time_spent) as avg_time_spent_ms,
        count() as stuck_events,
        avg(people_count) as avg_people_when_stuck,
        avg(items_count) as avg_items_when_stuck
      FROM events 
      WHERE event = 'user_stuck_detected' 
        AND timestamp >= now() - interval '7 days'
      GROUP BY step
      ORDER BY stuck_events DESC
    `,
    visualization: "table"
  },

  sessionCompletionFunnel: {
    name: "Bill Creation Completion Funnel",
    description: "Shows drop-off rates at each stage of bill creation",
    query: `
      WITH funnel_steps AS (
        SELECT 
          session_id,
          max(CASE WHEN event = 'app_initialized' THEN 1 ELSE 0 END) as step_1_initialized,
          max(CASE WHEN event = 'person_added' THEN 1 ELSE 0 END) as step_2_added_people,
          max(CASE WHEN event = 'item_added' THEN 1 ELSE 0 END) as step_3_added_items,
          max(CASE WHEN event = 'bill_completed' THEN 1 ELSE 0 END) as step_4_completed
        FROM events 
        WHERE timestamp >= now() - interval '7 days'
        GROUP BY session_id
      )
      SELECT 
        'App Initialized' as step, sum(step_1_initialized) as users,
        'Added People' as step, sum(step_2_added_people) as users,
        'Added Items' as step, sum(step_3_added_items) as users,
        'Bill Completed' as step, sum(step_4_completed) as users
      FROM funnel_steps
    `,
    visualization: "funnel"
  },

  // 3. BILL PARTICIPANT COUNT ANALYTICS
  averageBillSize: {
    name: "Average Number of People per Bill",
    description: "Shows typical bill splitting group sizes",
    query: `
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
    `,
    visualization: "bar_chart"
  },

  billSizeOverTime: {
    name: "Bill Size Trends Over Time",
    description: "How average group sizes change over time",
    query: `
      SELECT 
        toDate(timestamp) as date,
        avg(people_count) as avg_people_count,
        count() as bills_completed
      FROM events 
      WHERE event = 'bill_completed' 
        AND timestamp >= now() - interval '90 days'
        AND people_count > 0
      GROUP BY date
      ORDER BY date DESC
    `,
    visualization: "line_chart"
  },

  // 4. FEATURE USAGE ANALYTICS
  featureUsageRanking: {
    name: "Most Used Features",
    description: "Shows which features are being used most frequently",
    query: `
      SELECT 
        feature_name,
        count() as usage_count,
        count(DISTINCT session_id) as unique_sessions,
        count(DISTINCT bill_id) as unique_bills
      FROM events 
      WHERE event = 'feature_used' 
        AND timestamp >= now() - interval '30 days'
      GROUP BY feature_name
      ORDER BY usage_count DESC
    `,
    visualization: "table"
  },

  newFeatureAdoption: {
    name: "New Feature Adoption Rate",
    description: "Tracks adoption of recently launched features",
    query: `
      SELECT 
        feature_name,
        toDate(timestamp) as date,
        count() as daily_usage,
        count(DISTINCT session_id) as unique_users
      FROM events 
      WHERE event = 'feature_used' 
        AND timestamp >= now() - interval '30 days'
        AND feature_name IN ('share_bill_copy_link', 'copy_breakdown', 'export_csv', 'split_method_selector')
      GROUP BY feature_name, date
      ORDER BY date DESC, feature_name
    `,
    visualization: "line_chart"
  },

  // 5. BUSINESS IMPACT METRICS
  billCompletionMetrics: {
    name: "Bill Completion Analytics",
    description: "Key metrics about completed bills",
    query: `
      SELECT 
        count() as total_bills,
        avg(people_count) as avg_people_per_bill,
        avg(items_count) as avg_items_per_bill,
        avg(total_amount) as avg_bill_amount,
        avg(time_to_complete / 1000 / 60) as avg_completion_time_minutes,
        sum(CASE WHEN has_tax THEN 1 ELSE 0 END) * 100.0 / count() as tax_usage_percent,
        sum(CASE WHEN has_tip THEN 1 ELSE 0 END) * 100.0 / count() as tip_usage_percent,
        sum(CASE WHEN has_discount THEN 1 ELSE 0 END) * 100.0 / count() as discount_usage_percent
      FROM events 
      WHERE event = 'bill_completed' 
        AND timestamp >= now() - interval '30 days'
    `,
    visualization: "number"
  },

  sharingAndExportUsage: {
    name: "Sharing & Export Feature Usage",
    description: "How often users share bills and export data",
    query: `
      SELECT 
        event,
        count() as usage_count,
        avg(people_count) as avg_people_when_shared,
        avg(items_count) as avg_items_when_shared
      FROM events 
      WHERE event IN ('share_bill_clicked', 'bill_summary_copied') 
        AND timestamp >= now() - interval '30 days'
      GROUP BY event
      ORDER BY usage_count DESC
    `,
    visualization: "table"
  },

  // 6. ERROR AND PERFORMANCE TRACKING
  errorAnalysis: {
    name: "Error Analysis",
    description: "Most common errors and their frequency",
    query: `
      SELECT 
        error_type,
        error_message,
        count() as error_count,
        count(DISTINCT session_id) as affected_sessions
      FROM events 
      WHERE event = 'error_occurred' 
        AND timestamp >= now() - interval '7 days'
      GROUP BY error_type, error_message
      ORDER BY error_count DESC
    `,
    visualization: "table"
  },

  // 7. USER ENGAGEMENT METRICS
  sessionEngagement: {
    name: "User Engagement Metrics",
    description: "How engaged users are with the application",
    query: `
      WITH session_metrics AS (
        SELECT 
          session_id,
          min(timestamp) as session_start,
          max(timestamp) as session_end,
          count(DISTINCT event) as unique_events,
          count() as total_events,
          max(CASE WHEN event = 'bill_completed' THEN 1 ELSE 0 END) as completed_bill
        FROM events 
        WHERE timestamp >= now() - interval '7 days'
        GROUP BY session_id
      )
      SELECT 
        avg(dateDiff('minute', session_start, session_end)) as avg_session_duration_minutes,
        avg(total_events) as avg_events_per_session,
        sum(completed_bill) * 100.0 / count() as completion_rate_percent,
        count() as total_sessions
      FROM session_metrics
    `,
    visualization: "number"
  }
} as const

/**
 * Custom PostHog Properties for Better Analytics
 */
export const CUSTOM_POSTHOG_PROPERTIES = {
  // User properties
  user_type: "anonymous", // Could be extended for registered users
  app_version: "1.0.0",
  platform: "web",
  
  // Session properties  
  is_mobile: "boolean",
  browser: "string",
  screen_resolution: "string",
  
  // Bill properties
  bill_complexity_score: "number", // Based on items, people, split methods
  has_complex_splits: "boolean", // Uses custom amounts/percentages
  uses_advanced_features: "boolean", // Tax, tip, discount
  
  // Feature flags (for A/B testing)
  feature_new_ui: "boolean",
  feature_bulk_import: "boolean",
  feature_receipt_scanning: "boolean"
} as const

/**
 * Event Properties Schema for Type Safety
 */
export type PostHogEventProperties = {
  // Common properties added to all events
  session_id: string
  timestamp: number
  bill_id?: string
  
  // Feature-specific properties
  people_count?: number
  items_count?: number
  total_amount?: number
  split_method?: string
  feature_name?: string
  error_type?: string
  error_message?: string
}