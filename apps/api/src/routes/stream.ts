import type { StreamMessage } from '@mapcar/contracts'
import type { FastifyPluginAsync } from 'fastify'

export const streamRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/stream',
    { schema: { tags: ['canlı'], summary: 'Canlı simülasyon akışı (Server-Sent Events)' } },
    (req, reply) => {
      const origin = req.headers.origin
      reply.hijack()
      const res = reply.raw
      res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
        ...(origin && app.env.API_CORS_ORIGINS.includes(origin)
          ? { 'access-control-allow-origin': origin, vary: 'origin' }
          : {}),
      })
      res.write('retry: 3000\n\n')

      const send = (msg: StreamMessage) => {
        res.write(`event: ${msg.type}\ndata: ${JSON.stringify(msg.data)}\n\n`)
      }
      const unsubscribe = app.sim.subscribe(send)
      const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000)

      req.raw.on('close', () => {
        clearInterval(heartbeat)
        unsubscribe()
      })
    },
  )
}
