"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

type VisualTheme = "dark" | "clean"

interface VisualThemeContextValue {
  theme: VisualTheme
  setTheme: (theme: VisualTheme) => void
  toggleTheme: () => void
}

const VisualThemeContext = createContext<VisualThemeContextValue | null>(null)

export function VisualThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<VisualTheme>("dark")

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("colabsocial-theme")

    if (storedTheme === "dark" || storedTheme === "clean") {
      setThemeState(storedTheme)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem("colabsocial-theme", theme)
  }, [theme])

  const value = useMemo<VisualThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((currentTheme) => (currentTheme === "dark" ? "clean" : "dark")),
    }),
    [theme],
  )

  return (
    <VisualThemeContext.Provider value={value}>
      {children}
    </VisualThemeContext.Provider>
  )
}

export function useVisualTheme() {
  const context = useContext(VisualThemeContext)

  if (!context) {
    throw new Error("useVisualTheme must be used inside VisualThemeProvider")
  }

  return context
}
