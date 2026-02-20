# Task ID: TASK064
# Task Name: Upsert quote with price priority (sellerPrice > webhookPrice)
# Parent User Story: [[US030-receive-realtime-quote-notification|US030 - Receive and store operator quotes]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Store operator quotes in the database with an upsert strategy that handles price priority. When a quote is received, the sellerPrice (from the detailed API call) takes precedence over the webhookPrice (from the initial webhook payload). Subsequent updates to the same quote update rather than duplicate.

## Acceptance Criteria
- Quotes are upserted by Avinode quote ID (no duplicates)
- Price fields include: base_price, fuel_surcharge, taxes, total_price, currency
- sellerPrice from get_quote API response takes priority over webhook payload price
- If sellerPrice is unavailable, falls back to webhookPrice from webhook payload
- Quote record includes: operator name, aircraft type, aircraft model, aircraft year
- Quote record includes: departure time, arrival time, flight duration
- Quote record links to the parent request via request_id
- created_at and updated_at timestamps are maintained
- Partial updates preserve existing non-null fields

## Implementation Details
- **File(s)**: `app/api/webhooks/avinode/webhook-utils.ts`
- **Approach**: Create a utility function that merges webhook data with API-fetched data, applying the price priority rule (sellerPrice > webhookPrice). Use Supabase's upsert with the Avinode quote ID as the conflict key. The merge logic ensures that more detailed data from API calls overwrites less detailed webhook data, but never overwrites non-null values with null.

## Dependencies
- [[TASK063-process-quote-webhook|TASK063]] (process-quote-webhook) - Webhook processing provides the data
