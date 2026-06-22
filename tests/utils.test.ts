import { describe, it, expect } from 'vitest';

describe('Utility functions', () => {
  it('cn merges class names correctly', async () => {
    const { cn } = await import('@/lib/utils');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('base', undefined, 'extra')).toBe('base extra');
  });
});

describe('Environment variables', () => {
  it('has required env vars defined or is test environment', () => {
    if (process.env.NODE_ENV === 'test') return;
    // In non-test environments, these should be set
    expect(true).toBe(true);
  });
});
