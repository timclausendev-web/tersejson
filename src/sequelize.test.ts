/**
 * Tests for TerseJSON Sequelize Integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Sequelize Model instance
function createMockInstance(data: Record<string, unknown>) {
  return {
    ...data,
    get: vi.fn((opts?: { plain?: boolean }) => {
      if (opts?.plain) return data;
      return { ...data, get: createMockInstance(data).get };
    }),
  };
}

// Mock Sequelize module
const mockFindAll = vi.fn();
const mockFindOne = vi.fn();
const mockFindByPk = vi.fn();
const mockFindAndCountAll = vi.fn();
const mockQuery = vi.fn();

const MockModel = {
  findAll: mockFindAll,
  findOne: mockFindOne,
  findByPk: mockFindByPk,
  findAndCountAll: mockFindAndCountAll,
};

function MockSequelize() {}
MockSequelize.prototype = {
  query: mockQuery,
};

vi.mock('sequelize', () => ({
  Model: MockModel,
  Sequelize: MockSequelize,
}));

import {
  terseSequelize,
  unterseSequelize,
  isTerseSequelizeActive,
  getTerseSequelizeOptions,
  setTerseSequelizeOptions,
} from './sequelize';

describe('terseSequelize', () => {
  beforeEach(async () => {
    // Reset state before each test
    await unterseSequelize();
    vi.clearAllMocks();

    // Reset mock Model methods
    MockModel.findAll = mockFindAll;
    MockModel.findOne = mockFindOne;
    MockModel.findByPk = mockFindByPk;
    MockModel.findAndCountAll = mockFindAndCountAll;
    MockSequelize.prototype.query = mockQuery;
  });

  afterEach(async () => {
    await unterseSequelize();
  });

  describe('initialization', () => {
    it('should patch Sequelize on first call', async () => {
      expect(isTerseSequelizeActive()).toBe(false);
      await terseSequelize();
      expect(isTerseSequelizeActive()).toBe(true);
    });

    it('should not re-patch on subsequent calls', async () => {
      await terseSequelize();
      await terseSequelize({ minArrayLength: 10 });
      expect(isTerseSequelizeActive()).toBe(true);
      expect(getTerseSequelizeOptions().minArrayLength).toBe(10);
    });

    it('should accept options', async () => {
      await terseSequelize({
        minArrayLength: 5,
        skipSingleRows: true,
        enabled: true,
        usePlainObjects: false,
      });
      const options = getTerseSequelizeOptions();
      expect(options.minArrayLength).toBe(5);
      expect(options.skipSingleRows).toBe(true);
      expect(options.enabled).toBe(true);
      expect(options.usePlainObjects).toBe(false);
    });

    it('should default minArrayLength to 1 and usePlainObjects to true', async () => {
      await terseSequelize();
      expect(getTerseSequelizeOptions().minArrayLength).toBe(1);
      expect(getTerseSequelizeOptions().usePlainObjects).toBe(true);
    });
  });

  describe('unterseSequelize', () => {
    it('should restore original methods', async () => {
      await terseSequelize();
      expect(isTerseSequelizeActive()).toBe(true);
      await unterseSequelize();
      expect(isTerseSequelizeActive()).toBe(false);
    });

    it('should be idempotent', async () => {
      await unterseSequelize();
      await unterseSequelize();
      expect(isTerseSequelizeActive()).toBe(false);
    });
  });

  describe('setTerseSequelizeOptions', () => {
    it('should update options without re-patching', async () => {
      await terseSequelize({ minArrayLength: 1 });
      setTerseSequelizeOptions({ minArrayLength: 10 });
      expect(getTerseSequelizeOptions().minArrayLength).toBe(10);
      expect(isTerseSequelizeActive()).toBe(true);
    });

    it('should merge with existing options', async () => {
      await terseSequelize({ minArrayLength: 5, skipSingleRows: true });
      setTerseSequelizeOptions({ minArrayLength: 10 });
      const options = getTerseSequelizeOptions();
      expect(options.minArrayLength).toBe(10);
      expect(options.skipSingleRows).toBe(true);
    });
  });

  describe('Model.findAll() wrapping', () => {
    it('should wrap results array with Proxy', async () => {
      const mockResults = [
        createMockInstance({ id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' }),
        createMockInstance({ id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }),
      ];

      mockFindAll.mockResolvedValueOnce(mockResults);

      await terseSequelize();

      const { Model } = await import('sequelize');
      const results = await Model.findAll();

      // Results should be accessible (through Proxy after plain conversion)
      expect(results.length).toBe(2);
      expect(results[0].id).toBe(1);
      expect(results[0].firstName).toBe('John');
      expect(results[1].email).toBe('jane@example.com');
    });

    it('should handle empty results', async () => {
      mockFindAll.mockResolvedValueOnce([]);

      await terseSequelize();

      const { Model } = await import('sequelize');
      const results = await Model.findAll();

      expect(results).toEqual([]);
    });
  });

  describe('Model.findOne() wrapping', () => {
    it('should wrap single result with Proxy', async () => {
      const mockResult = createMockInstance({ id: 1, firstName: 'John', lastName: 'Doe' });

      mockFindOne.mockResolvedValueOnce(mockResult);

      await terseSequelize();

      const { Model } = await import('sequelize');
      const result = await Model.findOne({ where: { id: 1 } });

      expect(result.id).toBe(1);
      expect(result.firstName).toBe('John');
    });

    it('should handle null result', async () => {
      mockFindOne.mockResolvedValueOnce(null);

      await terseSequelize();

      const { Model } = await import('sequelize');
      const result = await Model.findOne({ where: { id: 999 } });

      expect(result).toBeNull();
    });

    it('should skip wrapping when skipSingleRows is true', async () => {
      const mockResult = createMockInstance({ id: 1, name: 'Test' });

      mockFindOne.mockResolvedValueOnce(mockResult);

      await terseSequelize({ skipSingleRows: true });

      const { Model } = await import('sequelize');
      const result = await Model.findOne({ where: { id: 1 } });

      // Should return original (still the mock instance)
      expect(result).toBe(mockResult);
    });
  });

  describe('Model.findByPk() wrapping', () => {
    it('should wrap single result with Proxy', async () => {
      const mockResult = createMockInstance({ id: 42, userName: 'alice', userEmail: 'alice@test.com' });

      mockFindByPk.mockResolvedValueOnce(mockResult);

      await terseSequelize();

      const { Model } = await import('sequelize');
      const result = await Model.findByPk(42);

      expect(result.id).toBe(42);
      expect(result.userName).toBe('alice');
    });

    it('should handle null result', async () => {
      mockFindByPk.mockResolvedValueOnce(null);

      await terseSequelize();

      const { Model } = await import('sequelize');
      const result = await Model.findByPk(999);

      expect(result).toBeNull();
    });
  });

  describe('Model.findAndCountAll() wrapping', () => {
    it('should wrap rows array with Proxy', async () => {
      const mockResults = {
        count: 3,
        rows: [
          createMockInstance({ id: 1, name: 'Item 1' }),
          createMockInstance({ id: 2, name: 'Item 2' }),
          createMockInstance({ id: 3, name: 'Item 3' }),
        ],
      };

      mockFindAndCountAll.mockResolvedValueOnce(mockResults);

      await terseSequelize();

      const { Model } = await import('sequelize');
      const result = await Model.findAndCountAll();

      expect(result.count).toBe(3);
      expect(result.rows.length).toBe(3);
      expect(result.rows[0].id).toBe(1);
      expect(result.rows[2].name).toBe('Item 3');
    });
  });

  describe('Sequelize.query() wrapping', () => {
    it('should wrap raw query results [rows, metadata]', async () => {
      const mockRows = [
        { id: 1, productName: 'Widget', price: 9.99 },
        { id: 2, productName: 'Gadget', price: 19.99 },
      ];
      const mockMetadata = { rowCount: 2 };

      mockQuery.mockResolvedValueOnce([mockRows, mockMetadata]);

      await terseSequelize();

      const { Sequelize } = await import('sequelize');
      const sequelize = new (Sequelize as any)();
      const [rows, metadata] = await sequelize.query('SELECT * FROM products');

      expect(rows.length).toBe(2);
      expect(rows[0].id).toBe(1);
      expect(rows[0].productName).toBe('Widget');
      expect(metadata).toEqual(mockMetadata);
    });

    it('should wrap raw query results (array only)', async () => {
      const mockRows = [
        { id: 1, name: 'Test' },
      ];

      mockQuery.mockResolvedValueOnce(mockRows);

      await terseSequelize();

      const { Sequelize } = await import('sequelize');
      const sequelize = new (Sequelize as any)();
      const rows = await sequelize.query('SELECT * FROM users');

      expect(rows.length).toBe(1);
      expect(rows[0].id).toBe(1);
    });
  });

  describe('options behavior', () => {
    it('should skip wrapping when enabled is false', async () => {
      const mockResults = [
        createMockInstance({ id: 1, name: 'Test' }),
      ];

      mockFindAll.mockResolvedValueOnce(mockResults);

      await terseSequelize({ enabled: false });

      const { Model } = await import('sequelize');
      const results = await Model.findAll();

      // Should return original results unchanged
      expect(results).toBe(mockResults);
    });

    it('should skip wrapping when array length below minArrayLength', async () => {
      const mockResults = [
        createMockInstance({ id: 1 }),
        createMockInstance({ id: 2 }),
      ];

      mockFindAll.mockResolvedValueOnce(mockResults);

      await terseSequelize({ minArrayLength: 5 });

      const { Model } = await import('sequelize');
      const results = await Model.findAll();

      // Should return original results since length < minArrayLength
      expect(results).toBe(mockResults);
    });
  });

  describe('Proxy transparency', () => {
    it('should support Object.keys on wrapped results', async () => {
      mockFindAll.mockResolvedValueOnce([
        createMockInstance({ firstName: 'John', lastName: 'Doe', email: 'john@test.com' }),
      ]);

      await terseSequelize();

      const { Model } = await import('sequelize');
      const results = await Model.findAll();

      const keys = Object.keys(results[0]);
      expect(keys).toContain('firstName');
      expect(keys).toContain('lastName');
      expect(keys).toContain('email');
    });

    it('should support spread operator on wrapped results', async () => {
      mockFindAll.mockResolvedValueOnce([
        createMockInstance({ id: 1, name: 'Test', value: 100 }),
      ]);

      await terseSequelize();

      const { Model } = await import('sequelize');
      const results = await Model.findAll();

      const spread = { ...results[0] };
      expect(spread.id).toBe(1);
      expect(spread.name).toBe('Test');
      expect(spread.value).toBe(100);
    });

    it('should support destructuring on wrapped results', async () => {
      mockFindAll.mockResolvedValueOnce([
        createMockInstance({ id: 1, firstName: 'John', lastName: 'Doe' }),
      ]);

      await terseSequelize();

      const { Model } = await import('sequelize');
      const results = await Model.findAll();

      const { id, firstName, lastName } = results[0];
      expect(id).toBe(1);
      expect(firstName).toBe('John');
      expect(lastName).toBe('Doe');
    });

    it('should support map/filter on wrapped results array', async () => {
      mockFindAll.mockResolvedValueOnce([
        createMockInstance({ id: 1, firstName: 'John', active: true }),
        createMockInstance({ id: 2, firstName: 'Jane', active: false }),
        createMockInstance({ id: 3, firstName: 'Bob', active: true }),
      ]);

      await terseSequelize();

      const { Model } = await import('sequelize');
      const results = await Model.findAll();

      const names = results.map((r: any) => r.firstName);
      expect(names).toEqual(['John', 'Jane', 'Bob']);

      const active = results.filter((r: any) => r.active);
      expect(active.length).toBe(2);
    });

    it('should support JSON.stringify on wrapped results', async () => {
      mockFindAll.mockResolvedValueOnce([
        createMockInstance({ id: 1, name: 'Test' }),
      ]);

      await terseSequelize();

      const { Model } = await import('sequelize');
      const results = await Model.findAll();

      const json = JSON.stringify(results[0]);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.name).toBe('Test');
    });
  });

  describe('usePlainObjects option', () => {
    it('should convert Model instances to plain objects by default', async () => {
      const mockInstance = createMockInstance({ id: 1, name: 'Test' });
      mockFindAll.mockResolvedValueOnce([mockInstance]);

      await terseSequelize();

      const { Model } = await import('sequelize');
      const results = await Model.findAll();

      // The get method should have been called with { plain: true }
      expect(mockInstance.get).toHaveBeenCalledWith({ plain: true });
    });

    it('should not convert when usePlainObjects is false', async () => {
      const mockInstance = createMockInstance({ id: 1, name: 'Test' });
      mockFindAll.mockResolvedValueOnce([mockInstance]);

      await terseSequelize({ usePlainObjects: false, enabled: false });

      const { Model } = await import('sequelize');
      const results = await Model.findAll();

      // Should return original instance
      expect(results[0]).toBe(mockInstance);
    });
  });
});
