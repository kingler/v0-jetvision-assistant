export type TripIdKind = 'avinode' | 'numeric' | 'alphanumeric';

export interface TripIdDetection {
  raw: string;
  normalized: string;
  kind: TripIdKind;
}

export interface DetectTripIdOptions {
  allowStandalone?: boolean;
  awaitingTripId?: boolean;
}

const AVINODE_TRIP_PATTERN = /\batrip-(\d{6,12})\b/i;
const NUMERIC_TRIP_PATTERN = /\b(\d{6,12})\b/;
const ALPHANUMERIC_TRIP_PATTERN = /\b([A-Z0-9]{6,8})\b/i;
const CONTEXT_PATTERN =
  /\b(trip\s*id|tripid|trip-id|trip\s*#|trip\s*number|my\s*trip|check\s*trip|lookup|search|get[_\s]*rfq|get[_\s]*quotes|avinode)\b/i;

export function normalizeTripId(input?: string | null): TripIdDetection | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const avinodeMatch = trimmed.match(/^atrip-(\d{6,12})$/i);
  if (avinodeMatch) {
    return {
      raw: trimmed,
      normalized: `atrip-${avinodeMatch[1]}`,
      kind: 'avinode',
    };
  }

  const numericMatch = trimmed.match(/^\d{6,12}$/);
  if (numericMatch) {
    return {
      raw: trimmed,
      normalized: `atrip-${trimmed}`,
      kind: 'numeric',
    };
  }

  const alphanumericMatch = trimmed.match(/^[A-Z0-9]{6,8}$/i);
  if (alphanumericMatch) {
    return {
      raw: trimmed,
      normalized: trimmed.toUpperCase(),
      kind: 'alphanumeric',
    };
  }

  return null;
}

export function detectTripId(
  message: string,
  options: DetectTripIdOptions = {}
): TripIdDetection | null {
  if (!message) {
    return null;
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const avinodeMatch = message.match(AVINODE_TRIP_PATTERN);
  if (avinodeMatch) {
    return {
      raw: avinodeMatch[0],
      normalized: `atrip-${avinodeMatch[1]}`,
      kind: 'avinode',
    };
  }

  const allowStandalone = Boolean(options.allowStandalone || options.awaitingTripId);
  if (allowStandalone) {
    const normalized = normalizeTripId(trimmed);
    if (normalized) {
      return normalized;
    }
  }

  const hasContext = CONTEXT_PATTERN.test(message);

  const numericMatch = message.match(NUMERIC_TRIP_PATTERN);
  if (numericMatch && hasContext) {
    return {
      raw: numericMatch[1],
      normalized: `atrip-${numericMatch[1]}`,
      kind: 'numeric',
    };
  }

  const alphanumericMatch = message.match(ALPHANUMERIC_TRIP_PATTERN);
  if (alphanumericMatch && (hasContext || allowStandalone)) {
    return {
      raw: alphanumericMatch[1],
      normalized: alphanumericMatch[1].toUpperCase(),
      kind: 'alphanumeric',
    };
  }

  return null;
}
