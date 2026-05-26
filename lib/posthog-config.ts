export function getPostHogKey(): string | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    ?.replace(/\\n/g, "")
    .trim()
  return key ? key : null
}

export function isPostHogConfigured(): boolean {
  return getPostHogKey() !== null
}
