# JetVision Deployment Guide

This guide covers the CI/CD pipeline setup for deploying JetVision to Vercel.

## Overview

The deployment pipeline consists of:

- **CI (Continuous Integration)**: `.github/workflows/code-review.yml`
  - Type checking, linting, tests, security audits
  - Runs on all branches and PRs

- **CD (Continuous Deployment)**: `.github/workflows/deploy.yml`
  - Preview deployments for PRs and `develop` branch
  - Production deployments for `main` branch
  - Smoke tests to verify deployments
  - Slack/Discord notifications

## Deployment Environments

| Branch | Environment | URL Pattern |
|--------|-------------|-------------|
| `main` | Production | `https://jetvision.ai` or `https://v0-jetvision-assistant.vercel.app` |
| `develop` | Staging | `https://v0-jetvision-assistant-[hash]-[team].vercel.app` |
| PR branches | Preview | Unique URL per deployment |

## Required GitHub Secrets

Configure these secrets in your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

### Vercel Secrets (Required)

| Secret | Description | How to Get |
|--------|-------------|------------|
| `VERCEL_TOKEN` | Vercel API token | [Vercel Settings → Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel team/org ID | Run `vercel link` or check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Vercel project ID | Run `vercel link` or check `.vercel/project.json` |

### Application Secrets (Required)

| Secret | Description |
|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `OPENAI_API_KEY` | OpenAI API key |

### Optional Secrets

| Secret | Description |
|--------|-------------|
| `SLACK_WEBHOOK_URL` | Slack webhook for deployment notifications |
| `AVINODE_API_KEY` | Avinode API key (for production API access) |
| `SENTRY_AUTH_TOKEN` | Sentry authentication token |

## Getting Vercel Credentials

### Method 1: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Link project (creates .vercel/project.json)
vercel link

# View credentials
cat .vercel/project.json
```

Output:
```json
{
  "projectId": "prj_xxx",
  "orgId": "team_xxx"
}
```

### Method 2: Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings → General**
4. Copy **Project ID** and **Team ID**

### Creating Vercel Token

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Name: `GitHub Actions`
4. Scope: Select your team
5. Expiration: No expiration (or set appropriate expiration)
6. Click **Create**
7. Copy the token immediately (shown only once)

## Deployment Workflow

### Automatic Deployments

```
PR Opened/Updated → Preview Deployment → Smoke Tests → PR Comment
                                                      ↓
                                               Preview URL

PR Merged to main → Production Deployment → Smoke Tests → Notification
                                                         ↓
                                                   Production URL
```

### Manual Deployments

For manual deployments, use the Vercel CLI:

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

## Environment Variables

### Setting in Vercel Dashboard

1. Go to **Project Settings → Environment Variables**
2. Add each variable for the appropriate environment:
   - **Production**: Variables for `main` branch
   - **Preview**: Variables for PR deployments
   - **Development**: Variables for local `vercel dev`

### Required Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# OpenAI
OPENAI_API_KEY=sk-...

# Avinode (Production)
AVINODE_API_KEY=your-api-key
AVINODE_API_URL=https://api.avinode.com
AVINODE_ENVIRONMENT=production
```

## Smoke Tests

The CD pipeline includes automated smoke tests:

1. **Wait for Deployment**: Polls until deployment is ready (max 2.5 minutes)
2. **Homepage Test**: Verifies homepage returns HTTP 200 or redirect
3. **Sign-In Test**: Verifies authentication page loads
4. **API Health Test**: Checks `/api/health` endpoint

### Custom Smoke Tests

Add custom tests in the workflow:

```yaml
- name: Custom Test
  run: |
    response=$(curl -sS "${{ steps.set-url.outputs.url }}/api/custom")
    echo "Response: $response"
    # Add assertions
```

## Notifications

### Slack Integration

1. Create a Slack webhook:
   - Go to [Slack Apps](https://api.slack.com/apps)
   - Create New App → From scratch
   - Add **Incoming Webhooks** feature
   - Create webhook for your channel

2. Add `SLACK_WEBHOOK_URL` to GitHub secrets

### Notification Contents

- Environment (Production/Preview)
- Deployment status
- Branch and commit info
- Direct link to deployment

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs
2. Verify all secrets are set correctly
3. Check Vercel dashboard for detailed errors

### Smoke Tests Fail

1. Deployment might still be initializing
2. Check if the URL is accessible
3. Review application logs in Vercel

### Missing Environment Variables

Error: `Error: Environment variable X is not set`

Solution: Add missing variable to Vercel project settings

### Build Fails

1. Check `vercel build` output in Actions logs
2. Try building locally: `npm run build`
3. Verify all dependencies are installed

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Use environment-specific secrets** (different keys for prod/staging)
3. **Rotate tokens regularly** (especially after team changes)
4. **Limit token scopes** where possible
5. **Use Vercel's built-in environment variables** for sensitive data

## Monitoring

### Vercel Analytics

Automatically enabled for Vercel deployments:
- Real-time visitor analytics
- Performance metrics
- Error tracking

### Sentry Integration

Configure Sentry for production error monitoring:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...
SENTRY_ORG=your-org
SENTRY_PROJECT=jetvision
```

## Related Documentation

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Project Architecture](../architecture/MULTI_AGENT_SYSTEM.md)
