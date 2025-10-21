# MCP Servers

This directory contains custom MCP server implementations for external service integrations.

## Server Implementations

Each MCP server is a Node.js application that follows the Model Context Protocol specification.

### 1. Avinode MCP Server
**Directory**: `avinode-server/`
- Connects to Avinode API
- Provides flight search and RFP tools
- Handles webhook responses

### 2. Gmail MCP Server
**Directory**: `gmail-server/`
- Connects to Gmail API
- Provides email sending and retrieval tools
- Manages OAuth authentication

### 3. Google Sheets MCP Server
**Directory**: `sheets-server/`
- Connects to Google Sheets API
- Syncs client database
- Provides client profile lookups

## Running MCP Servers

Each server can be run independently:

```bash
cd mcp-servers/avinode-server
npm install
npm start
```

## Configuration

Each server requires API credentials set in `.env` files:

```env
# Avinode
AVINODE_API_KEY=your_key
AVINODE_API_SECRET=your_secret

# Gmail
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_REFRESH_TOKEN=your_token

# Sheets
GOOGLE_SERVICE_ACCOUNT_KEY=your_key.json
GOOGLE_SHEET_ID=your_sheet_id
```

## Development

See individual server READMEs for development guidelines.

Reference: [Model Context Protocol](https://modelcontextprotocol.io)
