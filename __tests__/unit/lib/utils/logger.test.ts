import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@/lib/utils/logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // In test environment (NODE_ENV=test), isDev = true (not 'production')
  it('logger.log calls console.log in non-production', () => {
    logger.log('test message');
    expect(console.log).toHaveBeenCalledWith('test message');
  });

  it('logger.warn calls console.warn in non-production', () => {
    logger.warn('test warning');
    expect(console.warn).toHaveBeenCalledWith('test warning');
  });

  it('logger.error always calls console.error', () => {
    logger.error('test error');
    expect(console.error).toHaveBeenCalledWith('test error');
  });

  it('logger.debug prefixes with component name', () => {
    logger.debug('ChatInterface', 'some debug info');
    expect(console.log).toHaveBeenCalledWith('[ChatInterface]', 'some debug info');
  });

  it('logger.debug passes multiple args', () => {
    logger.debug('MyComponent', 'key:', { value: 42 });
    expect(console.log).toHaveBeenCalledWith('[MyComponent]', 'key:', { value: 42 });
  });

  it('logger.log passes multiple args', () => {
    logger.log('first', 'second', { third: true });
    expect(console.log).toHaveBeenCalledWith('first', 'second', { third: true });
  });
});
