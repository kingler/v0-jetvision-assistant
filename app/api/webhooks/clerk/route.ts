import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Clerk Webhook Handler
 *
 * Handles webhook events from Clerk to sync user data to Supabase
 * Events handled:
 * - user.created: Creates new user in iso_agents table
 * - user.updated: Updates user profile in Supabase
 * - user.deleted: Soft deletes user (sets is_active = false)
 *
 * Security: Verifies webhook signature using Svix
 */

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set')
    return new Response('Error: Missing webhook secret', { status: 500 })
  }

  // Get headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 })
  }

  // Get request body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error: Verification failed', { status: 400 })
  }

  // Handle webhook events
  const { type } = evt
  const eventId = 'id' in evt ? evt.id : 'unknown'
  console.log(`Webhook ${eventId} received: ${type}`)

  const supabase = await createClient()

  try {
    if (type === 'user.created') {
      const { id, email_addresses, first_name, last_name } = evt.data as any

      const primaryEmail = email_addresses.find(
        (email: any) => email.id === (evt.data as any).primary_email_address_id
      )

      // Insert new user into iso_agents table
      const { error } = await supabase.from('iso_agents').insert({
        clerk_user_id: id,
        email: primaryEmail?.email_address || '',
        full_name: `${first_name || ''} ${last_name || ''}`.trim() || null,
        role: 'broker', // Default role
        margin_type: 'percentage', // Default margin type
        margin_value: 10, // Default 10% margin
        is_active: true,
      })

      if (error) {
        console.error('Error creating user in Supabase:', error)
        return new Response('Error: Database sync failed', { status: 500 })
      }

      console.log(`User ${id} created in Supabase`)
    }

    if (type === 'user.updated') {
      const { id, email_addresses, first_name, last_name } = evt.data as any

      const primaryEmail = email_addresses.find(
        (email: any) => email.id === (evt.data as any).primary_email_address_id
      )

      // Update user in iso_agents table
      const { error } = await supabase
        .from('iso_agents')
        .update({
          email: primaryEmail?.email_address || '',
          full_name: `${first_name || ''} ${last_name || ''}`.trim() || null,
        })
        .eq('clerk_user_id', id)

      if (error) {
        console.error('Error updating user in Supabase:', error)
        return new Response('Error: Database update failed', { status: 500 })
      }

      console.log(`User ${id} updated in Supabase`)
    }

    if (type === 'user.deleted') {
      const { id } = evt.data

      // Soft delete: set is_active to false
      const { error } = await supabase
        .from('iso_agents')
        .update({ is_active: false })
        .eq('clerk_user_id', id)

      if (error) {
        console.error('Error deleting user in Supabase:', error)
        return new Response('Error: Database delete failed', { status: 500 })
      }

      console.log(`User ${id} deleted (soft) in Supabase`)
    }

    return new Response('Success', { status: 200 })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response('Error: Internal server error', { status: 500 })
  }
}
