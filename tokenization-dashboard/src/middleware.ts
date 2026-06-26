import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Read token from cookies
  const token = request.cookies.get('auth_token')?.value

  const { pathname } = request.nextUrl

  // Check if target is login page
  const isLoginPage = pathname === '/login'

  // If no token and not on login page, redirect to /login
  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If token exists and trying to access /login, redirect to /investors
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/investors', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Apply to all pages except api, _next static files, images, and public assets
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
