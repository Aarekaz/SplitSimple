"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    if (stored) {
      setThemeState(stored)
    } else if (prefersDark) {
      setThemeState("dark")
    }

    setMounted(true)
  }, [])

  // Update theme class on html element
  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)

    // Persist to localStorage
    localStorage.setItem("theme", theme)
  }, [theme, mounted])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {mounted ? children : <div className="invisible">{children}</div>}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

