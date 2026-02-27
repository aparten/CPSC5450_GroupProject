import { Badge, Button, Group, Paper, Stack, Text, Textarea } from '@mantine/core'
import { statusColor } from './colors'
import type { DecisionEntry, QueueStatus } from './types'

type ActionSectionProps = {
  currentStatus: QueueStatus
  note: string
  onNoteChange: (value: string) => void
  onDecision: (status: QueueStatus) => void
  history: DecisionEntry[]
}

export function ActionSection({
  currentStatus,
  note,
  onNoteChange,
  onDecision,
  history,
}: ActionSectionProps) {
  return (
    <Paper withBorder radius="md" p="sm" bg="var(--mantine-color-gray-0)">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600} size="sm">
            Analyst Action
          </Text>
          <Badge size="xs" color={statusColor(currentStatus)} variant="light">
            {currentStatus}
          </Badge>
        </Group>

        <Textarea
          value={note}
          onChange={(event) => onNoteChange(event.currentTarget.value)}
          placeholder="Required before decision"
          minRows={2}
        />

        <Group grow>
          <Button color="green" onClick={() => onDecision('approved')} disabled={!note.trim()}>
            Approve
          </Button>
          <Button color="red" onClick={() => onDecision('rejected')} disabled={!note.trim()}>
            Reject
          </Button>
          <Button variant="light" onClick={() => onDecision('needs review')} disabled={!note.trim()}>
            Needs Review
          </Button>
        </Group>

        <Stack gap="xs">
          <Text c="dimmed" size="xs" tt="uppercase">
            Decision History
          </Text>
          {history.length === 0 ? (
            <Text size="sm" c="dimmed">
              No decisions yet.
            </Text>
          ) : (
            <Stack gap={6}>
              {history
                .slice()
                .reverse()
                .map((entry) => (
                  <Paper key={entry.id} withBorder radius="sm" p="xs">
                    <Group justify="space-between" align="flex-start">
                      <Badge size="xs" color={statusColor(entry.status)} variant="light">
                        {entry.status}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {entry.at}
                      </Text>
                    </Group>
                    <Text size="sm" mt={4}>
                      {entry.note}
                    </Text>
                  </Paper>
                ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}
