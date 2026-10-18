import { jwtVerify, SignJWT } from 'jose'

export const SESSION_COOKIE = 'mapcar_admin'
export const SESSION_DAYS = 7

const key = (secret: string) => new TextEncoder().encode(secret)

export async function createSession(secret: string) {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key(secret))
}

export async function verifySession(token: string | undefined, secret: string | undefined) {
  if (!token || !secret) return false
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ['HS256'] })
    return payload.role === 'admin'
  } catch {
    return false
  }
}
