import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    // 1. Create a simplified Supabase client for Middleware
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    // 2. Get the User
    const { data: { user } } = await supabase.auth.getUser()

    // 3. Define Protected Routes
    const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
    const isVerify = request.nextUrl.pathname.startsWith('/verify')
    const isLogin = request.nextUrl.pathname.startsWith('/login')

    // Rule A: If not logged in, but trying to access dashboard/verify -> Go to Login
    if (!user && (isDashboard || isVerify)) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Rule B: If logged in... check verification status
    if (user) {
        // Note: In middleware, checking the DB ('profiles' table) for every request is expensive/slow.
        // We handle the specific redirect logic in the Dashboard Layout.

        // However, if they are logged in and try to go to Login, send them to Dashboard
        if (isLogin) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api (API routes)
         */
        '/((?!_next/static|_next/image|favicon.ico|api).*)',
    ],
}
