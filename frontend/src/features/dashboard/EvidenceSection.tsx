import { Badge, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core'
import type { QueueItem } from './types'

type EvidenceSectionProps = {
  item: QueueItem
}

export function EvidenceSection({ item }: EvidenceSectionProps) {
  return (
    <Stack gap="sm">
      <Text c="dimmed" size="xs" tt="uppercase">
        Triage Evidence
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
        <Paper withBorder radius="md" p="xs">
          <Text fw={600} size="xs" mb={6}>
            Indicators
          </Text>
          <Group gap={6}>
            <Badge variant="light" color="blue">
              URLs {item.parsed.indicators.urls.length}
            </Badge>
            <Badge variant="light" color="violet">
              IPs {item.parsed.indicators.ip_addresses.length}
            </Badge>
            <Badge variant="light" color="grape">
              Domains {item.parsed.indicators.domains.length}
            </Badge>
          </Group>
        </Paper>

        <Paper withBorder radius="md" p="xs">
          <Text fw={600} size="xs" mb={6}>
            Flags
          </Text>
          <Group gap={6}>
            <Badge
              variant="light"
              color={item.parsed.derived_flags.display_name_mismatch ? 'red' : 'gray'}
            >
              display-name
            </Badge>
            <Badge
              variant="light"
              color={item.parsed.derived_flags.sender_domain_mismatch ? 'red' : 'gray'}
            >
              sender-domain
            </Badge>
            <Badge
              variant="light"
              color={item.parsed.derived_flags.unicode_trick_detected ? 'red' : 'gray'}
            >
              unicode
            </Badge>
          </Group>
        </Paper>

        <Paper withBorder radius="md" p="xs">
          <Text fw={600} size="xs" mb={6}>
            Rationale
          </Text>
          <Text size="sm" c="dimmed" lineClamp={4}>
            {item.ui.rationale}
          </Text>
        </Paper>
      </SimpleGrid>

      <Group gap={6}>
        {item.parsed.indicators.domains.map((domain) => (
          <Badge key={domain} variant="outline" size="sm">
            {domain}
          </Badge>
        ))}
      </Group>
    </Stack>
  )
}
