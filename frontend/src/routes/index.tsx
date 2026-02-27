import { createFileRoute } from '@tanstack/react-router'
import { HeroBullets } from '@/components/hero/HeroBullets'
import { FeaturesCards } from '@/components/feature-cards/FeatureCards'
import { ClientsCarousel } from '@/components/carousel/ClientsCarousel'
import { IconCheck } from '@tabler/icons-react'
import {
  Badge,
  Box,
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
        <Box mb={32}>
          <Text size="xl" fw={700} ta="center">
            Trusted by over 10,000 teams worldwide
          </Text>
        </Box>
        <Box mb={64}>
          <ClientsCarousel />
        </Box>
        <Group justify="center">
          <Badge variant="light" size="lg" radius="sm">
            Why teams choose us
          </Badge>
        </Group>
        <Title order={2} className={classes.title} ta="center" mt="sm">
          Built for reliability and long-term growth
        </Title>
        <Text c="dimmed" className={classes.description} ta="center" mt="md">
          We combine proven execution, product thinking, and transparent collaboration
          so your team can ship faster with less operational risk.
        </Text>

        <Paper className={classes.section} radius="xl" p={{ base: 'md', md: 'xl' }} mt="xl">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            <Paper withBorder radius="lg" p="xl" className={classes.card}>
              <Title order={3} className={classes.cardTitle}>
                Why choose us?
              </Title>
              <Text c="dimmed" mt="md">
                We provide top-tier services tailored to your goals. Our team delivers
                practical, high-quality solutions that are designed for measurable impact.
              </Text>
              <List
                mt="lg"
                spacing="sm"
                className={classes.cardList}
                icon={
                  <ThemeIcon color="blue" variant="light" radius="xl" size={22}>
                    <IconCheck size={14} stroke={2} />
                  </ThemeIcon>
                }
              >
                <List.Item>Expert team with years of hands-on delivery experience</List.Item>
                <List.Item>Customer-first process with proactive communication</List.Item>
                <List.Item>Solutions designed to scale with your business</List.Item>
              </List>
            </Paper>

            <Paper withBorder radius="lg" p="xl" className={classes.card}>
              <Title order={3} className={classes.cardTitle}>
                Our mission
              </Title>
              <Text c="dimmed" mt="md">
                We empower organizations through modern technology and dependable execution.
                Our focus is building lasting partnerships that keep delivering value over time.
              </Text>
              <List
                mt="lg"
                spacing="sm"
                className={classes.cardList}
                icon={
                  <ThemeIcon color="blue" variant="light" radius="xl" size={22}>
                    <IconCheck size={14} stroke={2} />
                  </ThemeIcon>
                }
              >
                <List.Item>Deliver innovative, business-focused technology outcomes</List.Item>
                <List.Item>Build long-term partnerships grounded in trust</List.Item>
                <List.Item>Continuously improve with market and customer feedback</List.Item>
              </List>
            </Paper>
          </SimpleGrid>
        </Paper>
      </Container>
      <div>
        <FeaturesCards />
      </div>
    </div>
  )
}
