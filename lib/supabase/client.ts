import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/database'

/**
 * Create a Supabase client for browser/client-side use
 *
 * This client:
 * - Runs in the browser
 * - Automatically handles authentication with Clerk
 * - Enforces Row Level Security (RLS) policies
 * - Should be used in React components and client-side code
 *
 * @example
 * ```tsx
 * import { createClient } from '@/lib/supabase/client'
 *
 * export default function MyComponent() {
 *   const supabase = createClient()
 *
 *   const { data, error } = await supabase
 *     .from('flight_requests')
 *     .select('*')
 *
 *   // ...
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
