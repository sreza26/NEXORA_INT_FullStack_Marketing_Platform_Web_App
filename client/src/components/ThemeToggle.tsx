import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../lib/theme'

export function ThemeToggle() {
  const { resolved, toggle } = useTheme()
  return (
    <button
      type="button"
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 text-navy-700 shadow-sm transition-all hover:bg-white outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:bg-navy-800 dark:text-slate-300 dark:hover:bg-navy-700"
      aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}
      onClick={toggle}
    >
      {resolved === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}