# GEMINI.md - v0-jetvision-assistant

## Project Overview

This is a Next.js web application named "JetVision Agent". It appears to be a multi-agent chat application that allows users to interact with AI agents. The project is bootstrapped with `v0.app` and is set up for deployment on Vercel.

The application uses a modern tech stack, including:

*   **Framework:** Next.js (with App Router)
*   **Language:** TypeScript
*   **Authentication:** Clerk and Supabase
*   **Database:** Supabase
*   **UI:** Tailwind CSS, Radix UI, Lucide Icons, Framer Motion
*   **Testing:** Vitest for unit and integration tests, and Playwright for end-to-end tests.
*   **Workspaces:** The project uses pnpm workspaces, with at least one workspace in `mcp-servers/*`.
*   **Error Tracking:** Sentry (currently disabled)
*   **Queues:** BullMQ with Redis

## Building and Running

### Prerequisites

*   Node.js
*   pnpm

### Installation

1.  Clone the repository.
2.  Install the dependencies:

    ```bash
    pnpm install
    ```

### Running the Application

To run the application in development mode, use the following command:

```bash
pnpm dev
```

This will start the Next.js development server and the MCP (Model Context Protocol) servers.

### Building for Production

To build the application for production, use the following command:

```bash
pnpm build
```

## Development Conventions

### Testing

The project has a comprehensive testing setup.

*   **Unit Tests:** Run with `pnpm test:unit`.
*   **Integration Tests:** Run with `pnpm test:integration`.
*   **End-to-End Tests:** Run with `pnpm test:e2e`.

### Linting

The project uses ESLint for linting. To run the linter, use the following command:

```bash
pnpm lint
```

### Pre-commit Hooks

The project uses Husky for pre-commit hooks. The hooks are configured in the `.husky` directory.

### Code Style

The project uses Tailwind CSS for styling. The configuration is in the `tailwind.config.ts` file. It's likely that the project follows the standard React and TypeScript best practices.
