# Common Pitfalls

**Version**: 1.0.0
**Last Updated**: October 20, 2025

---

## 📋 Overview

This guide covers common mistakes, gotchas, and troubleshooting tips for JetVision development.

---

## 🔐 Authentication & Authorization

### Pitfall: Forgetting to Set Clerk Context

**Problem**: RLS policies don't work, queries return no data

```typescript
// ❌ BAD
const { data } = await supabase.from('requests').select()
// Returns empty array due to RLS

// ✅ GOOD
await supabase.rpc('set_clerk_user_context', { user_id: clerkUserId })
const { data } = await supabase.from('requests').select()
```

### Pitfall: Using Client in Server Components

**Problem**: Clerk auth() not available in Client Components

```typescript
// ❌ BAD: In Client Component
'use client'
import { auth } from '@clerk/nextjs/server'
const { userId } = auth() // Error!

// ✅ GOOD: Use server action
'use client'
async function getData() {
  const response = await fetch('/api/data') // Server route handles auth
  return response.json()
}
```

---

## 🗄️ Database

### Pitfall: Missing Await

**Problem**: Promise not awaited, code continues before database operation completes

```typescript
// ❌ BAD
const result = supabase.from('requests').insert(data) // Missing await!
console.log(result) // Logs Promise, not data

// ✅ GOOD
const { data, error } = await supabase.from('requests').insert(data)
if (error) throw error
console.log(data)
```

### Pitfall: Not Checking for Errors

```typescript
// ❌ BAD
const { data } = await supabase.from('requests').select()
return data[0].id // Might throw if error occurred

// ✅ GOOD
const { data, error } = await supabase.from('requests').select()
if (error) throw new Error(`Database error: ${error.message}`)
if (!data || data.length === 0) {
  throw new Error('No data found')
}
return data[0].id
```

---

## 🔄 BullMQ

### Pitfall: Not Handling Job Failures

```typescript
// ❌ BAD: Job fails silently
const worker = new Worker('my-queue', async (job) => {
  await processData(job.data) // If this throws, job fails silently
})

// ✅ GOOD: Proper error handling
const worker = new Worker('my-queue', async (job) => {
  try {
    await processData(job.data)
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error)
    await notifyError(error)
    throw error // Re-throw for BullMQ to handle retries
  }
})
```

### Pitfall: Memory Leaks in Workers

```typescript
// ❌ BAD: Connection not closed
const worker = new Worker('my-queue', async (job) => {
  const db = new DatabaseConnection()
  await db.query(...)
  // Connection never closed!
})

// ✅ GOOD: Clean up resources
const worker = new Worker('my-queue', async (job) => {
  const db = new DatabaseConnection()
  try {
    return await db.query(...)
  } finally {
    await db.close()
  }
})
```

---

## 🤖 AI Agents

### Pitfall: Not Validating Tool Arguments

```typescript
// ❌ BAD: No validation
tools: [{
  function: {
    name: 'search_flights',
    async handler(args) {
      return api.search(args.departure, args.arrival)
      // What if args.departure is undefined?
    }
  }
}]

// ✅ GOOD: Validate first
tools: [{
  function: {
    name: 'search_flights',
    async handler(args) {
      if (!args.departure || !args.arrival) {
        throw new Error('Missing required arguments')
      }
      return api.search(args.departure, args.arrival)
    }
  }
}]
```

### Pitfall: Token Limit Exceeded

```typescript
// ❌ BAD: Sending too much context
const session = await agent.run({
  context: {
    allFlights: [...], // 1000+ flights, exceeds token limit
    allHistory: [...], // Client's entire history
  }
})

// ✅ GOOD: Summarize or paginate
const session = await agent.run({
  context: {
    topFlights: topFlights.slice(0, 10),
    recentHistory: history.slice(0, 5),
  }
})
```

---

## 🔌 MCP Integration

### Pitfall: Not Handling MCP Server Failures

```typescript
// ❌ BAD: No fallback
const flights = await mcpClient.callTool('avinode', {
  tool: 'search_flights',
  arguments: criteria,
})

// ✅ GOOD: Fallback strategy
try {
  const flights = await mcpClient.callTool('avinode', {
    tool: 'search_flights',
    arguments: criteria,
  })
  return flights
} catch (error) {
  console.error('Avinode MCP error:', error)

  // Fallback to cached data or notify user
  return getCachedFlights(criteria) || []
}
```

---

## 🌐 API Integration

### Pitfall: Not Handling Rate Limits

```typescript
// ❌ BAD: No rate limit handling
async function searchAllRoutes(routes: Route[]) {
  return Promise.all(
    routes.map(route => avinodeAPI.search(route))
  ) // Will hit rate limit!
}

// ✅ GOOD: Rate limit with delay
async function searchAllRoutes(routes: Route[]) {
  const results = []
  for (const route of routes) {
    try {
      const result = await avinodeAPI.search(route)
      results.push(result)
    } catch (error) {
      if (error.status === 429) {
        await sleep(5000) // Wait 5 seconds
        const result = await avinodeAPI.search(route)
        results.push(result)
      } else {
        throw error
      }
    }
    await sleep(200) // Small delay between requests
  }
  return results
}
```

### Pitfall: Not Validating API Responses

```typescript
// ❌ BAD: Assume response structure
const flights = response.data.results.map(f => f.aircraft.model)
// What if results is undefined?

// ✅ GOOD: Validate structure
if (!response.data || !Array.isArray(response.data.results)) {
  throw new Error('Invalid API response')
}
const flights = response.data.results.map(f => {
  if (!f.aircraft || !f.aircraft.model) {
    console.warn('Flight missing aircraft data:', f)
    return 'Unknown'
  }
  return f.aircraft.model
})
```

---

## 🧪 Testing

### Pitfall: Tests Depend on External Services

```typescript
// ❌ BAD: Test calls real API
test('search flights', async () => {
  const results = await agent.searchFlights(criteria)
  // Fails if Avinode is down!
})

// ✅ GOOD: Mock external calls
jest.mock('@/lib/mcp/client')
test('search flights', async () => {
  mcpClient.callTool.mockResolvedValue({ flights: mockData })
  const results = await agent.searchFlights(criteria)
  expect(results).toEqual(mockData)
})
```

---

## 🐛 Debugging Tips

### Enable Debug Logging

```typescript
// Add to agent code
if (process.env.DEBUG === 'true') {
  console.log('Agent context:', context)
  console.log('Tool calls:', toolCalls)
  console.log('Response:', response)
}
```

### Check BullMQ Dashboard

```bash
# View queue status
npm run queue:status

# View failed jobs
npm run queue:failed
```

### Verify Environment Variables

```bash
# Check .env.local
cat .env.local | grep AVINODE_API_KEY

# Or add to startup
console.log('Env vars:', {
  openai: !!process.env.OPENAI_API_KEY,
  avinode: !!process.env.AVINODE_API_KEY,
  clerk: !!process.env.CLERK_SECRET_KEY,
})
```

---

## 📚 Related Documentation

- [Best Practices](./best-practices.md)
- [Integration Patterns](./integration-patterns.md)
- [All Agents](../agents/)

---

**Version**: 1.0.0 | **Last Updated**: Oct 20, 2025
