"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import { useEffect } from "react"

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      defaults: '2025-05-24',
      capture_exceptions: true, // This enables capturing exceptions using Error Tracking
      debug: process.env.NODE_ENV === "development", // Debug only in development
      disable_session_recording: false, // Ensure session recording works
      capture_pageview: true,
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: true, // Mask sensitive input data
        maskTextSelector: '.receipt-title', // Mask bill titles for privacy
      },
      loaded: (posthog) => {
        // PostHog loaded successfully
      }
    })

    // Generate a unique user ID for analytics (privacy-friendly)
    const getOrCreateUserId = () => {
      let userId = localStorage.getItem('splitsimple_user_id')
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        localStorage.setItem('splitsimple_user_id', userId)
      }
      return userId
    }

    // Identify the user with PostHog
    const userId = getOrCreateUserId()
    posthog.identify(userId, {
      app_version: '1.0.0',
      platform: 'web',
      user_type: 'anonymous',
    })

    // Set user properties for better analytics
    posthog.people.set({
      first_seen: new Date().toISOString(),
      browser: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      {children}
    </PHProvider>
  )
}
