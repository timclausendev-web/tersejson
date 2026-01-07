/**
 * Tests for TerseJSON PostgreSQL Integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock pg module
const mockClientQuery = vi.fn();
const mockPoolQuery = vi.fn();

// Create mock prototypes using function constructors (not classes)
function MockClient() {}
MockClient.prototype = {
  query: mockClientQuery,
  connect: vi.fn(),
  end: vi.fn(),
};

function MockPool() {}
MockPool.prototype = {
  query: mockPoolQuery,
  connect: vi.fn(),
  end: vi.fn(),
};

vi.mock('pg', () => ({
  Client: MockClient,
  Pool: MockPool,
}));

import {
  tersePg,
  untersePg,
  isTersePgActive,
  getTersePgOptions,
  setTersePgOptions,
  tersePgSync,
} from './pg';

describe('tersePg', () => {
  beforeEach(async () => {
    // Reset state before each test
    await untersePg();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await untersePg();
  });

  describe('initialization', () => {
    it('should patch pg on first call', async () => {
      expect(isTersePgActive()).toBe(false);
      await tersePg();
      expect(isTersePgActive()).toBe(true);
    });

    it('should not re-patch on subsequent calls', async () => {
      await tersePg();
      const firstOptions = getTersePgOptions();
      await tersePg({ minArrayLength: 10 });
      expect(isTersePgActive()).toBe(true);
      expect(getTersePgOptions().minArrayLength).toBe(10);
    });

    it('should accept options', async () => {
      await tersePg({
        minArrayLength: 5,
        skipSingleRows: true,
        enabled: true,
      });
      const options = getTersePgOptions();
      expect(options.minArrayLength).toBe(5);
      expect(options.skipSingleRows).toBe(true);
      expect(options.enabled).toBe(true);
    });

    it('should default minArrayLength to 1', async () => {
      await tersePg();
      expect(getTersePgOptions().minArrayLength).toBe(1);
    });
  });

  describe('untersePg', () => {
    it('should restore original methods', async () => {
      await tersePg();
      expect(isTersePgActive()).toBe(true);
      await untersePg();
      expect(isTersePgActive()).toBe(false);
    });

    it('should be idempotent', async () => {
      await untersePg();
      await untersePg();
      expect(isTersePgActive()).toBe(false);
    });
  });

  describe('setTersePgOptions', () => {
    it('should update options without re-patching', async () => {
      await tersePg({ minArrayLength: 1 });
      setTersePgOptions({ minArrayLength: 10 });
      expect(getTersePgOptions().minArrayLength).toBe(10);
      expect(isTersePgActive()).toBe(true);
    });

    it('should merge with existing options', async () => {
      await tersePg({ minArrayLength: 5, skipSingleRows: true });
      setTersePgOptions({ minArrayLength: 10 });
      const options = getTersePgOptions();
      expect(options.minArrayLength).toBe(10);
      expect(options.skipSingleRows).toBe(true);
    });
  });

  describe('query result wrapping', () => {
    it('should wrap rows array with Proxy', async () => {
      const mockRows = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
      ];

      mockClientQuery.mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 2,
        command: 'SELECT',
      });

      await tersePg();

      const client = new (MockClient as any)();
      const result = await client.query('SELECT * FROM users');

      // Result should still have rows
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBe(2);

      // Data should be accessible (through Proxy)
      expect(result.rows[0].id).toBe(1);
      expect(result.rows[0].firstName).toBe('John');
      expect(result.rows[1].email).toBe('jane@example.com');
    });

    it('should preserve result metadata', async () => {
      mockClientQuery.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Test' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [{ name: 'id' }, { name: 'name' }],
      });

      await tersePg();

      const client = new (MockClient as any)();
      const result = await client.query('SELECT * FROM users');

      expect(result.rowCount).toBe(1);
      expect(result.command).toBe('SELECT');
      expect(result.fields).toEqual([{ name: 'id' }, { name: 'name' }]);
    });

    it('should handle empty results', async () => {
      mockClientQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
      });

      await tersePg();

      const client = new (MockClient as any)();
      const result = await client.query('SELECT * FROM users WHERE 1=0');

      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should handle null/undefined result', async () => {
      mockClientQuery.mockResolvedValueOnce(null);

      await tersePg();

      const client = new (MockClient as any)();
      const result = await client.query('SELECT 1');

      expect(result).toBeNull();
    });

    it('should handle result without rows', async () => {
      mockClientQuery.mockResolvedValueOnce({
        command: 'INSERT',
        rowCount: 1,
      });

      await tersePg();

      const client = new (MockClient as any)();
      const result = await client.query('INSERT INTO users VALUES (1)');

      expect(result.command).toBe('INSERT');
      expect(result.rowCount).toBe(1);
    });

    it('should work with Pool.query', async () => {
      const mockRows = [
        { userId: 1, userName: 'Alice', userEmail: 'alice@test.com' },
      ];

      mockPoolQuery.mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 1,
        command: 'SELECT',
      });

      await tersePg();

      const pool = new (MockPool as any)();
      const result = await pool.query('SELECT * FROM users');

      expect(result.rows[0].userId).toBe(1);
      expect(result.rows[0].userName).toBe('Alice');
    });
  });

  describe('options behavior', () => {
    it('should skip wrapping when enabled is false', async () => {
      const mockRows = [
        { id: 1, name: 'Test' },
      ];

      mockClientQuery.mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 1,
      });

      await tersePg({ enabled: false });

      const client = new (MockClient as any)();
      const result = await client.query('SELECT * FROM users');

      // Should return original rows unchanged
      expect(result.rows).toBe(mockRows);
    });

    it('should skip wrapping when array length below minArrayLength', async () => {
      const mockRows = [{ id: 1 }, { id: 2 }];

      mockClientQuery.mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 2,
      });

      await tersePg({ minArrayLength: 5 });

      const client = new (MockClient as any)();
      const result = await client.query('SELECT * FROM users');

      // Should return original rows since length < minArrayLength
      expect(result.rows).toBe(mockRows);
    });
  });

  describe('Proxy transparency', () => {
    it('should support Object.keys on wrapped rows', async () => {
      mockClientQuery.mockResolvedValueOnce({
        rows: [
          { firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        ],
        rowCount: 1,
      });

      await tersePg();

      const client = new (MockClient as any)();
      const result = await client.query('SELECT * FROM users');

      const keys = Object.keys(result.rows[0]);
      expect(keys).toContain('firstName');
      expect(keys).toContain('lastName');
      expect(keys).toContain('email');
    });

    it('should support spread operator on wrapped rows', async () => {
      mockClientQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Test', value: 100 },
        ],
        rowCount: 1,
      });

      await tersePg();

      const client = new (MockClient as any)();
      const result = await client.query('SELECT * FROM users');

      const spread = { ...result.rows[0] };
      expect(spread.id).toBe(1);
      expect(spread.name).toBe('Test');
      expect(spread.value).toBe(100);
    });

    it('should support destructuring on wrapped rows', async () => {
      mockClientQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, firstName: 'John', lastName: 'Doe' },
        ],
        rowCount: 1,
      });

      await tersePg();

      const client = new (MockClient as any)();
      const result = await client.query('SELECT * FROM users');

      const { id, firstName, lastName } = result.rows[0];
      expect(id).toBe(1);
      expect(firstName).toBe('John');
      expect(lastName).toBe('Doe');
    });

    it('should support map/filter on wrapped rows array', async () => {
      mockClientQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, firstName: 'John', active: true },
          { id: 2, firstName: 'Jane', active: false },
          { id: 3, firstName: 'Bob', active: true },
        ],
        rowCount: 3,
      });

      await tersePg();

      const client = new (MockClient as any)();
      const result = await client.query('SELECT * FROM users');

      const names = result.rows.map((r: any) => r.firstName);
      expect(names).toEqual(['John', 'Jane', 'Bob']);

      const active = result.rows.filter((r: any) => r.active);
      expect(active.length).toBe(2);
    });

    it('should support JSON.stringify on wrapped rows', async () => {
      mockClientQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Test' },
        ],
        rowCount: 1,
      });

      await tersePg();

      const client = new (MockClient as any)();
      const result = await client.query('SELECT * FROM users');

      const json = JSON.stringify(result.rows[0]);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.name).toBe('Test');
    });
  });

  describe('tersePgSync', () => {
    // Note: tersePgSync uses require() which vi.mock doesn't intercept well
    // These tests are skipped in the mock environment
    it.skip('should patch pg synchronously', () => {
      tersePgSync();
      expect(isTersePgActive()).toBe(true);
    });
  });

  describe('non-compressible data', () => {
    it('should handle rows with different schemas', async () => {
      // Rows with different keys - not compressible
      mockClientQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, type: 'user' },
          { id: 2, category: 'admin' }, // Different key
        ],
        rowCount: 2,
      });

      await tersePg();

      const client = new (MockClient as any)();
      const result = await client.query('SELECT * FROM mixed');

      // Should still be accessible
      expect(result.rows[0].id).toBe(1);
      expect(result.rows[1].id).toBe(2);
    });

    it('should handle primitive values in rows', async () => {
      mockClientQuery.mockResolvedValueOnce({
        rows: [1, 2, 3], // Array of primitives, not objects
        rowCount: 3,
      });

      await tersePg();

      const client = new (MockClient as any)();
      const result = await client.query('SELECT 1 UNION SELECT 2 UNION SELECT 3');

      expect(result.rows).toEqual([1, 2, 3]);
    });
  });
});
