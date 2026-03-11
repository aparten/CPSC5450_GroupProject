import { IconShieldLock, IconCheck } from '@tabler/icons-react'
import { Button, Container, Group, List, Text, ThemeIcon, Title } from '@mantine/core'
import { useNavigate } from '@tanstack/react-router'
import classes from './HeroBullets.module.css'

export function HeroBullets() {
  const navigate = useNavigate()

  return (
    <Container size="md">
      <div className={classes.inner}>
        <div className={classes.content}>
          <Group justify="center" mb="md">
            <ThemeIcon size={80} radius="xl" variant="light">
              <IconShieldLock size={48} stroke={1.5} />
            </ThemeIcon>
          </Group>
          <Title className={classes.title} ta="center">
            University Email Security
          </Title>
          <Text c="dimmed" mt="md" ta="center">
            A simple tool to help security analysts review and triage suspicious emails.
            Spot phishing attempts before they reach students and staff.
          </Text>

          <List
            mt={30}
            spacing="sm"
            size="sm"
            icon={
              <ThemeIcon size={20} radius="xl">
                <IconCheck size={12} stroke={1.5} />
              </ThemeIcon>
            }
          >
            <List.Item>
              <b>Email Parsing</b> - extracts URLs, domains, and IP addresses from incoming emails
            </List.Item>
            <List.Item>
              <b>Threat Detection</b> - flags sender mismatches, suspicious links, and phishing patterns
            </List.Item>
            <List.Item>
              <b>Analyst Review</b> - security team approves or rejects flagged emails before action
            </List.Item>
          </List>

          <Group mt={30} justify="center">
            <Button
              radius="xl"
              size="md"
              className={classes.control}
              onClick={() => navigate({ to: '/app/dashboard' })}
            >
              Go to Dashboard
            </Button>
          </Group>
        </div>
      </div>
    </Container>
  )
}
