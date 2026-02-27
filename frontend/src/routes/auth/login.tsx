import { createFileRoute } from '@tanstack/react-router'
import { AuthenticationForm } from '@/components/login/AuthenticationForm'
import { useComputedColorScheme } from '@mantine/core'

export const Route = createFileRoute('/auth/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const isDark = useComputedColorScheme('light') === 'dark'

  return (
    <main
      className={`min-h-[calc(100dvh-180px)] w-full px-4 py-10 sm:px-6 lg:px-8 ${
        isDark
          ? 'bg-[#242424]'
          : 'bg-slate-50'
      }`}
    >
      <section className="mx-auto flex w-full max-w-xl items-center justify-center">
        <AuthenticationForm mode="login" w="100%" maw={560} />
      </section>
    </main>
  )
}
