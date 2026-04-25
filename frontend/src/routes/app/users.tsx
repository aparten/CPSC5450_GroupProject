import { createFileRoute } from '@tanstack/react-router'
import { requireSuperuser } from '@/lib/auth'
import { UsersPage } from '@/features/users/UsersPage'

export const Route = createFileRoute('/app/users')({
  beforeLoad: async () => {
    await requireSuperuser()
  },
  component: UsersPage,
})
