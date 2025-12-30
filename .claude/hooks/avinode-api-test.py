#!/usr/bin/env python3
"""
Avinode API Test Hook - Standardized connection validation and request testing.

This hook consolidates functionality from:
- scripts/test-avinode-connection.ts
- scripts/test-webhook.ts
- scripts/test-create-trip.ts

Usage:
  Direct execution: python3 .claude/hooks/avinode-api-test.py
  With arguments:   python3 .claude/hooks/avinode-api-test.py --test-type full

Test Types:
  - env:       Environment variable validation only
  - health:    GET /airports health check only
  - trip:      POST /trips creation test only
  - webhook:   Webhook endpoint test only
  - full:      All tests (default)

Environment Variables Required:
  - API_TOKEN (or AVINODE_API_TOKEN): X-Avinode-ApiToken header value
  - AUTHENTICATION_TOKEN (or AVINODE_BEARER_TOKEN): Bearer token (avitype=16)
  - BASE_URI (or AVINODE_BASE_URL): API base URL (defaults to sandbox)
  - EXTERNAL_ID: Account ID for X-Avinode-ActAsAccount header

Hook Event: Manual execution or PreToolUse (Avinode MCP tools)
"""

import json
import sys
import os
import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

# Optional: Try to import requests, fall back to urllib
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    import urllib.request
    import urllib.error
    HAS_REQUESTS = False

# ============================================================================
# ANSI Color Codes
# ============================================================================
class Colors:
    RESET = '\033[0m'
    BOLD = '\033[1m'
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    CYAN = '\033[36m'
    MAGENTA = '\033[35m'

def log(message: str, color: str = Colors.RESET) -> None:
    """Print colored message."""
    print(f"{color}{message}{Colors.RESET}")

def log_success(message: str) -> None:
    log(f"✅ {message}", Colors.GREEN)

def log_error(message: str) -> None:
    log(f"❌ {message}", Colors.RED)

def log_warning(message: str) -> None:
    log(f"⚠️  {message}", Colors.YELLOW)

def log_info(message: str) -> None:
    log(f"ℹ️  {message}", Colors.BLUE)

def log_section(title: str) -> None:
    print()
    print("=" * 60)
    log(f"  {title}", Colors.CYAN)
    print("=" * 60)

# ============================================================================
# Environment Configuration
# ============================================================================
class AvinodeConfig:
    """Avinode API configuration from environment variables."""

    # Default sandbox URL
    DEFAULT_BASE_URL = "https://sandbox.avinode.com/api"

    # Webhook test URL
    WEBHOOK_URL = "https://v0-jet-vision-agent.vercel.app/api/webhooks/avinode"

    def __init__(self):
        self.base_url = self._get_base_url()
        self.api_token = self._get_api_token()
        self.auth_token = self._get_auth_token()
        self.external_id = self._get_external_id()

    def _get_base_url(self) -> str:
        """Get API base URL from environment."""
        return (
            os.environ.get("BASE_URI") or
            os.environ.get("AVINODE_BASE_URL") or
            self.DEFAULT_BASE_URL
        )

    def _get_api_token(self) -> Optional[str]:
        """Get API token from environment."""
        token = (
            os.environ.get("API_TOKEN") or
            os.environ.get("AVINODE_API_TOKEN") or ""
        ).strip()
        return token if token else None

    def _get_auth_token(self) -> Optional[str]:
        """Get authentication token from environment."""
        token = (
            os.environ.get("AUTHENTICATION_TOKEN") or
            os.environ.get("AVINODE_BEARER_TOKEN") or ""
        ).strip()

        # Remove "Bearer " prefix if present
        if token.lower().startswith("bearer "):
            token = token[7:].strip()

        return token if token else None

    def _get_external_id(self) -> Optional[str]:
        """Get External ID (ActAsAccount) from environment."""
        return os.environ.get("EXTERNAL_ID", "").strip() or None

    def is_valid(self) -> Tuple[bool, list]:
        """Check if configuration is valid. Returns (is_valid, missing_vars)."""
        missing = []

        if not self.api_token:
            missing.append("API_TOKEN")
        if not self.auth_token:
            missing.append("AUTHENTICATION_TOKEN")
        if not self.external_id:
            missing.append("EXTERNAL_ID")

        return len(missing) == 0, missing

    def get_headers(self) -> Dict[str, str]:
        """Get standard Avinode API headers."""
        return {
            "Content-Type": "application/json",
            "X-Avinode-ApiToken": self.api_token or "",
            "Authorization": f"Bearer {self.auth_token or ''}",
            "X-Avinode-SentTimestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "X-Avinode-ApiVersion": "v1.0",
            "X-Avinode-Product": "Jetvision/1.0.0",
            "X-Avinode-ActAsAccount": self.external_id or "",
        }

    def print_config(self) -> None:
        """Print current configuration (masked)."""
        log_info("Configuration:")
        print(f"  Base URL: {self.base_url}")
        print(f"  API Token: {self._mask_token(self.api_token)}")
        print(f"  Auth Token: {self._mask_token(self.auth_token, show=20)}")
        print(f"  External ID: {self.external_id or 'NOT SET'}")

    def _mask_token(self, token: Optional[str], show: int = 8) -> str:
        """Mask token for display."""
        if not token:
            return "NOT SET"
        return f"{token[:show]}... (length: {len(token)})"

