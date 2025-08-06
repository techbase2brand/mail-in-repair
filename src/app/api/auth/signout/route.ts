import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  // Sign out the user
  await supabase.auth.signOut()

  // URL to redirect to after sign out process completes
  return NextResponse.redirect(new URL('/', request.url), {
    status: 302,
  })
}