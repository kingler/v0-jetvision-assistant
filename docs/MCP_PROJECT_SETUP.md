# JetVision Project MCP Configuration

**Project-Scoped MCP Setup for Team Collaboration**

---

## Overview

This project uses **project-scoped MCP servers** that are shared with all team members through git. The configuration is stored in `.mcp.json` at the project root and is committed to version control.

## MCP Servers Configured

### Supabase Database MCP

**Purpose**: Direct database access for Claude Code to query, insert, update, and manage data in the Supabase database.

**Location**: `mcp-servers/supabase-mcp-server/`

**Configuration**: See `.mcp.json` in project root

**Available Tools**:
- `supabase_query` - Execute SELECT queries
- `supabase_insert` - Insert records
- `supabase_update` - Update records
- `supabase_delete` - Delete records
- `supabase_rpc` - Call stored procedures
- `supabase_list_tables` - List all tables
- `supabase_describe_table` - Get table schema
- `supabase_count` - Count records

---

## Setup for New Team Members

### 1. Clone the Repository

```bash
git clone <repo-url>
cd v0-jetvision-assistant
```

### 2. Install Dependencies

```bash
# Install root dependencies
pnpm install

# Install MCP server dependencies
cd mcp-servers/supabase-mcp-server
pnpm install
cd ../..
```

### 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local` (if it exists) or create `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://sbzaevawnjlrsjsuevli.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get-from-team>
SUPABASE_SERVICE_ROLE_KEY=<get-from-team>
```

**Security Note**: Never commit `.env.local` to git!

### 4. Approve Project MCP Servers

When you first open the project in Claude Code, you'll see a prompt to approve the MCP servers defined in `.mcp.json`.

**Choose**: "Approve for this project"

This is a security feature to prevent malicious MCP servers from running automatically.

### 5. Restart Claude Code

After approving, restart Claude Code to activate the MCP servers:

```bash
# Exit Claude Code and restart
claude
```

### 6. Verify MCP Connection

In Claude Code, check that the Supabase MCP is loaded:

```
> /mcp
```

You should see "supabase" in the list of connected servers.

---

## Using the Supabase MCP

Once configured, you can ask Claude Code to interact with the database:

```
"Show me all tables in the database"
"Query the requests table for pending requests"
"How many clients are in the database?"
"Insert a test request for client ABC"
"Describe the structure of the quotes table"
```

Claude Code will automatically use the Supabase MCP tools to execute these requests.

---

## File Structure

```
v0-jetvision-assistant/
├── .mcp.json                           # ✅ Project MCP config (COMMITTED)
├── .env.local                          # ❌ Environment variables (NOT COMMITTED)
├── mcp-servers/
│   └── supabase-mcp-server/
│       ├── src/
│       │   ├── index.ts               # MCP server implementation
│       │   └── types.ts               # Type definitions
│       ├── package.json
│       └── README.md
└── docs/
    ├── MCP_PROJECT_SETUP.md           # This file
    └── SUPABASE_MCP_SETUP.md          # Detailed MCP documentation
```

---

## MCP Scope Explanation

This project uses **project scope** for the Supabase MCP:

| Scope | Description | Location | Committed? |
|-------|-------------|----------|------------|
| **Project** | Shared with team | `.mcp.json` | ✅ Yes |
| User | Personal across all projects | User config | ❌ No |
| Local | Personal in this project | User config | ❌ No |

**Why project scope?**
- Everyone on the team gets the same tools
- Configuration is version controlled
- Easy onboarding for new team members
- Consistent development environment

---

## Security Considerations

### What's Committed
✅ `.mcp.json` - MCP server configuration (no secrets)
✅ `mcp-servers/` - MCP server code
✅ Documentation

### What's NOT Committed
❌ `.env.local` - Contains sensitive API keys
❌ User-level MCP configurations
❌ Authentication tokens

### MCP Server Security
- The Supabase MCP uses the **service role key** (bypasses RLS)
- Runs locally on your machine (not exposed to internet)
- Only accessible through Claude Code's MCP protocol
- Requires user approval before first use

---

## Troubleshooting

### MCP Server Not Appearing

**Issue**: Supabase MCP doesn't show up in `/mcp`

**Solutions**:
1. Check `.mcp.json` exists at project root
2. Approve the MCP server when prompted
3. Restart Claude Code
4. Run: `cd mcp-servers/supabase-mcp-server && pnpm install`

### Environment Variable Errors

**Issue**: "Missing env.NEXT_PUBLIC_SUPABASE_URL"

**Solutions**:
1. Verify `.env.local` exists at project root
2. Check all required variables are set
3. Get credentials from team lead if missing

### Connection Errors

**Issue**: "Failed to connect to Supabase"

**Solutions**:
1. Run test: `npx tsx scripts/test-supabase-connection.ts`
2. Verify Supabase URL is correct
3. Check service role key is valid
4. Ensure you have network connectivity

### Reset MCP Approval

**Issue**: Need to re-approve MCP servers

**Solution**:
```bash
claude mcp reset-project-choices
```

---

## Adding More MCP Servers

To add additional project-scoped MCP servers:

### Method 1: Using CLI (Recommended)
```bash
claude mcp add --scope project <name> --transport <type> -- <command>
```

### Method 2: Edit .mcp.json Directly
```json
{
  "mcpServers": {
    "supabase": { ... },
    "new-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "your-mcp-server"],
      "env": {}
    }
  }
}
```

Then commit the changes:
```bash
git add .mcp.json
git commit -m "Add new MCP server"
git push
```

---

## Resources

- [Supabase MCP Documentation](./SUPABASE_MCP_SETUP.md)
- [Claude Code MCP Guide](https://docs.anthropic.com/claude-code/mcp)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Project Architecture](./architecture/MULTI_AGENT_SYSTEM.md)

---

## Support

**Questions?** Ask in:
- Team Slack: #jetvision-dev
- GitHub Discussions
- Tech lead: [contact info]

**Issues?** Report in:
- GitHub Issues
- Team Slack: #jetvision-support

---

**Last Updated**: 2025-10-21
**Maintained By**: DevOps Team
