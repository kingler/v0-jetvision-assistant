import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted to-muted/80 dark:from-background dark:to-background/90">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">
            Join Jetvision
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your account to start booking private jets with AI
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-xl',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
            },
          }}
          afterSignInUrl="/"
          afterSignUpUrl="/onboarding"
        />
      </div>
    </div>
  );
}
