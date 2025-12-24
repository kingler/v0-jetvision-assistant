#!/usr/bin/env bash

###############################################################################
# Avinode API End-to-End Test Script
#
# Tests the Avinode sandbox API integration including:
# - Airport search
# - Trip creation with deep link generation
# - Trip retrieval by ID
# - RFQ/Quote listing
#
# Usage:
#   ./scripts/test-avinode-e2e.sh           # Run all tests
#   ./scripts/test-avinode-e2e.sh --help    # Show help
#   ./scripts/test-avinode-e2e.sh --dry-run # Show commands without executing
#
# References:
# - https://developer.avinodegroup.com/docs/search-in-avinode-from-your-system
# - https://developer.avinodegroup.com/reference/readbynumericid
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/mcp-servers/avinode-mcp-server/.env.local"
DRY_RUN=false
VERBOSE=false

# Avinode API Configuration (loaded from env)
BASE_URL=""
API_TOKEN=""
AUTH_TOKEN=""
EXTERNAL_ID=""
CLIENT_ID=""
CLIENT_SECRET_JWT=""

# Test data
TEST_TRIP_ID=""
DEPARTURE_AIRPORT="KTEB"
ARRIVAL_AIRPORT="KPBI"
DEPARTURE_DATE=$(date -v+7d +%Y-%m-%d 2>/dev/null || date -d '+7 days' +%Y-%m-%d)
PAX_COUNT=4

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo ""
    echo -e "${CYAN}============================================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}============================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_step() {
    echo ""
    echo -e "${YELLOW}>>> $1${NC}"
}

show_help() {
    # Accept optional exit code parameter (defaults to 0 for normal help display)
    local exit_code=${1:-0}
    
    cat << EOF
Avinode API End-to-End Test Script

Usage: $0 [OPTIONS]

Options:
  --help      Show this help message
  --dry-run   Show commands without executing
  --verbose   Show full API responses

Environment:
  The script loads credentials from:
  ${ENV_FILE}

  Required variables:
  - BASE_URI: API base URL (default: https://sandbox.avinode.com/api)
  - API_TOKEN: X-Avinode-ApiToken header value
  - AUTHENTICATION_TOKEN: Bearer token for Authorization header
  - EXTERNAL_ID: Account ID for ActAsAccount header (optional)

Examples:
  $0              # Run all tests
  $0 --verbose    # Run with detailed output
  $0 --dry-run    # Preview commands only
EOF
    exit $exit_code
}

load_env() {
    print_step "Loading environment configuration"

    if [[ ! -f "$ENV_FILE" ]]; then
        print_error "Environment file not found: $ENV_FILE"
        echo "Please create the file with required credentials"
        exit 1
    fi

    # Source the env file
    set -a
    source "$ENV_FILE"
    set +a

    # Set variables with fallbacks
    BASE_URL="${BASE_URI:-https://sandbox.avinode.com/api}"
    API_TOKEN="${API_TOKEN:-}"
    AUTH_TOKEN="${AUTHENTICATION_TOKEN:-}"
    EXTERNAL_ID="${EXTERNAL_ID:-}"
    CLIENT_ID="${CLIENT_ID:-}"
    CLIENT_SECRET_JWT="${CLIENT_SECRET_JWT:-}"

    # Validate required variables
    if [[ -z "$API_TOKEN" ]]; then
        print_error "API_TOKEN is not set in $ENV_FILE"
        exit 1
    fi

    if [[ -z "$AUTH_TOKEN" ]]; then
        print_error "AUTHENTICATION_TOKEN is not set in $ENV_FILE"
        exit 1
    fi

    print_success "Environment loaded from $ENV_FILE"
    print_info "Base URL: $BASE_URL"
    print_info "API Token: ${API_TOKEN:0:8}..."
    print_info "Auth Token: ${AUTH_TOKEN:0:20}..."
    if [[ -n "$EXTERNAL_ID" ]]; then
        print_info "External ID: ${EXTERNAL_ID:0:8}..."
    fi
}

get_timestamp() {
    date -u +%Y-%m-%dT%H:%M:%SZ
}

# Build common headers for curl
get_headers() {
    local timestamp=$(get_timestamp)
    local headers=(
        -H "Content-Type: application/json"
        -H "X-Avinode-ApiToken: $API_TOKEN"
        -H "Authorization: Bearer $AUTH_TOKEN"
        -H "X-Avinode-SentTimestamp: $timestamp"
        -H "X-Avinode-ApiVersion: v1.0"
        -H "X-Avinode-Product: Jetvision/1.0.0"
    )

    # Add ActAsAccount header if EXTERNAL_ID is set
    if [[ -n "$EXTERNAL_ID" ]]; then
        headers+=(-H "X-Avinode-ActAsAccount: $EXTERNAL_ID")
    fi

    echo "${headers[@]}"
}

# Make API request and return response
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"

    local url="${BASE_URL}${endpoint}"
    local timestamp=$(get_timestamp)

    if [[ "$DRY_RUN" == "true" ]]; then
        echo "[DRY RUN] curl -s -X $method $url"
        return 0
    fi

    if [[ "$VERBOSE" == "true" ]]; then
        print_info "Request: $method $url" >&2
        if [[ -n "$data" ]]; then
            print_info "Body: $data" >&2
        fi
    fi

    # Build curl command
    local curl_opts=(-s -X "$method")
    curl_opts+=(-H "Content-Type: application/json")
    curl_opts+=(-H "X-Avinode-ApiToken: $API_TOKEN")
    curl_opts+=(-H "Authorization: Bearer $AUTH_TOKEN")
    curl_opts+=(-H "X-Avinode-SentTimestamp: $timestamp")
    curl_opts+=(-H "X-Avinode-ApiVersion: v1.0")
    curl_opts+=(-H "X-Avinode-Product: Jetvision/1.0.0")

    if [[ -n "$EXTERNAL_ID" ]]; then
        curl_opts+=(-H "X-Avinode-ActAsAccount: $EXTERNAL_ID")
    fi

    if [[ -n "$data" ]]; then
        curl_opts+=(-d "$data")
    fi

    # Execute curl and capture body and status code separately
    local http_code
    local body
    body=$(curl "${curl_opts[@]}" -w '\n%{http_code}' "$url")
    http_code=$(echo "$body" | tail -n1)
    body=$(echo "$body" | sed '$d')

    # Return as status|body
    echo "${http_code}|${body}"
}

