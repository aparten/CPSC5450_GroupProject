import { IconCheck, IconShieldLock } from '@tabler/icons-react'
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
            <span className={classes.highlight}>AI-Powered</span> Phishing Detection
          </Title>
          <Text c="dimmed" mt="md" ta="center">
            Protect your university from phishing attacks with our intelligent email triage system.
            Analyze suspicious emails, detect threats, and respond faster with AI assistance.
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
              <b>AI-Powered Analysis</b> – automatically detect phishing indicators like suspicious
              URLs, sender mismatches, and unicode tricks
            </List.Item>
            <List.Item>
              <b>Human-in-the-Loop</b> – SOC analysts review AI decisions before taking action,
              ensuring accuracy and control
            </List.Item>
            <List.Item>
              <b>Real-time Triage</b> – prioritize threats by severity and confidence scores
              for efficient response
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
