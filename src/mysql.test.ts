/**
 * Tests for TerseJSON MySQL Integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock mysql2/promise module
const mockConnectionQuery = vi.fn();
const mockConnectionExecute = vi.fn();
const mockPoolQuery = vi.fn();
const mockPoolExecute = vi.fn();
const mockPoolGetConnection = vi.fn();

const createMockConnection = () => ({
  query: mockConnectionQuery,
  execute: mockConnectionExecute,
  end: vi.fn(),
});

const createMockPool = () => ({
  query: mockPoolQuery,
  execute: mockPoolExecute,
  getConnection: mockPoolGetConnection,
  end: vi.fn(),
});

vi.mock('mysql2/promise', () => ({
  createConnection: vi.fn().mockResolvedValue(createMockConnection()),
  createPool: vi.fn().mockReturnValue(createMockPool()),
}));

import {
  terseMysql,
  unterseMysql,
  isTerseMysqlActive,
  getTerseMysqlOptions,
  setTerseMysqlOptions,
} from './mysql';

describe('terseMysql', () => {
  beforeEach(async () => {
    // Reset state before each test
    await unterseMysql();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await unterseMysql();
  });

  describe('initialization', () => {
    it('should patch mysql2 on first call', async () => {
      expect(isTerseMysqlActive()).toBe(false);
      await terseMysql();
      expect(isTerseMysqlActive()).toBe(true);
    });

    it('should not re-patch on subsequent calls', async () => {
      await terseMysql();
      await terseMysql({ minArrayLength: 10 });
      expect(isTerseMysqlActive()).toBe(true);
      expect(getTerseMysqlOptions().minArrayLength).toBe(10);
    });

    it('should accept options', async () => {
      await terseMysql({
        minArrayLength: 5,
        skipSingleRows: true,
        enabled: true,
      });
      const options = getTerseMysqlOptions();
      expect(options.minArrayLength).toBe(5);
      expect(options.skipSingleRows).toBe(true);
      expect(options.enabled).toBe(true);
    });

    it('should default minArrayLength to 1', async () => {
      await terseMysql();
      expect(getTerseMysqlOptions().minArrayLength).toBe(1);
    });
  });

  describe('unterseMysql', () => {
    it('should mark as inactive', async () => {
      await terseMysql();
      expect(isTerseMysqlActive()).toBe(true);
      await unterseMysql();
      expect(isTerseMysqlActive()).toBe(false);
    });

    it('should be idempotent', async () => {
      await unterseMysql();
      await unterseMysql();
      expect(isTerseMysqlActive()).toBe(false);
    });
  });

  describe('setTerseMysqlOptions', () => {
    it('should update options without re-patching', async () => {
      await terseMysql({ minArrayLength: 1 });
      setTerseMysqlOptions({ minArrayLength: 10 });
      expect(getTerseMysqlOptions().minArrayLength).toBe(10);
      expect(isTerseMysqlActive()).toBe(true);
    });

    it('should merge with existing options', async () => {
      await terseMysql({ minArrayLength: 5, skipSingleRows: true });
      setTerseMysqlOptions({ minArrayLength: 10 });
      const options = getTerseMysqlOptions();
      expect(options.minArrayLength).toBe(10);
      expect(options.skipSingleRows).toBe(true);
    });
  });

  describe('query result wrapping', () => {
    it('should wrap rows in [rows, fields] tuple', async () => {
      const mockRows = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
      ];
      const mockFields = [{ name: 'id' }, { name: 'firstName' }];

      mockConnectionQuery.mockResolvedValueOnce([mockRows, mockFields]);

      await terseMysql();

      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({});
      const [rows, fields] = await connection.query('SELECT * FROM users');

      // Rows should be accessible
      expect(rows.length).toBe(2);
      expect(rows[0].id).toBe(1);
      expect(rows[0].firstName).toBe('John');
      expect(rows[1].email).toBe('jane@example.com');

      // Fields should be preserved
      expect(fields).toEqual(mockFields);
    });

    it('should handle empty results', async () => {
      mockConnectionQuery.mockResolvedValueOnce([[], []]);

      await terseMysql();

      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({});
      const [rows] = await connection.query('SELECT * FROM users WHERE 1=0');

      expect(rows).toEqual([]);
    });

    it('should work with execute method', async () => {
      const mockRows = [
        { userId: 1, userName: 'Alice', userEmail: 'alice@test.com' },
      ];

      mockConnectionExecute.mockResolvedValueOnce([mockRows, []]);

      await terseMysql();

      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({});
      const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [1]);

      expect(rows[0].userId).toBe(1);
      expect(rows[0].userName).toBe('Alice');
    });

    it('should work with Pool.query', async () => {
      const mockRows = [
        { id: 1, name: 'Test', value: 100 },
      ];

      mockPoolQuery.mockResolvedValueOnce([mockRows, []]);

      await terseMysql();

      const mysql = await import('mysql2/promise');
      const pool = mysql.createPool({});
      const [rows] = await pool.query('SELECT * FROM data');

      expect(rows[0].id).toBe(1);
      expect(rows[0].name).toBe('Test');
    });

    it('should work with Pool.execute', async () => {
      const mockRows = [
        { productId: 1, productName: 'Widget', price: 9.99 },
      ];

      mockPoolExecute.mockResolvedValueOnce([mockRows, []]);

      await terseMysql();

      const mysql = await import('mysql2/promise');
      const pool = mysql.createPool({});
      const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [1]);

      expect(rows[0].productId).toBe(1);
      expect(rows[0].productName).toBe('Widget');
    });
  });

  describe('options behavior', () => {
    it('should skip wrapping when enabled is false', async () => {
      const mockRows = [
        { id: 1, name: 'Test' },
      ];

      mockConnectionQuery.mockResolvedValueOnce([mockRows, []]);

      await terseMysql({ enabled: false });

      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({});
      const [rows] = await connection.query('SELECT * FROM users');

      // Should return original rows unchanged
      expect(rows).toBe(mockRows);
    });

    it('should skip wrapping when array length below minArrayLength', async () => {
      const mockRows = [{ id: 1 }, { id: 2 }];

      mockConnectionQuery.mockResolvedValueOnce([mockRows, []]);

      await terseMysql({ minArrayLength: 5 });

      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({});
      const [rows] = await connection.query('SELECT * FROM users');

      // Should return original rows since length < minArrayLength
      expect(rows).toBe(mockRows);
    });
  });

  describe('Proxy transparency', () => {
    it('should support Object.keys on wrapped rows', async () => {
      mockConnectionQuery.mockResolvedValueOnce([
        [{ firstName: 'John', lastName: 'Doe', email: 'john@test.com' }],
        [],
      ]);

      await terseMysql();

      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({});
      const [rows] = await connection.query('SELECT * FROM users');

      const keys = Object.keys(rows[0]);
      expect(keys).toContain('firstName');
      expect(keys).toContain('lastName');
      expect(keys).toContain('email');
    });

    it('should support spread operator on wrapped rows', async () => {
      mockConnectionQuery.mockResolvedValueOnce([
        [{ id: 1, name: 'Test', value: 100 }],
        [],
      ]);

      await terseMysql();

      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({});
      const [rows] = await connection.query('SELECT * FROM users');

      const spread = { ...rows[0] };
      expect(spread.id).toBe(1);
      expect(spread.name).toBe('Test');
      expect(spread.value).toBe(100);
    });

    it('should support destructuring on wrapped rows', async () => {
      mockConnectionQuery.mockResolvedValueOnce([
        [{ id: 1, firstName: 'John', lastName: 'Doe' }],
        [],
      ]);

      await terseMysql();

      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({});
      const [rows] = await connection.query('SELECT * FROM users');

      const { id, firstName, lastName } = rows[0];
      expect(id).toBe(1);
      expect(firstName).toBe('John');
      expect(lastName).toBe('Doe');
    });

    it('should support map/filter on wrapped rows array', async () => {
      mockConnectionQuery.mockResolvedValueOnce([
        [
          { id: 1, firstName: 'John', active: true },
          { id: 2, firstName: 'Jane', active: false },
          { id: 3, firstName: 'Bob', active: true },
        ],
        [],
      ]);

      await terseMysql();

      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({});
      const [rows] = await connection.query('SELECT * FROM users');

      const names = rows.map((r: any) => r.firstName);
      expect(names).toEqual(['John', 'Jane', 'Bob']);

      const active = rows.filter((r: any) => r.active);
      expect(active.length).toBe(2);
    });

    it('should support JSON.stringify on wrapped rows', async () => {
      mockConnectionQuery.mockResolvedValueOnce([
        [{ id: 1, name: 'Test' }],
        [],
      ]);

      await terseMysql();

      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({});
      const [rows] = await connection.query('SELECT * FROM users');

      const json = JSON.stringify(rows[0]);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.name).toBe('Test');
    });
  });

  describe('non-compressible data', () => {
    it('should handle rows with different schemas', async () => {
      // Rows with different keys - not compressible
      mockConnectionQuery.mockResolvedValueOnce([
        [
          { id: 1, type: 'user' },
          { id: 2, category: 'admin' }, // Different key
        ],
        [],
      ]);

      await terseMysql();

      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({});
      const [rows] = await connection.query('SELECT * FROM mixed');

      // Should still be accessible
      expect(rows[0].id).toBe(1);
      expect(rows[1].id).toBe(2);
    });

    it('should handle INSERT/UPDATE results', async () => {
      // INSERT/UPDATE returns ResultSetHeader, not rows
      const resultHeader = {
        fieldCount: 0,
        affectedRows: 1,
        insertId: 42,
        info: '',
        serverStatus: 2,
        warningStatus: 0,
      };

      mockConnectionQuery.mockResolvedValueOnce([resultHeader, undefined]);

      await terseMysql();

      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({});
      const [result] = await connection.query('INSERT INTO users VALUES (?)');

      expect(result.affectedRows).toBe(1);
      expect(result.insertId).toBe(42);
    });
  });
});
