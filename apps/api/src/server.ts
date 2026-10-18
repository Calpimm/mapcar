import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import type { Db } from '@mapcar/db'
import scalar from '@scalar/fastify-api-reference'
import Fastify, { type FastifyBaseLogger } from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import type { Env } from './env'
import { adminRoutes } from './routes/admin'
import { publicRoutes } from './routes/public'
import { streamRoutes } from './routes/stream'
import type { SimRunner } from './sim/runner'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    sim: SimRunner
    env: Env
  }
}

export async function buildServer(deps: {
  env: Env
  db: Db
  createSim: (log: FastifyBaseLogger) => SimRunner
  logger?: boolean
}) {
  const { env } = deps
  const app = Fastify({
    logger:
      deps.logger === false
        ? false
        : env.NODE_ENV === 'development'
          ? {
              transport: {
                target: 'pino-pretty',
                options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
              },
            }
          : true,
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.decorate('db', deps.db)
  app.decorate('sim', deps.createSim(app.log.child({ module: 'sim' })))
  app.decorate('env', env)

  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, { origin: env.API_CORS_ORIGINS, credentials: false })
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    allowList: (req) => req.url.startsWith('/v1/stream'),
  })
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'mapcar API',
        description: "Gazimağusa'da yaşayan sanal sürücünün simülasyon API'si",
        version: '1.0.0',
      },
      components: { securitySchemes: { admin: { type: 'http', scheme: 'bearer' } } },
    },
    transform: jsonSchemaTransform,
  })
  await app.register(scalar, { routePrefix: '/docs' })

  app.get('/health', { schema: { hide: true } }, async () => ({ ok: true, day: app.sim.state.day }))

  await app.register(publicRoutes, { prefix: '/v1' })
  await app.register(streamRoutes, { prefix: '/v1' })
  await app.register(adminRoutes, { prefix: '/v1/admin' })

  return app
}

export type App = Awaited<ReturnType<typeof buildServer>>
