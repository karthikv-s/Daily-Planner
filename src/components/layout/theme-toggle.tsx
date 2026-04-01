"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground transition-colors w-full text-left">
        <div className="w-5 h-5 rounded-full bg-muted animate-pulse" />
        <span>Theme</span>
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors w-full text-left relative"
    >
      <div className="relative w-5 h-5">
        <Sun className="absolute h-5 w-5 transition-all dark:-rotate-90 dark:opacity-0" />
        <Moon className="absolute h-5 w-5 rotate-90 opacity-0 transition-all dark:rotate-0 dark:opacity-100" />
      </div>
      <span>Toggle Theme</span>
    </button>
  )
}
