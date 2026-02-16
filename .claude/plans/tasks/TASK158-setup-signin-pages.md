# Task ID: TASK158
# Task Name: Setup Sign-In/Sign-Up Pages
# Parent User Story: [[US082-sign-in-with-clerk|US082 - User Authentication with Clerk]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Configure Clerk sign-in and sign-up pages in the Next.js application. Create the authentication page routes and integrate Clerk's pre-built components for a consistent authentication experience.

## Acceptance Criteria
- Sign-in page is accessible at /sign-in
- Sign-up page is accessible at /sign-up
- Clerk SignIn and SignUp components are rendered on respective pages
- Pages use a centered layout appropriate for authentication
- Redirect after successful sign-in goes to the dashboard (/)
- Redirect after successful sign-up goes to onboarding or dashboard
- Pages are excluded from the authenticated layout
- Clerk appearance is customized to match the application design system

## Implementation Details
- **File(s)**: app/(auth)/sign-in/[[...sign-in]]/page.tsx, app/(auth)/sign-up/[[...sign-up]]/page.tsx
- **Approach**: Create the catch-all route pages for Clerk's sign-in and sign-up flows. Use Clerk's `<SignIn />` and `<SignUp />` components with appropriate routing and appearance configuration. Create a shared auth layout in app/(auth)/layout.tsx that provides a centered, minimal layout without the main application navigation. Configure redirectUrls in the Clerk components.

## Dependencies
- [[TASK157-configure-clerk-middleware|TASK157]] (middleware configured to allow public access to auth pages)
- Clerk API keys configured