# ============================================================================
# HTTP Client (works with or without requests library)
# ============================================================================
class HTTPClient:
    """Simple HTTP client that works with or without requests library."""

    def __init__(self, config: AvinodeConfig):
        self.config = config

    def get(self, endpoint: str) -> Tuple[int, Any]:
        """Make GET request. Returns (status_code, response_data)."""
        url = f"{self.config.base_url}{endpoint}"
        headers = self.config.get_headers()

        if HAS_REQUESTS:
            return self._get_requests(url, headers)
        else:
            return self._get_urllib(url, headers)

    def post(self, endpoint: str, data: Dict) -> Tuple[int, Any]:
        """Make POST request. Returns (status_code, response_data)."""
        url = f"{self.config.base_url}{endpoint}"
        headers = self.config.get_headers()

        if HAS_REQUESTS:
            return self._post_requests(url, headers, data)
        else:
            return self._post_urllib(url, headers, data)

    def _get_requests(self, url: str, headers: Dict) -> Tuple[int, Any]:
        """GET using requests library."""
        try:
            response = requests.get(url, headers=headers, timeout=30)
            return response.status_code, response.json() if response.text else {}
        except requests.exceptions.RequestException as e:
            return 0, {"error": str(e)}

    def _post_requests(self, url: str, headers: Dict, data: Dict) -> Tuple[int, Any]:
        """POST using requests library."""
        try:
            response = requests.post(url, headers=headers, json=data, timeout=30)
            return response.status_code, response.json() if response.text else {}
        except requests.exceptions.RequestException as e:
            return 0, {"error": str(e)}

    def _get_urllib(self, url: str, headers: Dict) -> Tuple[int, Any]:
        """GET using urllib (fallback)."""
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode())
                return response.status, data
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read().decode()) if e.read() else {}
        except Exception as e:
            return 0, {"error": str(e)}

    def _post_urllib(self, url: str, headers: Dict, data: Dict) -> Tuple[int, Any]:
        """POST using urllib (fallback)."""
        try:
            json_data = json.dumps(data).encode("utf-8")
            req = urllib.request.Request(url, data=json_data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode())
                return response.status, data
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read().decode()) if e.read() else {}
        except Exception as e:
            return 0, {"error": str(e)}

# ============================================================================
# Test Functions
# ============================================================================
def test_environment(config: AvinodeConfig) -> bool:
    """Test environment variable configuration."""
    log_section("Environment Validation")

    config.print_config()

    is_valid, missing = config.is_valid()

    if not is_valid:
        log_error("Missing required environment variables:")
        for var in missing:
            print(f"  - {var}")
        print()
        print("Please set these in your environment or .env.local file:")
        print("  API_TOKEN=your-api-token")
        print("  AUTHENTICATION_TOKEN=your-bearer-token")
        print("  EXTERNAL_ID=your-external-id")
        return False

    # Validate token format
    if config.auth_token and not config.auth_token.startswith("eyJ"):
        log_warning("Auth token does not appear to be a JWT (should start with 'eyJ')")
    else:
        log_success("Auth token format valid (JWT)")

    log_success("All required environment variables are set")
    return True

def test_health_check(client: HTTPClient) -> bool:
    """Test API connectivity using a known working endpoint.

    Note: The avitype=16 (Interactive) token used for buyer operations
    does not have permission for airport search endpoints. This is expected.
    We use GET /trips/{id} with a known trip ID as the health check instead.
    """
    log_section("Health Check (API Connectivity)")

    log_info("Testing API connectivity...")

    # Try to get a known trip (created in previous tests)
    # This endpoint is confirmed to work with avitype=16 tokens
    test_trip_id = "atrip-65262230"

    status, response = client.get(f"/trips/{test_trip_id}")

    if status == 0:
        log_error(f"Network error: {response.get('error', 'Unknown')}")
        return False

    if status == 200:
        log_success(f"API connection successful (HTTP {status})")

        # Parse trip data
        data = response.get("data", {})
        trip_id = data.get("tripId", "N/A")
        print(f"\n  Verified trip: {test_trip_id} (short ID: {trip_id})")

        return True
    elif status == 401:
        log_error("Authentication failed (HTTP 401)")
        log_warning("Check your API_TOKEN and AUTHENTICATION_TOKEN")
        return False
    elif status == 403:
        log_error("Forbidden (HTTP 403)")
        log_warning("Valid token but insufficient permissions for this endpoint")
        return False
    elif status == 404:
        # Trip not found - but API is reachable, this is still a success
        log_warning("Test trip not found (HTTP 404) - API is reachable")
        log_info("The health check trip may have been cancelled. Running trip creation test will validate connectivity.")
        return True  # API is reachable, just trip doesn't exist
    else:
        log_error(f"Unexpected response (HTTP {status})")
        print(f"\n  Response: {json.dumps(response, indent=2)}")
        return False

