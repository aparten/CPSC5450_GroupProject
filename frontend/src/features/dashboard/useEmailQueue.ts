import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchMessageDetail, fetchMessages } from '@/lib/api'
import { fromMessageDetail, fromEmailEvent } from './adapters'
import type { QueueItem } from './types'

const POLL_MS = 10_000
const FAST_POLL_MS = 2_000

export function useEmailQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [hasPending, setHasPending] = useState(false)

  const load = useCallback(async () => {
    try {
      const events = await fetchMessages()
      const hasPending = events.some((e) => e.status === 'queued' || e.status === 'processing')
      setHasPending(hasPending)

      const items = await Promise.all(
        events.map(async (event) => {
          if (event.status === 'done') {
            try {
              const detail = await fetchMessageDetail(event.event_id)
              const item = fromMessageDetail(detail)
              if (item) return item
            } catch {
              // Fall through to placeholder if detail fetch fails
            }
          }
          return fromEmailEvent(event)
        }),
      )

      setQueue((prev) => {
        const decisionMap = new Map<string, QueueItem['ui']['status']>()
        for (const old of prev) {
          if (old.ui.status !== 'needs review') {
            decisionMap.set(old.event_id, old.ui.status)
          }
        }

        return items.map((item) => {
          const prevStatus = decisionMap.get(item.event_id)
          if (prevStatus) {
            return { ...item, ui: { ...item.ui, status: prevStatus } }
          }
          return item
        })
      })

      setError(null)
      timeoutRef.current = setTimeout(load, hasPending ? FAST_POLL_MS : POLL_MS)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email queue')
      timeoutRef.current = setTimeout(load, POLL_MS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [load])

  return { queue, setQueue, loading, error, hasPending, refresh: load }
}
