import { getPostHogKey, isPostHogConfigured } from "@/lib/posthog-config"

describe("posthog config", () => {
  const original = process.env.NEXT_PUBLIC_POSTHOG_KEY

  afterEach(() => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = original
  })

  it("trims surrounding whitespace from the key", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "  phc_test_key  \n"

    expect(getPostHogKey()).toBe("phc_test_key")
    expect(isPostHogConfigured()).toBe(true)
  })

  it("removes literal newline escape sequences from the key", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key\\n"

    expect(getPostHogKey()).toBe("phc_test_key")
    expect(isPostHogConfigured()).toBe(true)
  })

  it("treats blank values as missing", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "   "

    expect(getPostHogKey()).toBeNull()
    expect(isPostHogConfigured()).toBe(false)
  })
})
