import { SignIn } from '@clerk/nextjs'

/**
 * Sign In Page
 *
 * Provides authentication interface using Clerk's pre-built component
 * Features:
 * - Email/password authentication
 * - OAuth providers (Google)
 * - Remember me functionality
 * - Password reset
 * - Automatic redirect to dashboard after sign-in
 */

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl rounded-lg',
            headerTitle: 'text-2xl font-bold',
            formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
      />
    </div>
  )
}
