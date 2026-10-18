'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/lib/actions'

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, null)
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={state?.ok === false}
          aria-describedby={state?.ok === false ? 'login-error' : undefined}
        />
        {state?.ok === false && (
          <p id="login-error" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Giriş yapılıyor' : 'Giriş yap'}
      </Button>
    </form>
  )
}
