# Supabase MCP Server

Model Context Protocol (MCP) server for interacting with Supabase database.

## Features

### Available Tools

1. **`supabase_query`** - Execute SELECT queries
   - Filter records
   - Order results
   - Pagination support

2. **`supabase_insert`** - Insert records
   - Single or batch insert
   - Return inserted records

3. **`supabase_update`** - Update records
   - Filter-based updates
   - Return updated records

4. **`supabase_delete`** - Delete records
   - Filter-based deletion
   - Optional return deleted records

5. **`supabase_rpc`** - Call stored procedures/functions

6. **`supabase_list_tables`** - List all accessible tables

7. **`supabase_describe_table`** - Get table schema information

8. **`supabase_count`** - Count records with optional filters

## Configuration

The server uses environment variables from the project root `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Usage Examples

### Query Records

```json
{
  "table": "requests",
  "select": "id, status, created_at",
  "filters": {
    "status": "pending",
    "created_by": "user-123"
  },
  "orderBy": {
    "column": "created_at",
    "ascending": false
  },
  "limit": 10
}
```

### Insert Records

```json
{
  "table": "requests",
  "data": {
    "client_id": "client-456",
    "status": "pending",
    "created_by": "user-123"
  },
  "returning": true
}
```

### Update Records

```json
{
  "table": "requests",
  "filters": {
    "id": "request-789"
  },
  "data": {
    "status": "completed"
  },
  "returning": true
}
```

### Count Records

```json
{
  "table": "requests",
  "filters": {
    "status": "pending"
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## Security

- Uses service role key (bypasses RLS)
- Only accessible through MCP protocol
- Not exposed to client-side code
- Logs all database operations

## Notes

- All timestamps are in UTC
- UUIDs are used for primary keys
- Tables follow snake_case naming convention
- Foreign keys use `_id` suffix
