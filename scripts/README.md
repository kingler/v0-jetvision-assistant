# Scripts Directory

Utility scripts for development, testing, and service management.

## Service Management

### Redis Scripts

**Start Redis**
```bash
npm run redis:start
```
Starts Redis using Docker Compose with persistent storage.

**Stop Redis**
```bash
npm run redis:stop
```
Stops Redis container (data is preserved).

**Check Redis Status**
```bash
npm run redis:status
```
Shows Redis container status, version, memory usage, and connection info.

## Service Verification

**Verify All Services**
```bash
npm run verify-services
```
Tests connectivity to:
- Redis (BullMQ task queue)
- Supabase (database)
- Clerk (authentication)
- OpenAI (AI agents)

Displays detailed status for each service and identifies configuration issues.

## Script Files

### Redis Management
- `redis-start.sh` - Starts Redis with Docker Compose
- `redis-stop.sh` - Stops Redis container
- `redis-status.sh` - Shows Redis status and metrics

### Service Verification
- `verify-services.ts` - Tests all service connections

## Usage Examples

### First Time Setup
```bash
# 1. Ensure Docker is running
docker info

# 2. Start Redis
npm run redis:start

# 3. Verify all services
npm run verify-services
```

### Daily Development
```bash
# Start Redis (if not already running)
npm run redis:start

# Check everything is working
npm run verify-services

# Start development
npm run dev
```

### Troubleshooting
```bash
# Check Redis status
npm run redis:status

# View Redis logs
docker logs jetvision-redis

# Restart Redis
npm run redis:stop && npm run redis:start

# Test individual services
npm run verify-services
```

## Environment Variables

All scripts respect `.env.local` configuration:
- `REDIS_URL` - Redis connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `OPENAI_API_KEY` - OpenAI API key

See `.env.local.example` for complete configuration.