# Parse response - now just splits on first pipe
parse_response() {
    local response="$1"
    echo "$response"
}

###############################################################################
# Test Functions
###############################################################################

test_airport_search() {
    print_step "Test 1: Airport Search"
    print_info "Searching for airport: KTEB"

    local response=$(api_request "GET" "/airports?query=KTEB")

    if [[ "$DRY_RUN" == "true" ]]; then
        return 0
    fi

    local status=$(echo "$response" | cut -d'|' -f1)
    local body=$(echo "$response" | cut -d'|' -f2-)

    if [[ "$VERBOSE" == "true" ]]; then
        echo "Response Body:"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi

    if [[ "$status" == "200" ]]; then
        print_success "Airport search successful (HTTP $status)"

        # Extract airport info if jq is available
        if command -v jq &> /dev/null; then
            local airport_name=$(echo "$body" | jq -r '.[0].name // .airports[0].name // "N/A"' 2>/dev/null)
            local icao=$(echo "$body" | jq -r '.[0].icao // .airports[0].icao // "N/A"' 2>/dev/null)
            print_info "Found: $icao - $airport_name"
        fi
        return 0
    else
        print_error "Airport search failed (HTTP $status)"
        if [[ "$VERBOSE" != "true" ]]; then
            echo "Response: $body"
        fi
        return 1
    fi
}

test_list_trips() {
    print_step "Test 2: List Existing Trips"
    print_info "Fetching trips from API..."

    local response=$(api_request "GET" "/trips")

    if [[ "$DRY_RUN" == "true" ]]; then
        return 0
    fi

    local status=$(echo "$response" | cut -d'|' -f1)
    local body=$(echo "$response" | cut -d'|' -f2-)

    if [[ "$VERBOSE" == "true" ]]; then
        echo "Response Body:"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi

    if [[ "$status" == "200" ]]; then
        print_success "Trips listed successfully (HTTP $status)"

        if command -v jq &> /dev/null; then
            local trip_count=$(echo "$body" | jq 'if type == "array" then length else .trips | length // 0 end' 2>/dev/null)
            print_info "Found $trip_count trip(s)"

            # Extract first trip ID for later tests
            local first_trip=$(echo "$body" | jq -r 'if type == "array" then .[0].numericId // .[0].id else .trips[0].numericId // .trips[0].id end // empty' 2>/dev/null)
            if [[ -n "$first_trip" && "$first_trip" != "null" ]]; then
                TEST_TRIP_ID="$first_trip"
                print_info "Using trip ID for tests: $TEST_TRIP_ID"
            fi
        fi
        return 0
    else
        print_warning "Trips list returned HTTP $status"
        if [[ "$VERBOSE" != "true" ]]; then
            echo "Response: $body"
        fi
        return 0  # Non-fatal - might have no trips
    fi
}

