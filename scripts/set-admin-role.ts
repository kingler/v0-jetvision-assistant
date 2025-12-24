/**
 * Script to set a user's role in the iso_agents table
 *
 * Usage:
 *   npx tsx scripts/set-admin-role.ts --supabase-id <uuid> --clerk-user-id <id> --role <role> [--full-name <name>] [--email <email>]
 *   npx tsx scripts/set-admin-role.ts --help
 *
 * Environment Variables (alternative to CLI args):
 *   SUPABASE_ID - Supabase user UUID
 *   CLERK_USER_ID - Clerk user identifier
 *   ROLE - User role to assign
 *   ADMIN_FULL_NAME - Full name for new user (default: "User")
 *   ADMIN_EMAIL - Email address for new user (default: "user-{clerk_user_id}@jetvision.ai")
 *
 * Valid Roles:
 *   - sales_rep (default for sales representatives)
 *   - admin (administrative users)
 *   - customer (customer users)
 *   - operator (system operators)
 *   - iso_agent (legacy ISO agent role)
 *
 * Examples:
 *   npx tsx scripts/set-admin-role.ts --supabase-id abc123 --clerk-user-id user_xyz --role admin --full-name "John Doe" --email "john@example.com"
 *   SUPABASE_ID=abc123 CLERK_USER_ID=user_xyz ROLE=admin ADMIN_EMAIL=john@example.com npx tsx scripts/set-admin-role.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Valid user roles in the system
 */
const VALID_ROLES = ['sales_rep', 'admin', 'customer', 'operator', 'iso_agent'] as const;

type ValidRole = typeof VALID_ROLES[number];

/**
 * Validate email format using a simple regex pattern
 * @param email - Email address to validate
 * @returns true if email format is valid, false otherwise
 */
