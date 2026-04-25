import { useEffect, useState } from 'react'
import { ActionIcon, Button, Container, Group, useMantineColorScheme, useComputedColorScheme } from '@mantine/core'
import { IconBrightnessDown, IconMoon, IconLogout, IconUser, IconLayoutDashboard, IconHome, IconUsers } from '@tabler/icons-react'
import classes from './HeaderMenu.module.css'
import { useNavigate } from "@tanstack/react-router"
import { getToken, logout } from '@/lib/auth'

export function HeaderMenu() {
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light')
  const navigate = useNavigate()
  const [userRole, setUserRole] = useState<number | null>(null)

  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark')
  }

  const isLoggedIn = !!getToken()

  useEffect(() => {
    if (!isLoggedIn) { setUserRole(null); return }
    fetch('http://localhost:8000/api/v1/users/me', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(user => user && setUserRole(user.role))
      .catch(() => {})
  }, [isLoggedIn])

  return (
    <header className={classes.header}>
      <Container size="lg">
        <Group justify="space-between">
          <Group gap={8}>
            <Button
              variant="default"
              size="sm"
              leftSection={<IconHome size={16} />}
              onClick={() => navigate({ to: "/" })}
            >
              Home
            </Button>
            {isLoggedIn && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconLayoutDashboard size={16} />}
                  onClick={() => navigate({ to: '/app/dashboard' })}
                >
                  Dashboard
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconUser size={16} />}
                  onClick={() => navigate({ to: '/app/profile' })}
                >
                  Profile
                </Button>
                {userRole === 3 && (
                  <Button
                    variant="default"
                    size="sm"
                    leftSection={<IconUsers size={16} />}
                    onClick={() => navigate({ to: '/app/users' })}
                  >
                    Users
                  </Button>
                )}
              </>
            )}
          </Group>

          <Group gap={8}>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Toggle color scheme"
              onClick={toggleColorScheme}
            >
              {colorScheme === 'dark' ? <IconBrightnessDown /> : <IconMoon />}
            </ActionIcon>
            {isLoggedIn ? (
              <Button variant="default" size="sm" leftSection={<IconLogout size={16} />} onClick={logout}>
                Logout
              </Button>
            ) : (
              <Button variant="default" size="sm" onClick={() => navigate({ to: '/auth/login' })}>
                Login
              </Button>
            )}
          </Group>
        </Group>
      </Container>
    </header>
  )
}