test_create_trip() {
    print_step "Test 3: Create New Trip"
    print_info "Creating trip: $DEPARTURE_AIRPORT -> $ARRIVAL_AIRPORT on $DEPARTURE_DATE"

    # Build request payload per Avinode API spec
    local payload="{\"departure\":{\"icao\":\"$DEPARTURE_AIRPORT\",\"dateTimeLocal\":\"${DEPARTURE_DATE}T10:00:00\"},\"arrival\":{\"icao\":\"$ARRIVAL_AIRPORT\"},\"pax\":$PAX_COUNT,\"postToTripBoard\":false}"

    local response=$(api_request "POST" "/trips" "$payload")

    if [[ "$DRY_RUN" == "true" ]]; then
        return 0
    fi

    local status=$(echo "$response" | cut -d'|' -f1)
    local body=$(echo "$response" | cut -d'|' -f2-)

    if [[ "$VERBOSE" == "true" ]]; then
        echo "Response Body:"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi

    if [[ "$status" == "200" || "$status" == "201" ]]; then
        print_success "Trip created successfully (HTTP $status)"

        if command -v jq &> /dev/null; then
            local trip_id=$(echo "$body" | jq -r '.numericId // .id // .trip_id // empty' 2>/dev/null)
            local deep_link=$(echo "$body" | jq -r '.links.deepLink // .deepLink // .deep_link // empty' 2>/dev/null)

            if [[ -n "$trip_id" && "$trip_id" != "null" ]]; then
                TEST_TRIP_ID="$trip_id"
                print_info "Trip ID: $TEST_TRIP_ID"
            fi

            if [[ -n "$deep_link" && "$deep_link" != "null" ]]; then
                print_info "Deep Link: $deep_link"
            fi
        fi
        return 0
    else
        print_error "Trip creation failed (HTTP $status)"
        if [[ "$VERBOSE" != "true" ]]; then
            echo "Response: $body"
        fi

        # Parse error details
        if command -v jq &> /dev/null; then
            local error_msg=$(echo "$body" | jq -r '.meta.errors[0].title // .message // .error // empty' 2>/dev/null)
            if [[ -n "$error_msg" ]]; then
                print_info "Error: $error_msg"
            fi
        fi
        return 1
    fi
}

test_get_trip() {
    print_step "Test 4: Retrieve Trip Details"

    if [[ -z "$TEST_TRIP_ID" ]]; then
        # Use known trip ID for testing
        TEST_TRIP_ID="FVCZ9M"
        print_info "Using known trip ID: $TEST_TRIP_ID"
    fi

    print_info "Fetching trip: $TEST_TRIP_ID"

    local response=$(api_request "GET" "/trips/$TEST_TRIP_ID")

    if [[ "$DRY_RUN" == "true" ]]; then
        return 0
    fi

    local status=$(echo "$response" | cut -d'|' -f1)
    local body=$(echo "$response" | cut -d'|' -f2-)

    if [[ "$VERBOSE" == "true" ]]; then
        echo "Response Body:"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi

    if [[ "$status" == "200" ]]; then
        print_success "Trip retrieved successfully (HTTP $status)"

        if command -v jq &> /dev/null; then
            local trip_status=$(echo "$body" | jq -r '.status // .state // "N/A"' 2>/dev/null)
            local departure=$(echo "$body" | jq -r '.departure.icao // .route.departure.airport // "N/A"' 2>/dev/null)
            local arrival=$(echo "$body" | jq -r '.arrival.icao // .route.arrival.airport // "N/A"' 2>/dev/null)

            print_info "Status: $trip_status"
            print_info "Route: $departure -> $arrival"
        fi
        return 0
    else
        print_error "Trip retrieval failed (HTTP $status)"
        if [[ "$VERBOSE" != "true" ]]; then
            echo "Response: $body"
        fi
        return 1
    fi
}

