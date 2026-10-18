import 'server-only'
import './root-env'
import { z } from 'zod'

const schema = z.object({
  API_INTERNAL_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  ADMIN_API_TOKEN: z.string().min(32),
  ADMIN_PASSWORD: z.string().min(4),
  ADMIN_SESSION_SECRET: z.string().min(32),
})

let cached: z.infer<typeof schema> | null = null

export function env() {
  if (!cached) {
    const parsed = schema.safeParse(process.env)
    if (!parsed.success)
      throw new Error(`Admin ortam değişkenleri eksik:\n${z.prettifyError(parsed.error)}`)
    cached = parsed.data
  }
  return cached
}

/** Sunucunun API'ye ulaştığı adres (Docker içinde farklı olabilir) */
export const apiBase = () => env().API_INTERNAL_URL ?? env().NEXT_PUBLIC_API_URL
