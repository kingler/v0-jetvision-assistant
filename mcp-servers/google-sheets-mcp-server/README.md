# Google Sheets MCP Server

MCP server for Google Sheets integration with JetVision client database.

## Overview

This MCP server provides tools for:
- Searching client records in Google Sheets
- Reading and writing sheet data
- Creating and updating client information
- Listing all clients

## Features

### Tools

1. **search_client** - Search for client by name
2. **read_sheet** - Read data from specific range
3. **write_sheet** - Write data to specific range
4. **update_client** - Update existing client
5. **create_client** - Create new client record
6. **list_clients** - List all clients

## Prerequisites

### 1. Google Cloud Project Setup

1. Create a Google Cloud project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable Google Sheets API
3. Create a service account
4. Download service account JSON credentials

### 2. Google Sheets Setup

Create a Google Sheet with the following structure:

**Sheet Name**: `Clients`

**Columns** (Row 1 - Header):
| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| Name | Email | Phone | Company | VIP Status | Preferences | Notes | Last Contact |

**Example Data** (Row 2+):
```
John Smith | john@example.com | +1-555-0100 | Acme Corp | vip | {"aircraftType":["Citation X"]} | VIP client | 2025-01-15T10:00:00Z
```

### 3. Environment Variables

Add to `.env.local`:

```env
# Google Sheets MCP Server
GOOGLE_SHEETS_CLIENT_DATABASE_ID=your-spreadsheet-id-here
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

**Finding your Spreadsheet ID**:
The spreadsheet ID is in the URL:
```
https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
```

### 4. Service Account Permissions

1. Open your Google Sheet
2. Click "Share"
3. Add your service account email (e.g., `my-service@project.iam.gserviceaccount.com`)
4. Grant "Editor" permissions

## Installation

```bash
cd mcp-servers/google-sheets-mcp-server
pnpm install
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Usage Examples

### Search Client

```typescript
// MCP Tool Call
{
  tool: 'search_client',
  arguments: {
    clientName: 'John Smith',
    exactMatch: false
  }
}

// Response
{
  "found": true,
  "row": 2,
  "data": {
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "+1-555-0100",
    "company": "Acme Corp",
    "vipStatus": "vip",
    "preferences": {
      "aircraftType": ["Citation X"]
    },
    "notes": "VIP client",
    "lastContact": "2025-01-15T10:00:00Z"
  }
}
```

### Update Client

```typescript
// MCP Tool Call
{
  tool: 'update_client',
  arguments: {
    clientName: 'John Smith',
    data: {
      vipStatus: 'ultra_vip',
      notes: 'Upgraded to Ultra VIP - frequent flyer',
      lastContact: new Date().toISOString()
    }
  }
}

// Response
{
  "success": true,
  "message": "Client \"John Smith\" updated successfully"
}
```

### Create Client

```typescript
// MCP Tool Call
{
  tool: 'create_client',
  arguments: {
    data: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1-555-0200',
      company: 'Tech Startup Inc',
      vipStatus: 'standard',
      preferences: {
        aircraftType: ['Gulfstream G650'],
        amenities: ['WiFi', 'Catering']
      },
      notes: 'New client - prefers morning flights',
      lastContact: new Date().toISOString()
    }
  }
}

// Response
{
  "success": true,
  "message": "Client \"Jane Doe\" created successfully",
  "row": 3
}
```

### List All Clients

```typescript
// MCP Tool Call
{
  tool: 'list_clients',
  arguments: {
    limit: 50
  }
}

// Response
[
  {
    "name": "John Smith",
    "email": "john@example.com",
    ...
  },
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    ...
  }
]
```

## Agent Integration

### Client Data Manager Agent

```typescript
import { MCPClient } from '@/lib/mcp/client'

const mcpClient = new MCPClient()

// Search for client
const result = await mcpClient.callTool('google-sheets', {
  tool: 'search_client',
  arguments: {
    clientName: 'John Smith',
  },
})

if (result.found) {
  console.log('Client VIP Status:', result.data.vipStatus)
  console.log('Preferences:', result.data.preferences)
}
```

## Data Schema

### ClientData Type

```typescript
interface ClientData {
  name: string
  email: string
  phone?: string
  company?: string
  vipStatus?: 'standard' | 'vip' | 'ultra_vip'
  preferences?: {
    aircraftType?: string[]
    amenities?: string[]
    budgetRange?: {
      min: number
      max: number
    }
  }
  notes?: string
  lastContact?: string  // ISO 8601 date string
}
```

## Error Handling

The server returns structured error responses:

```json
{
  "content": [{
    "type": "text",
    "text": "Error executing tool: Client not found"
  }],
  "isError": true
}
```

## Testing

```bash
# Test connection
npx tsx src/index.ts

# Expected output:
# Google Sheets client initialized
# Google Sheets MCP server running on stdio
```

## Troubleshooting

### Error: Missing GOOGLE_SHEETS_CLIENT_DATABASE_ID

Add the spreadsheet ID to `.env.local`:
```env
GOOGLE_SHEETS_CLIENT_DATABASE_ID=1AbC...XyZ
```

### Error: Missing GOOGLE_APPLICATION_CREDENTIALS

Download service account JSON from Google Cloud Console and set path:
```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

### Error: Permission denied

1. Open your Google Sheet
2. Share with service account email
3. Grant "Editor" access

### Error: Spreadsheet not found

Verify:
1. Spreadsheet ID is correct
2. Service account has access
3. Sheet name is "Clients" (case-sensitive)

## Security Notes

- **Never commit** service account JSON files to git
- Store credentials in `.env.local` (gitignored)
- Use service accounts, not OAuth tokens
- Grant minimum necessary permissions
- Regularly rotate service account keys

## Related Documentation

- [Client Data Manager Agent](../../docs/subagents/agents/client-data/README.md)
- [MCP Server Template](../TEMPLATE.md)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 2025 | Initial implementation |
