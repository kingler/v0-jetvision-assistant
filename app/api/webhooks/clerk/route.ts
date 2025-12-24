import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

/**
 * Valid user roles that can be assigned via Clerk public metadata.
 * Used for role validation in both user.created and user.updated handlers.
 */
const VALID_ROLES = ['sales_rep', 'admin', 'customer', 'operator'] as const;

/**
 * Clerk Webhook Handler
 *
 * This endpoint receives webhook events from Clerk and syncs user data to Supabase.
 * Events handled:
 * - user.created: Creates a new user record in Supabase iso_agents table
 * - user.updated: Updates existing user record in Supabase
 * - user.deleted: Soft deletes user record in Supabase
 *
 * Role Assignment:
 * - Default role is 'sales_rep'
 * - Role can be set via Clerk user public metadata: { role: 'admin' | 'sales_rep' | 'customer' | 'operator' }
 */
// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Get webhook secret from environment
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET environment variable');
    return new Response('Error: Missing webhook secret configuration', {
      status: 500
    });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // Verify all required headers are present
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Missing svix headers');
    return new Response('Error: Missing svix headers', {
      status: 400
    });
  }

  // Get the request body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with the webhook secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the webhook signature
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook signature:', err);
    return new Response('Error: Verification failed', {
      status: 400
    });
  }

  // Handle different event types
  const eventType = evt.type;
  console.log(`Received webhook event: ${eventType}`);

  try {
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;

        // Extract primary email
        const email = email_addresses[0]?.email_address;
        if (!email) {
          console.error('No email address found for user:', id);
          return new Response('Error: No email address', { status: 400 });
        }

        // Get role from public_metadata or default to 'sales_rep'
        const metadata = public_metadata as Record<string, unknown>;
        const proposedRole = metadata?.role;

        let userRole: typeof VALID_ROLES[number] = 'sales_rep';

        if (typeof proposedRole === 'string' && VALID_ROLES.includes(proposedRole as any)) {
          userRole = proposedRole as typeof VALID_ROLES[number];
        } else if (proposedRole) {
          console.warn(`[WEBHOOK] Invalid role "${proposedRole}" from Clerk for user ${id}, defaulting to sales_rep`);
        }

        // Create user in Supabase iso_agents table
        const { data, error } = await supabase
          .from('iso_agents')
          .insert({
            clerk_user_id: id,
            email: email,
            full_name: `${first_name || ''} ${last_name || ''}`.trim() || email,
            role: userRole,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating user in Supabase:', error);
          return new Response('Error: Database sync failed', {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        console.log('Successfully created user in Supabase:', data);
        break;
      }

      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;

        // Extract primary email
        const email = email_addresses[0]?.email_address;

        // Get role from public_metadata if provided
        const updateData: Record<string, unknown> = {
          email: email,
          full_name: `${first_name || ''} ${last_name || ''}`.trim() || email,
          updated_at: new Date().toISOString(),
        };

        // Update role if provided in metadata
        const metadata = public_metadata as Record<string, unknown>;
        const proposedRole = metadata?.role;

        if (typeof proposedRole === 'string') {
          if (VALID_ROLES.includes(proposedRole as any)) {
            updateData.role = proposedRole;
            console.log(`[WEBHOOK] Updated role to "${proposedRole}" for user ${id}`);
          } else {
            console.warn(`[WEBHOOK] Invalid role "${proposedRole}" ignored for user ${id}`);
          }
        }

        // Update user in Supabase
        const { data, error } = await supabase
          .from('iso_agents')
          .update(updateData)
          .eq('clerk_user_id', id)
          .select()
          .single();

        if (error) {
          console.error('Error updating user in Supabase:', error);
          return new Response('Error: Database update failed', {
            status: 500
          });
        }

        console.log('Successfully updated user in Supabase:', data);
        break;
      }

      case 'user.deleted': {
        const { id } = evt.data;

        if (!id) {
          console.error('user.deleted event missing user ID');
          return new Response('Error: Missing user ID', { status: 400 });
        }

        // Soft delete: mark user as inactive instead of deleting
        const { data, error } = await supabase
          .from('iso_agents')
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_user_id', id)
          .select()
          .single();

        if (error) {
          console.error('Error soft-deleting user in Supabase:', error);
          return new Response('Error: Database deletion failed', {
            status: 500
          });
        }

        console.log('Successfully soft-deleted user in Supabase:', data);
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response('Webhook processed successfully', {
      status: 200
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Error: Internal server error', {
      status: 500
    });
  }
}
