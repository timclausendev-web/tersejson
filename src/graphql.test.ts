import { describe, it, expect } from 'vitest';
import {
  findCompressibleArrays,
  compressGraphQLResponse,
  createTerseFormatFn,
} from './graphql';
import { isGraphQLTersePayload } from './types';

describe('findCompressibleArrays', () => {
  const defaultOptions = { minArrayLength: 2, excludePaths: [], maxDepth: 10 };

  it('finds arrays at the top level of data', () => {
    const data = {
      users: [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' },
      ],
    };

    const result = findCompressibleArrays(data, 'data', defaultOptions);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('data.users');
  });

  it('finds multiple arrays', () => {
    const data = {
      users: [
        { firstName: 'John' },
        { firstName: 'Jane' },
      ],
      products: [
        { name: 'Widget' },
        { name: 'Gadget' },
      ],
    };

    const result = findCompressibleArrays(data, 'data', defaultOptions);

    expect(result).toHaveLength(2);
    expect(result.map(r => r.path)).toContain('data.users');
    expect(result.map(r => r.path)).toContain('data.products');
  });

  it('finds nested arrays', () => {
    const data = {
      users: [
        {
          firstName: 'John',
          orders: [
            { productName: 'Widget' },
            { productName: 'Gadget' },
          ],
        },
        {
          firstName: 'Jane',
          orders: [
            { productName: 'Gizmo' },
            { productName: 'Thingamajig' },
          ],
        },
      ],
    };

    const result = findCompressibleArrays(data, 'data', defaultOptions);

    expect(result).toHaveLength(3);
    expect(result.map(r => r.path)).toContain('data.users');
    expect(result.map(r => r.path)).toContain('data.users[0].orders');
    expect(result.map(r => r.path)).toContain('data.users[1].orders');
  });

  it('skips arrays below minArrayLength', () => {
    const data = {
      users: [{ firstName: 'John' }], // Only 1 item
    };

    const result = findCompressibleArrays(data, 'data', defaultOptions);

    expect(result).toHaveLength(0);
  });

  it('skips excluded paths', () => {
    const data = {
      users: [
        { firstName: 'John' },
        { firstName: 'Jane' },
      ],
      config: [
        { setting: 'value' },
        { setting: 'other' },
      ],
    };

    const options = { ...defaultOptions, excludePaths: ['data.config'] };
    const result = findCompressibleArrays(data, 'data', options);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('data.users');
  });

  it('skips non-compressible arrays (primitives)', () => {
    const data = {
      tags: ['tag1', 'tag2', 'tag3'],
      users: [
        { firstName: 'John' },
        { firstName: 'Jane' },
      ],
    };

    const result = findCompressibleArrays(data, 'data', defaultOptions);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('data.users');
  });
});

