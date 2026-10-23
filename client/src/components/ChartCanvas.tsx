import { useEffect, useRef } from 'react'
import Chart, { type ChartConfiguration } from 'chart.js/auto'

export default function ChartCanvas({ config }: { config: ChartConfiguration }) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const chart = new Chart(canvas, config)
    return () => chart.destroy()
  }, [config])

  return <canvas ref={ref} data-nexora-chart data-config={JSON.stringify(config)} />
}
