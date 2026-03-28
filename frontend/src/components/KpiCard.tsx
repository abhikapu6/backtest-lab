import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'

interface KpiCardProps {
  label: string
  value: string
  rawValue?: number
  formatter?: (n: number) => string
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  style?: CSSProperties
  index?: number
}

const trendClass: Record<string, string> = {
  up: 'kpi-card__value--up',
  down: 'kpi-card__value--down',
  neutral: 'kpi-card__value--neutral',
}

function useCountUp(target: number, duration = 900): number {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(target * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return current
}

function AnimatedValue({ rawValue, formatter, trend }: {
  rawValue: number
  formatter: (n: number) => string
  trend: string
}) {
  const animated = useCountUp(rawValue)
  return (
    <span className={`kpi-card__value ${trendClass[trend]}`}>
      {formatter(animated)}
    </span>
  )
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 360, damping: 28, delay: i * 0.055 },
  }),
}

export function KpiCard({ label, value, rawValue, formatter, subValue, trend = 'neutral', style, index = 0 }: KpiCardProps) {
  return (
    <motion.div
      className="kpi-card"
      style={style}
      variants={cardVariants}
      custom={index}
      initial="hidden"
      animate="show"
    >
      <span className="kpi-card__label">{label}</span>
      {rawValue !== undefined && formatter ? (
        <AnimatedValue rawValue={rawValue} formatter={formatter} trend={trend} />
      ) : (
        <span className={`kpi-card__value ${trendClass[trend]}`}>{value}</span>
      )}
      {subValue && <span className="kpi-card__sub">{subValue}</span>}
    </motion.div>
  )
}
