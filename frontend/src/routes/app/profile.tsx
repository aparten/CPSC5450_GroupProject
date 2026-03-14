import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/lib/auth'
import { ProfilePage } from '@/features/profile/ProfilePage'

export const Route = createFileRoute('/app/profile')({
  beforeLoad: async () => {
    await requireAuth()
  },
  component: ProfilePage,
})