describe('compressGraphQLResponse', () => {
  it('compresses arrays in GraphQL response', () => {
    const response = {
      data: {
        users: [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' },
        ],
      },
    };

    const result = compressGraphQLResponse(response);

    expect(isGraphQLTersePayload(result)).toBe(true);
    if (isGraphQLTersePayload(result)) {
      expect(result.__terse__.v).toBe(1);
      expect(result.__terse__.paths).toContain('data.users');
      expect(Object.values(result.__terse__.k)).toContain('firstName');
      expect(Object.values(result.__terse__.k)).toContain('lastName');
    }
  });

  it('compresses multiple arrays with shared key map', () => {
    const response = {
      data: {
        users: [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' },
        ],
        admins: [
          { firstName: 'Admin', lastName: 'User' },
          { firstName: 'Super', lastName: 'Admin' },
        ],
      },
    };

    const result = compressGraphQLResponse(response);

    expect(isGraphQLTersePayload(result)).toBe(true);
    if (isGraphQLTersePayload(result)) {
      expect(result.__terse__.paths).toContain('data.users');
      expect(result.__terse__.paths).toContain('data.admins');
      // Should use a shared key map (firstName appears once, not twice)
      const values = Object.values(result.__terse__.k);
      expect(values.filter(v => v === 'firstName')).toHaveLength(1);
    }
  });

  it('preserves GraphQL errors', () => {
    const response = {
      data: {
        users: [
          { firstName: 'John' },
          { firstName: 'Jane' },
        ],
      },
      errors: [
        { message: 'Some warning', path: ['users'] },
      ],
    };

    const result = compressGraphQLResponse(response);

    expect(isGraphQLTersePayload(result)).toBe(true);
    if (isGraphQLTersePayload(result)) {
      expect(result.errors).toEqual(response.errors);
    }
  });

  it('preserves GraphQL extensions', () => {
    const response = {
      data: {
        users: [
          { firstName: 'John' },
          { firstName: 'Jane' },
        ],
      },
      extensions: {
        tracing: { duration: 100 },
      },
    };

    const result = compressGraphQLResponse(response);

    expect(isGraphQLTersePayload(result)).toBe(true);
    if (isGraphQLTersePayload(result)) {
      expect(result.extensions).toEqual(response.extensions);
    }
  });

  it('returns original response if no compressible arrays', () => {
    const response = {
      data: {
        user: { firstName: 'John', lastName: 'Doe' }, // Single object, not array
      },
    };

    const result = compressGraphQLResponse(response);

    expect(isGraphQLTersePayload(result)).toBe(false);
    expect(result).toEqual(response);
  });

  it('returns original response if arrays too short', () => {
    const response = {
      data: {
        users: [{ firstName: 'John' }], // Only 1 item
      },
    };

    const result = compressGraphQLResponse(response);

    expect(isGraphQLTersePayload(result)).toBe(false);
    expect(result).toEqual(response);
  });

  it('returns original response if no keys would be shortened', () => {
    const response = {
      data: {
        items: [
          { id: 1, x: 'a' },
          { id: 2, x: 'b' },
        ],
      },
    };

    const result = compressGraphQLResponse(response);

    // Keys are too short to benefit from compression
    expect(isGraphQLTersePayload(result)).toBe(false);
  });

  it('respects excludePaths option', () => {
    const response = {
      data: {
        users: [
          { firstName: 'John' },
          { firstName: 'Jane' },
        ],
        config: [
          { settingName: 'theme' },
          { settingName: 'language' },
        ],
      },
    };

    const result = compressGraphQLResponse(response, {
      excludePaths: ['data.config'],
    });

    expect(isGraphQLTersePayload(result)).toBe(true);
    if (isGraphQLTersePayload(result)) {
      expect(result.__terse__.paths).toContain('data.users');
      expect(result.__terse__.paths).not.toContain('data.config');
    }
  });

  it('respects shouldCompress callback', () => {
    const response = {
      data: {
        users: [
          { firstName: 'John' },
          { firstName: 'Jane' },
        ],
        products: [
          { productName: 'Widget' },
          { productName: 'Gadget' },
        ],
      },
    };

    const result = compressGraphQLResponse(response, {
      shouldCompress: (_data, path) => path === 'data.users',
    });

    expect(isGraphQLTersePayload(result)).toBe(true);
    if (isGraphQLTersePayload(result)) {
      expect(result.__terse__.paths).toContain('data.users');
      expect(result.__terse__.paths).not.toContain('data.products');
    }
  });

  it('handles deeply nested structures', () => {
    const response = {
      data: {
        organization: {
          departments: [
            {
              departmentName: 'Engineering',
              teams: [
                {
                  teamName: 'Frontend',
                  members: [
                    { firstName: 'John', lastName: 'Doe' },
                    { firstName: 'Jane', lastName: 'Smith' },
                  ],
                },
              ],
            },
            {
              departmentName: 'Marketing',
              teams: [
                {
                  teamName: 'Content',
                  members: [
                    { firstName: 'Bob', lastName: 'Wilson' },
                    { firstName: 'Alice', lastName: 'Brown' },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    const result = compressGraphQLResponse(response);

    expect(isGraphQLTersePayload(result)).toBe(true);
    if (isGraphQLTersePayload(result)) {
      const keys = Object.values(result.__terse__.k);
      expect(keys).toContain('departmentName');
      expect(keys).toContain('teamName');
      expect(keys).toContain('firstName');
      expect(keys).toContain('lastName');
    }
  });
});

describe('createTerseFormatFn', () => {
  it('returns a function that compresses GraphQL results', () => {
    const formatFn = createTerseFormatFn();

    const result = formatFn({
      data: {
        users: [
          { firstName: 'John' },
          { firstName: 'Jane' },
        ],
      },
    });

    expect(isGraphQLTersePayload(result)).toBe(true);
  });

  it('passes options to compressor', () => {
    const formatFn = createTerseFormatFn({
      minArrayLength: 5,
    });

    const result = formatFn({
      data: {
        users: [
          { firstName: 'John' },
          { firstName: 'Jane' },
        ],
      },
    });

    // Should not compress because array length < 5
    expect(isGraphQLTersePayload(result)).toBe(false);
  });
});

describe('isGraphQLTersePayload', () => {
  it('returns true for valid GraphQL terse payload', () => {
    const payload = {
      data: { users: [{ a: 'John' }] },
      __terse__: {
        v: 1,
        k: { a: 'firstName' },
        paths: ['data.users'],
      },
    };

    expect(isGraphQLTersePayload(payload)).toBe(true);
  });

  it('returns false for regular GraphQL response', () => {
    const payload = {
      data: { users: [{ firstName: 'John' }] },
    };

    expect(isGraphQLTersePayload(payload)).toBe(false);
  });

  it('returns false for REST terse payload', () => {
    const payload = {
      __terse__: true,
      v: 1,
      k: { a: 'firstName' },
      d: [{ a: 'John' }],
    };

    expect(isGraphQLTersePayload(payload)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isGraphQLTersePayload(null)).toBe(false);
    expect(isGraphQLTersePayload(undefined)).toBe(false);
  });
});

describe('compression integrity', () => {
  it('compressed data can be used with original keys via expansion', () => {
    const response = {
      data: {
        users: [
          { firstName: 'John', lastName: 'Doe', emailAddress: 'john@example.com' },
          { firstName: 'Jane', lastName: 'Smith', emailAddress: 'jane@example.com' },
        ],
      },
    };

    const compressed = compressGraphQLResponse(response);

    expect(isGraphQLTersePayload(compressed)).toBe(true);
    if (isGraphQLTersePayload(compressed)) {
      // The compressed data should have short keys
      const users = (compressed.data as { users: Record<string, unknown>[] }).users;
      const firstUser = users[0];

      // Short keys should exist
      const shortKeys = Object.keys(compressed.__terse__.k);
      expect(shortKeys.length).toBeGreaterThan(0);

      // Original keys should not exist in compressed data
      expect('firstName' in firstUser).toBe(false);

      // But we should be able to reconstruct using the key map
      const keyMap = compressed.__terse__.k;
      const reverseMap = Object.fromEntries(
        Object.entries(keyMap).map(([short, orig]) => [orig, short])
      );

      expect(firstUser[reverseMap['firstName']]).toBe('John');
      expect(firstUser[reverseMap['lastName']]).toBe('Doe');
      expect(firstUser[reverseMap['emailAddress']]).toBe('john@example.com');
    }
  });
});
