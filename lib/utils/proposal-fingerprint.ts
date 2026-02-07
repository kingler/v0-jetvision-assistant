/**
 * Proposal Fingerprint Utility
 *
 * Generates a deterministic hash of proposal data to detect if the underlying
 * data has changed between preview generation and email send.
 * This is a UI guard, not a security mechanism.
 */

interface FingerprintInput {
  selectedFlights: Array<{ id: string; totalPrice: number }>;
  tripDetails: {
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    passengers: number;
  };
  customer: {
    name: string;
    email: string;
  };
}

/**
 * Simple djb2 string hash
 */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Compute a deterministic fingerprint of proposal data.
 * Returns a short hash string that changes if any input changes.
 */
export function computeProposalFingerprint(data: FingerprintInput): string {
  const flights = data.selectedFlights
    .map((f) => `${f.id}:${f.totalPrice}`)
    .sort()
    .join('|');

  const trip = [
    data.tripDetails.departureAirport,
    data.tripDetails.arrivalAirport,
    data.tripDetails.departureDate,
    data.tripDetails.passengers,
  ].join('|');

  const customer = `${data.customer.name}|${data.customer.email}`;

  return djb2Hash(`${flights}::${trip}::${customer}`);
}
