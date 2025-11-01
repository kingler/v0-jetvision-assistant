import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/types/database'

/**
 * Create a Supabase client for server-side use
 *
 * This client:
 * - Runs on the server (API routes, Server Components, Server Actions)
 * - Reads authentication cookies to maintain user session
 * - Enforces Row Level Security (RLS) policies based on authenticated user
 * - Should be used in Server Components, API routes, and Server Actions
 *
 * @example
 * ```tsx
 * // In a Server Component
 * import { createServerClient } from '@/lib/supabase/server'
 *
 * export default async function Page() {
 *   const supabase = await createServerClient()
 *
 *   const { data, error } = await supabase
 *     .from('flight_requests')
 *     .select('*')
 *
 *   // ...
 * }
 * ```
 *
 * @example
 * ```ts
 * // In an API route
 * import { createServerClient } from '@/lib/supabase/server'
 *
 * export async function GET(request: Request) {
 *   const supabase = await createServerClient()
 *
 *   const { data, error } = await supabase
 *     .from('flight_requests')
 *     .select('*')
 *
 *   return Response.json(data)
 * }
 * ```
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

/**
 * Create a Supabase admin client with service role key
 *
 * ⚠️ WARNING: This client bypasses Row Level Security!
 * Only use for administrative operations that need unrestricted access.
 *
 * Use cases:
 * - System-level operations
 * - Webhook handlers that create data for users
 * - Administrative dashboards
 * - Background jobs
 *
 * @example
 * ```ts
 * import { createAdminClient } from '@/lib/supabase/server'
 *
 * // In a webhook handler
 * export async function POST(request: Request) {
 *   const supabase = createAdminClient()
 *
 *   // This bypasses RLS - use with caution!
 *   const { data, error } = await supabase
 *     .from('users')
 *     .insert({
 *       clerk_user_id: webhookData.user_id,
 *       email: webhookData.email
 *     })
 *
 *   return Response.json({ success: true })
 * }
 * ```
 */
export function createAdminClient() {
  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      cookies: {
        get() {
          return undefined
        },
      },
    }
  )
}
