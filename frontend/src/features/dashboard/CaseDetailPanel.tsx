import { Badge, Group, Paper, ScrollArea, Stack, Text, Title } from '@mantine/core'
import { labelColor } from './colors'
import { ActionSection } from './ActionSection'
import { EvidenceSection } from './EvidenceSection'
import type { DecisionEntry, QueueItem, QueueStatus } from './types'

type CaseDetailPanelProps = {
  selectedItem: QueueItem | null
  note: string
  onNoteChange: (value: string) => void
  onDecision: (status: QueueStatus) => void
  history: DecisionEntry[]
}

export function CaseDetailPanel({
  selectedItem,
  note,
  onNoteChange,
  onDecision,
  history,
}: CaseDetailPanelProps) {
  if (!selectedItem) {
    return (
      <Paper withBorder radius="md" p="md" h="100%">
        <Text c="dimmed">Select a case from the queue.</Text>
      </Paper>
    )
  }

  return (
    <Paper withBorder radius="md" p="md" h="100%">
      <ScrollArea.Autosize mah={640} type="auto" offsetScrollbars>
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text c="dimmed" size="xs" tt="uppercase">
                Selected Case
              </Text>
              <Title order={4}>{selectedItem.event_id}</Title>
            </div>
            <Badge color={labelColor(selectedItem.parsed.label)}>
              {selectedItem.parsed.label ?? 'unlabeled'}
            </Badge>
          </Group>

          <Paper withBorder radius="md" p="sm">
            <Stack gap={4}>
              <Text fw={600}>{selectedItem.parsed.headers.subject ?? '(no subject)'}</Text>
              <Text size="sm" c="dimmed">
                {selectedItem.parsed.headers.from_address ?? '(unknown sender)'}
              </Text>
              <Group gap={8}>
                <Badge size="sm" variant="light" color="blue">
                  confidence {(selectedItem.ui.confidence * 100).toFixed(0)}%
                </Badge>
                <Badge size="sm" variant="light" color="orange">
                  {selectedItem.ui.severity}
                </Badge>
                <Text size="xs" c="dimmed">
                  {selectedItem.parsed.headers.date
                    ? new Date(selectedItem.parsed.headers.date).toLocaleString()
                    : 'n/a'}
                </Text>
              </Group>
            </Stack>
          </Paper>

          <EvidenceSection item={selectedItem} />

          <ActionSection
            currentStatus={selectedItem.ui.status}
            note={note}
            onNoteChange={onNoteChange}
            onDecision={onDecision}
            history={history}
          />
        </Stack>
      </ScrollArea.Autosize>
    </Paper>
  )
}
