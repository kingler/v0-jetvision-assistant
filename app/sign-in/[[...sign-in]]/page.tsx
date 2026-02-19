import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted to-muted/80 dark:from-background dark:to-background/90">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to Jetvision
          </h1>
          <p className="text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-xl border-border",
            },
          }}
          afterSignInUrl="/"
          afterSignUpUrl="/"
        />
      </div>
    </div>
  );
}
