import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Giriş' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <main className="grid min-h-dvh place-items-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <p className="font-display text-2xl font-bold tracking-tight">mapcar</p>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Yönetim paneli</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Simülasyonu yönetmek için şifreyi girin.
        </p>
        <LoginForm next={next ?? '/'} />
      </div>
    </main>
  )
}
