import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

export function useThrottledText(text: string, streaming: boolean, interval = 50): string {
  const [display, setDisplay] = useState(text)
  const lastRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  useEffect(() => {
    if (!streaming) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setDisplay(text)
      lastRef.current = performance.now()
      return
    }
    const now = performance.now()
    if (now - lastRef.current >= interval) {
      lastRef.current = now
      setDisplay(text)
    } else {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        lastRef.current = performance.now()
        setDisplay(text)
      }, interval)
    }
  }, [text, streaming, interval])
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])
  return display
}

export function useAutoScroll(dep: unknown, threshold = 120): [RefObject<HTMLDivElement>, () => void] {
  const ref = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = (): void => {
      nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [threshold])
  const scrollToBottom = (): void => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
  }
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (nearBottom.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
    }
  }, [dep])
  return [ref, scrollToBottom]
}
