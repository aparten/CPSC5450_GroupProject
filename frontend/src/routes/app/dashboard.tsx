import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/lib/auth'
import { useMemo, useState } from 'react'
import { Box, Container, Grid, Stack, Tabs } from '@mantine/core'
import { DashboardHeader } from '@/features/dashboard/DashboardHeader'
import { QueuePanel } from '@/features/dashboard/QueuePanel'
import { CaseDetailPanel } from '@/features/dashboard/CaseDetailPanel'
import { mockQueue } from '@/features/dashboard/mockQueue'
import type { DecisionEntry, QueueItem, QueueStatus } from '@/features/dashboard/types'

export const Route = createFileRoute('/app/dashboard')({
  beforeLoad: async () => {
    await requireAuth()
  },
  component: RouteComponent,
})

function RouteComponent() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | QueueStatus>('all')
  const [selectedId, setSelectedId] = useState<string>(mockQueue[0]?.event_id ?? '')
  const [note, setNote] = useState('')
  const [mobileTab, setMobileTab] = useState<string>('queue')
  const [queue, setQueue] = useState<QueueItem[]>(mockQueue)
  const [historyByCase, setHistoryByCase] = useState<Record<string, DecisionEntry[]>>({})

  const filteredQueue = useMemo(() => {
    const q = query.trim().toLowerCase()
    return queue.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.ui.status === statusFilter
      const matchesQuery =
        q.length === 0 ||
        (item.parsed.headers.from_address ?? '').toLowerCase().includes(q) ||
        (item.parsed.headers.subject ?? '').toLowerCase().includes(q) ||
        item.event_id.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [query, queue, statusFilter])

  const selectedItem =
    filteredQueue.find((item) => item.event_id === selectedId) ?? filteredQueue[0] ?? null

  const applyDecision = (status: QueueStatus) => {
    if (!selectedItem) return
    const trimmedNote = note.trim()
    if (!trimmedNote) return

    setQueue((prev) =>
      prev.map((item) =>
        item.event_id === selectedItem.event_id
          ? { ...item, ui: { ...item.ui, status } }
          : item,
      ),
    )
    setHistoryByCase((prev) => ({
      ...prev,
      [selectedItem.event_id]: [
        ...(prev[selectedItem.event_id] ?? []),
        {
          id: `${selectedItem.event_id}-${Date.now()}`,
          status,
          note: trimmedNote,
          at: new Date().toLocaleString(),
        },
      ],
    }))
    setNote('')
  }

  const resetFilters = () => {
    setQuery('')
    setStatusFilter('all')
  }

  return (
    <ClientOnly
      fallback={
        <Container size="xl" py="xl">
          <Stack gap="lg">
            <DashboardHeader queue={[]} />
          </Stack>
        </Container>
      }
    >
      <Container size="xl" py="xl">
        <Stack gap="lg">
          <DashboardHeader queue={filteredQueue} />

          <Box hiddenFrom="md">
            <Tabs value={mobileTab} onChange={(value) => setMobileTab(value ?? 'queue')}>
              <Tabs.List grow>
                <Tabs.Tab value="queue">Queue</Tabs.Tab>
                <Tabs.Tab value="case">Selected Case</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="queue" pt="md">
                <QueuePanel
                  query={query}
                  onQueryChange={setQuery}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  queue={filteredQueue}
                  selectedId={selectedItem?.event_id ?? ''}
                  onSelect={(id) => {
                    setSelectedId(id)
                    setMobileTab('case')
                  }}
                  onResetFilters={resetFilters}
                />
              </Tabs.Panel>

              <Tabs.Panel value="case" pt="md">
                <CaseDetailPanel
                  selectedItem={selectedItem}
                  note={note}
                  onNoteChange={setNote}
                  onDecision={applyDecision}
                  history={selectedItem ? historyByCase[selectedItem.event_id] ?? [] : []}
                />
              </Tabs.Panel>
            </Tabs>
          </Box>

          <Grid gutter="lg" visibleFrom="md">
            <Grid.Col span={{ md: 7, lg: 8 }}>
              <QueuePanel
                query={query}
                onQueryChange={setQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                queue={filteredQueue}
                selectedId={selectedItem?.event_id ?? ''}
                onSelect={setSelectedId}
                onResetFilters={resetFilters}
              />
            </Grid.Col>

            <Grid.Col span={{ md: 5, lg: 4 }}>
              <Box style={{ position: 'sticky', top: 16 }}>
                <CaseDetailPanel
                  selectedItem={selectedItem}
                  note={note}
                  onNoteChange={setNote}
                  onDecision={applyDecision}
                  history={selectedItem ? historyByCase[selectedItem.event_id] ?? [] : []}
                />
              </Box>
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>
    </ClientOnly>
  )
}