def test_create_trip(client: HTTPClient) -> bool:
    """Test POST /trips endpoint with verified correct format."""
    log_section("Trip Creation Test (POST /trips)")

    # Generate future date (30 days from now to be safe)
    future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

    log_info(f"Creating test trip for {future_date}...")

    # VERIFIED CORRECT FORMAT - uses 'segments' array, not 'criteria.legs'
    trip_request = {
        "externalTripId": f"JETVISION-TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "sourcing": True,  # Required: enables sourcing/search functionality
        "segments": [
            {
                "startAirport": {"icao": "KTEB"},  # Teterboro
                "endAirport": {"icao": "KMIA"},    # Miami
                "dateTime": {
                    "date": future_date,
                    "time": "10:00",
                    "departure": True,
                    "local": True
                },
                "paxCount": "4",
                "paxSegment": True,
                "paxTBD": False,
                "timeTBD": False
            }
        ],
        "criteria": {
            "requiredLift": [
                {
                    "aircraftCategory": "Midsize jet",
                    "aircraftType": "",
                    "aircraftTail": ""
                }
            ],
            "requiredPartnerships": [],
            "maxFuelStopsPerSegment": 0,
            "includeLiftUpgrades": True,
            "maxInitialPositioningTimeMinutes": 0
        }
    }

    log_info("Request payload:")
    print(json.dumps(trip_request, indent=2))
    print()

    status, response = client.post("/trips", trip_request)

    if status == 0:
        log_error(f"Network error: {response.get('error', 'Unknown')}")
        return False

    if status in [200, 201]:
        log_success(f"Trip created successfully (HTTP {status})")

        # Extract trip data
        data = response.get("data", response)
        trip_id = data.get("id", "N/A")
        trip_short_id = data.get("tripId", "N/A")
        actions = data.get("actions", {})

        print()
        log_info("Trip Details:")
        print(f"  Trip ID: {trip_id}")
        print(f"  Short ID: {trip_short_id}")

        # Deep links
        if actions:
            if "searchInAvinode" in actions:
                search_link = actions["searchInAvinode"]
                if isinstance(search_link, dict):
                    search_link = search_link.get("href", search_link)
                print(f"  Search Link: {search_link}")
                log_success("Deep link generated - can open in Avinode Marketplace")

            if "viewInAvinode" in actions:
                view_link = actions["viewInAvinode"]
                if isinstance(view_link, dict):
                    view_link = view_link.get("href", view_link)
                print(f"  View Link: {view_link}")

            if "cancel" in actions:
                cancel_link = actions["cancel"]
                if isinstance(cancel_link, dict):
                    cancel_link = cancel_link.get("href", cancel_link)
                print(f"  Cancel Link: {cancel_link}")

        return True
    elif status == 401:
        log_error("Authentication failed (HTTP 401)")
        return False
    elif status == 403:
        log_error("Forbidden (HTTP 403)")
        return False
    elif status == 422:
        log_error("Validation error (HTTP 422)")
        print(f"\n  Response: {json.dumps(response, indent=2)}")
        log_warning("Check request format - dates must be in the future")
        return False
    else:
        log_error(f"Unexpected response (HTTP {status})")
        print(f"\n  Response: {json.dumps(response, indent=2)}")
        return False

