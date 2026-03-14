import { createFileRoute } from '@tanstack/react-router'
import { HeroBullets } from '@/components/hero/HeroBullets'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div>
      <HeroBullets />
    </div>
  )
}
