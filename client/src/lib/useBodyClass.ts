import { useEffect } from 'react'

/**
 * Applies a class list to `<body>` for as long as the component is mounted.
 *
 * The Laravel reference renders a different body class per layout:
 *
 *   layouts/app.blade.php   -> "flex min-h-screen flex-col"
 *   layouts/guest.blade.php -> "hero-grid min-h-screen bg-surface"
 *   layouts/member.blade.php-> "bg-surface"
 *   layouts/admin.blade.php -> "bg-surface"
 *
 * The React app only has one document, so each layout claims the body class
 * while it is on screen and hands it back on unmount.
 */
export function useBodyClass(className: string): void {
  useEffect(() => {
    const previous = document.body.className
    document.body.className = className
    return () => {
      // Only hand the body back if nobody else has claimed it already.
      if (document.body.className === className) {
        document.body.className = previous
      }
    }
  }, [className])
}
