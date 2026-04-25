export type User = {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  role: number
}

export const ROLE_LABELS: Record<number, string> = {
  1: 'Viewer',
  2: 'Analyst',
  3: 'Superuser',
}
