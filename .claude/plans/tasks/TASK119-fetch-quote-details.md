# Task ID: TASK119
# Task Name: Fetch Quote Details from Avinode API
# Parent User Story: [[US060-process-quote-webhook|US060 - Process incoming Avinode webhook events]]
# Status: Done
# Priority: Critical
# Estimate: 3h

## Description
When a TripRequestSellerResponse webhook event is received, fetch the full quote details from the Avinode API using the quote href URL provided in the webhook payload. Implement exponential backoff retry logic to handle cases where the quote data may not be immediately available after the webhook fires.

## Acceptance Criteria
- Fetches full quote details from Avinode API using the href URL
- Includes authentication headers (API key, authorization token)
- Implements exponential backoff: retries at 1s, 2s, 4s, 8s, 16s intervals
- Maximum of 5 retry attempts
- Returns parsed quote data: price, aircraft, operator, availability, terms
- Handles 404 (quote not ready yet) by retrying
- Handles 401/403 (auth issues) without retry
- Handles network errors with retry
- Logs fetch attempts and outcomes for debugging
- Times out after maximum retry window (approximately 30 seconds)

## Implementation Details
- **File(s)**: app/api/webhooks/avinode/webhook-utils.ts
- **Approach**: Create a fetchQuoteDetails function that takes the quote href URL. Implement a retry loop with exponential backoff using setTimeout/delay. Use fetch() with proper Avinode API headers (Accept, Authorization). Parse the JSON response and validate with a Zod schema. Differentiate between retryable errors (404, 500, network) and non-retryable errors (401, 403). Return the parsed quote or throw after max retries.

## Dependencies
- [[TASK118-validate-webhook-payload|TASK118]] (Validate webhook payload) - provides the quote href
- Avinode API credentials must be configured in environment variables
- Network access to Avinode API endpoints
