import { useEffect } from 'react'

const SEPARATOR = '\u2014'

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} ${SEPARATOR} NEXORA` : `NEXORA ${SEPARATOR} Marketing & Network Management Platform`
  }, [title])
}
