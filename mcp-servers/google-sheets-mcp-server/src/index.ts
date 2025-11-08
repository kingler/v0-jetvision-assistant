#!/usr/bin/env node

/**
 * Google Sheets MCP Server
 *
 * Provides MCP tools for interacting with Google Sheets for client database:
 * - search_client: Search for client in Google Sheets database
 * - read_sheet: Read data from specific sheet range
 * - write_sheet: Write data to specific sheet range
 * - update_client: Update client information
 * - create_client: Create new client record
 * - list_clients: List all clients
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { google, sheets_v4 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  SearchClientParams,
  ReadSheetParams,
  WriteSheetParams,
  UpdateClientParams,
  CreateClientParams,
  ClientData,
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
config({ path: resolve(__dirname, '../../../.env.local') });

// Validate environment variables
const spreadsheetId = process.env.GOOGLE_SHEETS_CLIENT_DATABASE_ID;
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!spreadsheetId) {
  console.error('Error: Missing GOOGLE_SHEETS_CLIENT_DATABASE_ID in .env.local');
  process.exit(1);
}

if (!credentialsPath) {
  console.error('Error: Missing GOOGLE_APPLICATION_CREDENTIALS in .env.local');
  console.error('Please provide path to Google service account JSON file');
  process.exit(1);
}

// Initialize Google Sheets API client
const auth = new GoogleAuth({
  keyFile: credentialsPath,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

let sheetsClient: sheets_v4.Sheets;

async function initializeSheetsClient(): Promise<void> {
  const authClient = await auth.getClient();
  sheetsClient = google.sheets({ version: 'v4', auth: authClient as any });
  console.error('Google Sheets client initialized');
}

// Define MCP tools
const tools: Tool[] = [
  {
    name: 'search_client',
    description:
      'Search for a client in the Google Sheets client database by name. Returns client profile if found.',
    inputSchema: {
      type: 'object',
      properties: {
        clientName: {
          type: 'string',
          description: 'Name of the client to search for',
        },
        exactMatch: {
          type: 'boolean',
          description: 'Whether to require exact name match (default: false)',
        },
      },
      required: ['clientName'],
    },
  },
  {
    name: 'read_sheet',
    description:
      'Read data from a specific range in the Google Sheets client database',
    inputSchema: {
      type: 'object',
      properties: {
        range: {
          type: 'string',
          description: 'Sheet range to read (e.g., "Clients!A1:H10" or "A1:H")',
        },
        sheetName: {
          type: 'string',
          description: 'Optional sheet name (default: "Clients")',
        },
      },
      required: ['range'],
    },
  },
  {
    name: 'write_sheet',
    description: 'Write data to a specific range in the Google Sheets',
    inputSchema: {
      type: 'object',
      properties: {
        range: {
          type: 'string',
          description: 'Sheet range to write to (e.g., "Clients!A2:H2")',
        },
        values: {
          type: 'array',
          description: 'Array of rows to write (each row is an array of values)',
          items: {
            type: 'array',
            items: {
              type: ['string', 'number', 'boolean', 'null'],
            },
          },
        },
        sheetName: {
          type: 'string',
          description: 'Optional sheet name (default: "Clients")',
        },
      },
      required: ['range', 'values'],
    },
  },
  {
    name: 'update_client',
    description:
      'Update existing client information in the Google Sheets database',
    inputSchema: {
      type: 'object',
      properties: {
        clientName: {
          type: 'string',
          description: 'Name of the client to update',
        },
        data: {
          type: 'object',
          description: 'Client data to update',
          properties: {
            email: { type: 'string' },
            phone: { type: 'string' },
            company: { type: 'string' },
            vipStatus: {
              type: 'string',
              enum: ['standard', 'vip', 'ultra_vip'],
            },
            preferences: { type: 'object' },
            notes: { type: 'string' },
            lastContact: { type: 'string' },
          },
        },
      },
      required: ['clientName', 'data'],
    },
  },
  {
    name: 'create_client',
    description: 'Create a new client record in the Google Sheets database',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: 'Client data for new record',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            company: { type: 'string' },
            vipStatus: {
              type: 'string',
              enum: ['standard', 'vip', 'ultra_vip'],
            },
            preferences: { type: 'object' },
            notes: { type: 'string' },
            lastContact: { type: 'string' },
          },
          required: ['name', 'email'],
        },
      },
      required: ['data'],
    },
  },
  {
    name: 'list_clients',
    description: 'List all clients from the Google Sheets database',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of clients to return (default: 100)',
        },
      },
    },
  },
];

// Initialize MCP server
const server = new Server(
  {
    name: 'google-sheets-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_client': {
        const params = args as unknown as SearchClientParams;
        const result = await searchClient(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'read_sheet': {
        const params = args as unknown as ReadSheetParams;
        const result = await readSheet(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'write_sheet': {
        const params = args as unknown as WriteSheetParams;
        const result = await writeSheet(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_client': {
        const params = args as unknown as UpdateClientParams;
        const result = await updateClient(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_client': {
        const params = args as unknown as CreateClientParams;
        const result = await createClient(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_clients': {
        const limit = (args as { limit?: number })?.limit || 100;
        const result = await listClients(limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Tool implementation functions

async function searchClient(
  params: SearchClientParams
): Promise<{ found: boolean; data: ClientData | null; row?: number }> {
  const { clientName, exactMatch = false } = params;

  // Read all clients from sheet
  const response = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: 'Clients!A2:H', // Skip header row
  });

  const rows = response.data.values || [];
  const normalizedSearchName = clientName.toLowerCase().trim();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowName = (row[0] || '').toLowerCase().trim();

    const isMatch = exactMatch
      ? rowName === normalizedSearchName
      : rowName.includes(normalizedSearchName) ||
        normalizedSearchName.includes(rowName);

    if (isMatch) {
      return {
        found: true,
        row: i + 2, // +2 because we start at row 2 (skipped header)
        data: {
          name: row[0] || '',
          email: row[1] || '',
          phone: row[2] || '',
          company: row[3] || '',
          vipStatus: (row[4] || 'standard') as 'standard' | 'vip' | 'ultra_vip',
          preferences: row[5] ? JSON.parse(row[5]) : {},
          notes: row[6] || '',
          lastContact: row[7] || '',
        },
      };
    }
  }

  return { found: false, data: null };
}

async function readSheet(params: ReadSheetParams): Promise<any[][]> {
  const { range, sheetName = 'Clients' } = params;
  const fullRange = range.includes('!') ? range : `${sheetName}!${range}`;

  const response = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: fullRange,
  });

  return response.data.values || [];
}

async function writeSheet(
  params: WriteSheetParams
): Promise<{ success: boolean; updatedCells: number }> {
  const { range, values, sheetName = 'Clients' } = params;
  const fullRange = range.includes('!') ? range : `${sheetName}!${range}`;

  const response = await sheetsClient.spreadsheets.values.update({
    spreadsheetId,
    range: fullRange,
    valueInputOption: 'RAW',
    requestBody: {
      values,
    },
  });

  return {
    success: true,
    updatedCells: response.data.updatedCells || 0,
  };
}

async function updateClient(
  params: UpdateClientParams
): Promise<{ success: boolean; message: string }> {
  const { clientName, data } = params;

  // Find client
  const searchResult = await searchClient({ clientName, exactMatch: true });

  if (!searchResult.found || !searchResult.row) {
    return {
      success: false,
      message: `Client "${clientName}" not found`,
    };
  }

  // Merge existing data with updates
  const updatedData = {
    ...searchResult.data!,
    ...data,
  };

  // Convert to row format
  const row = [
    updatedData.name,
    updatedData.email,
    updatedData.phone || '',
    updatedData.company || '',
    updatedData.vipStatus || 'standard',
    JSON.stringify(updatedData.preferences || {}),
    updatedData.notes || '',
    updatedData.lastContact || new Date().toISOString(),
  ];

  // Update the row
  await writeSheet({
    range: `Clients!A${searchResult.row}:H${searchResult.row}`,
    values: [row],
  });

  return {
    success: true,
    message: `Client "${clientName}" updated successfully`,
  };
}

async function createClient(
  params: CreateClientParams
): Promise<{ success: boolean; message: string; row: number }> {
  const { data } = params;

  // Check if client already exists
  const existing = await searchClient({ clientName: data.name, exactMatch: true });

  if (existing.found) {
    return {
      success: false,
      message: `Client "${data.name}" already exists`,
      row: existing.row || 0,
    };
  }

  // Find next empty row
  const response = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: 'Clients!A:A',
  });

  const nextRow = (response.data.values?.length || 1) + 1;

  // Create row data
  const row = [
    data.name,
    data.email,
    data.phone || '',
    data.company || '',
    data.vipStatus || 'standard',
    JSON.stringify(data.preferences || {}),
    data.notes || '',
    data.lastContact || new Date().toISOString(),
  ];

  // Append to sheet
  await sheetsClient.spreadsheets.values.append({
    spreadsheetId,
    range: 'Clients!A:H',
    valueInputOption: 'RAW',
    requestBody: {
      values: [row],
    },
  });

  return {
    success: true,
    message: `Client "${data.name}" created successfully`,
    row: nextRow,
  };
}

async function listClients(limit: number): Promise<ClientData[]> {
  const response = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: `Clients!A2:H${Math.min(limit + 1, 1000)}`, // +1 for header, max 1000
  });

  const rows = response.data.values || [];

  return rows.map((row) => ({
    name: row[0] || '',
    email: row[1] || '',
    phone: row[2] || '',
    company: row[3] || '',
    vipStatus: (row[4] || 'standard') as 'standard' | 'vip' | 'ultra_vip',
    preferences: row[5] ? JSON.parse(row[5]) : {},
    notes: row[6] || '',
    lastContact: row[7] || '',
  }));
}

// Start the server
async function main() {
  await initializeSheetsClient();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Google Sheets MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
