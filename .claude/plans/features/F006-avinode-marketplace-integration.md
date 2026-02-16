# Feature ID: F006
# Feature Name: Avinode Marketplace Integration
# Status: Implemented
# Priority: Critical

## Description
Deep integration with the Avinode charter flight marketplace via MCP servers and webhooks. Enables the ISO agent to create trips, receive real-time operator quotes, and communicate with operators through a human-in-the-loop deep link workflow that combines AI automation with manual operator selection in Avinode's web UI.

## Business Value
Avinode is the industry-standard marketplace for charter flight brokerage. This integration eliminates the need for sales reps to manually switch between the Jetvision assistant and Avinode, streamlining the RFP-to-quote pipeline and reducing quote turnaround time from hours to minutes. Real-time webhook processing ensures no operator response is missed.

## Key Capabilities
- Deep link workflow: create trip via MCP, receive deep link URL, open Avinode Web UI for manual operator selection
- Webhook event processing for three event types: TripRequestSellerResponse (operator quotes), TripChatSeller (operator messages), TripChatMine (sent message confirmations)
- Real-time SSE (Server-Sent Events) updates pushing new quotes and messages to the frontend
- 3-party operator messaging: ISO agent communicates through AI, which relays to/from operators
- Trip management: create and cancel trips programmatically
- Empty leg flight search for cost-effective positioning
- Airport search by ICAO/IATA code or name
- Connection status monitoring with visual indicator
- Authentication status display for Avinode API credentials
- Webhook status indicator showing event processing health
- Action required banner when manual steps are needed in Avinode

## Related Epics
- [[EPIC013-deep-link-workflow|EPIC013 - Deep Link Workflow]]
- [[EPIC014-webhook-processing|EPIC014 - Webhook Processing]]
- [[EPIC015-operator-messaging|EPIC015 - Operator Messaging]]

## Dependencies
- [[F010-multi-agent-infrastructure|F010 - Multi-Agent Infrastructure (MCP server transport and agent execution)]]

## Technical Components
- `mcp-servers/avinode-mcp-server/` - Avinode MCP server with 8 tools (create_trip, get_rfq, get_quote, cancel_trip, send_trip_message, get_trip_messages, search_airports, search_empty_legs)
- `app/api/webhooks/avinode/` - Webhook endpoint for receiving Avinode events
- `app/api/avinode/events/` - SSE endpoint for real-time frontend updates
- `components/avinode/` - 20+ UI components including TripSummaryCard, AvinodeDeepLinks, RFQQuoteDetailsCard, AvinodeSidebarCard, AvinodeConnectionStatus, AvinodeAuthStatus, WebhookStatusIndicator, AvinodeActionRequired
- `lib/chat/hooks/use-webhook-subscription.ts` - React hook for SSE event subscription
- Supabase tables: `avinode_webhook_events`, `requests` (avinode_rfp_id, avinode_trip_id, avinode_deep_link columns)