test_list_rfqs() {
    print_step "Test 5: List RFQs"
    print_info "Fetching RFQs..."

    local response=$(api_request "GET" "/rfqs")

    if [[ "$DRY_RUN" == "true" ]]; then
        return 0
    fi

    local status=$(echo "$response" | cut -d'|' -f1)
    local body=$(echo "$response" | cut -d'|' -f2-)

    if [[ "$VERBOSE" == "true" ]]; then
        echo "Response Body:"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi

    if [[ "$status" == "200" ]]; then
        print_success "RFQs listed successfully (HTTP $status)"

        if command -v jq &> /dev/null; then
            local rfq_count=$(echo "$body" | jq 'if type == "array" then length else .rfqs | length // 0 end' 2>/dev/null)
            print_info "Found $rfq_count RFQ(s)"
        fi
        return 0
    else
        print_warning "RFQ list returned HTTP $status"
        if [[ "$VERBOSE" != "true" ]]; then
            echo "Response: $body"
        fi
        return 0  # Non-fatal
    fi
}

test_trip_messages() {
    print_step "Test 6: Trip Messages"

    if [[ -z "$TEST_TRIP_ID" ]]; then
        TEST_TRIP_ID="FVCZ9M"
        print_info "Using known trip ID: $TEST_TRIP_ID"
    fi

    print_info "Fetching messages for trip: $TEST_TRIP_ID"

    local response=$(api_request "GET" "/tripmsgs/$TEST_TRIP_ID")

    if [[ "$DRY_RUN" == "true" ]]; then
        return 0
    fi

    local status=$(echo "$response" | cut -d'|' -f1)
    local body=$(echo "$response" | cut -d'|' -f2-)

    if [[ "$VERBOSE" == "true" ]]; then
        echo "Response Body:"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi

    if [[ "$status" == "200" ]]; then
        print_success "Trip messages retrieved (HTTP $status)"

        if command -v jq &> /dev/null; then
            local msg_count=$(echo "$body" | jq 'if type == "array" then length else .messages | length // 0 end' 2>/dev/null)
            print_info "Found $msg_count message(s)"
        fi
        return 0
    else
        print_warning "Trip messages returned HTTP $status"
        if [[ "$VERBOSE" != "true" ]]; then
            echo "Response: $body"
        fi
        return 0  # Non-fatal
    fi
}

