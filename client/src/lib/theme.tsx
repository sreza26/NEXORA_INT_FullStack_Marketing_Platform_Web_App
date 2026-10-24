import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  toggle(): void
  setMode(mode: ThemeMode): void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem('nexora_theme')
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored as ThemeMode
    } catch {
      // ignore storage errors
    }
    return 'system'
  })

  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(mode))

  useEffect(() => {
    function apply(res: 'light' | 'dark') {
      setResolved(res)
      const html = document.documentElement
      if (res === 'dark') {
        html.classList.add('dark')
        html.setAttribute('data-theme', 'dark')
      } else {
        html.classList.remove('dark')
        html.setAttribute('data-theme', 'light')
      }
      // Also set CSS variable for immediate effect
      html.style.colorScheme = res
    }

    apply(resolveTheme(mode))

    function onSystemChange() {
      if (mode === 'system') apply(resolveTheme('system'))
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', onSystemChange)
    return () => mq.removeEventListener('change', onSystemChange)
  }, [mode])

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolved,
      toggle() {
        setMode((prev) => {
          const next = prev === 'dark' ? 'light' : 'dark'
          try {
            localStorage.setItem('nexora_theme', next)
          } catch {
            // ignore storage errors
          }
          return next
        })
      },
      setMode(newMode: ThemeMode) {
        setMode(newMode)
        try {
          localStorage.setItem('nexora_theme', newMode)
        } catch {
          // ignore storage errors
        }
      },
    }),
    [mode, resolved],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
