import { describe, it, expect } from 'vitest';
import { isValidUUID, isValidRequestId, findValidRequestId } from '@/lib/utils/validation';

describe('isValidUUID', () => {
  it('accepts valid v4 UUID', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts uppercase UUID', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejects short string', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidUUID('')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidUUID(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidUUID(null)).toBe(false);
  });
});

describe('isValidRequestId (alias)', () => {
  it('works as alias for isValidUUID', () => {
    expect(isValidRequestId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidRequestId('not-valid')).toBe(false);
  });
});

describe('findValidRequestId', () => {
  const validId = '550e8400-e29b-41d4-a716-446655440000';
  const validId2 = '660e8400-e29b-41d4-a716-446655440001';

  it('returns requestId when valid', () => {
    expect(findValidRequestId({ requestId: validId })).toBe(validId);
  });

  it('falls back to conversationId', () => {
    expect(findValidRequestId({ requestId: 'bad', conversationId: validId })).toBe(validId);
  });

  it('falls back to id', () => {
    expect(findValidRequestId({ id: validId })).toBe(validId);
  });

  it('returns null when none valid', () => {
    expect(findValidRequestId({ requestId: 'x', conversationId: 'y', id: 'z' })).toBeNull();
  });

  it('respects priority order', () => {
    expect(findValidRequestId({ requestId: validId, conversationId: validId2 })).toBe(validId);
  });

  it('handles empty object', () => {
    expect(findValidRequestId({})).toBeNull();
  });
});
