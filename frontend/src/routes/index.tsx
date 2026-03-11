import { createFileRoute } from '@tanstack/react-router'
import { HeroBullets } from '@/components/hero/HeroBullets'
import { IconCheck } from '@tabler/icons-react'
import {
  Badge,
  Container,
  Group,
  List,
  Paper,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import classes from './index.module.css'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div>
      <HeroBullets />

      <Container size="lg" py="xl">
        <Group justify="center">
          <Badge variant="light" size="lg" radius="sm">
            How it works
          </Badge>
        </Group>
        <Title order={2} className={classes.title} ta="center" mt="sm">
          Streamlined phishing response workflow
        </Title>
        <Text c="dimmed" className={classes.description} ta="center" mt="md">
          Our AI analyzes incoming emails for phishing indicators, assigns confidence scores,
          and queues suspicious messages for SOC analyst review.
        </Text>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" mt="xl">
          <Paper withBorder radius="lg" p="xl">
            <Title order={3} mb="md">AI Detection</Title>
            <Text c="dimmed" mb="md">
              Our system automatically scans emails for common phishing patterns and
              generates detailed analysis reports for each suspicious message.
            </Text>
            <List
              spacing="sm"
              icon={
                <ThemeIcon color="blue" variant="light" radius="xl" size={22}>
                  <IconCheck size={14} stroke={2} />
                </ThemeIcon>
              }
            >
              <List.Item>URL and domain analysis</List.Item>
              <List.Item>Sender verification and mismatch detection</List.Item>
              <List.Item>Unicode trick and spoofing detection</List.Item>
            </List>
          </Paper>

          <Paper withBorder radius="lg" p="xl">
            <Title order={3} mb="md">Human Review</Title>
            <Text c="dimmed" mb="md">
              SOC analysts review AI findings and make final decisions on flagged emails.
              This ensures accuracy while reducing manual workload.
            </Text>
            <List
              spacing="sm"
              icon={
                <ThemeIcon color="blue" variant="light" radius="xl" size={22}>
                  <IconCheck size={14} stroke={2} />
                </ThemeIcon>
              }
            >
              <List.Item>Approve or reject flagged emails</List.Item>
              <List.Item>Add notes and rationale for decisions</List.Item>
              <List.Item>Track decision history for auditing</List.Item>
            </List>
          </Paper>
        </SimpleGrid>
      </Container>
    </div>
  )
}
