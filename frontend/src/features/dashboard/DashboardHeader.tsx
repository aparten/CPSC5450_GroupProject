import { Badge, Button, Group, Text, Title } from '@mantine/core'
import type { QueueItem } from './types'

type DashboardHeaderProps = {
  queue: QueueItem[]
  onProcessEmails: () => void
  isProcessing: boolean
}

export function DashboardHeader({ queue, onProcessEmails, isProcessing }: DashboardHeaderProps) {
  return (
    <Group justify="space-between" align="flex-end">
      <div>
        <Title order={2}>SOC Dashboard</Title>
        <Text c="dimmed" size="sm">
          Analyst queue and phishing triage review
        </Text>
      </div>
      <Group gap="xs">
        <Badge variant="light" color="blue">
          {queue.length} cases
        </Badge>
        <Badge variant="light" color="red">
          {queue.filter((item) => item.ui.severity === 'critical').length} critical
        </Badge>
        <Button
          size="sm"
          loading={isProcessing}
          onClick={onProcessEmails}
        >
          Process Emails
        </Button>
      </Group>
    </Group>
  )
}
