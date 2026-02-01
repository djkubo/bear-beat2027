'use client'

import { useEffect } from 'react'
import { trackPageView } from '@/lib/tracking'

interface PageViewTrackerProps {
  pageName: string
}

export function PageViewTracker({ pageName }: PageViewTrackerProps) {
  useEffect(() => {
    trackPageView(pageName)
  }, [pageName])
  
  return null
}