def test_webhook(config: AvinodeConfig) -> bool:
    """Test webhook endpoint connectivity."""
    log_section("Webhook Endpoint Test")

    webhook_url = config.WEBHOOK_URL
    log_info(f"Testing webhook at: {webhook_url}")

    # Test payload simulating TripRequestSellerResponse
    test_payload = {
        "eventType": "TripRequestSellerResponse",
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "data": {
            "tripId": "TEST-TRIP-ID",
            "rfqId": "TEST-RFQ-ID",
            "quoteId": "TEST-QUOTE-ID",
            "price": {"amount": 25000, "currency": "USD"},
            "test": True
        }
    }

    try:
        if HAS_REQUESTS:
            response = requests.post(
                webhook_url,
                json=test_payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            status = response.status_code
            # Handle empty or non-JSON responses gracefully
            try:
                data = response.json() if response.text.strip() else {}
            except (json.JSONDecodeError, ValueError):
                data = {"raw_response": response.text[:200] if response.text else ""}
        else:
            json_data = json.dumps(test_payload).encode("utf-8")
            req = urllib.request.Request(
                webhook_url,
                data=json_data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                status = resp.status
                raw = resp.read().decode()
                # Handle empty or non-JSON responses gracefully
                try:
                    data = json.loads(raw) if raw.strip() else {}
                except (json.JSONDecodeError, ValueError):
                    data = {"raw_response": raw[:200] if raw else ""}
    except urllib.error.HTTPError as e:
        # HTTP errors are still reachable endpoints
        status = e.code
        try:
            data = json.loads(e.read().decode()) if e.read() else {}
        except (json.JSONDecodeError, ValueError):
            data = {}
    except Exception as e:
        log_error(f"Webhook test failed: {e}")
        return False

    if status in [200, 201, 202]:
        log_success(f"Webhook endpoint responsive (HTTP {status})")
        return True
    elif status == 401:
        log_warning("Webhook requires authentication (HTTP 401)")
        return True  # Endpoint is reachable
    elif status == 404:
        log_error("Webhook endpoint not found (HTTP 404)")
        return False
    else:
        log_warning(f"Webhook returned HTTP {status}")
        return True  # Endpoint is reachable

# ============================================================================
# Main Execution
# ============================================================================
def run_tests(test_type: str = "full") -> bool:
    """Run specified tests. Returns True if all tests pass."""

    print()
    log(f"{'=' * 60}", Colors.CYAN)
    log("  AVINODE API TEST SUITE", Colors.BOLD)
    log(f"  Test Type: {test_type}", Colors.CYAN)
    log(f"  Timestamp: {datetime.now().isoformat()}", Colors.CYAN)
    log(f"{'=' * 60}", Colors.CYAN)

    # Load environment from .env.local files
    load_env_files()

    # Initialize configuration
    config = AvinodeConfig()

    results = {}

    # Environment test (always run first)
    if test_type in ["env", "full"]:
        results["environment"] = test_environment(config)

        # Stop if environment is invalid
        if not results["environment"]:
            return False

    # Create HTTP client
    client = HTTPClient(config)

    # Health check test
    if test_type in ["health", "full"]:
        results["health_check"] = test_health_check(client)

    # Trip creation test
    if test_type in ["trip", "full"]:
        results["trip_creation"] = test_create_trip(client)

    # Webhook test
    if test_type in ["webhook", "full"]:
        results["webhook"] = test_webhook(config)

    # Summary
    log_section("Test Summary")

    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        color = Colors.GREEN if passed else Colors.RED
        log(f"  {test_name}: {status}", color)
        if not passed:
            all_passed = False

    print()
    if all_passed:
        log_success("All tests passed!")
    else:
        log_error("Some tests failed")

    return all_passed

def load_env_files() -> None:
    """Load environment variables from .env.local files."""
    project_root = Path(__file__).parent.parent.parent

    env_files = [
        project_root / "mcp-servers" / "avinode-mcp-server" / ".env.local",
        project_root / ".env.local",
    ]

    for env_file in env_files:
        if env_file.exists():
            log_info(f"Loading: {env_file.name}")
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, _, value = line.partition("=")
                        key = key.strip()
                        value = value.strip()
                        # Only set if not already in environment
                        if key not in os.environ:
                            os.environ[key] = value

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Avinode API Test Suite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Test Types:
  env       Environment variable validation only
  health    GET /airports health check only
  trip      POST /trips creation test only
  webhook   Webhook endpoint test only
  full      All tests (default)

Examples:
  python3 .claude/hooks/avinode-api-test.py
  python3 .claude/hooks/avinode-api-test.py --test-type health
  python3 .claude/hooks/avinode-api-test.py --test-type trip
        """
    )

    parser.add_argument(
        "--test-type", "-t",
        choices=["env", "health", "trip", "webhook", "full"],
        default="full",
        help="Type of test to run (default: full)"
    )

    parser.add_argument(
        "--hook-mode",
        action="store_true",
        help="Run in hook mode (read from stdin)"
    )

    args = parser.parse_args()

    # Hook mode - triggered by Claude Code
    if args.hook_mode:
        try:
            input_data = json.load(sys.stdin)
            tool_name = input_data.get("tool_name", "")

            # Only trigger for Avinode-related tools
            if "avinode" in tool_name.lower():
                log_info(f"Hook triggered by tool: {tool_name}")
                # Run quick validation only
                run_tests("env")

            sys.exit(0)  # Don't block tool execution
        except Exception as e:
            log_warning(f"Hook error: {e}")
            sys.exit(0)

    # Direct execution mode
    success = run_tests(args.test_type)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
