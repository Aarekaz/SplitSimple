"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="relative h-9 w-9 rounded-lg border border-border bg-surface-2 transition-all-moderate hover:bg-surface-3 hover:border-border-strong"
          >
            {/* Sun icon for light mode */}
            <Sun
              className={`h-4 w-4 absolute transition-all-moderate ${
                theme === "light"
                  ? "rotate-0 scale-100 opacity-100"
                  : "rotate-90 scale-0 opacity-0"
              }`}
            />
            {/* Moon icon for dark mode */}
            <Moon
              className={`h-4 w-4 absolute transition-all-moderate ${
                theme === "dark"
                  ? "rotate-0 scale-100 opacity-100"
                  : "-rotate-90 scale-0 opacity-0"
              }`}
            />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Switch to {theme === "light" ? "dark" : "light"} mode</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

