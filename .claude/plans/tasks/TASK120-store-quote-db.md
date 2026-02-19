# Task ID: TASK120
# Task Name: Upsert Quote to Database
# Parent User Story: [[US060-process-quote-webhook|US060 - Process incoming Avinode webhook events]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Store the fetched Avinode quote details in the database using an upsert operation. When a quote from the same operator for the same trip already exists, update it with the latest data. The sellerPrice (operator's price) takes priority over any previously stored price data.

## Acceptance Criteria
- Upserts quote record keyed by (trip_id, operator_id) or avinode quote_id
- Stores: quote_id, trip_id, rfq_id, operator_name, aircraft_type, price, currency
- sellerPrice from API response takes priority over other price fields
- Updates existing record if quote from same operator already exists
- Inserts new record if first quote from this operator
- Stores raw API response in a JSONB column for reference
- Sets received_at timestamp
- Links to the flight request via trip_id lookup
- Returns the upserted quote record

## Implementation Details
- **File(s)**: app/api/webhooks/avinode/webhook-utils.ts
- **Approach**: Create a storeQuote function that maps the Avinode API quote response to the database schema. Use Supabase's upsert with onConflict specifying the unique constraint (avinode_quote_id or trip_id + operator_id). Map sellerPrice to the price column, preferring it over buyerPrice or listPrice. Store the complete API response in a raw_data JSONB column. Look up the request_id from the trip_id to maintain the foreign key relationship.

## Dependencies
- [[TASK119-fetch-quote-details|TASK119]] (Fetch quote details) - provides quote data
- avinode_webhook_events or quotes table must exist in Supabase
- Trip-to-request mapping must be queryable
