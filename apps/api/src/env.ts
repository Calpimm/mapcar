import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().int().default(4000),
  API_HOST: z.string().default('0.0.0.0'),
  API_CORS_ORIGINS: z
    .string()
    .default('http://localhost:3010,http://localhost:3011')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  ADMIN_API_TOKEN: z.string().min(32, 'ADMIN_API_TOKEN en az 32 karakter olmalı'),
  OSRM_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  SIM_TICK_MS: z.coerce.number().int().min(100).max(5000).default(1000),
})

export type Env = z.infer<typeof schema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source)
  if (!parsed.success) {
    console.error('Geçersiz ortam değişkenleri:\n', z.prettifyError(parsed.error))
    process.exit(1)
  }
  return parsed.data
}
