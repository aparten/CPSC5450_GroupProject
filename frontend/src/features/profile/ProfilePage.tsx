import { useEffect, useState } from 'react'
import { Avatar, Container, Loader, Paper, Stack, Text, Title } from '@mantine/core'
import { IconUser } from '@tabler/icons-react'
import { getToken } from '@/lib/auth'

type User = {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  is_superuser: boolean
}

export function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const token = getToken()
      if (!token) return

      try {
        const res = await fetch('http://localhost:8000/api/v1/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setUser(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return (
      <Container size="sm" py="xl">
        <Loader />
      </Container>
    )
  }

  if (!user) {
    return (
      <Container size="sm" py="xl">
        <Text>Failed to load user data.</Text>
      </Container>
    )
  }

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="lg">Profile</Title>

      <Paper withBorder radius="md" p="xl">
        <Stack align="center" gap="md">
          <Avatar size={80} radius="xl" color="blue">
            <IconUser size={40} />
          </Avatar>

          <div style={{ textAlign: 'center' }}>
            <Text fw={600} size="lg">
              {user.full_name || 'No name set'}
            </Text>
            <Text c="dimmed" size="sm">
              {user.email}
            </Text>
          </div>
        </Stack>

        <Stack gap="xs" mt="xl">
          <Paper withBorder p="sm" radius="sm">
            <Text size="xs" c="dimmed">Email</Text>
            <Text>{user.email}</Text>
          </Paper>

          <Paper withBorder p="sm" radius="sm">
            <Text size="xs" c="dimmed">Full Name</Text>
            <Text>{user.full_name || '—'}</Text>
          </Paper>

          <Paper withBorder p="sm" radius="sm">
            <Text size="xs" c="dimmed">Role</Text>
            <Text>{user.is_superuser ? 'Admin' : 'Analyst'}</Text>
          </Paper>

          <Paper withBorder p="sm" radius="sm">
            <Text size="xs" c="dimmed">Status</Text>
            <Text>{user.is_active ? 'Active' : 'Inactive'}</Text>
          </Paper>
        </Stack>
      </Paper>
    </Container>
  )
}
