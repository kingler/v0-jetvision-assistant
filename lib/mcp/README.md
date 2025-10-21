# MCP (Model Context Protocol) Integration

This directory contains MCP client configuration and utilities for connecting AI agents to external services.

## Files

- `client.ts` - MCP client initialization and connection management
- `types.ts` - TypeScript types for MCP tools and responses

## Available MCP Servers

1. **Avinode MCP Server**
   - `search_flights` - Search available aircraft
   - `create_rfp` - Create RFP request
   - `get_quotes` - Retrieve operator quotes

2. **Gmail MCP Server**
   - `send_email` - Send emails
   - `get_threads` - Retrieve email threads

3. **Google Sheets MCP Server**
   - `sync_clients` - Sync client database
   - `get_client` - Fetch client profile

## Usage

Agents call MCP tools through the OpenAI function calling mechanism.

See [Model Context Protocol Documentation](https://modelcontextprotocol.io) for more details.
