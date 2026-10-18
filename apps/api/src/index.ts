import { createPrisma } from '@mapcar/db'
import { loadEnv } from './env'
import { buildServer } from './server'
import { SimRunner } from './sim/runner'

const env = loadEnv()
const db = createPrisma(env.DATABASE_URL)
const app = await buildServer({
  env,
  db,
  createSim: (log) => new SimRunner(db, log, { osrmUrl: env.OSRM_URL, tickMs: env.SIM_TICK_MS }),
})

await app.sim.init()
app.sim.start()
await app.listen({ port: env.API_PORT, host: env.API_HOST })

let closing = false
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    if (closing) return
    closing = true
    app.log.info({ signal }, 'kapanıyor')
    await app.sim.stop()
    await app.close()
    await db.$disconnect()
    process.exit(0)
  })
}
