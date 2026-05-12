'use client'

import { useEffect, useState } from 'react'

interface NeuralMatchScoreProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export default function NeuralMatchScore({ score, size = 'md', label }: NeuralMatchScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const targetScore = Math.min(Math.max(score, 0), 100)

  useEffect(() => {
    let frame: number
    const start = performance.now()
    const duration = 1000

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(targetScore * eased))
      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      }
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [targetScore])

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-16 h-16 text-base',
    lg: 'w-24 h-24 text-2xl',
  }

  const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : 6
  const circumference = 2 * Math.PI * 36
  const offset = circumference - (animatedScore / 100) * circumference

  const getColor = (val: number) => {
    if (val >= 80) return '#10B981'
    if (val >= 60) return '#6366F1'
    if (val >= 40) return '#F59E0B'
    return '#EF4444'
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={sizeClasses[size].split(' ')[1] === 'w-10' ? 40 : size === 'md' ? 64 : 96}
        height={sizeClasses[size].split(' ')[1] === 'w-10' ? 40 : size === 'md' ? 64 : 96}
        viewBox="0 0 80 80"
        className="transform -rotate-90"
      >
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="rgba(99, 102, 241, 0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke={getColor(animatedScore)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300"
        />
        <text
          x="40"
          y="40"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-current text-[var(--text-primary)] font-semibold"
          style={{ fontSize: 18, transform: 'rotate(90deg)', transformOrigin: '40px 40px' }}
        >
          {animatedScore}%
        </text>
      </svg>
      {label && (
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
      )}
    </div>
  )
}