function isValidEmail(email: string): boolean {
  // Basic email validation regex - matches most common email formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parse command-line arguments
 * Supports: --supabase-id, --clerk-user-id, --role, --full-name, --email, --help
 */
function parseArgs(): {
  supabaseId?: string;
  clerkUserId?: string;
  role?: string;
  fullName?: string;
  email?: string;
  help?: boolean;
} {
  const args = process.argv.slice(2);
  const parsed: {
    supabaseId?: string;
    clerkUserId?: string;
    role?: string;
    fullName?: string;
    email?: string;
    help?: boolean;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--supabase-id':
      case '-s':
        parsed.supabaseId = args[++i];
        break;
      case '--clerk-user-id':
      case '-c':
        parsed.clerkUserId = args[++i];
        break;
      case '--role':
      case '-r':
        parsed.role = args[++i];
        break;
      case '--full-name':
      case '-n':
        parsed.fullName = args[++i];
        break;
      case '--email':
      case '-e':
        parsed.email = args[++i];
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }

  return parsed;
}

/**
 * Display usage information and exit
 */
function showUsage(): void {
  console.log(`
Usage:
  npx tsx scripts/set-admin-role.ts [options]

Options:
  --supabase-id, -s <uuid>     Supabase user UUID (required)
  --clerk-user-id, -c <id>     Clerk user identifier (required)
  --role, -r <role>            User role to assign (required)
  --full-name, -n <name>       Full name for new user (optional, default: "User")
  --email, -e <email>          Email address for new user (optional, default: "user-{clerk_user_id}@jetvision.ai")
  --help, -h                   Show this help message

Environment Variables (alternative to CLI args):
  SUPABASE_ID                  Supabase user UUID
  CLERK_USER_ID                Clerk user identifier
  ROLE                         User role to assign
  ADMIN_FULL_NAME              Full name for new user (default: "User")
  ADMIN_EMAIL                  Email address for new user (default: "user-{clerk_user_id}@jetvision.ai")

Valid Roles:
  - sales_rep                  Sales representative (default role)
  - admin                      Administrative user
  - customer                   Customer user
  - operator                   System operator
  - iso_agent                  Legacy ISO agent role

Examples:
  # Using command-line arguments
  npx tsx scripts/set-admin-role.ts --supabase-id abc123 --clerk-user-id user_xyz --role admin --full-name "John Doe" --email "john@example.com"

  # Using environment variables
  SUPABASE_ID=abc123 CLERK_USER_ID=user_xyz ROLE=admin ADMIN_EMAIL=john@example.com npx tsx scripts/set-admin-role.ts

  # Mixed (CLI args override env vars)
  ROLE=admin npx tsx scripts/set-admin-role.ts --supabase-id abc123 --clerk-user-id user_xyz --email "john@example.com"
`);
  process.exit(0);
}

/**
 * Get user configuration from environment variables or command-line arguments
 * Validates that all required values are present and role is valid
 * Provides sensible defaults for full_name and email if not provided
 */
function getUserConfig(): {
  supabase_id: string;
  clerk_user_id: string;
  role: ValidRole;
  full_name: string;
  email: string;
} {
  const args = parseArgs();

  // Show help if requested
  if (args.help) {
    showUsage();
  }

  // Get values from CLI args first, then fall back to environment variables
  const supabaseId = args.supabaseId || process.env.SUPABASE_ID;
  const clerkUserId = args.clerkUserId || process.env.CLERK_USER_ID;
  const role = args.role || process.env.ROLE;
  const fullName = args.fullName || process.env.ADMIN_FULL_NAME;
  const email = args.email || process.env.ADMIN_EMAIL;

  // Validate required values
  const missing: string[] = [];
  if (!supabaseId) missing.push('supabase_id (--supabase-id or SUPABASE_ID)');
  if (!clerkUserId) missing.push('clerk_user_id (--clerk-user-id or CLERK_USER_ID)');
  if (!role) missing.push('role (--role or ROLE)');

  if (missing.length > 0) {
    console.error('❌ Missing required parameters:');
    missing.forEach((param) => console.error(`   - ${param}`));
    console.error('\nRun with --help to see usage information.');
    process.exit(1);
  }

  // Validate role is in allowed list
  if (!VALID_ROLES.includes(role as ValidRole)) {
    console.error(`❌ Invalid role: ${role}`);
    console.error(`Valid roles are: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  // Set defaults for full_name and email if not provided
  const finalFullName = fullName || 'User';
  const finalEmail = email || `user-${clerkUserId}@jetvision.ai`;

  // Validate email format if provided (or if using default)
  if (!isValidEmail(finalEmail)) {
    console.error(`❌ Invalid email format: ${finalEmail}`);
    console.error('Email must be in the format: user@example.com');
    process.exit(1);
  }

  // At this point, TypeScript knows all values are defined due to validation above
  // Use non-null assertions since we've validated they exist
  return {
    supabase_id: supabaseId!,
    clerk_user_id: clerkUserId!,
    role: role as ValidRole,
    full_name: finalFullName,
    email: finalEmail,
  };
}

// Get user configuration (validates and exits on error)
const USER_CONFIG = getUserConfig();

/**
 * Set user role in the iso_agents table
 * Attempts to update by Supabase ID first, then by Clerk user ID
 * Creates a new user if neither exists
 */
async function setAdminRole(): Promise<void> {
  console.log(`Setting user role to ${USER_CONFIG.role}...`);
  console.log(`  Supabase ID: ${USER_CONFIG.supabase_id}`);
  console.log(`  Clerk ID: ${USER_CONFIG.clerk_user_id}`);

  // Try to update by Supabase ID first (iso_agents table)
  const { data: userById, error: errorById } = await supabase
    .from('iso_agents')
    .update({ role: USER_CONFIG.role })
    .eq('id', USER_CONFIG.supabase_id)
    .select()
    .single();

  if (errorById && errorById.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is expected if user doesn't exist
    console.error('\n❌ Failed to update user role by Supabase ID:', errorById.message);
    console.error(`  Supabase ID: ${USER_CONFIG.supabase_id}`);
    console.error(`  Error Details:`, errorById);
    process.exit(1);
  }

  if (userById) {
    console.log(`\n✅ Successfully updated user role to ${USER_CONFIG.role} (by Supabase ID)`);
    console.log(`  User: ${userById.email || userById.full_name || userById.id}`);
    console.log(`  Role: ${userById.role}`);
    return;
  }

  // Try by Clerk user ID
  const { data: userByClerk, error: errorByClerk } = await supabase
    .from('iso_agents')
    .update({ role: USER_CONFIG.role })
    .eq('clerk_user_id', USER_CONFIG.clerk_user_id)
    .select()
    .single();

  if (errorByClerk && errorByClerk.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is expected if user doesn't exist
    console.error('\n❌ Failed to update user role by Clerk ID:', errorByClerk.message);
    console.error(`  Clerk User ID: ${USER_CONFIG.clerk_user_id}`);
    console.error(`  Error Details:`, errorByClerk);
    process.exit(1);
  }

  if (userByClerk) {
    console.log(`\n✅ Successfully updated user role to ${USER_CONFIG.role} (by Clerk ID)`);
    console.log(`  User: ${userByClerk.email || userByClerk.full_name || userByClerk.id}`);
    console.log(`  Role: ${userByClerk.role}`);
    return;
  }

  // If user doesn't exist, create them
  console.log('\n⚠️  User not found, creating new user...');
  console.log(`   Full Name: ${USER_CONFIG.full_name}`);
  console.log(`   Email: ${USER_CONFIG.email}`);

  const { data: newUser, error: createError } = await supabase
    .from('iso_agents')
    .insert({
      id: USER_CONFIG.supabase_id,
      clerk_user_id: USER_CONFIG.clerk_user_id,
      role: USER_CONFIG.role,
      full_name: USER_CONFIG.full_name,
      email: USER_CONFIG.email,
    })
    .select()
    .single();

  if (createError) {
    console.error('\n❌ Failed to create user:', createError.message);
    console.error(`  Error Details:`, createError);
    process.exit(1);
  }

  console.log(`\n✅ Successfully created user with role ${USER_CONFIG.role}`);
  console.log(`  User ID: ${newUser.id}`);
  console.log(`  Clerk ID: ${newUser.clerk_user_id}`);
  console.log(`  Role: ${newUser.role}`);
  console.log(`  Full Name: ${newUser.full_name}`);
  console.log(`  Email: ${newUser.email}`);
}

setAdminRole().catch(console.error);
