"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      duration={3000}
      closeButton
      toastOptions={{
        classNames: {
          toast: "rounded-xl shadow-lg border-2 p-3 gap-2",
          title: "text-sm font-semibold",
          description: "text-xs",
          closeButton: "border-0 bg-transparent hover:bg-muted/50 rounded-lg",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
