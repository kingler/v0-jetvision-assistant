import { SignUp } from '@clerk/nextjs'

/**
 * Sign Up Page
 *
 * Provides user registration interface using Clerk's pre-built component
 * Features:
 * - Email/password registration
 * - OAuth providers (Google)
 * - Email verification
 * - Password strength validation
 * - Terms of service acceptance
 * - Automatic redirect to dashboard after registration
 * - User synced to Supabase via webhook
 */

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl rounded-lg',
            headerTitle: 'text-2xl font-bold',
            formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
          },
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/dashboard"
      />
    </div>
  )
}
