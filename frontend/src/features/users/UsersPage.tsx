import { useEffect, useState } from 'react'
import {
  ActionIcon, Badge, Button, Container, Group,
  Loader, Modal, Select, Table, Text, Title,
} from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { getToken } from '@/lib/auth'
import { ROLE_LABELS, type User } from '@/lib/types'

const API_BASE = 'http://localhost:8000/api/v1'

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  })

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/users/`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API_BASE}/users/me`, { headers: authHeaders() }).then(r => r.json()),
    ])
      .then(([usersData, me]) => {
        setUsers(usersData.data ?? [])
        setCurrentUserId(me.id)
      })
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false))
  }, [])

  async function changeRole(userId: string, role: number) {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const res = await fetch(`${API_BASE}/users/${deleteTarget.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
    }
    setDeleteTarget(null)
  }

  if (loading) return <Container py="xl"><Loader /></Container>

  if (error) return (
    <Container py="xl">
      <Text c="red">{error}</Text>
    </Container>
  )

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="lg">User Management</Title>

      <Table highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Role</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {users.map(user => (
            <Table.Tr key={user.id}>
              <Table.Td>{user.full_name || '—'}</Table.Td>
              <Table.Td>{user.email}</Table.Td>
              <Table.Td>
                <Select
                  size="xs"
                  data={ROLE_OPTIONS}
                  value={String(user.role)}
                  onChange={val => val && changeRole(user.id, Number(val))}
                  w={120}
                  allowDeselect={false}
                />
              </Table.Td>
              <Table.Td>
                <Badge color={user.is_active ? 'green' : 'gray'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </Table.Td>
              <Table.Td>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  disabled={user.id === currentUserId}
                  title={user.id === currentUserId ? 'Cannot delete your own account' : 'Delete user'}
                  onClick={() => setDeleteTarget(user)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete User"
      >
        <Text mb="md">
          Are you sure you want to delete <strong>{deleteTarget?.email}</strong>? This cannot be undone.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="red" onClick={confirmDelete}>Delete</Button>
        </Group>
      </Modal>
    </Container>
  )
}
