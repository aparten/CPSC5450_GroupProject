import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { requireAuth, ingestInbox } from '@/lib/auth'
import { useMemo, useState } from 'react'
import { Alert, Box, Center, Container, Grid, Loader, Stack, Tabs } from '@mantine/core'
import { DashboardHeader } from '@/features/dashboard/DashboardHeader'
import { QueuePanel } from '@/features/dashboard/QueuePanel'
import { CaseDetailPanel } from '@/features/dashboard/CaseDetailPanel'
import { useEmailQueue } from '@/features/dashboard/useEmailQueue'
import type { DecisionEntry, QueueStatus } from '@/features/dashboard/types'

export const Route = createFileRoute('/app/dashboard')({
  beforeLoad: async () => {
    await requireAuth()
  },
  component: RouteComponent,
})

function RouteComponent() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | QueueStatus>('all')
  const [selectedId, setSelectedId] = useState<string>('')
  const [note, setNote] = useState('')
  const [mobileTab, setMobileTab] = useState<string>('queue')
  const [historyByCase, setHistoryByCase] = useState<Record<string, DecisionEntry[]>>({})
  const [isProcessing, setIsProcessing] = useState(false)

  const { queue, setQueue, loading, error, hasPending, refresh } = useEmailQueue()

  const queueIsProcessing = isProcessing || hasPending

  const handleProcessEmails = async () => {
    setIsProcessing(true)
    try {
      await ingestInbox()
      refresh()
    } finally {
      setIsProcessing(false)
    }
  }

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

  // Auto-select first item if nothing is selected or selection is no longer in the list
  const effectiveSelectedId =
    filteredQueue.find((item) => item.event_id === selectedId)
      ? selectedId
      : (filteredQueue[0]?.event_id ?? '')

  const selectedItem =
    filteredQueue.find((item) => item.event_id === effectiveSelectedId) ?? null

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
            <DashboardHeader queue={[]} onProcessEmails={() => {}} isProcessing={false} />
          </Stack>
        </Container>
      }
    >
      <Container size="xl" py="xl">
        <Stack gap="lg">
          <DashboardHeader
            queue={filteredQueue}
            onProcessEmails={handleProcessEmails}
            isProcessing={isProcessing}
          />

          {error && (
            <Alert color="red" title="Error loading queue" variant="light">
              {error}
            </Alert>
          )}

          {loading && queue.length === 0 ? (
            <Center py="xl">
              <Loader size="lg" />
            </Center>
          ) : (
            <>
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
                      selectedId={effectiveSelectedId}
                      onSelect={(id) => {
                        setSelectedId(id)
                        setMobileTab('case')
                      }}
                      onResetFilters={resetFilters}
                      isProcessing={queueIsProcessing}
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
                    selectedId={effectiveSelectedId}
                    onSelect={setSelectedId}
                    onResetFilters={resetFilters}
                    isProcessing={queueIsProcessing}
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
            </>
          )}
        </Stack>
      </Container>
    </ClientOnly>
  )
}
