import { useEffect } from 'react'

const TAGLINE = 'Marketing & Network Management Platform'
const SEPARATOR = '\u2014'

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} ${SEPARATOR} ${TAGLINE}` : `NEXORA ${SEPARATOR} ${TAGLINE}`
  }, [title])
}
