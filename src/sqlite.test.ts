/**
 * Tests for TerseJSON SQLite Integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  unterseSqlite,
  isTerseSqliteActive,
  getTerseSqliteOptions,
  setTerseSqliteOptions,
} from './sqlite';

// Mock better-sqlite3 module - vi.mock doesn't work with require()
// so we test the API surface and skip the actual patching tests

describe('terseSqlite', () => {
  beforeEach(() => {
    // Reset state before each test
    // Note: Can't call unterseSqlite without better-sqlite3 installed
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
  });

  describe('state management', () => {
    it('should report inactive initially', () => {
      expect(isTerseSqliteActive()).toBe(false);
    });

    it('should return empty options initially', () => {
      const options = getTerseSqliteOptions();
      expect(options).toEqual({});
    });

    it('should update options via setTerseSqliteOptions', () => {
      setTerseSqliteOptions({ minArrayLength: 10 });
      expect(getTerseSqliteOptions().minArrayLength).toBe(10);

      // Reset
      setTerseSqliteOptions({});
    });

    it('should merge options with setTerseSqliteOptions', () => {
      setTerseSqliteOptions({ minArrayLength: 5, skipSingleRows: true });
      setTerseSqliteOptions({ minArrayLength: 10 });

      const options = getTerseSqliteOptions();
      expect(options.minArrayLength).toBe(10);
      expect(options.skipSingleRows).toBe(true);

      // Reset
      setTerseSqliteOptions({});
    });
  });

  describe('error handling', () => {
    // Note: These tests verify the error is thrown when better-sqlite3 isn't installed
    // which is the expected behavior

    it.skip('should throw if better-sqlite3 is not installed', async () => {
      // This test is skipped because we can't easily mock require()
      // The error message is verified manually
    });
  });

  describe('terseSqlite function signature', () => {
    it('should export terseSqlite function', async () => {
      const { terseSqlite } = await import('./sqlite');
      expect(typeof terseSqlite).toBe('function');
    });

    it('should export unterseSqlite function', () => {
      expect(typeof unterseSqlite).toBe('function');
    });

    it('should export isTerseSqliteActive function', () => {
      expect(typeof isTerseSqliteActive).toBe('function');
    });

    it('should export getTerseSqliteOptions function', () => {
      expect(typeof getTerseSqliteOptions).toBe('function');
    });

    it('should export setTerseSqliteOptions function', () => {
      expect(typeof setTerseSqliteOptions).toBe('function');
    });
  });
});

// Integration tests that would run with better-sqlite3 installed
// These are skipped in CI since better-sqlite3 requires native compilation
describe.skip('terseSqlite integration', () => {
  // These tests require better-sqlite3 to be installed
  // They verify the actual patching behavior

  it('should patch Statement.all()', async () => {
    // Would test actual wrapping of results
  });

  it('should patch Statement.get()', async () => {
    // Would test actual wrapping of single result
  });

  it('should patch Statement.iterate()', async () => {
    // Would test actual wrapping of iterated results
  });
});
