import './lib/root-env'
import { type NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySession } from './lib/session'

export async function proxy(req: NextRequest) {
  const ok = await verifySession(
    req.cookies.get(SESSION_COOKIE)?.value,
    process.env.ADMIN_SESSION_SECRET,
  )
  const isLogin = req.nextUrl.pathname === '/login'
  if (!ok && !isLogin) {
    const url = new URL('/login', req.url)
    if (req.nextUrl.pathname !== '/') url.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  if (ok && isLogin) return NextResponse.redirect(new URL('/', req.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/|maplibre/|favicon.ico).*)'],
}
