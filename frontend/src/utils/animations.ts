import type { Variants } from 'framer-motion'

export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
}

export function staggerContainer(stagger = 0.06): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger } },
  }
}
