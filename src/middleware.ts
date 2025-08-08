import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  runtime: 'nodejs'
}

export async function middleware(req: NextRequest) {
  // Create a response object
  const res = NextResponse.next()
  
  try {
    // Skip middleware for static files and API routes
    if (
      req.nextUrl.pathname.startsWith('/_next') ||
      req.nextUrl.pathname.startsWith('/static') ||
      req.nextUrl.pathname.startsWith('/api')
    ) {
      return res
    }
    
    // Create a Supabase client configured to use cookies
    const supabase = createMiddlewareClient({ req, res })
    
    // Refresh session if expired - required for Server Components
    // Use a try-catch block specifically for the getSession call
    let session = null
    try {
      const { data } = await supabase.auth.getSession()
      session = data.session
    } catch (sessionError) {
      console.error('Error getting session:', sessionError)
      // Continue without a session
    }
    
    // If there's no session and the user is trying to access a protected route, redirect to login
    const isAuthRoute = req.nextUrl.pathname.startsWith('/dashboard')
    if (!session && isAuthRoute) {
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
    
    // If there's a session and the user is trying to access login/register, redirect to dashboard
    const isLoginRoute = req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register'
    if (session && isLoginRoute) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  } catch (error) {
    console.error('Middleware error:', error)
    // Return the original response in case of error
  }
  
  return res
}