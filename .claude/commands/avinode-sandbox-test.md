# Avinode Sandbox Integration Test

Test the complete Avinode RFP workflow end-to-end using Chrome browser automation. Simulates both ISO Agent and Operator roles in a single session.

## Parameters:

- **Phase** (optional): Run a specific phase only
  - `1` - Login to Avinode Sandbox
  - `2` - ISO Agent: Create trip via Jetvision & send RFP in Avinode
  - `3` - Switch to Operator role & submit quote
  - `4` - Switch back to ISO Agent & verify quote received
  - `5` - Verification summary (database + UI checks)
  - `all` - Full workflow (default)
- Usage: `/avinode-sandbox-test [phase]`

## Prerequisites:

1. Chrome browser open with Claude-in-Chrome extension active
2. Jetvision dev server running (`npm run dev:app`)
3. Valid Avinode Sandbox credentials (resets every Monday)

## Actions to Execute:

**IMPORTANT:** You MUST invoke the `avinode-sandbox-test` skill using the Skill tool BEFORE taking any action. The skill contains the full phase-by-phase workflow with browser automation steps.

```
Skill: avinode-sandbox-test
Args: $ARGUMENTS
```

Follow the skill's instructions exactly. Do not proceed without loading it first.

### Phase Summary:

| Phase | Action | Tool Focus |
|-------|--------|-----------|
| 1 | Login to Avinode Sandbox marketplace | `tabs_create_mcp`, `form_input`, `computer` |
| 2 | Create trip in Jetvision chat, open deep link, select operator, send RFP | `form_input`, `navigate`, `computer` |
| 3 | Switch to Operator via header dropdown, find RFP, submit $45K quote | `computer`, `form_input`, `read_page` |
| 4 | Switch back to ISO Agent, verify quote in Avinode + Jetvision UI | `read_page`, `navigate`, `upload_image` |
| 5 | Query Supabase for webhook events, generate pass/fail report | Supabase MCP tools |

## Sandbox Credentials:

```
URL: https://marketplace.avinode.com
Email: kingler@me.com
Password: 2FRhgGZK3wSy8SY
```

## Success Indicators:

- Login successful, marketplace dashboard visible
- Trip created with valid deep link
- RFP sent to Sandbox Seller
- Operator received and responded to RFP
- Quote appears in both Avinode UI and Jetvision app
- Webhook event stored in `avinode_webhook_events` table

## Troubleshooting:

### Chrome Extension Not Responding
- Ensure Claude-in-Chrome extension is installed and active
- Check that Chrome is running and accessible
- Try `mcp__claude-in-chrome__tabs_context_mcp` to test connection

### Login Fails
- API key resets every Monday morning
- Run `/avinode-sandbox-reset` if stale data is present
- Verify credentials haven't changed

### Webhook Not Received
- Check that the Jetvision dev server is running on port 3000
- Verify the webhook URL is configured in Avinode Sandbox settings
- Check the Next.js console for webhook endpoint logs
- Wait 15-30 seconds and retry — sandbox webhooks can be delayed

### Quote Not Showing in Jetvision
- Check the SSE connection status in the Jetvision UI
- Verify the `avinode_webhook_events` table has the event
- Check for errors in the browser console: `mcp__claude-in-chrome__read_console_messages`

## Related Commands:

- `/avinode-test` - API connectivity testing (no browser needed)
- `/avinode-sandbox-reset` - Clean up stale sandbox data
