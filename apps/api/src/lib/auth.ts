import { createHash, timingSafeEqual } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'

const digest = (s: string) => createHash('sha256').update(s).digest()

export function bearerGuard(token: string) {
  const expected = digest(token)
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization ?? ''
    const given = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!given || !timingSafeEqual(digest(given), expected)) {
      return reply.code(401).send({ message: 'Yetkisiz' })
    }
  }
}