test_oauth_refresh() {
    print_step "Test 0a: OAuth Token Refresh"
    print_info "Attempting to refresh OAuth token..."

    local client_id="${CLIENT_ID:-}"
    local client_secret="${CLIENT_SECRET_JWT:-}"

    if [[ -z "$client_id" || -z "$client_secret" ]]; then
        print_warning "OAuth credentials not configured (CLIENT_ID, CLIENT_SECRET_JWT)"
        print_info "Skipping OAuth refresh - using existing AUTHENTICATION_TOKEN"
        return 0
    fi

    # Early return for dry-run mode to prevent network calls and secret exposure
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "DRY_RUN mode: Skipping OAuth token refresh (no network call)"
        print_info "Using existing AUTHENTICATION_TOKEN for subsequent tests"
        return 0
    fi

    local timestamp=$(get_timestamp)
    local response=$(curl -s -w '\n%{http_code}' -X POST "${BASE_URL}/oauth/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -H "X-Avinode-ApiToken: $API_TOKEN" \
        -H "X-Avinode-SentTimestamp: $timestamp" \
        -H "X-Avinode-ApiVersion: v1.0" \
        -H "X-Avinode-Product: Jetvision/1.0.0" \
        --data-urlencode "grant_type=client_credentials" \
        --data-urlencode "client_id=$client_id" \
        --data-urlencode "client_secret=$client_secret" \
        --data-urlencode "expiresInMinutes=60")

    local parsed=$(parse_response "$response")
    local status=$(echo "$parsed" | cut -d'|' -f1)
    local body=$(echo "$parsed" | cut -d'|' -f2-)

    if [[ "$VERBOSE" == "true" ]]; then
        echo "Response Body:"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi

    if [[ "$status" == "200" ]]; then
        print_success "OAuth token refreshed (HTTP $status)"

        if command -v jq &> /dev/null; then
            local new_token=$(echo "$body" | jq -r '.access_token // empty' 2>/dev/null)
            if [[ -n "$new_token" && "$new_token" != "null" ]]; then
                AUTH_TOKEN="$new_token"
                print_info "New token obtained: ${AUTH_TOKEN:0:20}..."
            fi
        fi
        return 0
    else
        print_warning "OAuth refresh failed (HTTP $status) - using existing token"
        if command -v jq &> /dev/null; then
            local error_msg=$(echo "$body" | jq -r '.error_description // .error // empty' 2>/dev/null)
            if [[ -n "$error_msg" ]]; then
                print_info "OAuth Error: $error_msg"
            fi
        fi
        return 0  # Non-fatal
    fi
}

test_api_auth() {
    print_step "Test 0b: Validate API Authentication"
    print_info "Testing API credentials..."

    # First try with a simple GET on a known trip
    local response=$(api_request "GET" "/trips/FVCZ9M")

    if [[ "$DRY_RUN" == "true" ]]; then
        return 0
    fi

    local status=$(echo "$response" | cut -d'|' -f1)
    local body=$(echo "$response" | cut -d'|' -f2-)

    if [[ "$VERBOSE" == "true" ]]; then
        echo "Response Body:"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi

    if [[ "$status" == "200" ]]; then
        print_success "API authentication successful (HTTP $status)"

        if command -v jq &> /dev/null; then
            local trip_id=$(echo "$body" | jq -r '.numericId // .id // "N/A"' 2>/dev/null)
            print_info "Trip ID verified: $trip_id"
        fi
        return 0
    elif [[ "$status" == "401" || "$status" == "403" ]]; then
        print_error "API authentication failed (HTTP $status)"
        if [[ "$VERBOSE" != "true" ]]; then
            echo "Response: $body"
        fi
        print_info "The AUTHENTICATION_TOKEN may be expired or invalid"
        print_info "Check expiry date in .env.local (should be: 08 Feb 2026)"

        if command -v jq &> /dev/null; then
            local error_msg=$(echo "$body" | jq -r '.meta.errors[0].title // empty' 2>/dev/null)
            if [[ -n "$error_msg" ]]; then
                print_info "API Error: $error_msg"
            fi
        fi
        return 1
    else
        print_warning "Unexpected response (HTTP $status)"
        if [[ "$VERBOSE" != "true" ]]; then
            echo "Response: $body"
        fi
        return 1
    fi
}

###############################################################################
# Summary Report
###############################################################################

print_summary() {
    local passed=$1
    local failed=$2
    local total=$((passed + failed))

    print_header "Test Summary"

    echo -e "Total Tests: $total"
    echo -e "${GREEN}Passed: $passed${NC}"
    echo -e "${RED}Failed: $failed${NC}"

    if [[ $failed -eq 0 ]]; then
        echo ""
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    else
        echo ""
        echo -e "${RED}Some tests failed. Check the output above for details.${NC}"
        return 1
    fi
}

###############################################################################
# Main Execution
###############################################################################

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --verbose|-v)
                VERBOSE=true
                shift
                ;;
            *)
                echo "Unknown option: $1"
                show_help 1
                ;;
        esac
    done

    print_header "Avinode API E2E Test Suite"

    echo "Date: $(date)"
    echo "Dry Run: $DRY_RUN"
    echo "Verbose: $VERBOSE"

    # Load environment
    load_env

    local passed=0
    local failed=0

    # Run tests
    # Test 0a: OAuth token refresh (optional)
    if test_oauth_refresh; then
        ((passed++))
    else
        ((failed++))
    fi

    # Test 0b: API authentication
    if test_api_auth; then
        ((passed++))
    else
        ((failed++))
        print_warning "Authentication failed - continuing with remaining tests..."
    fi

    # Test 1: Airport search
    if test_airport_search; then
        ((passed++))
    else
        ((failed++))
    fi

    # Test 2: List existing trips
    if test_list_trips; then
        ((passed++))
    else
        ((failed++))
    fi

    # Test 3: Create new trip
    if test_create_trip; then
        ((passed++))
    else
        ((failed++))
    fi

    # Test 4: Get trip by ID
    if test_get_trip; then
        ((passed++))
    else
        ((failed++))
    fi

    # Test 5: List RFQs
    if test_list_rfqs; then
        ((passed++))
    else
        ((failed++))
    fi

    # Test 6: Trip messages
    if test_trip_messages; then
        ((passed++))
    else
        ((failed++))
    fi

    # Print summary
    print_summary $passed $failed
}

# Run main function
main "$@"
