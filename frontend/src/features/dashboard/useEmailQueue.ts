import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchMessageDetail, fetchMessages } from '@/lib/api'
import { fromMessageDetail, fromEmailEvent } from './adapters'
import type { QueueItem } from './types'

const POLL_INTERVAL_MS = 10_000

export function useEmailQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const events = await fetchMessages()

      // For each event that finished processing, fetch its parsed detail
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
        // Preserve any analyst decisions (status overrides) from the previous state
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [load])

  return { queue, setQueue, loading, error, refresh: load }
}
