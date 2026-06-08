"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVisualTheme } from "@/components/VisualThemeProvider"

export function ThemeToggle() {
  const { theme, toggleTheme } = useVisualTheme()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="border-border bg-card/80 text-foreground hover:bg-muted"
      aria-label={`Tema atual: ${theme === "dark" ? "Dark" : "Clean"}`}
    >
      {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span>{theme === "dark" ? "Dark" : "Clean"}</span>
    </Button>
  )
}
